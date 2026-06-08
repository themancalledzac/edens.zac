# 008 · Collection / Admin

> Admin-side collection management — the staging workflow · 🟢 active

This chapter covers admin-facing collection management. Its one open feature is the **staging collection**: a system collection that automatically parents any invisible (`visible=false`) collection, mirroring the existing "Home" system-collection pattern, so drafts have a single home instead of floating loose. The work is backend-heavy (enum value, seed migration, auto-parenting logic, visibility exemption) with a thin frontend veneer (manage-page badge).

## ✅ Recently shipped

- **Collections parent column + type-grouped accordion** — [PR #167](https://github.com/themancalledzac/edens.zac/pull/167) (`0165-collections-parent-column`). A Parent toggle column on the manage-page selector, rows grouped under collapsible `CollectionType` accordion sections (HOME pinned at top), `parents` wired onto `CollectionListModel`/`CollectionUpdate`, and `COLLECTION_TYPE_ORDER` + `ASSIGNABLE_COLLECTION_TYPES` constants next to the enum (`CollectionListSelector` +545 LoC). → [plan](superpowers/plans/2026-06-02-collections-parent-column-and-grouped-rows.md).
- **Collection-type drag-and-drop retype** — same PR. Drag a row onto a different type's section header to optimistically reassign its type via the colocated `useCollectionRetype` hook (single-flight; reverts + error banner on non-success), persisted through the existing `PUT /api/admin/collections/{id}`. → [plan](superpowers/plans/2026-06-03-collection-type-drag-and-drop-retype.md).
- **Manage-page design pass + tag/location-removal persistence fix** — same PR (`ad33940`, `6e5406c`).

## Remaining work (deduped)

- Add `STAGING` to `CollectionType` (backend enum + frontend `app/types/Collection.ts`).
- Seed a `staging` system collection via migration (`type=STAGING`, `slug=staging`, `visible=false`).
- Auto-parent any `visible=false` collection under Staging on visibility change (and on creation with `visible=false`); remove the association when it flips to `visible=true`. Guard against self-reference and against parenting Home.
- Exempt Staging from `enforceVisibility()` for admin reads (like Home); keep it invisible on public reads via its own `visible=false` flag.
- Manage-page badge / indicator for staged (invisible) collections.

## Sections

| Section                                                                 | Role | Status |
| ----------------------------------------------------------------------- | ---- | ------ |
| [008 · Staging Collection](superpowers/plans/008-staging-collection.md) | Plan | 🟢     |

## Blocked on / open

- None standalone — but the bulk of the work lands in the `edens.zac.backend` repo (enum, migration, `CollectionService` auto-association). The frontend side is just the enum alignment + manage-page badge.

---

_↑ [Back to the book](000-summary.md)._
