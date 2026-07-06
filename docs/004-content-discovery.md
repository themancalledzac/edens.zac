# 004 · Content Discovery & Filtering

> Letting visitors (and admins) slice the image catalog by location, people, tags, camera, and rating · collection-tags frontend + location bar partially shipped, search backend-blocked.

This chapter covers the public-facing ways to find images: a future `/search` route, the live Location-page filter bar, collection-level tagging on the manage page, and the Collection IA (tag-view routing + save/follow). The throughline is a single reusable filter-bar/chip component — the location bar proved the pattern in Phase 1, and Search, Person, Tag, and Collection views should all reuse it rather than each rebuilding filters from scratch.

## ✅ Collection IA (shipped)

**A1 — unified tag-view routing** ([#198](https://github.com/themancalledzac/edens.zac/pull/198)/[#200](https://github.com/themancalledzac/edens.zac/pull/200)) shipped `/{slug}` as the single routing surface for both collections and tag-views, MenuDropdown Home/Me entries, and tag chips. **A3 — Save-as-Collection** ([#199](https://github.com/themancalledzac/edens.zac/pull/199)) shipped from the manage-list row, alongside Track C saves/follows and the `/user` redesign. **Deferred by design:** A2 dynamic Home, Track D automation (auto-related, CLIP auto-tag). The living target-model spec is [2026-06-29-collection-ia-and-user-flow-design](superpowers/specs/2026-06-29-collection-ia-and-user-flow-design.md) — consult it for the full end-state, not just what shipped.

## Remaining work (deduped)

- Build ONE reusable filter-bar/chip component shared across Search / Location / Person / Tag / Collection — don't rebuild per page.
- `/search` public route: `SearchPage` server component + `SearchFilters` client component + `searchImages()` API fn + `SearchParams` type + nav link + error/loading/empty states. ⛔ Blocked on backend `GET /content/images/search` (and `GET /content/locations` for the location dropdown).
- Location filter bar Phase 2/3: tag/people/camera chip rows, dynamic option counts (`Canon R5 (47)`), removable active-filter badges + Clear-all, focal-length range.
- Collection tags: ✅ **frontend Phase 1 merged ([PR #167](https://github.com/themancalledzac/edens.zac/pull/167), `0165`)** — a shared `TagsSelector` (extracted from the image editor's `TagsPeopleSection`, reused on the manage page) + `tagUtils` (`convertTagsToModels`/`createTagsUpdate`) + `buildUpdatePayload` wiring; backend `TagUpdate` persistence confirmed. Remaining: the auto-tag endpoint + "Auto-populate from images" button (Phase 2, backend), and optional tag-chip display on the public collection page.
- ✅ **Unified filter-visibility gate — shipped** (`canFilter`/`computeFilterVisibility`, 35/35 plan tasks; plan archived).
- Menu-dropdown nav & discovery: **Option A shipped** (Home/Me live in `MenuDropdown`, delivered via the Collection IA work above); **Option C** (`/explore` as a real drill-down explorer) still open.
- **Breadcrumb mount-or-drop** — `app/components/Breadcrumb/Breadcrumb.tsx` exists but is unmounted; decide whether to wire it into `CollectionPageClient` or delete it.
- **Verify people/location chip-click-to-filter** — confirm content-renderer chips route to `/{tagSlug}` / `/location/{slug}` as designed.
- **A3 Spot-1** — Save-as-Collection button on the tag-view page itself (blocked on rendering tag-views through the collection editor; see `TODO(A3)` in `useCollectionEdit.tsx`).

## Sections

| Section                                                                  | Role | Status                                             |
| ------------------------------------------------------------------------ | ---- | -------------------------------------------------- |
| [Public Search Page](superpowers/plans/004-public-search-page.md)        | plan | ⛔                                                 |
| [Location Page Filter Bar](superpowers/plans/004-location-filter-bar.md) | plan | 🟡                                                 |
| [Collection Tags](superpowers/plans/004-collection-tags.md)              | plan | 🟡 (FE Phase 1 shipped; auto-tag + display remain) |
| [Collection IA & user-flow (living spec)](superpowers/specs/2026-06-29-collection-ia-and-user-flow-design.md) | spec | 📘 (A1/A3 shipped; A2/Track D deferred)            |
| [Menu-dropdown nav & discovery](superpowers/specs/2026-06-10-menu-dropdown-nav-design.md) | spec | ✅ Option A shipped · Option C open                |

## Blocked on / open

- Public Search Page is fully blocked until the backend ships `GET /api/read/content/images/search` (primary) plus `GET /api/read/content/locations` and (optionally) `/lenses` read endpoints. Everything else in the chapter is unblocked.
- Breadcrumb mount-or-drop, people/location chip-click verification, and A3 Spot-1 are open follow-ups from the Collection IA ship (see above).

---

_↑ [Back to the book](000-summary.md)._
