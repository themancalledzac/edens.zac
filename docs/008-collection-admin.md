# 008 · Collection / Admin

> Admin-side collection management — the **consolidated edit-mode overhaul** (shipped) + the staging workflow (next) · 🟢 active

This chapter covers admin-facing collection management. Its center of gravity is the **`0179` edit-mode overhaul** (shipped, below): the bespoke dark `/manage` route was collapsed into an in-place, mobile-first edit mode on the real collection page, and the 2,027-line `ManageClient` god-component was deleted in favour of a single `useCollectionEdit` hook. The one remaining open feature is the **staging collection**: a system collection that automatically parents drafts, mirroring the existing "Home" system-collection pattern, so they have a single home instead of floating loose. Its upload-path half already ships in the backend; the rest was re-specced against the typeless-collection model (see [Remaining work](#remaining-work)).

## ✅ Shipped (archived → [previous-work.md](previous-work.md))

- **Consolidated Edit Mode & Mobile-First Admin** ([#181](https://github.com/themancalledzac/edens.zac/pull/181), `0179`, merged 2026-06-10) — the single biggest admin-side architectural change in the project's recent history. The dark `/collection/manage/[slug]` page was **relocated into a light, in-place edit mode on the public `/[slug]` route** (`?manage=1` searchParam, soft-nav, parked to local-dev via `isLocalEnvironment()`); **`ManageClient` (2,027 LoC) deleted** for one `useCollectionEdit` hook + one context-aware `EditBar` primitive + inline tap-to-edit + a minimal `CreateCollectionForm`; the edit layer is **dynamically imported** so the public bundle ships zero admin code. Phases 1–2 (LAN dev-API fix, surface-aware `ui/` primitives, edit-bar/dialog a11y) landed with it.
- **Collections parent column + type-grouped accordion + drag-to-retype** ([#167](https://github.com/themancalledzac/edens.zac/pull/167), `0165`) — a Parent toggle column, collapsible `CollectionType` accordion sections, `parents` on `CollectionListModel`/`CollectionUpdate`, `COLLECTION_TYPE_ORDER`/`ASSIGNABLE_COLLECTION_TYPES` constants, and drag-a-row-onto-a-type-header optimistic retype (`useCollectionRetype`, single-flight). _Partly **superseded** by the typeless migration ([#233](https://github.com/themancalledzac/edens.zac/pull/233)): the type constants, `useCollectionRetype` and drag-to-retype are **deleted** — retyping is meaningless without types. The Parent column and `parents` survive; the accordion survives re-keyed on `bucketOf()` (Home / Client Galleries / Blogs / Collections)._
- **Admin panel** — comments panel ([#197](https://github.com/themancalledzac/edens.zac/pull/197)); user management (invite onboarding [#187](https://github.com/themancalledzac/edens.zac/pull/187), Person→User merge UI, email-edit [#202](https://github.com/themancalledzac/edens.zac/pull/202)); **0203 admin-API authz** (`is_admin`, `hasRole(ADMIN)` gate on `/api/admin/**` — see [007](007-security-hardening.md) for the security half); **0204 root-view model** (impersonation removed, [#204](https://github.com/themancalledzac/edens.zac/pull/204) + BE #114, both merged 2026-07-06) — admin now navigates directly to `/admin/users/[id]` as a root/omniscient view rather than impersonating a user session.
- **`/user` ↔ `/admin/users/[id]` layout unification** — the 0204 follow-up, shipped across [#239](https://github.com/themancalledzac/edens.zac/pull/239), [#243](https://github.com/themancalledzac/edens.zac/pull/243) and [#251](https://github.com/themancalledzac/edens.zac/pull/251). Both routes now render the same `UserSpace` component; `/admin/users/[id]/page.tsx` passes `me={null}`, which disarms every personal-action control, and stacks `AdminUserSpaceEditor` above it. That one switch is also what made the share-recipient view need no new component.
- **Admin hub as a layout surface** — the panels became first-class blocks in the layout engine: shaped blocks + collapsible panels + `useCachedPanelData` ([#246](https://github.com/themancalledzac/edens.zac/pull/246)), the user rail ([#244](https://github.com/themancalledzac/edens.zac/pull/244)), the roles panel ([#245](https://github.com/themancalledzac/edens.zac/pull/245)), `AdminPanel` generalized into `ListPanel` ([#252](https://github.com/themancalledzac/edens.zac/pull/252)), and the collections list built on it ([#253](https://github.com/themancalledzac/edens.zac/pull/253)). One open trade-off remains, tracked in [005](005-layout.md): shared panel width versus page height.

Full commit-level detail in [previous-work.md](previous-work.md) ("Collections"); the detailed plans/specs are in `_archive/shipped-plans-2026-06-10.tar.gz`. _This overhaul retired the stale `ManageClient` work items that [003](003-client-gallery-security.md) (extract `GalleryAccessSection`) and [006](006-code-health.md) (decompose `ManageClient`) once listed._

## Remaining work

**Mobile-first admin Phase 3** 🟢 — rebuild every remaining editor surface on the **dark, white-framed** token foundation the spec commits to. Phases 1–2 + the consolidated edit-mode relocation shipped on `0179`; Phase 3 (the surface rebuilds) is the ongoing tail.

**`staging` system collection** 🟡 _(partly shipped; backend-heavy)_ — **re-specced 2026-07-28** against the typeless-collection model. The original spec was written entirely against `CollectionType.STAGING` and a `visible` boolean, and **neither exists any more**: the enum and `collection.type` were dropped (backend `V52__drop_collection_type.sql`), and `visible` was replaced by the 3-state `CollectionVisibility` back in V20. The feature itself survives — a system collection is now identified by its **slug**, exactly like Home.

_Already shipped (backend):_ a freshly uploaded collection is auto-linked to whatever row holds `slug = 'staging'` — `ImageUploadPipelineService.linkToStagingCollection` (`STAGING_COLLECTION_SLUG`), wrapped in its own try/catch so a metadata failure can't block staging, and a logged no-op when no such row exists. This is the enum-free version of the auto-parenting bullet, for the upload path only.

_Still open:_

- **Seed the row.** Nothing creates `staging` — the backend link is a no-op until an operator makes it by hand. A migration should create `slug='staging'` with a deliberate `visibility`; there is no type to set. **Open decision:** `HIDDEN` is dev-only (404s in prod for anyone without an explicit grant), `UNLISTED` is direct-slug-only. Pick one before writing the migration.
- **Auto-parent beyond upload.** Link on creation and on a visibility change into the draft state; unlink when it flips back to `LISTED`. Guard against self-reference and against parenting Home.
- **Visibility carve-out.** `CollectionService.enforceVisibility()` bypasses on `HOME_SLUG` alone. Decide whether `staging` needs the same slug bypass for admin reads, or whether its own `visibility` plus the `/api/admin/**` authz gate is already sufficient — the answer depends on the seed choice above.
- **Frontend veneer.** Manage-page badge for staged collections, keyed on the collection's `visibility` (and on membership in `staging`), never on a type. FE's `HOME_SLUG` lives in `app/utils/collectionSlugs.ts`; a `STAGING_SLUG` belongs beside it.

**Admin "user change log" panel** 🔭 _(future, cross-ref)_ — the notify-badge / accept / revert / edit review panel designed in the [logged-in user-flow review §4](superpowers/specs/2026-07-06-logged-in-user-flow-review.md) will live on this admin surface; the doc is owned by [009](009-backend-and-vision.md).

## Sections (active)

| Section                                                                                  | Role | Status                                                                                                                                |
| ---------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------- |
| [Mobile-first admin](superpowers/plans/2026-06-08-mobile-first-admin.md)                 | plan | ✅ `0179` (Phases 1–2; Phase 3 surfaces ongoing)                                                                                      |
| [Mobile-first admin — design](superpowers/specs/2026-06-08-mobile-first-admin-design.md) | spec | 📘 north-star (dark design language)                                                                                                  |
| [008 · Staging Collection](superpowers/plans/008-staging-collection.md)                  | plan | ⚠️ **stale** — written against the deleted `CollectionType`/`visible`; the [Remaining work](#remaining-work) list above supersedes it |

> **Shipped sections** (consolidated-edit-mode plan + spec, manage-consolidation-and-cleanup, parent-column-and-grouped-rows plan + spec, collection-type-drag-and-drop-retype plan + spec) are archived in `_archive/shipped-plans-2026-06-10.tar.gz` — recorded in [previous-work.md](previous-work.md).

## Blocked on / open

- None standalone — but the bulk of the remaining staging work lands in the `edens.zac.backend` repo (seed migration, `CollectionService` auto-association beyond the upload path, the `enforceVisibility` decision). The frontend side is just a `STAGING_SLUG` constant + the manage-page badge; there is no enum to align any more.

---

_↑ [Back to the book](000-summary.md)._
