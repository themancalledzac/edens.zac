# MA — Admin & manage surfaces

_Context file for board items MA1–MA6 on [2026-features.md](../2026-features.md)._

## MA1 · Manage rail restructure — the largest open item

Plan: `docs/superpowers/plans/2026-08-12-manage-rail-restructure-reconstructed.md` (gitignored),
verified UNBUILT 2026-08-30 — its Task 9 deletes `CollectionEditSheet.tsx`, `InfoTab.tsx`,
`StructureTab.tsx`, and all three still exist.

Approach B: replace the edit sheet's batch-save model with per-field optimistic PATCH commits into
an admin rail. Task 1 (backend `PATCH /collections/{id}`) was assigned to a sibling agent —
**verify it exists before starting; if absent it is the first MR and gets a backend-board row.**
The eleven frontend tasks:

1. `patchCollection` API util + `buildFieldPatch` (derive from the existing `buildUpdatePayload`)
2. `commitField` in `useCollectionEdit` — optimistic overlay, in-flight set, merge-reconcile,
   extracted `runLocationInheritance`, slug `router.replace`
3. Remove the batch layer: `manageMode:'edit'`, dirty tracking, staging buffer, Save/Cancel cells
4. `InlineEditableDate` (one control, two fields)
5. `InlineEditableLocations`
6. Rating moved into `titleAside`
7. `CollectionAdminRail` as `railExtras` content: Kind/Visibility, Tags, People, Collections,
   Access/Roles, Delete — the plan's largest single task
8. Delete `CollectionEditSheet.tsx`, `sections/InfoTab.tsx`, `sections/StructureTab.tsx` + 3
   stylesheets
9. Persist L/M/S density tier; reset-to-chronological cell in the reorder bar
10. Dead-code sweep: drop `FIXED` from `DisplayMode` (**coordinate with CT1, which needs to verify
    `FIXED`'s status first**), prune orphaned `CollectionUpdateRequest` fields (slug, rating,
    password, contentPerPage, people), resolve `TODO(A3)` at `useCollectionEdit.tsx:1571`
11. Test rewrite: `useCollectionEdit.buffer.test.tsx` pins the buffer-reseed policy this deletes

Prereqs merged: `railExtras` threads through `CollectionContentRenderer`; 0244/0245/0246/0247
landed; 0246/0247 repointed admin calls to `/api/edit` — the patch util must target the current
tier (read `lib/api/collections.ts` first).

**Collisions:** EM2 adds UI to `InfoTab` (which Task 8 deletes); `CollectionRolesSection` lives in
`sections/` and moves into the rail; the refactor board's F1 decomposes `useCollectionEdit.tsx`
along different lines. Sequence MA1 vs F1 deliberately — they rewrite the same 1,751-line file.
Wants its own sessions; do not start it as a run's second item.

## MA2 · `staging` system collection

The old plan (`008-staging-collection.md`) is superseded — its first task adds `STAGING` to the
deleted `CollectionType` enum. The concept survives (debloat review D3): a slug-driven system
collection that auto-parents drafts the way Home aggregates. Open, per
`docs/008-collection-admin.md:25-30`:

- Seed migration for the `slug='staging'` row — **blocked on decision #2: `HIDDEN` vs `UNLISTED`**
- Auto-parenting beyond the upload path (the upload half already ships backend-side)
- The `enforceVisibility()` slug-bypass carve-out call
- FE veneer: `STAGING_SLUG` beside `HOME_SLUG` in `app/utils/collectionSlugs.ts` (verified
  absent — zero `STAGING` hits in `app/`) + a manage-page badge

Backend-heavy; file the backend rows when picked up.

## MA3 · Mobile-first admin Phase 3 remainder

Shipped: the foundational pass, the dark/white-framed token layer (`globals.css`
`[data-surface='dark']` block), tabbed edit sheet, tabbed `MetadataModal`. Open surfaces from the
2026-06-08 design:

- §5.1 image-editor mobile layout (photo pinned, not crammed into the top 30% — the tab mechanism
  shipped, the layout did not)
- §5.2 manage page full-screen grid + morphing bottom bar
- §5.5 text-block editor: `TextBlockCreateModal/` was never migrated onto the primitives (raw
  `<select>/<textarea>/<button>` + hardcoded blue)

**The premise decision (board #5):** `app/(admin)/layout.tsx` deliberately deleted the admin-only
dark wiring, recording that a real dark mode belongs to the whole site behind a user preference.
The `[data-surface='dark']` tokens and `Modal` surface bridge survive as the mechanism. Settle
whether remaining Phase 3 work targets dark-admin, light-admin, or waits for site-wide dark.

## MA4 · Messages admin features

From `docs/007-security-hardening.md`'s "Housekeeping" — three independent slices, feature-shaped
despite the label: a PII retention TTL on stored messages (backend scheduled delete); mark-as-read
/ delete / search on the admin Comments page; an optional Discord/Slack webhook notify channel on
new messages (the richer alternative to EM3's email notification — pick one).

## MA5 · Admin collections list at 100×

From the similar-collections spike §8: backend-paged/filtered admin list (the 0216/0345 filter
machinery is the base), sort options (date, updated, count, rating), filter-by-kind (client /
blog / hub / filter-backed / suggested), and — once CT3 exists — a visible membership-source
distinction (curated / query-backed / suggested). Mechanical; schedule when the collection count
demands it.

## MA6 · User change log + non-admin canonical mutation path

From the 2026-07-06 logged-in-flow review §4, designed and 0% implemented. The governing decision:
logged-in users' edits (ratings, tags, people, descriptions) mutate canonical values; every
user-scoped mutation appends to a `user_change_log`; the admin gets a review surface with
notify-badge / accept / revert / edit-in-place (§4.3) plus notification/retention (§4.4). Today no
non-admin write path exists at all — every mutation is `/api/admin/**` behind `hasRole('ADMIN')`.
Also attached: §8.2 group/org tables, §8.3 invite/email state tracking (overlaps EM3's
`created_by`). Blocked on the review's §10 decisions; overlaps refactor-board H2b (labelled
metadata-section layout) per its sequencing note — settle together. Treat as a design adjudication
before any build.

## Closed

_Nothing yet._
