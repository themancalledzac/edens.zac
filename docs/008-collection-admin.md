# 008 · Collection / Admin

> Admin-side collection management — the **consolidated edit-mode overhaul** (shipped) + the staging workflow (next) · 🟢 active

This chapter covers admin-facing collection management. Its center of gravity is the **`0179` edit-mode overhaul** (shipped, below): the bespoke dark `/manage` route was collapsed into an in-place, mobile-first edit mode on the real collection page, and the 2,027-line `ManageClient` god-component was deleted in favour of a single `useCollectionEdit` hook. The one remaining open feature is the **staging collection**: a system collection that automatically parents any invisible (`visible=false`) collection, mirroring the existing "Home" system-collection pattern, so drafts have a single home instead of floating loose. That work is backend-heavy (enum value, seed migration, auto-parenting logic, visibility exemption) with a thin frontend veneer (manage-page badge).

## ✅ Shipped (archived → [previous-work.md](previous-work.md))

- **Consolidated Edit Mode & Mobile-First Admin** ([#181](https://github.com/themancalledzac/edens.zac/pull/181), `0179`, merged 2026-06-10) — the single biggest admin-side architectural change in the project's recent history. The dark `/collection/manage/[slug]` page was **relocated into a light, in-place edit mode on the public `/[slug]` route** (`?manage=1` searchParam, soft-nav, parked to local-dev via `isLocalEnvironment()`); **`ManageClient` (2,027 LoC) deleted** for one `useCollectionEdit` hook + one context-aware `EditBar` primitive + inline tap-to-edit + a minimal `CreateCollectionForm`; the edit layer is **dynamically imported** so the public bundle ships zero admin code. Phases 1–2 (LAN dev-API fix, surface-aware `ui/` primitives, edit-bar/dialog a11y) landed with it.
- **Collections parent column + type-grouped accordion + drag-to-retype** ([#167](https://github.com/themancalledzac/edens.zac/pull/167), `0165`) — a Parent toggle column, collapsible `CollectionType` accordion sections, `parents` on `CollectionListModel`/`CollectionUpdate`, `COLLECTION_TYPE_ORDER`/`ASSIGNABLE_COLLECTION_TYPES` constants, and drag-a-row-onto-a-type-header optimistic retype (`useCollectionRetype`, single-flight).
- **Admin panel** — comments panel ([#197](https://github.com/themancalledzac/edens.zac/pull/197)); user management (invite onboarding [#187](https://github.com/themancalledzac/edens.zac/pull/187), Person→User merge UI, email-edit [#202](https://github.com/themancalledzac/edens.zac/pull/202)); **0203 admin-API authz** (`is_admin`, `hasRole(ADMIN)` gate on `/api/admin/**` — see [007](007-security-hardening.md) for the security half); **0204 root-view model** (impersonation removed, FE `8689437` / BE `c39fe70`, pushed, **pending merge**) — admin now navigates directly to `/admin/users/[id]` as a root/omniscient view rather than impersonating a user session.

Full commit-level detail in [previous-work.md](previous-work.md) ("Collections"); the detailed plans/specs are in `_archive/shipped-plans-2026-06-10.tar.gz`. _This overhaul retired the stale `ManageClient` work items that [003](003-client-gallery-security.md) (extract `GalleryAccessSection`) and [006](006-code-health.md) (decompose `ManageClient`) once listed._

## Remaining work

**`/user` ↔ `/admin/users/[id]` layout unification** 🟢 _(0204 follow-up)_ — the two pages render user data with diverging layouts; visual/structural unification is the natural next step now that `/admin/users/[id]` is the admin's primary (root-view) surface.

**Mobile-first admin Phase 3** 🟢 — rebuild every remaining editor surface on the **dark, white-framed** token foundation the spec commits to. Phases 1–2 + the consolidated edit-mode relocation shipped on `0179`; Phase 3 (the surface rebuilds) is the ongoing tail.

**`STAGING` system collection** 🟢 _(backend-heavy)_:

- Add `STAGING` to `CollectionType` (backend enum + frontend `app/types/Collection.ts`).
- Seed a `staging` system collection via migration (`type=STAGING`, `slug=staging`, `visible=false`).
- Auto-parent any `visible=false` collection under Staging on visibility change (and on creation with `visible=false`); remove the association when it flips to `visible=true`. Guard against self-reference and against parenting Home.
- Exempt Staging from `enforceVisibility()` for admin reads (like Home); keep it invisible on public reads via its own `visible=false` flag.
- Manage-page badge / indicator for staged (invisible) collections.

**Admin "user change log" panel** 🔭 _(future, cross-ref)_ — the notify-badge / accept / revert / edit review panel designed in the [logged-in user-flow review §4](superpowers/specs/2026-07-06-logged-in-user-flow-review.md) will live on this admin surface; the doc is owned by [009](009-backend-and-vision.md).

## Sections (active)

| Section                                                                                  | Role | Status                                           |
| ---------------------------------------------------------------------------------------- | ---- | ------------------------------------------------ |
| [Mobile-first admin](superpowers/plans/2026-06-08-mobile-first-admin.md)                 | plan | ✅ `0179` (Phases 1–2; Phase 3 surfaces ongoing) |
| [Mobile-first admin — design](superpowers/specs/2026-06-08-mobile-first-admin-design.md) | spec | 📘 north-star (dark design language)             |
| [008 · Staging Collection](superpowers/plans/008-staging-collection.md)                  | plan | 🟢 next (backend-heavy)                          |

> **Shipped sections** (consolidated-edit-mode plan + spec, manage-consolidation-and-cleanup, parent-column-and-grouped-rows plan + spec, collection-type-drag-and-drop-retype plan + spec) are archived in `_archive/shipped-plans-2026-06-10.tar.gz` — recorded in [previous-work.md](previous-work.md).

## Blocked on / open

- None standalone — but the bulk of the staging work lands in the `edens.zac.backend` repo (enum, migration, `CollectionService` auto-association). The frontend side is just the enum alignment + manage-page badge.

---

_↑ [Back to the book](000-summary.md)._
