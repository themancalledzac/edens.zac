/**
 * Filter derivations for the public `/search` surface.
 */

import { type FilterState, INITIAL_FILTER_STATE } from '@/app/types/GalleryFilter';
import {
  buildCollectionCriteria,
  type ContentFilterCriteria,
  filmFilterFromIsFilm,
} from '@/app/utils/contentFilter';

/** Images fetched per search. 200 is the backend's hard cap — larger values 400. */
export const SEARCH_RESULT_LIMIT = 200;

/**
 * Criteria for the search toolbar: every array dimension the collection page uses, plus the
 * film/digital toggle. Array dimensions match `AND`, so picking a second value narrows.
 */
export function buildSearchCriteria(filterState: FilterState): ContentFilterCriteria {
  return {
    ...buildCollectionCriteria(filterState),
    ...(filterState.filmFilter === 'film' ? { isFilm: true as const } : {}),
    ...(filterState.filmFilter === 'digital' ? { isFilm: false as const } : {}),
  };
}

/**
 * Builds toolbar state from criteria parsed off the URL, so a shared `/search` link opens with
 * its filters applied. Lenses are still omitted because no URL key carries them — `lenses` is a
 * criteria field that `serializeFilterToParams` never emits, so a lens choice is not shareable.
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
    selectedFilmTypes: criteria.filmTypes ?? [],
    selectedDates: criteria.dates ?? [],
  };
}
