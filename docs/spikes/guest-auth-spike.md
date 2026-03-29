# Spike: Guest User Authentication for Private Client Galleries

**Date**: 2026-03-29
**Status**: Research Complete
**Branch**: `0116-fix`

---

## 1. Current State Analysis

### 1.1 What Already Exists

The project already has a **partial implementation** of password-per-gallery protection. This is further along than expected.

#### Backend (Spring Boot + PostgreSQL)

| Component | Status | Location |
|-----------|--------|----------|
| `password_hash` column on `collection` table | Deployed | `V5__password_and_indices.sql` |
| BCrypt hashing via `spring-security-crypto` | Working | `CollectionProcessingUtil.hashPassword()` / `.passwordMatches()` |
| `ClientGalleryAuthService` | Working | Validates passwords, generates/validates 24h HMAC access tokens |
| `POST /{slug}/access` endpoint | Working | `CollectionControllerProd` - accepts `{ password }`, returns `{ hasAccess, accessToken }` |
| `GET /{slug}` with `accessToken` query param | Working | Strips content from response if token missing/invalid for protected galleries |
| `isPasswordProtected` field on `CollectionModel` | Working | Backend sets this based on `passwordHash != null` |
| Password update on collection edit | **Commented out** | `CollectionProcessingUtil` lines 555-565 - the admin update path for setting/clearing passwords is disabled |

#### Frontend (Next.js App Router)

| Component | Status | Location |
|-----------|--------|----------|
| `ClientGalleryGate` component | Working | `app/components/ClientGalleryGate/` - `'use client'` password form |
| `CollectionPageWrapper` integration | Working | Wraps `CLIENT_GALLERY` type collections with the gate |
| `validateClientGalleryAccess` API function | Working | `app/lib/api/collections.ts` |
| `sessionStorage` grant caching | Working | Persists `granted` flag per-slug for the browser session |
| `CollectionType.CLIENT_GALLERY` enum | Working | `app/types/Collection.ts` |
| Next.js middleware | **Does not exist** | No `middleware.ts` anywhere in the project |
| Admin UI for setting gallery passwords | **Not built** | No form to set/clear password on collection manage page |

#### AWS Amplify

The project has an Amplify Gen 2 setup (`amplify/auth/resource.ts`) that defines email-based auth via Cognito, but it is a **boilerplate stub** -- the `amplify/data/resource.ts` is still the default `Todo` model. Amplify/Cognito is not wired into the actual application at all. The real backend is a self-hosted Spring Boot app on EC2 with PostgreSQL (migrated from DynamoDB), fronted by CloudFront + Caddy.

#### Security Model Summary

- **Read endpoints** (`/api/read/*`): Public, no auth required
- **Write/Admin endpoints** (`/api/write/*`, `/api/admin/*`): Protected by `InternalSecretFilter` using a shared `X-Internal-Secret` header (constant-time comparison)
- **No user authentication exists** -- no login system, no user sessions, no JWT infrastructure
- The admin endpoints are only accessible from the Next.js proxy in production (EC2 is not publicly exposed; CloudFront routes through the Next.js API proxy)

### 1.2 What the Current System Does NOT Cover

The existing password-per-gallery system was designed for a simpler use case: one password per gallery, entered directly by the client. The user's requirements go beyond this:

| Requirement | Current State | Gap |
|-------------|---------------|-----|
| Users get emailed access to create a password | No email system | Need email invitations + user registration flow |
| Email/password combo stored in a database table | No users table | Need `gallery_user` table and credential management |
| Users can only access specific galleries they're authorized for | Password is per-gallery, not per-user | Need user-gallery authorization mapping |
| Secure against bots/hackers | Basic HMAC tokens, sessionStorage | Need rate limiting, account lockout, HTTPS-only cookies |
| Admin invites specific users | No invitation system | Need invitation workflow |

---

## 2. Approach Evaluation

### 2.1 Option A: Per-Gallery Password (Current System -- Enhanced)

**How it works**: Each gallery has a single shared password. Admin sets the password when creating the gallery. Clients enter the password to view.

**Pros**:
- Already 80% built -- backend service, frontend gate, and DB column exist
- Simplest possible model -- no users table, no email, no sessions
- Zero operational overhead (no email provider, no user management)
- Good enough for "send client a link + password in an email"

**Cons**:
- No per-user tracking (can't revoke one person's access without changing the password for everyone)
- No audit trail (who accessed what, when)
- Password sharing is uncontrolled (clients forward the password to anyone)
- The access token is stored in sessionStorage (lost on tab close, not shareable across devices)
- No email integration (admin manually communicates the password)

**Effort**: ~2-3 days (uncomment admin update, build admin UI, harden tokens)

### 2.2 Option B: Per-User Email/Password with Gallery Authorization (Recommended)

**How it works**: Admin invites users by email to specific galleries. User receives email with a link to set their password. User logs in with email/password and can access only their authorized galleries.

**Pros**:
- Meets all stated requirements
- Per-user access control (revoke one user without affecting others)
- Audit trail (who logged in, when)
- Users can access multiple galleries with one account
- Professional client experience (branded login, "your galleries" dashboard)
- Foundation for future features (download tracking, favorites, proofing)

**Cons**:
- Requires new database tables (`gallery_user`, `gallery_user_access`, `gallery_invitation`)
- Requires email sending (AWS SES is cheap and already in the AWS ecosystem)
- More frontend work (login page, registration page, "my galleries" page)
- Session management complexity (JWT or httpOnly cookies)

**Effort**: ~2-3 weeks

### 2.3 Option C: Magic Link Authentication

**How it works**: No passwords at all. Admin sends a magic link to the client's email. Clicking the link grants a time-limited session for the authorized galleries.

**Pros**:
- No password management for users (no forgotten passwords)
- Simple UX -- click link, view gallery
- Still per-user (each link is tied to an email)
- Lower friction than email/password registration

**Cons**:
- Requires email infrastructure (same as Option B)
- Users need email access every time the link expires (annoying for repeat visits)
- Links can be forwarded (same risk as shared passwords)
- Less familiar UX for non-technical clients
- Still needs DB tables for user/access tracking

**Effort**: ~1.5-2 weeks

### 2.4 Option D: AWS Cognito (via Amplify)

**How it works**: Use the existing Amplify/Cognito stub to manage user pools. Cognito handles signup, login, password reset, email verification, and JWT issuance.

**Pros**:
- Managed service -- AWS handles password storage, MFA, brute-force protection
- Amplify Gen 2 boilerplate already exists in the project
- JWT tokens integrate naturally with both frontend (Amplify client library) and backend (JWT verification)
- Supports MFA, social login, password policies out of the box

**Cons**:
- Heavy dependency on AWS Cognito for a simple use case (guest gallery access)
- Cognito is notoriously difficult to customize (email templates, hosted UI, error messages)
- Vendor lock-in for authentication
- The existing backend has no JWT verification -- would need `spring-security-oauth2-resource-server` or custom filter
- Amplify data layer (`amplify/data/`) is unused and would conflict with the existing PostgreSQL backend
- Overkill for "10 clients viewing photo galleries"
- Monthly cost for Cognito user pool (free tier: 50k MAU, so likely free in practice)

**Effort**: ~2-3 weeks (despite "managed" -- Cognito configuration is non-trivial)

---

## 3. Recommendation

### Phase 1: Finish and harden the per-gallery password system (Option A)

This delivers immediate value with minimal effort. The backend is already built. The work is:

1. Uncomment and wire up the password update in the admin collection edit flow
2. Build admin UI for setting/clearing gallery passwords
3. Replace `sessionStorage` with an `httpOnly` cookie for the access token
4. Add rate limiting to the `/access` endpoint

### Phase 2: Per-user authentication (Option B)

Build the full user system on top of the per-gallery foundation. Phase 1's password gate becomes the fallback for galleries that don't need per-user tracking. Phase 2 adds:

1. User registration and login
2. Admin invitation flow
3. Per-user gallery authorization
4. "My Galleries" client dashboard

This phased approach means clients can start using private galleries within days (Phase 1), while the full user system is built out over the following weeks (Phase 2).

---

## 4. Phase 1: Per-Gallery Password Hardening (Detailed Plan)

### 4.1 Backend Changes

**Already done (no changes needed)**:
- `password_hash` column exists
- `ClientGalleryAuthService` with BCrypt + HMAC tokens exists
- `POST /{slug}/access` and `GET /{slug}?accessToken=` work

**Needs work**:

1. **Uncomment password update in `CollectionProcessingUtil`** (lines 555-565)
   - Wire `CollectionUpdateRequest.password` field through the update path
   - When password is set: hash with BCrypt, store in `password_hash`
   - When password is cleared (empty string or null with explicit flag): set `password_hash = NULL`

2. **Add rate limiting to `POST /{slug}/access`**
   - Use a simple in-memory rate limiter (Bucket4j or Guava RateLimiter)
   - Limit: 5 attempts per IP per slug per 15 minutes
   - Return `429 Too Many Requests` when exceeded
   - Log failed attempts for monitoring

3. **Return `accessToken` as `Set-Cookie` header** instead of JSON body
   - `Set-Cookie: gallery_access_{slug}=<token>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`
   - Modify `GET /{slug}` to read from `Cookie` header in addition to `accessToken` query param
   - This prevents JavaScript from reading/leaking the token

### 4.2 Frontend Changes

1. **Admin collection manage page** -- add password field
   - Add a "Gallery Password" section to the collection edit form (only shown when `type === CLIENT_GALLERY`)
   - Input field with "Set Password" / "Clear Password" toggle
   - Sends `password` field in `CollectionUpdateRequest`

2. **Update `ClientGalleryGate` to use cookies instead of sessionStorage**
   - After successful `/access` POST, the backend sets the cookie automatically
   - The gate just needs to re-fetch the collection (with cookie attached) and check if content is present
   - Remove `sessionStorage` logic -- cookies persist across tabs and survive tab close
   - The 24-hour HMAC expiry still applies

3. **Add `middleware.ts`** (optional but recommended)
   - Intercept requests to `/{slug}` routes
   - Check for `gallery_access_{slug}` cookie
   - If collection is `CLIENT_GALLERY` and cookie is missing, could redirect to a login page
   - However, this requires knowing which slugs are client galleries at the edge, which complicates things
   - **Recommendation**: Skip middleware for Phase 1. The `ClientGalleryGate` component is sufficient.

### 4.3 Security Considerations for Phase 1

| Threat | Mitigation |
|--------|------------|
| Brute-force password guessing | Rate limiting (5 attempts / 15 min / IP / slug) |
| Token theft via XSS | `httpOnly` cookie (JS cannot read it) |
| Token replay after expiry | 24h HMAC expiry baked into token |
| Token valid for wrong gallery | HMAC payload includes slug |
| Password stored in plaintext | BCrypt hashing (already implemented) |
| Timing attacks on password comparison | BCrypt's `matches()` is constant-time |
| Content visible in HTML source before gate | Backend strips `content` from response when token invalid (already implemented) |
| SEO indexing of private content | Backend returns collection metadata but no content without token (search engines see the shell but not photos) |
| Direct image URL access | **Not mitigated in Phase 1** -- CloudFront URLs are still public if someone has the URL. Phase 2 can add signed URLs. |

---

## 5. Phase 2: Per-User Authentication (Detailed Plan)

### 5.1 Database Schema

```sql
-- V10__gallery_users.sql

-- Guest users who can access client galleries
CREATE TABLE gallery_user (
    id          BIGSERIAL PRIMARY KEY,
    email       VARCHAR(255) NOT NULL UNIQUE,
    name        VARCHAR(100),
    password_hash VARCHAR(255),          -- BCrypt hash, NULL until user sets password
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Which users can access which galleries
CREATE TABLE gallery_user_access (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES gallery_user(id) ON DELETE CASCADE,
    collection_id   BIGINT NOT NULL REFERENCES collection(id) ON DELETE CASCADE,
    granted_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    granted_by      VARCHAR(100),        -- admin identifier
    UNIQUE(user_id, collection_id)
);

-- Invitation tokens (for email links)
CREATE TABLE gallery_invitation (
    id              BIGSERIAL PRIMARY KEY,
    email           VARCHAR(255) NOT NULL,
    collection_id   BIGINT NOT NULL REFERENCES collection(id) ON DELETE CASCADE,
    token           VARCHAR(255) NOT NULL UNIQUE,  -- random URL-safe token
    expires_at      TIMESTAMP NOT NULL,
    accepted_at     TIMESTAMP,                     -- NULL until used
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gallery_user_email ON gallery_user(email);
CREATE INDEX idx_gallery_user_access_user ON gallery_user_access(user_id);
CREATE INDEX idx_gallery_user_access_collection ON gallery_user_access(collection_id);
CREATE INDEX idx_gallery_invitation_token ON gallery_invitation(token);
CREATE INDEX idx_gallery_invitation_email ON gallery_invitation(email);
```

### 5.2 Backend API Endpoints

#### Public (guest-facing)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/read/auth/login` | Email + password login, returns JWT in httpOnly cookie |
| `POST` | `/api/read/auth/logout` | Clears the JWT cookie |
| `GET`  | `/api/read/auth/me` | Returns current user info + authorized gallery slugs |
| `POST` | `/api/read/auth/accept-invite` | Accept invitation: `{ token, password }` -- creates/updates user, sets password |
| `POST` | `/api/read/auth/forgot-password` | Sends password reset email |
| `POST` | `/api/read/auth/reset-password` | Reset password: `{ token, newPassword }` |

#### Admin (invitation management)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/admin/gallery-users/invite` | `{ email, collectionId }` -- creates invitation, sends email |
| `GET`  | `/api/admin/gallery-users` | List all gallery users with their access |
| `DELETE` | `/api/admin/gallery-users/{userId}/access/{collectionId}` | Revoke access |
| `DELETE` | `/api/admin/gallery-users/{userId}` | Deactivate user |

#### Modified existing endpoints

| Method | Path | Change |
|--------|------|--------|
| `GET` | `/api/read/collections/{slug}` | Accept JWT cookie as alternative to `accessToken` query param |
| `GET` | `/api/read/collections` | Optionally filter to show user's authorized galleries |

### 5.3 JWT Strategy

Use a **self-issued JWT** (not Cognito). The backend already has `spring-security-crypto` and the HMAC infrastructure.

```
Header: { "alg": "HS256", "typ": "JWT" }
Payload: {
  "sub": "user@example.com",
  "userId": 42,
  "slugs": ["smith-wedding-2026", "jones-portraits"],
  "iat": 1711700000,
  "exp": 1711786400   // 24 hours
}
```

- Signed with the same `app.access-token.secret` used for gallery HMAC tokens
- Stored in `httpOnly; Secure; SameSite=Strict` cookie named `gallery_session`
- Backend validates on every request to protected collections
- No refresh tokens needed -- 24h is fine for gallery viewing. Users re-login when expired.

Why not Cognito:
- The project's backend is a self-hosted Spring Boot app, not a serverless/Amplify app
- Adding Cognito means two auth systems (internal secret filter + Cognito JWT verification)
- The gallery auth use case is simple enough that self-issued JWTs are appropriate
- Avoids AWS vendor lock-in for a core feature

### 5.4 Email (AWS SES)

The backend is already on AWS (EC2, S3, CloudFront). AWS SES is the natural choice:

- **Cost**: $0.10 per 1,000 emails. For a photography portfolio, this is effectively free.
- **Setup**: Verify the sending domain (`edens.zac` or a subdomain), add SES SDK to pom.xml
- **Templates**: Simple HTML email with invitation link. No complex template engine needed.

Email content for invitation:
```
Subject: You've been invited to view a gallery on Zac Eden Photography

Hi {name},

You've been invited to view "{collectionTitle}".

Click below to set your password and access the gallery:
{baseUrl}/gallery-access/accept?token={invitationToken}

This link expires in 7 days.

-- Zac Eden Photography
```

### 5.5 Frontend Routes and Components

#### New routes

| Route | Type | Description |
|-------|------|-------------|
| `/gallery-access/login` | Page (Server Component) | Email + password login form |
| `/gallery-access/accept` | Page (Server Component) | Accept invitation -- set password form (reads `?token=`) |
| `/gallery-access/forgot-password` | Page (Server Component) | Forgot password form |
| `/gallery-access/reset-password` | Page (Server Component) | Reset password form (reads `?token=`) |
| `/gallery-access/my-galleries` | Page (Server Component) | List of galleries the user has access to |

All pages under `/gallery-access/` to keep them grouped. These are simple forms -- no heavy client-side state needed.

#### Modified components

| Component | Change |
|-----------|--------|
| `ClientGalleryGate` | Check for JWT cookie (via `/auth/me` call) before showing password form. If user is logged in and authorized, skip the gate. Fall back to per-gallery password if no JWT. |
| `CollectionPageWrapper` | Pass auth context to gate |
| `SiteHeader` | Show "My Galleries" link and "Logout" button when gallery user is logged in |

#### New API functions (`app/lib/api/auth.ts`)

```typescript
export async function login(email: string, password: string): Promise<{ success: boolean }>;
export async function logout(): Promise<void>;
export async function getCurrentUser(): Promise<GalleryUser | null>;
export async function acceptInvitation(token: string, password: string): Promise<{ success: boolean }>;
export async function forgotPassword(email: string): Promise<void>;
export async function resetPassword(token: string, newPassword: string): Promise<{ success: boolean }>;
```

### 5.6 Auth Flow Diagram

```
ADMIN INVITES USER:
  Admin UI -> POST /admin/gallery-users/invite { email, collectionId }
           -> Backend creates invitation record
           -> Backend sends email via SES with accept link
           -> User clicks link

USER ACCEPTS INVITATION:
  /gallery-access/accept?token=abc123
           -> Frontend reads token, shows "set password" form
           -> User submits { token, password }
           -> POST /auth/accept-invite
           -> Backend validates token, creates/updates gallery_user,
              creates gallery_user_access, sets JWT cookie
           -> Redirect to /gallery-access/my-galleries

USER VIEWS GALLERY:
  User visits /{slug} (e.g., /smith-wedding-2026)
           -> CollectionPageWrapper fetches collection
           -> ClientGalleryGate checks JWT cookie via GET /auth/me
           -> If authorized for this slug: render gallery
           -> If not authorized: show "login or enter password" prompt

RETURNING USER:
  /gallery-access/login
           -> User submits { email, password }
           -> POST /auth/login
           -> Backend validates, sets JWT cookie
           -> Redirect to /gallery-access/my-galleries
```

---

## 6. Security Considerations (Both Phases)

### 6.1 Attack Vectors and Mitigations

| Attack | Phase 1 Mitigation | Phase 2 Mitigation |
|--------|--------------------|--------------------|
| **Brute force** | Rate limit 5/15min/IP/slug | Rate limit + account lockout after 10 failures |
| **Credential stuffing** | N/A (no user accounts) | Rate limit per IP across all endpoints |
| **XSS token theft** | httpOnly cookie | httpOnly cookie + CSP headers |
| **CSRF** | SameSite=Strict cookie | SameSite=Strict + CSRF token on forms |
| **Session hijacking** | 24h expiry | 24h expiry + IP binding (optional) |
| **Enumeration (valid slugs)** | All slugs return 200 (content stripped) | Same -- don't reveal which galleries are protected |
| **Direct image URL access** | Not mitigated (CloudFront URLs are public) | CloudFront signed URLs (see 6.2) |
| **SQL injection** | Parameterized queries (already used) | Same |
| **Timing attacks** | BCrypt + constant-time HMAC | Same |

### 6.2 CloudFront Signed URLs (Future -- Phase 3)

Currently, once someone knows a CloudFront image URL (e.g., `https://d1234.cloudfront.net/images/photo.webp`), they can access it directly regardless of gallery auth. This is acceptable for Phase 1-2 because:

- Image URLs are not guessable (they contain UUIDs or hashed filenames)
- URLs are only served to authenticated users in the API response
- The risk is limited to someone who was once authorized sharing a direct link

For full protection, CloudFront supports signed URLs or signed cookies:
- Backend generates time-limited signed URLs when serving content to authenticated users
- CloudFront rejects requests without valid signatures
- This adds latency (URL generation) and complexity (key pair management)
- **Recommend deferring to Phase 3** unless a client specifically requests it

### 6.3 Password Policy

Enforce on both frontend and backend:
- Minimum 8 characters
- No maximum (BCrypt handles long passwords, though truncates at 72 bytes)
- No complexity requirements (length is more important than complexity)
- Check against common password list (top 10,000) on the backend

---

## 7. Migration and Rollout Strategy

### Phase 1 Rollout (Per-Gallery Passwords)

1. **Backend**: Uncomment password update logic, add rate limiting, switch to cookie-based tokens
2. **Frontend**: Build admin password UI, update ClientGalleryGate for cookies
3. **Test**: Create a test CLIENT_GALLERY collection, set password, verify gate works
4. **Deploy**: Standard deploy -- no migration needed (DB column already exists)
5. **Use**: Admin sets passwords on client galleries via manage page, sends password to clients manually (email, text, etc.)

### Phase 2 Rollout (Per-User Auth)

1. **Backend**: Create Flyway migration for new tables, build auth endpoints, integrate SES
2. **Frontend**: Build login/registration pages, update gate component
3. **Test**: Full invitation flow end-to-end
4. **Deploy**: Flyway handles schema migration automatically
5. **Transition**: Existing per-gallery passwords continue to work alongside user auth. The `ClientGalleryGate` checks both:
   - Is the user logged in with a JWT and authorized for this gallery? -> grant access
   - Otherwise, show the password form (existing behavior)
6. **Gradual migration**: Admin can invite users to galleries while keeping the shared password as a fallback. Once all clients are on user accounts, the shared password can be cleared.

### Backwards Compatibility

- Phase 2 does not break Phase 1. Per-gallery passwords remain functional.
- No existing public routes are affected. Only CLIENT_GALLERY collections get the auth gate.
- The `visible` flag on collections is orthogonal to auth -- invisible collections are hidden from listings but still accessible by slug (with auth if protected).

---

## 8. Effort Estimates

| Phase | Backend | Frontend | Testing | Total |
|-------|---------|----------|---------|-------|
| **Phase 1**: Per-gallery password hardening | 1 day | 1-2 days | 0.5 day | 2-3 days |
| **Phase 2**: Per-user auth | 4-5 days | 4-5 days | 2 days | 10-12 days |
| **Phase 3**: CloudFront signed URLs | 2 days | 1 day | 1 day | 3-4 days |

---

## 9. Open Questions

1. **Email provider**: AWS SES is the recommendation, but is the domain already verified in SES? If not, verification takes 24-72 hours.
2. **Admin auth**: The admin panel currently uses the `InternalSecretFilter` shared secret. Should the admin also get proper login, or is the current secret-header approach sufficient?
3. **Multiple galleries per user**: Should the invitation flow allow inviting a user to multiple galleries at once, or one-at-a-time?
4. **Download tracking**: Is download tracking a requirement for Phase 2, or a separate feature? (The `ClientGalleryDownload` component exists but seems incomplete.)
5. **Gallery expiration**: Should client gallery access expire after a period (e.g., 90 days after the event)? This would be a field on `gallery_user_access`.
6. **Password for per-gallery vs per-user**: In Phase 2, should the per-gallery password be removed entirely, or kept as a simpler alternative for galleries that don't need per-user tracking?

---

## 10. Files Referenced

### Frontend (`edens.zac`)

- `app/components/ClientGalleryGate/ClientGalleryGate.tsx` -- existing password gate component
- `app/lib/components/CollectionPageWrapper.tsx` -- server component that wraps CLIENT_GALLERY with gate
- `app/lib/api/collections.ts` -- `validateClientGalleryAccess()` function
- `app/lib/api/core.ts` -- API layer with read/write/admin endpoint routing
- `app/types/Collection.ts` -- `CollectionModel.isPasswordProtected`, `CollectionType.CLIENT_GALLERY`
- `app/[slug]/page.tsx` -- dynamic collection route
- `amplify/auth/resource.ts` -- Cognito stub (unused)

### Backend (`edens.zac.backend`)

- `src/.../services/ClientGalleryAuthService.java` -- password validation + HMAC token generation
- `src/.../services/CollectionProcessingUtil.java` -- BCrypt `hashPassword()` / `passwordMatches()`, commented-out password update (lines 555-565)
- `src/.../controller/prod/CollectionControllerProd.java` -- `POST /{slug}/access`, `GET /{slug}` with token check
- `src/.../entity/CollectionEntity.java` -- `passwordHash` field
- `src/.../config/InternalSecretFilter.java` -- existing admin auth (shared secret)
- `src/.../types/CollectionType.java` -- `CLIENT_GALLERY` enum value
- `src/main/resources/db/migration/V5__password_and_indices.sql` -- added `password_hash` column
