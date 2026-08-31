# AU — Auth & accounts

_Context file for board items AU1–AU4 on [2026-features.md](../2026-features.md)._

## AU1 · Self-serve password reset

Plan: `docs/superpowers/plans/2026-08-10-auth-password-reset.md` (gitignored), re-verified
2026-08-30 — no forgot/reset route exists under `app/`, no `purpose` field, and
`app/invite/[token]/page.tsx:54` still calls `notFound()` on expiry.

Key finding that stands: a reset mechanism already exists as the invite subsystem
(`user_invite`, V32 — hashed single-use tokens, expiry, redeem, session mint, SES send;
`UserInviteService.regenerateInvite` doubles as reset). The work:

- Backend V55: a `purpose` column on `user_invite` (chosen over TTL-only parameterization so the
  page can render the right copy); per-purpose TTL — 1 hour for reset vs `INVITE_TTL_DAYS = 7`
- Reset-specific email copy (`sendInviteEmail` currently says "You've been invited")
- `purpose` on `InvitePreview` so `/invite/[token]` distinguishes account setup from password
  choice
- A public, rate-limited forgot-password entry point (route + backend trigger). Note PF7/007's
  rate-limit generalization: `application.properties:79-80` is contact-specific today — a second
  public endpoint needs the per-path rate-limit map first or alongside
- Reverse the expiry behavior from `notFound()` to a `/login` redirect, docblock explaining why

The only reset path today is admin-side (`app/lib/api/users.ts`, `GenerateInviteButton.tsx`).
Cross-repo: the V55 half gets a backend-board row when picked up.

## AU2 · Passkey credential list + revoke + enrollment-state UI

One gap named in three places (`docs/009`, `docs/handoffs/CURRENT-STATE.md` §5, the backend
board's Decisions section). Verified 2026-08-30: `WebAuthnController.java` has exactly four
mappings — `register/start` (`:93`), `register/finish` (`:110`), `login/start` (`:140`),
`login/finish` (`:185`). `WebAuthnCredentialRepository` has insert/find/updateSignCount, no
delete. A compromised authenticator can only be handled by disabling the whole account.

Blocked on the shape decision (board decision #4): admin endpoint, user-facing list-and-remove, or
both. After the endpoint: the FE enrollment-state UI (009's item — FE and BE login fixes are
merged; the UI needs the credentials list). Also open nearby, from CURRENT-STATE: no prod startup
guard against `rpId=localhost`; passkey login has never been e2e-verified against a deployed
environment.

## AU4 · Local admin dev-session affordance

Backend #243 (merged 2026-08-30) removed the `app.admin.enforce-authz` toggle:
`SecurityConfig.java:75-76` now gates `/api/admin/**` behind `hasRole('ADMIN')` unconditionally in
every profile (`/api/edit/**` likewise behind `hasRole('USER')`). The frontend's three anonymous
local layers still pass, so local `/admin` renders but every data fetch 401s. The refactor board's
G6 **shipped 2026-08-31 as PR #351** and fixed the now-false `CLAUDE.md` Critical Rule.

**Re-scoped 2026-08-31 (6): documentation, not capability.** The paragraph that used to sit here
said this was "packaging an existing flow" out of `ADMIN_BOOTSTRAP_EMAIL` /
`ADMIN_BOOTSTRAP_PASSWORD` + `POST /api/auth/login`. Those ingredients do not combine.
`AdminBootstrap.java:50-63` uses the password only to seed a user that does not exist yet; for an
existing account it flips `is_admin`, logs "already admin but ADMIN_BOOTSTRAP_PASSWORD is still
set", and returns without ever setting a password. `docker exec edenszacbackend-backend-1 printenv`
shows the variable present and empty, so there is nothing to substitute even if it did work.

**The login form at `/login` already works, and always did.** `application-dev.properties:9` sets
`app.auth.cookie-secure=false`, so `ezac_session` survives plain http; the BFF re-emits
`Set-Cookie` to the browser (`app/api/proxy/[...path]/route.ts:178-181`, pinned by
`tests/api/proxy/route.test.ts:34`); sessions last 60 days. The friction was discoverability —
nothing said a login was needed, and the panels hang on "Loading users…" rather than reporting the 401.

**Do not build a dev-only session-minting route**, which was one of the options listed here. The
backend has no local database: port 5432 is an autossh tunnel to the production EC2, and the
container's `SPRING_DATASOURCE_URL` is `host.docker.internal:5432/edens_zac`. Such a route would
mint production admin sessions from an unauthenticated localhost endpoint. For the same reason an
agent cannot self-serve a session here, and should not try — the only working password is the
owner's own.

**What ships instead:** the README's Getting Started gains a "Working on admin pages" section
covering the login step and the production-database warning. That is the whole item.

## Deferred by design (no rows — do not resurrect without a decision)

- **ABAC Phase A** (admin MFA + admin-from-anywhere): `mfa_satisfied` is surfaced in `MeResponse`
  with zero frontend consumers. Vision, explicitly not approved.
- **ABAC Phase T** (client tagging + moderation): the write path behind MA6.
- The `009-abac-access-control.md` spec is stale (built around the deleted `gallery_access`
  table); read §8/§11/§15 as historical.
- Backend V34 per-user rating-override stack: the FE half was deliberately removed (`fa5516b`,
  recorded in `previous-work.md` "so it doesn't get restored"); the backend stack should be
  deleted when someone is in that area (logged-in-flow review §1.7).

## Closed

### ✅ AU3 · Enforce `UserStatus.DISABLED` — closed 2026-08-31 with no work; already shipped upstream

The item's own first step was "confirm S-1 hasn't shipped." It had. Run, not re-read, on 2026-08-31:

- Backend board `ai_docs/reviews/2026-08-22-backend-cleanup-spike.md:200` —
  `- [x] **S-1** (HIGH) UserStatus.DISABLED enforced nowhere in the auth path — #192, 2026-08-24.`
- Confirmed in source rather than only in the ledger: `AuthController.java:80` refuses login unless
  `SessionService.mayHoldSession(maybeUser.get().getStatus())`, and `SessionService.java:175`
  re-checks the same predicate when a session is used.

CURRENT-STATE §5's "disabling an account does not prevent it logging in" has therefore been false
since 2026-08-24, and this row spent a week advertising a fixed bug as the most serious open item.

**The lesson is about the row, not the bug.** An item whose first step is "confirm X hasn't already
shipped" reads as available work until someone spends the one command. Where the premise lives in
another repo's ledger, re-run that check at close-out rather than at pickup — same cost, and it
stops the board offering work that no longer exists.
