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
  rate-limit generalization: `application.properties:81-82` (was `:79-80`; anchor on the `contact` rate-limit keys) is contact-specific today — a second
  public endpoint needs the per-path rate-limit map first or alongside
- Reverse the expiry behavior from `notFound()` to a `/login` redirect, docblock explaining why

The only reset path today is admin-side (`app/lib/api/users.ts`, `GenerateInviteButton.tsx`).
Cross-repo: the V55 half gets a backend-board row when picked up.

## AU2 · Passkey credential list + revoke + enrollment-state UI

**The admin endpoints exist — this section's 2026-08-30 verification grepped the wrong controller.**
`WebAuthnController.java` still has exactly four mappings (`register/start` `:93`,
`register/finish` `:110`, `login/start` `:140`, `login/finish` `:185`), but the list and revoke
live on the users controller: `GET /api/admin/users/{id}/passkeys` (`AdminUserController.java:419`)
and `DELETE /api/admin/users/{id}/passkeys/{credentialId}` (`:465`), on
`WebAuthnCredentialRepository.deleteByIdAndUserId` (`:108`). BE#257, merged 2026-08-31. The
backend board filed the missing consumer as **FE-4** the same day; the refactor board's **H7** is
the same finding. Three records for one feature; this row is the one that survives.

```bash
git grep -n 'passkeys' origin/main -- 'src/main/java/**/*Controller.java' | grep -c 'Mapping('   # 2
grep -rln 'passkeys' app/                                                                      # nothing — no caller
```

**Startable now, frontend-only:** a passkey list with a per-row Remove on `/admin/users/[id]`,
through the BFF. Removing an account's last passkey is allowed and, when the account has no
password, leaves it unable to log in until re-invited (`AdminUserController.java:436-456`; backend
S-28) — the UI says so before the delete. The response carries `remaining` and
`passwordLoginAvailable` for exactly that message. The page cannot be exercised locally without a
real login; mount with fixture props per the board's throwaway-route method.

**Still a decision (#4, narrowed):** whether a signed-in user gets a self-service list-and-remove
on `/user`. `/api/auth/webauthn/**` has register and login only, so that half is a backend handoff.
The enrollment-state UI (009's item) follows whichever list exists; `AccountCard.tsx` already
drives `registerPasskey`. Also open nearby, from CURRENT-STATE: no prod startup guard against
`rpId=localhost`; passkey login has never been e2e-verified against a deployed environment.

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

### ✅ AU4 · Local admin dev-session affordance — docs shipped in #383

There was no affordance to build; the `/login` form always worked. The item was re-scoped from
capability to documentation, and what shipped is the README's "Working on admin pages" section.

**Why `ADMIN_BOOTSTRAP_PASSWORD` is not the answer**, verified by running commands rather than
reading. `AdminBootstrap.java:50-63` uses it only to seed a user that does not yet exist; for an
account that already exists it flips `is_admin`, logs "already admin but ADMIN_BOOTSTRAP_PASSWORD
is still set", and returns without ever setting a password. It is also empty on this machine —
`docker exec edenszacbackend-backend-1 printenv` shows the variable present with no value.

**The flow that does work** is the existing login form. The dev profile sets
`app.auth.cookie-secure=false` (`application-dev.properties:9`) so `ezac_session` survives plain
http, and the BFF re-emits `Set-Cookie` to the browser
(`app/api/proxy/[...path]/route.ts:178-181`, pinned by `tests/api/proxy/route.test.ts:34`).
Sessions last 60 days. The friction was never a missing mechanism — nothing said a login was
needed, and the panels hang on "Loading users…" rather than reporting the 401.

**Do not build a dev-only session-minting route.** It was one of the options originally listed
here, and it is the one thing this item must prevent: against the database below, such a route
would mint production admin sessions from an unauthenticated localhost endpoint. For the same
reason an agent cannot self-serve a session here and should not try — the only working password is
the owner's own, which is correct and should not be engineered around.

**Its history is a case study in the board's own trap.** Run (7) recorded this SHIPPED on the
strength of #383 being _opened_. Run (8) caught that, and also found AU4 keeping an open section
beside this closed one. #383 then sat conflicting for two runs — and because GitHub builds
`refs/pull/N/merge` for a `pull_request` event, a conflicting PR has no merge ref and **its CI
never ran at all**. Not red, absent. A PR that has been open a while with no checks showing is
worth a second look, not a glance.

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
