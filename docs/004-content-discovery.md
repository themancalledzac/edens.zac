# 004 · Content Discovery & Filtering

> Letting visitors (and admins) slice the image catalog by location, people, tags, camera, and rating · collection-tags frontend + location bar partially shipped. Search is **no longer backend-blocked** — `searchImages()` and the public locations/lenses reads are live; the `/search` frontend route is just unbuilt.

This chapter covers the public-facing ways to find images: a future `/search` route, the live Location-page filter bar, and collection-level tagging on the manage page. The throughline is a single reusable filter-bar/chip component — the location bar proved the pattern in Phase 1, and Search, Person, Tag, and Collection views should all reuse it rather than each rebuilding filters from scratch.

## Remaining work (deduped)

- Build ONE reusable filter-bar/chip component shared across Search / Location / Person / Tag / Collection — don't rebuild per page.
- `/search` public route: `SearchPage` server component + `SearchFilters` client component + nav link + error/loading/empty states. **No longer backend-blocked** — `searchImages()` (`app/lib/api/content.ts`, hits `GET /api/read/content/images/search`) and `getLocations()`/`getLenses()` (`GET /api/read/content/locations` / `/lenses`) are all live. The remaining work is purely the frontend route + filter UI.
- Location filter bar Phase 2/3: tag/people/camera chip rows, dynamic option counts (`Canon R5 (47)`), removable active-filter badges + Clear-all, focal-length range.
- Collection tags: ✅ **frontend Phase 1 merged ([PR #167](https://github.com/themancalledzac/edens.zac/pull/167), `0165`)** — a shared `TagsSelector` (extracted from the image editor's `TagsPeopleSection`, reused on the manage page) + `tagUtils` (`convertTagsToModels`/`createTagsUpdate`) + `buildUpdatePayload` wiring; backend `TagUpdate` persistence confirmed. Remaining: the auto-tag endpoint + "Auto-populate from images" button (Phase 2, backend), and optional tag-chip display on the public collection page.

## Sections

| Section                                                                  | Role | Status                                             |
| ------------------------------------------------------------------------ | ---- | -------------------------------------------------- |
| [Public Search Page](superpowers/plans/004-public-search-page.md)        | plan | 🟡 (backend live; FE route unbuilt)                |
| [Location Page Filter Bar](superpowers/plans/004-location-filter-bar.md) | plan | 🟡                                                 |
| [Collection Tags](superpowers/plans/004-collection-tags.md)              | plan | 🟡 (FE Phase 1 shipped; auto-tag + display remain) |

## Blocked on / open

- The backend reads that Search needs — `GET /api/read/content/images/search`, `/content/locations`, `/content/lenses` — have **all shipped** and are wired in `app/lib/api/content.ts`. The Public Search Page is therefore unblocked; only the frontend `/search` route + filter UI remain unbuilt. The one genuinely-absent discovery endpoint is `POST /collections/{id}/auto-tag` (collection auto-tagging, Phase 2).

---

_↑ [Back to the book](000-summary.md)._
