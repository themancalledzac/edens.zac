# 009 · Backend Contract & Auth Vision

> The frontend↔backend contract, the still-missing endpoints, and the long-horizon access-control design · 🟢 active / 🔭 vision

This chapter is the bridge to the `edens.zac.backend` repo. The **contract** half is the living handoff: what the frontend now expects, which endpoints are confirmed, and — most importantly — which endpoints are still missing and blocking shipped-but-dark frontend features. The **vision** half is the long-horizon ABAC (really RBAC + one resource scope) access-control design: per-user accounts, admin MFA, client passkeys, DB-backed sessions. It is explicitly **not approved for build** — it is the umbrella the chapter-003 client-gallery Phase-2 items roll up into.

## Remaining work (deduped)

**Still-missing backend endpoints (blockers):**

- `GET /content/images/search` — the keystone. Multi-dimensional image search; unblocks chapter [004 · content discovery](004-content-discovery.md) search + server-side filtering.
- Public `locations` and public `lenses` read endpoints (filter dropdowns).
- Collection-download ZIP stream (`GET /collections/{slug}/download`).
- Secure content-gating for password-protected galleries — server-side session/token so content isn't returned until access is validated (today the gate is client-side only).
- `POST /collections/{id}/auto-tag`.

**ABAC vision — sequenced Foundation → Admin → Client → Tagging:**

- **Phase F · Foundation — SHIPPED** (`0186-auth-foundation`): `app_user`, `user_session`, `gallery_access`, `webauthn_credential`, `SessionAuthenticationFilter`, `/api/auth/me`, DB-backed sessions + passkeys. Ships dormant (no client users yet).
- **Phase C · Client — first slice GREENLIT**: the [009 · User Concept](superpowers/specs/009-user-concept.md) spec — person↔account FK link, `gallery_access` enforcement (logged-in password bypass), and the `/user` synthetic-collection page. Invite/onboarding still deferred.
- **Still vision (not approved):** admin MFA (TOTP → passkey, Phase A), client tagging + moderation (Phase T), CloudFront signed URLs. The chapter-003 Phase-2 items roll up here.

## Sections

| Section                                                                   | Role                       | Status      |
| ------------------------------------------------------------------------- | -------------------------- | ----------- |
| [009 · Backend Handoff](superpowers/specs/009-backend-handoff.md)         | API-contract reference     | 📘 contract |
| [009 · ABAC Access Control](superpowers/specs/009-abac-access-control.md) | Long-horizon design        | 🔭 vision   |
| [009 · User Concept](superpowers/specs/009-user-concept.md)               | Phase-C slice — build spec | 🟢 approved |

## Blocked on / open

- Every endpoint above is owned by the **backend** repo — this chapter tracks the need, not the implementation. Phase 1 of the handoff (confirm/fix existing contracts) can start immediately; the search endpoint is the highest-leverage new build.
- ABAC stays in design until explicitly greenlit, **phase by phase**. Greenlit so far: Phase F (shipped) and the Phase-C [User Concept](superpowers/specs/009-user-concept.md) slice (spec approved 2026-06-22, plan pending). Phases A and T remain vision-only.

---

_↑ [Back to the book](000-summary.md)._
