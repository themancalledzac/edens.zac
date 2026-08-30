/**
 * Filter derivations for the public `/search` surface.
 *
 * Search is the only gallery view with no scope of its own. A collection page is already narrowed
 * to one collection and a taxonomy page to one tag or location, so each of those surfaces wires a
 * subset of the dimensions and gets its own criteria builder (see `buildCollectionCriteria` and
 * `buildLocationCriteria`). Search starts from everything, which makes it the one surface that
 * wants every dimension at once — the collection builder's six array dimensions plus the location
 * builder's film/digital toggle.
 *
 * These live here rather than beside the other two in `contentFilter.ts` deliberately: that file is
 * the shared filter domain and is queued under several larger board items, and nothing outside
 * `/search` needs this composition.
 */

import { type FilterState, INITIAL_FILTER_STATE } from '@/app/types/GalleryFilter';
import {
  buildCollectionCriteria,
  type ContentFilterCriteria,
  filmFilterFromIsFilm,
} from '@/app/utils/contentFilter';

/**
 * How many images the route pulls from the backend to search over.
 *
 * Explicit because `searchImages` omits `size` entirely when it is not passed, which leaves the
 * page at the mercy of whatever the backend's default page size happens to be — a silent cap is
 * the failure mode that would make this page quietly wrong rather than visibly slow. Filtering
 * then runs client-side over this corpus, matching how the location and tag pages already work.
 *
 * 200 is the backend's own ceiling, not a preference: `/content/images/search` rejects anything
 * larger with `searchImages.size: must be less than or equal to 200`. Asking for more does not
 * return fewer results, it returns none — the whole route 500s into its error boundary. Raising
 * this is a backend change first.
 *
 * It is therefore a real ceiling rather than a page size: beyond it, results are absent rather
 * than paginated. Genuine pagination is a backend conversation, not a config value.
 */
export const SEARCH_RESULT_LIMIT = 200;

/**
 * Criteria for the search page: every array dimension the collection page uses, plus the
 * film/digital toggle the taxonomy pages use.
 *
 * Array dimensions inherit the collection builder's `AND` match modes, which is the semantic a
 * search surface wants — picking a second tag should narrow the result, not widen it.
 */
export function buildSearchCriteria(filterState: FilterState): ContentFilterCriteria {
  return {
    ...buildCollectionCriteria(filterState),
    ...(filterState.filmFilter === 'film' ? { isFilm: true as const } : {}),
    ...(filterState.filmFilter === 'digital' ? { isFilm: false as const } : {}),
  };
}

/**
 * Seed the toolbar's state from criteria parsed off the URL, so a shared or reloaded `/search`
 * link opens with its filters already applied.
 *
 * `selectedLenses` is absent on purpose rather than by oversight: `FILTER_PARAM_KEYS` has no lens
 * key, so `serializeFilterToParams` never writes one and `parseFilterFromParams` never reads one.
 * A lens choice is live for the session but cannot survive a reload on any surface in the repo.
 * Restoring it is a shared-serializer change, tracked as one of SD3's stragglers.
 */
export function seedFilterState(criteria: ContentFilterCriteria): FilterState {
  return {
    ...INITIAL_FILTER_STATE,
    highlyRatedOnly: criteria.minRating !== undefined && criteria.minRating >= 4,
    filmFilter: filmFilterFromIsFilm(criteria.isFilm),
    selectedTags: criteria.tags ?? [],
    selectedPeople: criteria.people ?? [],
    selectedCameras: criteria.cameras ?? [],
    selectedLocations: criteria.locations ?? [],
    selectedDates: criteria.dates ?? [],
  };
}
