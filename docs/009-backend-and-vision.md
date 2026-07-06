# 009 · Backend Contract & Auth Vision

> The frontend↔backend contract, the still-missing endpoints, and the long-horizon access-control design · 🟢 active / 🔭 vision

This chapter is the bridge to the `edens.zac.backend` repo. The **contract** half is the living handoff: what the frontend now expects, which endpoints are confirmed, and — most importantly — which endpoints are still missing and blocking shipped-but-dark frontend features. The **vision** half is the long-horizon ABAC (really RBAC + one resource scope) access-control design: per-user accounts, admin MFA, client passkeys, DB-backed sessions. It is explicitly **not approved for build** — it is the umbrella the chapter-003 client-gallery Phase-2 items roll up into.

## Remaining work (deduped)

**Still-missing backend endpoints (blockers):**

- `GET /content/images/search` — the keystone. Multi-dimensional image search; unblocks chapter [004 · content discovery](004-content-discovery.md) search + server-side filtering.
- Public `locations` and public `lenses` read endpoints (filter dropdowns).
- `POST /collections/{id}/auto-tag`.

**ABAC vision — sequenced Foundation → Admin → Client → Tagging:**

- **Phase F · Foundation — SHIPPED** (`0186-auth-foundation`): `app_user`, `user_session`, `gallery_access`, `webauthn_credential`, `SessionAuthenticationFilter`, `/api/auth/me`, DB-backed sessions + passkeys. Ships dormant (no client users yet).
- **Phase C · Client — SHIPPED**: the [009 · User Concept](superpowers/specs/009-user-concept.md) spec executed via the 2026-06-22 plan — Selects/user pages are live; person↔account FK link and `gallery_access` enforcement (logged-in password bypass) shipped alongside the `/user` synthetic-collection page. **Note:** a Rating control shipped as part of this slice and was then **deliberately removed** (`fa5516b`) — don't restore it without re-litigating why.
- **Still vision (not approved):** admin MFA (TOTP → passkey, Phase A), client tagging + moderation (Phase T), CloudFront signed URLs. The chapter-003 Phase-2 items roll up here.

**Person→User identity merge — SHIPPED** (Phases 1+2, [#194](https://github.com/themancalledzac/edens.zac/pull/194)/[#195](https://github.com/themancalledzac/edens.zac/pull/195)/[#196](https://github.com/themancalledzac/edens.zac/pull/196)): the backend's `Person` and `User` concepts were unified into a single `users` table — the same identity now carries both "person tagged in photos" and "account with login" semantics, and it's the path that fed the `is_admin` column 0203's authz gate depends on. Two watch-outs mined from the identity-merge handoff (recorded nowhere else in this chapter, so keep them here):
- The `Records.Person(id, name)` DTO shape is a hard constraint — legacy `Person` API consumers expect exactly that shape; don't widen it casually when touching merge-adjacent code.
- **Never `SELECT *` on `users` for tag queries** — the merged table carries auth-sensitive columns (password/session material) that must not leak into tag/people-list responses.

## Sections

| Section                                                                   | Role                       | Status      |
| ------------------------------------------------------------------------- | -------------------------- | ----------- |
| [009 · ABAC Access Control](superpowers/specs/009-abac-access-control.md) | Long-horizon design        | 🔭 vision   |
| [009 · User Concept](superpowers/specs/009-user-concept.md)               | Phase-C slice — build spec | ✅ shipped |

> The original **009 · Backend Handoff** contract doc (2026-03-16) is archived — its confirm/fix asks are long resolved and its endpoint gaps are folded into "Still-missing backend endpoints" above.

## Blocked on / open

- Every endpoint above is owned by the **backend** repo — this chapter tracks the need, not the implementation. Phase 1 of the handoff (confirm/fix existing contracts) can start immediately; the search endpoint is the highest-leverage new build.
- ABAC stays in design until explicitly greenlit, **phase by phase**. Greenlit so far: Phase F and Phase C (both shipped). Phases A and T remain vision-only.

---

_↑ [Back to the book](000-summary.md)._
