# Admin Auth — Path Forward

Status: **DRAFT for review** · Author: review pass 2026-07-03 · Scope: single-admin photography portfolio, one EC2 box, Next.js BFF on Vercel/Amplify.

## TL;DR

There is a **verified CRITICAL**: `/api/admin/**` has no per-user authorization, and the BFF proxy attaches the internal secret to *every* forwarded request, so an anonymous internet client can reach every admin endpoint (PII read, and an invite→accept **account-takeover** chain). Immediate cause: `AuthPrincipal` carries no `role` and the session filter stamps every session `ROLE_USER`, so admin can't be asserted server-side.

**Important context (this is not a simple "restore the field"):** the global `role` was **deliberately dropped** in a documented migration sequence — V29 created `users.role` (ADMIN|CLIENT), V35 marked it temporary ("Phase 2 removes it once membership + perimeter replace it"), V36 added per-collection `user_collection.role` (GENERAL|CLIENT), and V37 dropped `users.role`. The catch: per-collection membership can express *client-per-gallery* but **cannot express global-admin operations** (user CRUD, invite, merge, messages), and the "perimeter" that was meant to cover the rest is the confused-deputy the review just exposed. So `role` was removed **before its global-admin replacement existed**. Your own design doc (`docs/superpowers/specs/009-abac-access-control.md`, 2026-05-31) already prescribes the answer: *"You don't need ABAC. You need **RBAC + one resource scope** … store cheap attributes on the principal (`role`, `galleries`, `mfa`)"* and *"Admin gets MFA."* So **Phase 0 = complete the admin identity your ABAC design calls for** (re-establish a global admin attribute on the principal + gate `/api/admin/**`), not revert anything.

This is delivered as a **plan, not a blind implementation**: it's a security-critical auth-core change requiring a DB migration, it touches the identity-merge machinery, and its actual enforcement can't be verified without the Testcontainers/Docker integration suite (unavailable in the review environment). It should ship as its own reviewed branch with CI green + a manual auth test before merge. The X-Forwarded-For rate-limit issue from the April review is **fixed**. A WAF/API-Gateway is **not** warranted at this scale — the gap is app-layer authorization, which a WAF does not fix.

The small, decision-free hardening bits (proxy `x-real-ip`, image `remotePatterns` pin) are documented here and in the roadmap; they don't depend on the admin-model decision and can ship with this branch or a quick hardening branch — they are not part of the 0195 feature MR.

## Current state (why it's broken)

| Layer | What exists today | Problem |
|---|---|---|
| Spring `SecurityConfig` | `/api/admin/**` is `permitAll`; comment says "Do NOT switch to authenticated()" | No server-side gate on admin routes |
| Method security | `@EnableMethodSecurity` present, **zero** `@PreAuthorize`/`@Secured` in the whole source | No RBAC anywhere |
| `AuthPrincipal` | `(userId, email, mfaSatisfied)` — **no `role`** | Can't express "is admin" at the request layer |
| `SessionAuthenticationFilter` | grants hardcoded `ROLE_USER` to every session | Even adding `hasRole('ADMIN')` would fail-closed for the real admin |
| FE middleware | **none** (`middleware.ts` absent); `(admin)/layout.tsx requireAdmin()` is non-enforcing | No FE gate either |
| BFF proxy | injects `X-Internal-Secret` on **every** forwarded request; GET skips the Origin check | The secret authenticates the *channel*, not the *user* — a confused deputy |

**Exploit paths (unauthenticated, through the public proxy):**
- `GET /api/proxy/api/admin/messages` → contact-form PII (emails + bodies); `GET /api/admin/users` → all user emails.
- `POST /api/proxy/api/admin/users/{id}/invite` → returns an invite token → `POST /api/proxy/api/auth/invite/{token}/accept` → sets the target's password and logs the caller in = **full account takeover**. (`Origin` is only checked on writes and is trivially set by a non-browser client.)

## Phased plan

### Phase 0 — Close the hole (do first; its own `security-admin-authz` branch)
1. **Re-establish a global admin attribute on the principal** (completes the ABAC design; V37 dropped `users.role` before this replacement existed). Two shapes — pick one:
   - **(recommended) `is_admin BOOLEAN NOT NULL DEFAULT false` on `users`** — minimal, unambiguous, single-admin-shaped; the CLIENT-per-gallery half is already handled by `user_collection`. New migration V42.
   - **re-add `users.role VARCHAR(16)` (ADMIN|CLIENT)** — matches the doc's literal wording, but re-introduces a column V37 intentionally removed and overlaps `user_collection.role`.
   Then add the attribute to `AppUserEntity`, `AuthPrincipal`, and populate it in `SessionService.resolve`. Set your own account's flag once (data migration or manual UPDATE).
2. **Grant it.** `SessionAuthenticationFilter` grants `ROLE_ADMIN` when the attribute is set (not hardcoded `ROLE_USER`).
3. **Gate the routes.** In `SecurityConfig`, `/api/admin/**` → `.hasRole("ADMIN")`. Keep `InternalSecretFilter` as defense-in-depth (channel auth), but it is no longer the only control.
4. **Manage the blast radius (now known to be small):**
   - Admin controller tests use `MockMvcBuilders.standaloneSetup`, which **bypasses the security filter chain** — so gating does NOT break them. The gate is exercised only by full-context integration tests (add one asserting anon `/api/admin/**` → 401/403 and admin-session → 200). Those are Testcontainers/CI-gated.
   - FE `/explore` calls admin `getMetadata` (no-store). Once admin is gated, anonymous `/explore` breaks → repoint it to a public read (the backend already has `@Cacheable("generalMetadata")`) or authenticate the page. **Audit all FE `/api/admin/**` callers**: admin-user-initiated calls keep working (the proxy forwards the `ezac_session` cookie), but any anonymous/server-render caller of an admin route must be repointed.
5. **Also strip the client-controlled `x-real-ip` fallback** in the proxy (`route.ts:54`) — only trust the platform `x-vercel-forwarded-for`. *(Decision-free one-liner; ship with this branch.)*

*Outcome:* Findings 1/2/4 (CRITICAL/HIGH) closed. This is the single highest-value change in the whole review. **Verify before merge:** CI green (integration test proves enforcement) + a manual anon-vs-admin curl through the proxy — do not merge on compile-only.

### Phase 1 — Passkey enforcement for admin
- Require `mfaSatisfied == true` for all `/api/admin/**` and for **passkey registration** (`WebAuthnController.registerStart/Finish` currently only check `principal != null`).
- Treat a **break-glass password** session as *reduced*: it can reach `/api/auth/me` and re-authenticate with a passkey, but cannot perform admin mutations or enroll a new passkey until it has satisfied a passkey assertion. (Closes the "password compromise → durable takeover via new passkey" path.)

### Phase 2 — Session hygiene
- Separate admin session policy: short idle (2–8h) and short absolute (~24h) vs. the current 60d/90d for client-gallery users.
- Rotate the session token on privilege-sensitive events (not just slide the expiry).
- Add `revokeAllForUser` and call it on any credential change (invite-accept sets a password today without revoking prior sessions; there's no password-change path yet).
- Append-only **audit log** for admin mutations (who/what/when/IP — the session already captures IP + UA).

### Phase 3 — Auth-endpoint hardening
- Keep the per-`ip|email` login limiter but add a global failure ceiling so `X-Real-IP`/email rotation can't fully bypass it; the limiter is per-instance in-memory (fine for one box, resets on restart — note for scale).
- Log admin logins at WARN.

## Decisions requested from you

- **IP allowlisting** for `/api/admin/**` and `/api/auth/**` at the EC2 security group or CloudFront: high ROI for a single admin *if* you have a stable IP/VPN. Con: lockout on dynamic IPs — keep a break-glass. Recommended as an **edge layer**, not a substitute for Phase 0.
- **WAF / API Gateway:** **not recommended** now. One public endpoint (`/api/public/messages`) already has two rate limiters + body caps + the BFF. A WAF adds cost/ops for marginal gain and does **not** address the missing app-layer authZ. Revisit only if you expose more public endpoints or see real abuse.
- **Security headers** (CSP, HSTS, X-Frame-Options, Referrer-Policy): none are committed today. Add a Next `headers()` block or set them at the CloudFront edge (Phase 3 / roadmap).
- **`next.config.js` image `remotePatterns`** allows `*.cloudfront.net` (any distribution). Pin to the site's distribution domain.

## What's already good (don't regress)
256-bit CSPRNG session tokens hashed at rest; `ezac_session` cookie is httpOnly + Secure + SameSite=Strict; sliding + absolute expiry; constant-time internal-secret compare; login timing-attack defense; prod CORS locked down; `ProdSecretGuard` fails startup on a blank/default prod secret; self-scoped per-user endpoints (saves/follows/selects) with no IDOR-by-id; anonymous tag-view reads correctly restricted to LISTED.
