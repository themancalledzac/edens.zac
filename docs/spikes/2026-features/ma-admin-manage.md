# MA — Admin & manage surfaces

_Context file for board items MA1–MA6 on [2026-features.md](../2026-features.md)._

## MA1 · Manage rail restructure — the largest open item

Plan: `docs/superpowers/plans/2026-08-12-manage-rail-restructure-reconstructed.md` (gitignored),
verified UNBUILT 2026-08-30 — its Task 9 deletes `CollectionEditSheet.tsx`, `InfoTab.tsx`,
`StructureTab.tsx`, and all three still exist.

Approach B: replace the edit sheet's batch-save model with per-field optimistic PATCH commits into
an admin rail. Task 1 (backend `PATCH /collections/{id}`) was assigned to a sibling agent.

> **BLOCKED as of 2026-08-31 — the prerequisite does not exist.** The row told the next session to
> verify before starting. It was verified, by running the command rather than re-reading the claim:
>
> ```bash
> git grep -n "PatchMapping(" origin/main -- 'src/main/java/**/controller/**'
> ```
>
> Five `@PatchMapping`s exist on the backend's `origin/main`, and **none of them is
> `PATCH /collections/{id}`**: `/content/images` and `/content/gifs/{id}` (`AdminController`
> `:233`, `:341`), `/{id}` on `AdminUserController:313`, and `/collections/{collectionId}/rating`
> and `/collections/{collectionId}/images` (`EditController:52`, `:94`). The last two are
> sub-resource patches, not the whole-collection field patch this item's `buildFieldPatch` needs.
>
> Checked against `origin/main` deliberately — the backend checkout was sitting on a working
> branch, and its `.claude/worktrees/` copies produce convincing false positives for exactly this
> grep.
>
> So the backend endpoint is **MR 1 of this item**, on the backend board, and every frontend task
> below waits on it. This is the whole reason MA1 is no longer COLD.

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

- §5.5 text-block editor: `TextBlockCreateModal/` was never migrated onto the primitives (raw
  `<select>/<textarea>/<button>` + hardcoded blue)

**The premise decision (board #5):** `app/(admin)/layout.tsx` deliberately deleted the admin-only
dark wiring, recording that a real dark mode belongs to the whole site behind a user preference.
The `[data-surface='dark']` tokens and `Modal` surface bridge survive as the mechanism. Settle
whether remaining Phase 3 work targets dark-admin, light-admin, or waits for site-wide dark.

## MA4 · Messages admin features

From `docs/007-security-hardening.md`'s "Housekeeping". Slice by slice as of 2026-08-31 (8):

- **Retention TTL — MR open**, backend [#281](https://github.com/themancalledzac/edens.zac.backend/pull/281).
  Ships OFF, and the first opt-in only reports. `app.messages.retention.days` defaults to `0` (the
  nightly job returns before touching the database) and `app.messages.retention.dry-run` defaults to
  `true` (logs the count it would delete, deletes nothing). Set `days`, read the count out of the
  logs, then set `dry-run=false`. Two properties rather than one because the deletion is
  irreversible — the contact form is the only writer, nothing archives what a purge removes — and a
  local backend can point at production, so the reporting mode is how you find out safely from the
  environment that actually holds the rows. Both guards mutation-proved.

  **This slice has no frontend half.** MA4's row reads BE+FE, but a retention TTL is configuration,
  not a control; there is nothing to render.

- **Delete** — already shipped, both halves (`@DeleteMapping("/{id}")`, `useMessageDelete`).
- **Search** — shipped as [#384](https://github.com/themancalledzac/edens.zac/pull/384).
- **Mark-as-read — blocked.** There is no read column on `messages`; `V17__create_messages_table.sql`
  is still the whole schema (`id`, `email`, `message`, `created_at`). Needs a backend migration
  first.
- **Discord/Slack notify channel** — still unbuilt, and still the either/or with EM3's email
  notification. Pick one before building either.

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
