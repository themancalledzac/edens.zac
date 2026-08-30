/**
 * Tests for the `/search` filter derivations.
 *
 * The load-bearing case is the last one: a deep link only works if a criteria object survives
 * `buildSearchCriteria` -> `serializeFilterToParams` -> `parseFilterFromParams` -> `seedFilterState`
 * unchanged. Each of those four functions is tested elsewhere in isolation; nothing before this
 * file checked that the composition round-trips, which is the only property the search URL
 * actually depends on.
 */

import {
  buildSearchCriteria,
  SEARCH_RESULT_LIMIT,
  seedFilterState,
} from '@/app/components/SearchPage/searchFilters';
import { type FilterState, INITIAL_FILTER_STATE } from '@/app/types/GalleryFilter';
import { parseFilterFromParams, serializeFilterToParams } from '@/app/utils/contentFilter';

const state = (overrides: Partial<FilterState> = {}): FilterState => ({
  ...INITIAL_FILTER_STATE,
  ...overrides,
});

describe('SEARCH_RESULT_LIMIT', () => {
  /**
   * The backend rejects `size > 200` outright ("searchImages.size: must be less than or equal to
   * 200"), which fails the whole route into its error boundary rather than truncating. That is a
   * live-only failure — every unit test here passes with an over-large limit — so the bound is
   * pinned rather than left to be rediscovered in a browser.
   */
  const BACKEND_MAX_SEARCH_SIZE = 200;

  it('stays within the size the backend will accept', () => {
    expect(SEARCH_RESULT_LIMIT).toBeLessThanOrEqual(BACKEND_MAX_SEARCH_SIZE);
    expect(SEARCH_RESULT_LIMIT).toBeGreaterThan(0);
  });
});

describe('buildSearchCriteria', () => {
  it('is empty for the untouched toolbar', () => {
    expect(buildSearchCriteria(state())).toEqual({});
  });

  it('carries every array dimension the toolbar surfaces', () => {
    const criteria = buildSearchCriteria(
      state({
        selectedTags: ['alpine'],
        selectedPeople: ['Ada'],
        selectedCameras: ['M6'],
        selectedLenses: ['35mm'],
        selectedLocations: ['Dolomites'],
        selectedDates: ['2026-07-20'],
      })
    );

    expect(criteria.tags).toEqual(['alpine']);
    expect(criteria.people).toEqual(['Ada']);
    expect(criteria.cameras).toEqual(['M6']);
    expect(criteria.lenses).toEqual(['35mm']);
    expect(criteria.locations).toEqual(['Dolomites']);
    expect(criteria.dates).toEqual(['2026-07-20']);
  });

  it('narrows rather than widens when two values are picked in one dimension', () => {
    const criteria = buildSearchCriteria(state({ selectedTags: ['alpine', 'winter'] }));
    expect(criteria.tagMatchMode).toBe('AND');
  });

  it('maps the film tri-state onto isFilm, leaving it absent when off', () => {
    expect(buildSearchCriteria(state({ filmFilter: 'film' })).isFilm).toBe(true);
    expect(buildSearchCriteria(state({ filmFilter: 'digital' })).isFilm).toBe(false);
    expect(buildSearchCriteria(state({ filmFilter: 'off' })).isFilm).toBeUndefined();
  });

  it('sets minRating only when the highly-rated toggle is on', () => {
    expect(buildSearchCriteria(state({ highlyRatedOnly: true })).minRating).toBe(4);
    expect(buildSearchCriteria(state({ highlyRatedOnly: false })).minRating).toBeUndefined();
  });
});

describe('seedFilterState', () => {
  it('returns the untouched toolbar state for empty criteria', () => {
    expect(seedFilterState({})).toEqual(INITIAL_FILTER_STATE);
  });

  it('restores every dimension the URL can carry', () => {
    const seeded = seedFilterState({
      minRating: 4,
      isFilm: true,
      tags: ['alpine'],
      people: ['Ada'],
      cameras: ['M6'],
      locations: ['Dolomites'],
      dates: ['2026-07-20'],
    });

    expect(seeded.highlyRatedOnly).toBe(true);
    expect(seeded.filmFilter).toBe('film');
    expect(seeded.selectedTags).toEqual(['alpine']);
    expect(seeded.selectedPeople).toEqual(['Ada']);
    expect(seeded.selectedCameras).toEqual(['M6']);
    expect(seeded.selectedLocations).toEqual(['Dolomites']);
    expect(seeded.selectedDates).toEqual(['2026-07-20']);
  });

  it('leaves lenses unseeded, because no URL key carries them', () => {
    expect(serializeFilterToParams({ lenses: ['35mm'] }).toString()).toBe('');
    expect(seedFilterState({ lenses: ['35mm'] }).selectedLenses).toEqual([]);
  });

  it('treats a rating below 4 as the highly-rated toggle being off', () => {
    expect(seedFilterState({ minRating: 2 }).highlyRatedOnly).toBe(false);
  });
});

describe('deep-link round trip', () => {
  it('survives state -> criteria -> params -> criteria -> state', () => {
    const original = state({
      highlyRatedOnly: true,
      filmFilter: 'digital',
      selectedTags: ['alpine', 'winter'],
      selectedPeople: ['Ada'],
      selectedCameras: ['M6'],
      selectedLocations: ['Dolomites'],
      selectedDates: ['2026-07-20'],
    });

    const params = serializeFilterToParams(buildSearchCriteria(original));
    const restored = seedFilterState(parseFilterFromParams(params));

    expect(restored).toEqual(original);
  });

  it('produces a shareable query string rather than an opaque blob', () => {
    const params = serializeFilterToParams(
      buildSearchCriteria(state({ selectedTags: ['alpine'], filmFilter: 'film' }))
    );

    expect(params.getAll('tag')).toEqual(['alpine']);
    expect(params.get('isFilm')).toBe('true');
  });
});
