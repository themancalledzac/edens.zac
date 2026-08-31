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
G6 **shipped 2026-08-31 as PR #351** and fixed the now-false `CLAUDE.md` Critical Rule;
**this item builds the missing capability**: a sanctioned way to get a local admin session
(documented bootstrap login, seeded dev admin, or a dev-profile session mint). The corrected
rule already names the ingredients — `ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD` in
`docker-compose.yml` + `AdminBootstrap.java`, then `POST /api/auth/login` — so this is packaging
an existing flow, not inventing one. Without it, all local admin
development is broken for agents and slow for the user.

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

### ✅ AU4 · Local admin dev-session affordance — SHIPPED #383 as documentation

There was no affordance to build; the `/login` form always worked. Full write-up in
[au-auth-accounts.md](2026-features/au-auth-accounts.md).

**The one fact that must not get lost with the item: the local backend writes to production.**
Port 5432 is an autossh tunnel to the production EC2 (`ps aux | grep 'ssh.*5432'` →
`-L 5432:localhost:5432 ec2-user@<prod-ip>`), and the backend container's `SPRING_DATASOURCE_URL`
is `host.docker.internal:5432/edens_zac`. There is no local Postgres. Every admin mutation made at
localhost edits live production rows. This is repeated here rather than only in the archive because
it constrains **every** admin item on this board — MA1, MA2, MA3, MA4, MA5 and MA6 all mutate admin
data, and none of them should be tested by bulk-editing through the local admin UI.

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
