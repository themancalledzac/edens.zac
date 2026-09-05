# 004 · Content Discovery & Filtering

> Letting visitors (and admins) slice the image catalog by location, people, tags, camera, and rating · collection-tags frontend + location bar shipped; `/search` shipped 2026-08-31 (feature board SD1).

This chapter covers the public-facing ways to find images: a future `/search` route, the live Location-page filter bar, collection-level tagging on the manage page, and the Collection IA (tag-view routing + save/follow). The throughline is a single reusable filter-bar/chip component — the location bar proved the pattern in Phase 1, and Search, Person, Tag, and Collection views should all reuse it rather than each rebuilding filters from scratch.

## ✅ Collection IA (shipped)

**A1 — unified tag-view routing** ([#198](https://github.com/themancalledzac/edens.zac/pull/198)/[#200](https://github.com/themancalledzac/edens.zac/pull/200)) shipped `/{slug}` as the single routing surface for both collections and tag-views, MenuDropdown Home/Me entries, and tag chips. **A3 — Save-as-Collection** ([#199](https://github.com/themancalledzac/edens.zac/pull/199)) shipped from the manage-list row, alongside Track C saves/follows and the `/user` redesign. **Deferred by design:** A2 dynamic Home, Track D automation (auto-related, CLIP auto-tag). The living target-model spec is [2026-06-29-collection-ia-and-user-flow-design](superpowers/specs/2026-06-29-collection-ia-and-user-flow-design.md) — consult it for the full end-state, not just what shipped.

## 📘 Collections-as-tags (design, 2026-07-06)

The proposed next evolution of the Collection IA: the [collections-as-tags design](superpowers/specs/2026-07-06-collections-as-tags-design.md) makes **collections saved tag-combination filters** — a presentation shell (slug / cover / description / `rows_wide`) plus an optional AND-tag query for membership, **materialized into the existing `collection_content` join** (new `source` column; `visible=false` doubles as the curated hide) with event-driven sync + a nightly reconcile. It generalizes — and inverts — the V39 tag→collection promotion: "Save as Collection" gains a live mode. It **supersedes D7/D8 of the [2026-06-29 living spec](superpowers/specs/2026-06-29-collection-ia-and-user-flow-design.md)**; the rest of that spec stands. Kind dispositions: parent hubs attach queries in place; client galleries and Home stay bespoke. Blog rides the same model: per-day `isBlog` collections keyed by an explicit `collection_date`, ISO-date slugs resolved by the existing `/{slug}` resolver, and a `/blog` stream route. Net-new backend work flagged: the AND-tag query, a BE→FE revalidation client, and a `FIXED` display mode. Decision matrix D1–D12 awaiting Zac's review. _⚠️ The spec was drafted **before** the typeless migration and still names the deleted `CollectionType` members throughout; read `PARENT`/`HOME` there as derived, `CLIENT_GALLERY`/`BLOG` as `isClient`/`isBlog`, and `PORTFOLIO`/`ART_GALLERY`/`MISC` as ordinary collections. Its D1–D12 matrix needs re-reading against the current model before review._

## ✅ Collections page filter bar (0243)

The [collections page filter bar design](superpowers/specs/2026-08-05-collections-page-filter-bar-design.md) brings `/collections` onto the same shared `FilterToolbar`/`FilterState` system as the rest of this chapter. **Shipped in 0243:** ordering that actually reaches collection tiles (`applySort` in `app/utils/sortContent.ts` — `isDateable` excludes collection cards by design, and `showDateSort` is image-derived, so `/collections` previously rendered **no Order chip at all** and could not be sequenced); an admin-only **Hidden** chip that renders SELECTED by default — reading as "non-public collections are showing", which is an admin's default — and which when switched OFF narrows the list to `LISTED` only, so an admin sees exactly what the general audience sees; and route consolidation — `/collections` gained `meServer()` and the redundant `/all-collections` route was deleted outright (the backend `all-collections` _slug_ remains). Tag/location filtering on tiles already worked via `collectionRefMatchesCriteria`.

Switching it off drops **both `UNLISTED` and `HIDDEN`**, mirroring the backend's anonymous scope (`LISTED` alone) in `SyntheticCollectionResolver#findAllCollectionsForCurrentViewer` — neither appears in a public list. `FilterState.showHidden` defaults to `true`, which also makes the scope a no-op on every page that never surfaces the chip. It is a **view** control, never an access control: the row scoping is the boundary, and it already runs server-side before anything is serialized.

**Rating-based ordering was cut** on review — the Order control stays date-only. Type grouping and view-count popularity remain deferred.

**Backend counterpart** (`edens.zac.backend`, branch `0243-collection-block-visibility`): `ContentModels.Collection` now carries `visibility`, populated on both the synthetic-list path (`fromCollectionModel`) and the real content-row path (`buildCollectionRecord`), and preserved through the `withTags`/`withOrderIndex` record copies. It is serialized **unconditionally for every viewer** — deliberately not role-gated, since the row scoping already decided what the viewer receives, a role-varying payload shape is a caching hazard, and a conditionally-omitted field would imply it is the access boundary and invite someone to relax the row query behind it.

## Remaining work (deduped)

- Build ONE reusable filter-bar/chip component shared across Search / Location / Person / Tag / Collection — don't rebuild per page.
- ✅ **Backend visibility on collection blocks — done** (`0243-collection-block-visibility`, backend PR #143), which activates the admin Hide-hidden chip. ✅ **`locations` (and `people`) on collection blocks shipped** — backend #277 and #293, 2026-08-31 (feature board SD2/SD7); the location dimension on `/collections` is live.
- ✅ `/search` public route **shipped** 2026-08-31 (feature board SD1, #357) — it was never backend-blocked; the endpoints were live. Still unlinked from the nav pending the `/explore` decision (SD4). Note: the search endpoint returns every image regardless of collection visibility (backend S-29, refactor board D15).
- Location filter bar Phase 2/3: chip rows and dynamic counts shipped; removable active-filter badges + Clear-all shipped (#373); year chips (#376) and film stock (#397) shipped; **focal-length range was built and dropped by the owner (#379) — do not rebuild.**
- Collection tags: ✅ **frontend Phase 1 merged ([PR #167](https://github.com/themancalledzac/edens.zac/pull/167), `0165`)** — a shared `TagsSelector` (extracted from the image editor's `TagsPeopleSection`, reused on the manage page) + `tagUtils` (`convertTagsToModels`/`createTagsUpdate`) + `buildUpdatePayload` wiring; backend `TagUpdate` persistence confirmed. Remaining: the auto-tag endpoint + "Auto-populate from images" button (Phase 2, backend), and optional tag-chip display on the public collection page.
- ✅ **Unified filter-visibility gate — shipped** (`canFilter`/`computeFilterVisibility`, 35/35 plan tasks; plan archived).
- Menu-dropdown nav & discovery: **Option A shipped** (Home/Me live in `MenuDropdown`, delivered via the Collection IA work above); **Option C** (`/explore` as a real drill-down explorer) still open.
- ✅ **Breadcrumb** — dropped and deleted (refactor board A1); the component no longer exists.
- ✅ **Chip-click-to-filter** — settled 2026-08-31 (feature board SD5): fullscreen tag chips now link to `/tag/{slug}` (#382); people chips wait on a person route (SD6, decision #17).
- ✅ **A3 Spot-1** — shipped (`b66c39a`): `saveTagAsCollection` in `useCollectionEdit` through `SaveAsCollectionModal`; the `TODO(A3)` comment is gone.

## Sections

| Section                                                                                                       | Role | Status                                                                                 |
| ------------------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------------------------- |
| [Public Search Page](superpowers/plans/004-public-search-page.md)                                             | plan | ⛔                                                                                     |
| [Location Page Filter Bar](superpowers/plans/004-location-filter-bar.md)                                      | plan | 🟡                                                                                     |
| [Collection Tags](superpowers/plans/004-collection-tags.md)                                                   | plan | 🟡 (FE Phase 1 shipped; auto-tag + display remain)                                     |
| [Collection IA & user-flow (living spec)](superpowers/specs/2026-06-29-collection-ia-and-user-flow-design.md) | spec | 📘 (A1/A3 shipped; A2/Track D deferred; D7/D8 superseded → collections-as-tags)        |
| [Collections-as-tags (design)](superpowers/specs/2026-07-06-collections-as-tags-design.md)                    | spec | 📘 (D1–D12 awaiting review)                                                            |
| [Menu-dropdown nav & discovery](superpowers/specs/2026-06-10-menu-dropdown-nav-design.md)                     | spec | ✅ Option A shipped · Option C open                                                    |
| [Collections page filter bar](superpowers/specs/2026-08-05-collections-page-filter-bar-design.md)             | spec | ✅ Shipped 0243 (rating sort cut) · BE visibility shipped (backend #143); chip is live |

## Blocked on / open

- Public Search Page is fully blocked until the backend ships `GET /api/read/content/images/search` (primary) plus `GET /api/read/content/locations` and (optionally) `/lenses` read endpoints. Everything else in the chapter is unblocked.
- Breadcrumb mount-or-drop, people/location chip-click verification, and A3 Spot-1 are open follow-ups from the Collection IA ship (see above).

---

_↑ [Back to the book](000-summary.md)._
