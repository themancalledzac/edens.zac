# Contact-form messages: DB-backed storage + email notification

**Status:** Approved design
**Date:** 2026-04-19
**Scope:** Cross-repo feature — spans `edens.zac` (frontend, this repo) and `edens.zac.backend` (backend)
**Companion spec:** The identical spec lives in the backend repo at `docs/superpowers/specs/2026-04-19-contact-messages-design.md`. Keep both in sync if revised.

## Problem

Today `app/components/ContactForm/ContactForm.tsx` generates a `mailto:` link with a base64-encoded owner email. Submitting the form opens the user's email client. Two problems:

1. The owner's email address is shipped in the client bundle (base64 is trivially decoded). Scrapers can and do harvest it.
2. The user's email client has to be configured; if it isn't, nothing happens and the message is lost.

## Goal

Replace the `mailto:` flow with a server-stored message pipeline:

- A new `messages` table on the backend stores every submission.
- Each successful submission triggers a notification email to the owner via Gmail SMTP.
- Both the user's contact email and the owner's email stay out of the client bundle.

## Non-goals

- Admin UI for reading/managing messages (v1: query the DB directly).
- Retry queue for unsent emails (the schema supports this but no worker yet).
- Per-email-address rate limiting (IP-only for v1).
- CAPTCHA (deferred; layer in later if rate-limit proves insufficient).

## Decisions locked during brainstorming

| Topic | Choice | Why |
|---|---|---|
| Email delivery | `spring-boot-starter-mail` + Gmail SMTP (app password) | Solo-portfolio scale, no new vendor, swappable behind `EmailService` |
| Spam protection | Rate limit (per-IP, Bucket4j, 3/hour default) | Scales vs. honeypot; no UX friction vs. CAPTCHA |
| Failure mode | Persist-first + flag row (`email_sent_at NULL`) | DB never loses a message; null flag surfaces retry candidates |
| Rate-limit location | Backend Spring filter | Stateful logic belongs with the DB write; no Vercel KV dependency |
| Endpoint placement | New `controller/public/` tier; non-profile-gated | Public POSTs don't fit `dev/` (admin) or `prod/` (reads) |

## Architecture

```
Browser ─POST─▶ Next.js /api/proxy/api/public/messages
                        │ adds X-Internal-Secret
                        ▼
              Spring Boot :8080
                        │
              RateLimitFilter (Bucket4j, /api/public/**, per-IP)
                        ▼
              MessagesControllerPublic
                        ▼
              MessageService ──▶ MessageRepository (INSERT)
                        │
                        ├──▶ EmailService.sendContactNotification() ──▶ Gmail SMTP
                        │       │
                        │       └── on success: UPDATE email_sent_at = NOW()
                        │           on failure: log ERROR, leave email_sent_at NULL
                        ▼
                   201 { id, createdAt }
```

## Data model

Flyway migration `V17__create_messages_table.sql` (backend repo):

```sql
CREATE TABLE messages (
  id            BIGSERIAL PRIMARY KEY,
  email         VARCHAR(320) NOT NULL,
  message       TEXT NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  email_sent_at TIMESTAMP NULL
);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_unsent ON messages(email_sent_at) WHERE email_sent_at IS NULL;
```

Column notes:
- `email` is the submitter's contact email. 320 is the RFC 5321 max.
- `message` is TEXT (uncapped in DB); application enforces `@Size(max=5000)`.
- `created_at` is server-set (`DEFAULT NOW()`), not client-supplied.
- `email_sent_at` is NULL on insert; set to NOW() on successful SMTP send.

## Backend units (`edens.zac.backend`)

| Unit | Purpose | Depends on |
|---|---|---|
| `entity/MessageEntity.java` | Record matching the table | — |
| `dao/MessageRepository.java` | `insert(email, msg) → id`, `markEmailSent(id)`; extends existing `BaseDao` | `JdbcTemplate` |
| `services/EmailService.java` | Thin wrapper on `JavaMailSender.send()`. One method: `sendContactNotification(MessageEntity)`. Throws on SMTP failure. | `spring-boot-starter-mail` |
| `services/MessageService.java` | Orchestrates: insert → try email → mark sent OR log error. Never throws on email failure. | `MessageRepository` + `EmailService` |
| `model/Requests.java` → add `CreateMessage` | Record `{email, message}` with `@Email`, `@NotBlank`, `@Size(max=5000)` on message, `@Size(max=320)` on email | — |
| `controller/public/MessagesControllerPublic.java` | `@PostMapping("/api/public/messages")` returns 201 `{id, createdAt}`. **No** `@Profile` annotation. | `MessageService` |
| `config/RateLimitFilter.java` | Servlet filter. Per-IP (`X-Forwarded-For` first hop, fallback to `getRemoteAddr()`). Bucket4j in-memory `ConcurrentHashMap<String, Bucket>`. Default 3/hour, configurable. Returns 429 with `Retry-After` header. Applied to `/api/public/**`. | `com.bucket4j:bucket4j-core` |
| `application.yml` | `spring.mail.host=smtp.gmail.com`, `port=587`, `username=${MAIL_USERNAME}`, `password=${MAIL_APP_PASSWORD}`, starttls=true. Plus `app.contact.notify-to=${CONTACT_NOTIFY_TO}` and `app.contact.rate-limit-per-hour=3`. | env vars |
| `pom.xml` | Add `spring-boot-starter-mail` + `com.bucket4j:bucket4j-core:8.10.1` | — |

### New env vars (backend)
- `MAIL_USERNAME` — Gmail address for SMTP auth
- `MAIL_APP_PASSWORD` — Google app password (not account password)
- `CONTACT_NOTIFY_TO` — address to notify; defaults to `MAIL_USERNAME` when unset

Docker compose `environment:` block and `.env.example` updated.

## Frontend units (`edens.zac`, this repo)

| Unit | Change |
|---|---|
| `app/components/ContactForm/ContactForm.tsx` | Remove `mailto`/base64 logic + `BREAKPOINTS` import. Replace `title` input with `email` input (`type="email"`, `required`, `maxLength={320}`). Add `useState` for `status: 'idle' \| 'submitting' \| 'success' \| 'error'` and `errorMessage`. Submit button disabled when submitting. Submit via `fetch('/api/proxy/api/public/messages', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email, message}) })`. On 201: clear form, show success banner. On 429: show "too many requests, please wait". On 400/500/network: show error + inline mailto fallback link. |
| `app/components/ContactForm/ContactForm.module.scss` | Rename `titleInput` → `emailInput` (same styles). Add `.statusBanner`, `.statusBanner--success`, `.statusBanner--error`. |
| `app/utils/contactApi.ts` **(new)** | `submitContactMessage(payload): Promise<Result>`, where `Result = { ok: true; id: number } \| { ok: false; code: 'rate-limit' \| 'validation' \| 'server' \| 'network'; message: string }`. Fetch wrapper with typed error surface. |
| `tests/components/ContactForm.test.tsx` **(new)** | New test file under the project's `tests/` mirror convention: new email field present, new endpoint called, success/error/rate-limit UI branches, validation blocks empty submit, mailto fallback link rendered only after an error. |

## Data flow

1. User fills `email` + `message`, clicks Send.
2. Frontend POSTs to `/api/proxy/api/public/messages` with JSON `{ email, message }`.
3. Next.js proxy (`app/api/proxy/[...path]/route.ts`) adds `X-Internal-Secret` and forwards.
4. Spring Boot's `RateLimitFilter` resolves the client IP from `X-Forwarded-For`; consumes one token from that IP's bucket. If empty: **429 + `Retry-After`**, no further processing.
5. `MessagesControllerPublic` validates the body via `@Valid`. Validation failure → **400** (via existing `GlobalExceptionHandler`).
6. `MessageService.create(email, message)`:
   - Inserts row via `MessageRepository`. Returns new `id`.
   - Attempts `EmailService.sendContactNotification(entity)`.
     - Success → `MessageRepository.markEmailSent(id)`.
     - Failure → caught, logged at `ERROR` level with the id, `email_sent_at` stays NULL.
   - Returns the persisted entity.
7. Controller returns **201** with `{ id, createdAt }`.
8. Frontend clears form and renders a success banner. On error, renders error banner + inline mailto fallback.

## Error handling

Backend: errors inside the controller/service flow through the existing `GlobalExceptionHandler`, which emits `{ timestamp, status, error, message }`. `RateLimitFilter` runs **before** the DispatcherServlet, so the handler does not see it — the filter must write the same JSON shape to the response directly (status 429, `Content-Type: application/json`, `Retry-After` header). Use the same `ObjectMapper` bean Spring already provides.

Frontend error surface (user-facing copy):
- **429** — "You've sent a lot of messages. Try again in an hour."
- **400** — surface the backend's `message` field (per-field validation text).
- **500 / network** — "Something went wrong. Please email me directly:" + inline `<a href="mailto:…">` as a graceful degradation.

The mailto fallback keeps the page no worse than today if the backend is down. Owner's email is still base64-encoded at this fallback point (acceptable: only shown on failure, not in the happy-path bundle).

## Testing

**Backend**
- `MessageServiceTest` — mocked repo + email service. Verifies: happy path marks sent; email-throw path persists + logs + leaves NULL.
- `RateLimitFilterTest` — verifies: token consumption, 429 response shape, `Retry-After` header, clock-advance releases the next request.
- `MessagesControllerPublicTest` — MockMvc POST; DB verified via repo; mail sender mocked; rate limiter disabled or bypassed in the test profile.

**Frontend**
- `ContactForm.test.tsx` — idle/submitting/success/error/rate-limit branches; validation blocks empty submit; email-field HTML5 validation triggers.

## Deployment

- Backend `Dockerfile` unchanged. Docker compose gains three env var entries. Flyway runs `V17` automatically on container start. Rollout is zero-downtime because the endpoint is additive.
- Frontend deploys unchanged — proxy already exists.
- Required manual step: generate a Google app password and set it in the backend's env.

## Open items (carry into the plan)

- Exact copy for the notification email body (plain-text; needs to include the submitter's email + message + a timestamp + a link to the DB row / id).
- Confirm the rate-limit default (3/hour) is right. The value is already parameterized via `app.contact.rate-limit-per-hour`, so this is a tuning question, not a design one.
- Mailto fallback placement: v1 decision is "only after a submission error, not always-visible" — keeps the happy-path UI clean. Plan should codify this.
