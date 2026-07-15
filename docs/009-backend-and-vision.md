# 009 · Backend Contract & Auth Vision

> The frontend↔backend contract, the still-missing endpoints, and the long-horizon access-control design · 🟢 active / 🔭 vision

This chapter is the bridge to the `edens.zac.backend` repo. The **contract** half is the living handoff: what the frontend now expects, which endpoints are confirmed, and — most importantly — which endpoints are still missing and blocking shipped-but-dark frontend features. The **vision** half is the long-horizon ABAC (really RBAC + one resource scope) access-control design: per-user accounts, admin MFA, client passkeys, DB-backed sessions. It is explicitly **not approved for build** — it is the umbrella the chapter-003 client-gallery Phase-2 items roll up into.

## Remaining work (deduped)

**Still-missing backend endpoints (blockers):**

- `GET /content/images/search` — the keystone. Multi-dimensional image search; unblocks chapter [004 · content discovery](004-content-discovery.md) search + server-side filtering.
- Public `locations` and public `lenses` read endpoints (filter dropdowns).
- `POST /collections/{id}/auto-tag`.

**ABAC vision — sequenced Foundation → Admin → Client → Tagging:**

- **Phase F · Foundation — SHIPPED** (`0186-auth-foundation`): `app_user`, `user_session`, `gallery_access`, `webauthn_credential`, `SessionAuthenticationFilter`, `/api/auth/me`, DB-backed sessions + passkeys. Ships dormant (no client users yet). _Since then: `gallery_access` was dropped in V36 (`user_collection` replaced it), and the 2026-07-06 spike below proved passkey login never worked e2e._
- **Phase C · Client — SHIPPED**: the [009 · User Concept](superpowers/specs/009-user-concept.md) spec executed via the 2026-06-22 plan — Selects/user pages are live; person↔account FK link and `gallery_access` enforcement (logged-in password bypass; carried by `user_collection` since V36) shipped alongside the `/user` synthetic-collection page. **Note:** a Rating control shipped as part of this slice and was then **deliberately removed** (`fa5516b`) — don't restore it without re-litigating why.
- **Still vision (not approved):** admin MFA (TOTP → passkey, Phase A), client tagging + moderation (Phase T), CloudFront signed URLs. The chapter-003 Phase-2 items roll up here.

**Person→User identity merge — SHIPPED** (Phases 1+2, [#194](https://github.com/themancalledzac/edens.zac/pull/194)/[#195](https://github.com/themancalledzac/edens.zac/pull/195)/[#196](https://github.com/themancalledzac/edens.zac/pull/196)): the backend's `Person` and `User` concepts were unified into a single `users` table — the same identity now carries both "person tagged in photos" and "account with login" semantics, and it's the path that fed the `is_admin` column 0203's authz gate depends on. Two watch-outs mined from the identity-merge handoff (recorded nowhere else in this chapter, so keep them here):

- The `Records.Person(id, name)` DTO shape is a hard constraint — legacy `Person` API consumers expect exactly that shape; don't widen it casually when touching merge-adjacent code.
- **Never `SELECT *` on `users` for tag queries** — the merged table carries auth-sensitive columns (password/session material) that must not leak into tag/people-list responses.

**2026-07-06 review wave (three new reference docs):**

- **Logged-in user flow — as-built review:** the [logged-in user-flow review](superpowers/specs/2026-07-06-logged-in-user-flow-review.md) inventories every logged-in surface and pins the edit-permission matrix to the 2026-07-06 decision — **user edits mutate canonical values; there is no per-user overlay** — plus a concrete FUTURE `user_change_log` design (admin hub panel: notify badge / accept / revert / edit; the panel itself will live on the [008](008-collection-admin.md) admin surface). Its user-tables review found **`gallery_access` was dropped in V36** (`user_collection` GENERAL|CLIENT is the whole access model) and the **V34 rating-override backend stack is orphaned** (D1 recommends deletion). Also covers group-access UX (bulk-grant over `user_collection` first), email-flow UX, and passkey-enrollment UX. Decisions D1–D8.
- **Email/SES production posture:** the [email/SES production posture](superpowers/specs/2026-07-06-email-ses-production.md) doc pins that **nothing sends today** (`email.enabled` defaults false; invite links are clipboard-copy; the sole call site is the gallery-password email; the from-address is a non-deliverable placeholder), then lays out the ordered console checklist (domain identity + Easy DKIM in us-west-2, MAIL FROM/SPF, DMARC `p=none`, configuration set + SNS bounce handling, sandbox-exit request text included), code changes C1–C10 (S/M/L-sized), and decisions 1–6.
- **Passkey login — diagnosed broken e2e (spike):** the [passkey login diagnosis](spikes/2026-07-06-passkey-login-diagnosis.md) verified a 4-layer root cause — the attempt-cookie (`Path=/api/auth/webauthn`) never survives the BFF proxy so login/finish always 401s (**passkeys have never worked end-to-end anywhere**); no enrollment surface exists for password-only accounts; prod serves `rpId=localhost` (compose lacks `WEBAUTHN_*` passthrough); and the shared login limiter compounds it. Fixes implemented on `0211-passkey-login-fixes` (FE: `/user` AccountCard enrollment, flow-keyed login errors, invite-failure surfacing) + `0211-passkey-login-fixes-be` (BE: cookie `Path=/`, compose env plumb) — **PRs pending**. Follow-up: a credentials list/remove backend endpoint for enrollment-state UI.

## Sections

| Section                                                                                  | Role                                       | Status                                |
| ---------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------- |
| [009 · ABAC Access Control](superpowers/specs/009-abac-access-control.md)                | Long-horizon design                        | 🔭 vision                             |
| [009 · User Concept](superpowers/specs/009-user-concept.md)                              | Phase-C slice — build spec                 | ✅ shipped                            |
| [Logged-in user-flow review](superpowers/specs/2026-07-06-logged-in-user-flow-review.md) | As-built review + `user_change_log` design | 📘 (D1–D8)                            |
| [Email/SES production posture](superpowers/specs/2026-07-06-email-ses-production.md)     | Go-live checklist + code changes           | 📘 (C1–C10; decisions 1–6)            |
| [Passkey login diagnosis](spikes/2026-07-06-passkey-login-diagnosis.md)                  | Spike — root cause + fixes                 | 📘 (`0211` fix branches, PRs pending) |

> The original **009 · Backend Handoff** contract doc (2026-03-16) is archived — its confirm/fix asks are long resolved and its endpoint gaps are folded into "Still-missing backend endpoints" above.

## Blocked on / open

- Every endpoint above is owned by the **backend** repo — this chapter tracks the need, not the implementation. Phase 1 of the handoff (confirm/fix existing contracts) can start immediately; the search endpoint is the highest-leverage new build.
- ABAC stays in design until explicitly greenlit, **phase by phase**. Greenlit so far: Phase F and Phase C (both shipped). Phases A and T remain vision-only.

---

_↑ [Back to the book](000-summary.md)._
