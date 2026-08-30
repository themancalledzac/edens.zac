# SD — Search & discovery

_Context file for board items SD1–SD5 on [2026-features.md](../2026-features.md)._

## SD1 · The public `/search` route

**Status correction (2026-08-30, verified in source):** four docs call this backend-blocked
(`docs/004-content-discovery.md:29`, `docs/009-backend-and-vision.md`, `docs/000-summary.md`'s
"Backend blockers" block, the refactor board's roadmap #1). All three "missing" endpoints are live
in `ContentControllerProd.java`: `@GetMapping("/images/search")` at `:45` (returns
`ImageSearchResponse` via `contentService.searchImages`), `/locations` at `:129`, `/lenses` at
`:117` — plus `/tags`, `/people`, `/cameras`, `/film-metadata`. The FE API function
`searchImages()` exists at `app/lib/api/content.ts:128`, is used in production by
`app/location/[slug]/page.tsx:82` and `app/tag/[slug]/page.tsx:48`, and has tests at
`tests/lib/api/content.test.ts:74`.

What is genuinely missing — the whole of the work:

- `app/search/page.tsx` (server component; parse URL filter state, call `searchImages()`)
- A `SearchPage` client component wiring the shared `FilterToolbar` + `FilterState` system —
  the same machinery Location/Tag/Collection pages use; this satisfies 004's "one reusable
  filter-bar across surfaces" commitment for the search surface
- `error.tsx`, `loading.tsx`, an empty state
- A nav entry (the `MenuDropdown` already links Explore/Home/Me; where Search lands is a small
  design choice — do not block on SD4's bigger explore question)
- Tests per project rule

The old plan `docs/superpowers/plans/004-public-search-page.md` still claims blocked and its POC
paths never landed — treat this file, not the plan, as current. Est: 2–3 sittings (route + wiring,
then polish states + tests).

## SD2 · Backend: enrich `locations` on collection blocks

`SyntheticCollectionResolver.java` batch-loads tags only (docblock `:78`, `.withTags(...)` at
`:109`) and never enriches `locations`, so the location dimension of the shipped `/collections`
filter bar matches nothing. The FE is complete and waiting: `collectionRefMatchesCriteria` already
matches on locations. Mirror the tags batch-load with a `withLocations` wither. Secondary,
non-blocking: `convertCollectionContentToParallax` hard-codes `locations: []` on the card
(filtering runs pre-conversion). Source: `2026-08-05-collections-page-filter-bar-design.md` §4 and
`docs/004-content-discovery.md:28`. Cross-repo — file on the backend board when picked up.

## SD3 · Filter-bar dimension gaps

From the 004 location-filter-bar plan's unshipped tail, verified absent from
`app/types/GalleryFilter.ts` (state today: `selectedTags`, `selectedPeople`, `selectedCameras`,
`selectedLenses`, `selectedLocations`, `selectedDates`):

- Focal-length range filters (Wide/Normal/Tele)
- Film-stock secondary filter, conditional on Film active with 2+ stocks
- Year filter chips
- Active-filter summary with individually removable badges + "Clear all" (`resetAll` exists; the
  badge summary does not)
- Proportional layout algorithm merging short filter-bar rows

Related smaller stragglers from the 2026-08-02 consolidation follow-ups: restore `selectedLenses`
from the URL; optional per-date display labels ("Day 1 — Opening"). Each dimension is an
independent MR slice.

## SD4 · `/explore` as a real explorer — blocked on a design reconcile

`app/explore/page.tsx` is the flat Option-A directory page. Never built: Option C (`/explore` as a
cross-faceting drill-down explorer) and the in-dropdown three-level accordion (menu spec §6.2 —
the dropdown is a flat `NavLink` list; `MenuDropdown.tsx:294` has the ungated Explore entry). All
five §8 open questions from the menu spec remain (accordion vs panel slide, back affordance,
typeahead, keep-or-drop `/explore`, people in `getMetadata()`).

**The blocker:** refactor-board item H5 is a second, newer design review of `MenuDropdown`
(unblocked 2026-08-24, detail in `2026-summer-refactor/group-h-features.md`). Two design passes
over the same component must be reconciled before either is planned, or they will produce
competing designs. This is decision #10 on the board.

## SD5 · Verify chip-click-to-filter

Open verification task from `docs/004-content-discovery.md`: confirm people/location chips on
public pages actually apply filters when clicked. One browser pass on :3000; either close the item
or file what's broken as a concrete bug.

## Not here, deliberately

- Collection tags Phase 2 / auto-tag → CT5.
- The `/collections` page filter bar itself → shipped (#242/#243).
- Breadcrumb → shipped as a deliberate DROP (component deleted, refactor board Group A1). Still
  listed as open in `004:34` and `000` Next-steps #2 — both stale; do not re-ticket.

## Closed

_Nothing yet._
