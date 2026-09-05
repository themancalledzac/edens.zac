# MA — Admin & manage surfaces

_Context file for board items MA1–MA6 on [2026-features.md](../2026-features.md)._

## MA1 · Manage rail restructure — the largest open item

Plan: `docs/superpowers/plans/2026-08-12-manage-rail-restructure-reconstructed.md` (gitignored),
verified UNBUILT 2026-08-30 — its Task 9 deletes `CollectionEditSheet.tsx`, `InfoTab.tsx`,
`StructureTab.tsx`, and all three still exist.

Approach B: replace the edit sheet's batch-save model with per-field optimistic PATCH commits into
an admin rail.

> **The "absent endpoint" blocker is a question, and it is ours to answer (2026-09-05).** No
> whole-collection `@PatchMapping` exists on the backend's `origin/main` — six PATCHes, all
> sub-resource or unrelated (`AdminController.java:234` `/content/images`, `:308`
> `/content/gifs/{id}`; `AdminUserController.java:329` `/{id}`; `MessagesControllerAdmin.java:70`
> `/{id}/read`; `EditController.java:52` `/collections/{collectionId}/rating`, `:94`
> `/collections/{collectionId}/images`):
>
> ```bash
> git grep -n -E '@PatchMapping\("/collections/\{(id|collectionId)\}"\)' origin/main -- src/main/java/ | wc -l   # 0
> ```
>
> But the backend board already holds this as **#22**, filed from MA1 on 2026-08-31 and corrected
> on 2026-09-01: both `PUT /collections/{id}` routes (`AdminController.java:112`,
> `EditController.java:70`) are already null-guarded partial updates — `{id, title}` changes the
> title and nothing else — and the row asks THIS board whether pointing `buildFieldPatch` at that
> PUT unblocks MA1. The frontend's `updateCollection` (`app/lib/api/collections.ts:252`) already
> calls that PUT and its docblock says "accepts partial updates".
>
> **The answer, recorded here and handed off in
> [backend-handoff-MA1-EM2.md](backend-handoff-MA1-EM2.md):** setting a field to a value works
> through the existing PUT today, so MR 1 is frontend. What the PUT cannot do is CLEAR a nullable
> field, because null means "unchanged" on that path — and MA1's per-field commits need to clear
> the description, the collection date and the location list. The backend's small piece is a clear
> semantics (an explicit-null marker or a `clear: [...]` list on the same PUT), not a new verb.
> MA1's frontend can start on the set-a-value path now; the clear path waits on that one change.
>
> Check the other repo's `origin/main`, never its checkout — its `.claude/worktrees/` copies
> produce convincing false positives for exactly this grep.

> **Ordering with refactor-board F1 (decided 2026-09-05): F1 lands first and leaves the
> update-form region (`seedUpdateData` → `handleUpdate`) untouched for MA1.** MA1's Tasks 2–3
> rewrite that region in place and must not re-inline the five hooks F1 extracts; MA1's Task 11
> rewrites `useCollectionEdit.buffer.test.tsx`, which F1 must leave green. The file is 1,811 lines
> at `699aa4f2`.

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
    password, contentPerPage, people). ~~resolve `TODO(A3)` at `useCollectionEdit.tsx:1571`~~ —
    **struck 2026-08-31 (4):** zero `TODO(A3)` hits in `app/`. `c1dd1d4` deleted the comment in
    its inline-comment sweep and `b66c39a` had already built what it asked for
    (`saveTagAsCollection` at `useCollectionEdit.tsx:1441` → `StructureTab.tsx:167` →
    `SaveAsCollectionModal`). Nothing left to resolve.
11. Test rewrite: `useCollectionEdit.buffer.test.tsx` pins the buffer-reseed policy this deletes

Prereqs merged: `railExtras` threads through `CollectionContentRenderer`; 0244/0245/0246/0247
landed; 0246/0247 repointed admin calls to `/api/edit` — the patch util must target the current
tier (read `lib/api/collections.ts` first).

**Collisions:** EM2 adds UI to `InfoTab` (which Task 8 deletes); `CollectionRolesSection` lives in
`sections/` and moves into the rail; the refactor board's F1 decomposes `useCollectionEdit.tsx`
along different lines. Sequence MA1 vs F1 deliberately — they rewrite the same 1,811-line file.
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

- ~~§5.1 image-editor mobile layout~~ — **MR open, [#386](https://github.com/themancalledzac/edens.zac/pull/386)**.
  The row's premise was wrong in an instructive way. "Crammed into the top 30%" is not what happens
  on a phone held upright: at 375x812 the strip is 160px, 19.7%, and the form gets 501px. The
  failure is a phone in LANDSCAPE. It is under 768px wide, so it takes the stacked branch, where
  the flat `160px` is **44.4% of a 360px viewport and leaves the form 49.5px** — about one and a
  half rows, under a 98px tab-and-action bar. Fixed by keying the layout switch on height as well
  as width, and making the stacked strip a fraction of the sheet rather than a fixed height.
  Measured, not reasoned: 740x360 form 49.5px -> 209.5px; 375x667 356.5 -> 383.1; 375x812
  501.5 -> 499.1; 1280x900 unchanged.

  **How it was measured, since the editor cannot be opened locally.** `/api/admin/**` 401s without
  a real session and the local backend can point at production, so signing in to look at a layout
  is the wrong trade. The real `MetadataModal` was mounted in a throwaway route under `app/` with
  fixture props, measured with `getBoundingClientRect()` at four viewports, and the route deleted
  before the commit. Reuse this for §5.2 and §5.5.

  **Reported, not fixed, in that MR:** the close `×` (`.closeButtonSlot`, `position: fixed`) sits
  inside the photo strip on the stacked layout. A square or 3:2 photo is centred and clears it; a
  panorama fills the strip's width and runs under a bare glyph with no scrim. `IconButton` has an
  `overlay` variant for this, but applying it changes the desktop look too, so it wants its own
  call.

- §5.2 manage page full-screen grid + morphing bottom bar — **the filter bar half shipped as
  [#392](https://github.com/themancalledzac/edens.zac/pull/392); the rest is NOT startable as
  written.** `.trailing` never shrinks and, with the manage view's density slider in it, measures
  220.7px; at 375px that left `.controls` 126.3px, narrower than one "Highly Rated" chip, so all
  six chips took a row each and the bar stood 230.6px tall. Wrapping below 768px with
  `flex-basis: 100%` on `.controls` — the pair is the fix, since the basis is what forces
  `.trailing` onto its own row instead of beside arbitrary chips. 360/375 230.6 -> 113.8;
  414 155.4 -> 113.8; 740x360 80.2 -> 76.2.

  **What is left needs a respec, not an implementation.** This section's §5.2 above puts the grid
  and the morphing bottom bar on a dark canvas ("rendered in manage mode on dark"). Decision #5
  removed admin-only dark and made a real dark mode site-wide (PF14), so that framing is void. The
  bottom bar is also a four-mode state machine across several components — several MRs even once
  respecified. Treat it as a design call for the user before anyone sizes it.

  **The method lesson, sharper than §5.1's.** §5.1 taught "measure it, do not reason from the
  stylesheet". This pass measured the defect and then still got the breakpoint wrong, setting it at
  480px on the plausible argument that wrapping would cost more than it saved at 740x360. That
  compared against a number that had been assumed rather than measured; forcing both states at ten
  widths showed wrapping never loses in the range. **Measure BOTH sides of a change, including the
  state you are replacing.** Also: a throwaway route in a `_`-prefixed folder never routes — the
  App Router treats those as private — so the first measurement run silently 404'd.

  **Reported, not fixed:** with two chip rows, `wrap-reverse` splits one dimension across rows and
  inverts its order ("Jul 19 · Jul 20 · Lens" above "Order · Highly Rated · Jul 18").
  `wrap-reverse` is deliberate and documented, so changing it is its own call; it only became
  visible once the bar stopped being one chip per row.

- ~~§5.5 text-block editor: `TextBlockCreateModal/` was never migrated onto the primitives (raw
  `<select>/<textarea>/<button>` + hardcoded blue)~~ — **CLOSED 2026-09-01 (10): the claim was
  false, and had been for three months.** `b81b6ad feat(ui): migrate TextBlockCreateModal to
surface-aware primitives` landed **2026-06-08** and is on `origin/main`. The component is
  `Modal` + `Field` + `Select` + `Textarea` + `Button` + `CloseButton` + `FormError`, and both
  files are entirely `var(--*)`:
  `grep -nE '<(select|textarea|button)[ >]|#[0-9a-fA-F]{3,6}|rgb\(' app/components/TextBlockCreateModal/*`
  → no matches.

  **The row was written the same day the migration landed and never reconciled**, which is the
  failure mode worth naming: a checklist item is only as good as its last verification, and this
  one survived three planning passes because every pass re-read it instead of re-running it. The
  "verified and holding" table exists for exactly this — §5.5 was never in it.

  Only one thing was actually stale, and it is fixed here: the component docblock claimed `Modal`
  "propagates the admin dark surface", which decision #5 removed from `app/(admin)/layout.tsx`.

**The premise decision (board #5):** `app/(admin)/layout.tsx` deliberately deleted the admin-only
dark wiring, recording that a real dark mode belongs to the whole site behind a user preference.
The `[data-surface='dark']` tokens and `Modal` surface bridge survive as the mechanism. Settle
whether remaining Phase 3 work targets dark-admin, light-admin, or waits for site-wide dark.

## MA4 · Messages admin features — only the notify channel remains

From `docs/007-security-hardening.md`'s "Housekeeping". Four of five slices shipped. The commands
that prove each are on the board row; re-run them before re-sizing anything here.

- **Retention TTL** — shipped OFF, backend [#281](https://github.com/themancalledzac/edens.zac.backend/pull/281)
  (backend board #26). `app.messages.retention.days` defaults to `0` (the nightly job returns before
  touching the database); `app.messages.retention.dry-run` defaults to `true` (logs the count,
  deletes nothing). Set `days`, read the count from the logs, then set `dry-run=false`. Two
  properties because the deletion is irreversible and a local backend can point at production.
  Configuration, not a control: no frontend half.
- **Delete** — shipped both ends before the item was picked up (`@DeleteMapping("/{id}")` at
  `MessagesControllerAdmin.java:85`, `useMessageDelete` with optimistic rollback).
- **Search** — client-side over the loaded page in #384 (merged 2026-09-01), replaced by
  server-side `?q=` in #396 (merged 2026-09-03). The `matchesQuery`/`useMemo` filter and the "N of M
  loaded" line are gone.
- **Mark-as-read** — backend BE#300, merged 2026-09-01: V61 `read_at TIMESTAMP NULL` with a partial
  index, `PATCH /api/admin/messages/{id}/read` (204/404, `COALESCE(read_at, NOW())` so re-marking is
  idempotent), `readAt` as a fifth component on `AdminMessageView`, `?unread=` and `?q=` sharing one
  WHERE clause. Frontend #396: `markMessageRead`, `useMessageRead`, the All/Unread/Read `Select` and
  the Unread badge on `/comments`. `MessagesPanel` on the hub does not opt in; what that would cost
  is on the board row.
- **Notify channel** — unbuilt. Either/or with EM3's owner email; decision #14 on the board.

**Do not fake read state with localStorage.** Per-browser, so wrong the moment the page opens on a
phone. Read status is server state, and since V61 it is.

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
