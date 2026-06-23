# 004 · Content Discovery & Filtering

> Letting visitors (and admins) slice the image catalog by location, people, tags, camera, and rating · collection-tags frontend + location bar partially shipped, search backend-blocked.

This chapter covers the public-facing ways to find images: a future `/search` route, the live Location-page filter bar, and collection-level tagging on the manage page. The throughline is a single reusable filter-bar/chip component — the location bar proved the pattern in Phase 1, and Search, Person, Tag, and Collection views should all reuse it rather than each rebuilding filters from scratch.

## Remaining work (deduped)

- Build ONE reusable filter-bar/chip component shared across Search / Location / Person / Tag / Collection — don't rebuild per page.
- `/search` public route: `SearchPage` server component + `SearchFilters` client component + `searchImages()` API fn + `SearchParams` type + nav link + error/loading/empty states. ⛔ Blocked on backend `GET /content/images/search` (and `GET /content/locations` for the location dropdown).
- Location filter bar Phase 2/3: tag/people/camera chip rows, dynamic option counts (`Canon R5 (47)`), removable active-filter badges + Clear-all, focal-length range.
- Collection tags: ✅ **frontend Phase 1 merged ([PR #167](https://github.com/themancalledzac/edens.zac/pull/167), `0165`)** — a shared `TagsSelector` (extracted from the image editor's `TagsPeopleSection`, reused on the manage page) + `tagUtils` (`convertTagsToModels`/`createTagsUpdate`) + `buildUpdatePayload` wiring; backend `TagUpdate` persistence confirmed. Remaining: the auto-tag endpoint + "Auto-populate from images" button (Phase 2, backend), and optional tag-chip display on the public collection page.

## Sections

| Section                                                                  | Role | Status                                             |
| ------------------------------------------------------------------------ | ---- | -------------------------------------------------- |
| [Public Search Page](superpowers/plans/004-public-search-page.md)        | plan | ⛔                                                 |
| [Location Page Filter Bar](superpowers/plans/004-location-filter-bar.md) | plan | 🟡                                                 |
| [Collection Tags](superpowers/plans/004-collection-tags.md)              | plan | 🟡 (FE Phase 1 shipped; auto-tag + display remain) |

## Blocked on / open

- Public Search Page is fully blocked until the backend ships `GET /api/read/content/images/search` (primary) plus `GET /api/read/content/locations` and (optionally) `/lenses` read endpoints. Everything else in the chapter is unblocked.

---

_↑ [Back to the book](000-summary.md)._
