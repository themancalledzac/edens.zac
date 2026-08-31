# SD — Search & discovery

_Context file for board items SD1–SD5 on [2026-features.md](../2026-features.md)._

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

**Re-sized down after SD1 (2026-08-31).** SD1 proved these dimensions compose from existing tested
helpers rather than needing new machinery; each slice is well under a sitting.

**The lens gap is now confirmed and specified**, not just suspected. `FILTER_PARAM_KEYS`
(`app/utils/contentFilter.ts:670`) has no lens key, so `serializeFilterToParams` never writes one
and `parseFilterFromParams` never reads one — a lens choice is live for the session and cannot
survive a reload **on any surface in the repo**. `/search` documents and test-pins the gap
(`seedFilterState` leaves `selectedLenses` empty). Fixing it is a one-key change to the shared
serializer plus a seed line in each surface. Verified 2026-08-31: `selectedLenses` is still in
`FilterState` (`app/types/GalleryFilter.ts:36`), so the state side needs nothing.

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

**SD1 added a rider (2026-08-31).** `/search` shipped with **no nav entry** — deliberately, so it
would not pre-empt this decision. It is live and reachable only by typing the URL. Whatever `/explore`
becomes, this decision now also has to say where Search is linked from; adding the link is one line
in `MenuDropdown.tsx` (the Explore entry is at `:294`, re-verified 2026-08-31). Until then `/search`
is effectively unlisted, which is a real cost the decision should weigh.

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

### ✅ SD1 · The public `/search` route — PR #357, merged 2026-08-31

Shipped `app/search/` (page, `error.tsx`, `loading.tsx` + module) and
`app/components/SearchPage/` (`SearchPageClient.tsx`, `searchFilters.ts`). Real diff **+560 / −0
across 8 files**; suite 245 → 247 suites, 4478 → 4498 tests.

**The board's headline correction held exactly.** Nothing was backend-blocked. Every endpoint was
live and `searchImages()` was already in production use by the location and tag pages. Refs
re-verified on `main` at close-out and all four are still correct: `app/lib/api/content.ts:128`,
`app/location/[slug]/page.tsx:82`, `app/tag/[slug]/page.tsx:48`, `tests/lib/api/content.test.ts:74`.

**Estimate 2–3 sittings, actual 1.** The item was sized as if the filter machinery had to be built.
It did not — `FilterToolbar`, `useFilterUrlState`, `contentFilter.ts` and `EmptyState` all existed
and compose. **The correction that travels forward: an item whose whole content is "wire existing
tested primitives into a new route" is a one-sitting item on this repo, regardless of how many
files it touches.** SD3's per-dimension slices are the same shape and should be re-sized down; MA1
is NOT (it deletes and rewrites, it does not compose).

**Trap, and the one that matters most from this session: the backend caps `size` at 200.**
`/content/images/search` **rejects** a larger `size` — it does not truncate — so `size: 500` 400s
the API call and fails the whole route into its error boundary. **All 4497 tests passed with the
broken value**; nothing mocks the real validation, so no unit test could have caught it. Only the
browser check on `:3000` did. Now pinned in `tests/components/SearchPage/searchFilters.test.ts`.
Generalizes: **a numeric API parameter that no test exercises against the real backend needs either
a live check or a pinned bound.** RC2's `?limit=5` and MA5's paging are the next items with this
shape.

**Silver lining worth recording:** that failure was an unplanned live test of `error.tsx`, which
rendered its retry correctly rather than a blank page.

**Scope decisions.**

- **No nav entry.** Where Search belongs in the menu is part of SD4's `/explore` question, so
  `/search` is reachable by URL only. One-line follow-up once SD4 is decided — carried into SD4's
  section as a guardrail.
- **No `<Suspense>` wrapper.** `force-dynamic` makes it unnecessary and no sibling route has one;
  component-level Suspense stays PF8's.
- **No date dimension.** `extractFilterOptions` produces no dates and `computeFilterCounts` has no
  dates key; surfacing them is SD3's date work, not a free ride here.
- **`buildSearchCriteria` lives in `app/components/SearchPage/`, not `contentFilter.ts`.** It
  composes `buildCollectionCriteria` + the film toggle. Keeping it out of the shared filter domain
  avoids collision with MA1, SD3 and the refactor board's F1, all of which queue behind that file.

**What held (do not re-investigate).** The `FilterToolbar` dimension contract; `useFilterUrlState`'s
seed-once behaviour; `computeFilterVisibility` as the right gate for an unscoped surface. All three
were used as-is and behaved as documented.

**Tests were mutation-proved, not assumed.** Collapsing the two empty states, counting the corpus
instead of the filtered result, and dropping the film mapping each red the tests claiming to cover
them.
