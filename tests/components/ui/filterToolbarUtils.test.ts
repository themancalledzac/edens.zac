/**
 * Unit tests for the pure helpers extracted from {@link FilterToolbar}.
 */

import {
  buildImagePageToolbarProps,
  collectActiveFilterBadges,
  computeHasActiveFilters,
  isOptionAvailable,
} from '@/app/components/ui/FilterToolbar/filterToolbarUtils';
import {
  ARRAY_FILTER_KEYS,
  type ArrayFilterKey,
  type FilterState,
  INITIAL_FILTER_STATE,
} from '@/app/types/GalleryFilter';
import {
  type extractFilterOptions,
  type FilterCounts,
  type FilterVisibility,
} from '@/app/utils/contentFilter';

/**
 * An empty array is falsy-by-length but the guard is `!avail`, so it falls through to includes.
 */
describe('isOptionAvailable', () => {
  it('returns true for every option when no filteredAvailable map is given', () => {
    expect(isOptionAvailable(null, 'selectedTags', 'sunset')).toBe(true);
    expect(isOptionAvailable(undefined, 'selectedTags', 'sunset')).toBe(true);
  });

  it('returns true when the dimension has no entry in the map', () => {
    expect(isOptionAvailable({ selectedPeople: ['Ana'] }, 'selectedTags', 'sunset')).toBe(true);
  });

  it('returns true when the value is in the dimension subset', () => {
    expect(
      isOptionAvailable({ selectedTags: ['sunset', 'forest'] }, 'selectedTags', 'sunset')
    ).toBe(true);
  });

  it('returns false when the value is absent from a present, non-empty subset', () => {
    expect(isOptionAvailable({ selectedTags: ['forest'] }, 'selectedTags', 'sunset')).toBe(false);
  });

  it('treats an empty subset as "all unavailable" for that dimension', () => {
    expect(isOptionAvailable({ selectedTags: [] }, 'selectedTags', 'sunset')).toBe(false);
  });
});

/**
 * selectedTags is non-empty but excluded from the scanned keys -> still no active filter.
 *
 * CHRONOLOGICAL collections run with the Date sort always engaged (asc/desc, never off);
 * that structural sort must not count as an active filter or the reset button shows on load.
 */
describe('computeHasActiveFilters', () => {
  it('returns false when nothing is filtered', () => {
    expect(computeHasActiveFilters(INITIAL_FILTER_STATE, ARRAY_FILTER_KEYS)).toBe(false);
  });

  it('returns true when a date sort is active', () => {
    const state: FilterState = { ...INITIAL_FILTER_STATE, dateSortDirection: 'asc' };
    expect(computeHasActiveFilters(state, ARRAY_FILTER_KEYS)).toBe(true);
  });

  it('returns true when highly-rated is toggled on', () => {
    const state: FilterState = { ...INITIAL_FILTER_STATE, highlyRatedOnly: true };
    expect(computeHasActiveFilters(state, ARRAY_FILTER_KEYS)).toBe(true);
  });

  it('returns true when the following filter is toggled on', () => {
    const state: FilterState = { ...INITIAL_FILTER_STATE, followedOnly: true };
    expect(computeHasActiveFilters(state, ARRAY_FILTER_KEYS)).toBe(true);
  });

  it('returns true when the film filter is set', () => {
    const state: FilterState = { ...INITIAL_FILTER_STATE, filmFilter: 'digital' };
    expect(computeHasActiveFilters(state, ARRAY_FILTER_KEYS)).toBe(true);
  });

  it('returns true when any array dimension is non-empty', () => {
    const state: FilterState = { ...INITIAL_FILTER_STATE, selectedLenses: ['Zeiss 80mm'] };
    expect(computeHasActiveFilters(state, ARRAY_FILTER_KEYS)).toBe(true);
  });

  it('ignores array dimensions not listed in arrayKeys', () => {
    const state: FilterState = { ...INITIAL_FILTER_STATE, selectedTags: ['sunset'] };
    expect(computeHasActiveFilters(state, ['selectedPeople'])).toBe(false);
  });

  it('ignores the always-on date sort in two-state mode', () => {
    const state: FilterState = { ...INITIAL_FILTER_STATE, dateSortDirection: 'asc' };
    expect(computeHasActiveFilters(state, ARRAY_FILTER_KEYS, true)).toBe(false);
  });

  it('still reports other filters as active in two-state mode', () => {
    const state: FilterState = {
      ...INITIAL_FILTER_STATE,
      dateSortDirection: 'desc',
      highlyRatedOnly: true,
    };
    expect(computeHasActiveFilters(state, ARRAY_FILTER_KEYS, true)).toBe(true);
  });
});

describe('collectActiveFilterBadges', () => {
  const dimensions = {
    selectedCameras: { label: 'Camera' },
    selectedTags: { label: 'Tag' },
    selectedDates: { label: 'Date', optionLabels: { '2026-07-20': 'Jul 20' } },
  };

  it('returns nothing when no array dimension is selected', () => {
    expect(collectActiveFilterBadges(INITIAL_FILTER_STATE, dimensions, ARRAY_FILTER_KEYS)).toEqual(
      []
    );
  });

  it('names each badge by its dimension and value', () => {
    const state: FilterState = { ...INITIAL_FILTER_STATE, selectedCameras: ['Nikon FM2'] };
    expect(collectActiveFilterBadges(state, dimensions, ARRAY_FILTER_KEYS)).toEqual([
      {
        key: 'selectedCameras',
        value: 'Nikon FM2',
        label: 'Camera: Nikon FM2',
        removeLabel: 'Remove Nikon FM2 from Camera',
      },
    ]);
  });

  it('prefers a dimension display label over the raw value', () => {
    const state: FilterState = { ...INITIAL_FILTER_STATE, selectedDates: ['2026-07-20'] };
    expect(collectActiveFilterBadges(state, dimensions, ARRAY_FILTER_KEYS)[0]?.label).toBe(
      'Date: Jul 20'
    );
  });

  it('flattens several dimensions in arrayKeys order', () => {
    const state: FilterState = {
      ...INITIAL_FILTER_STATE,
      selectedCameras: ['Nikon FM2'],
      selectedTags: ['sunset', 'coast'],
    };
    expect(
      collectActiveFilterBadges(state, dimensions, ARRAY_FILTER_KEYS).map(b => b.label)
    ).toEqual(['Tag: sunset', 'Tag: coast', 'Camera: Nikon FM2']);
  });

  /**
   * Without a dropdown there is no label to render, and inventing one would surface an internal
   * state key to a reader. The toolbar skips unsurfaced dimensions everywhere else too.
   */
  it('skips a dimension the page does not surface', () => {
    const state: FilterState = { ...INITIAL_FILTER_STATE, selectedLenses: ['Zeiss 80mm'] };
    expect(collectActiveFilterBadges(state, dimensions, ARRAY_FILTER_KEYS)).toEqual([]);
  });

  /**
   * The flat date chips already show their own selection, so summarising them would print the
   * same fact twice a few pixels apart.
   */
  it('honours excludeKeys so an already-visible dimension is not repeated', () => {
    const state: FilterState = {
      ...INITIAL_FILTER_STATE,
      selectedDates: ['2026-07-20'],
      selectedTags: ['sunset'],
    };
    expect(
      collectActiveFilterBadges(state, dimensions, ARRAY_FILTER_KEYS, ['selectedDates']).map(
        b => b.label
      )
    ).toEqual(['Tag: sunset']);
  });
});

describe('buildImagePageToolbarProps', () => {
  const allVisible: FilterVisibility = {
    dateSort: true,
    highlyRated: true,
    film: true,
    tags: true,
    people: true,
    cameras: true,
    lenses: true,
    filmTypes: true,
    locations: true,
  };
  const availableOptions = {
    tags: ['a'],
    people: ['p'],
    locations: ['l'],
    cameras: ['c'],
    lenses: ['n'],
    filmTypes: ['f'],
  } as unknown as ReturnType<typeof extractFilterOptions>;
  const filterCounts = {
    highlyRated: 1,
    film: 2,
    digital: 3,
    tags: { a: 1 },
    people: { p: 1 },
    locations: { l: 1 },
    cameras: { c: 1 },
    lenses: { n: 1 },
    filmTypes: { f: 1 },
  } as unknown as FilterCounts;
  const surfaced: ArrayFilterKey[] = [
    'selectedTags',
    'selectedPeople',
    'selectedLocations',
    'selectedCameras',
    'selectedLenses',
    'selectedFilmTypes',
  ];

  it('surfaces keys in order with their labels, hiding film stock unless film is selected', () => {
    const result = buildImagePageToolbarProps(
      { filterState: INITIAL_FILTER_STATE, availableOptions, filterCounts, visibility: allVisible },
      surfaced
    );
    expect(Object.keys(result.dimensions)).toEqual(surfaced.slice(0, 5));
    expect(result.dimensions.selectedTags).toEqual({
      label: 'Tags',
      options: ['a'],
      counts: { a: 1 },
    });
    expect(result.counts).toEqual({ highlyRated: 1, film: 2, digital: 3 });
    expect(result.showDateSort).toBe(true);
    expect(result.showHighlyRated).toBe(true);
    expect(result.showFilm).toBe(true);
  });

  it('adds Film stock when the film filter is on and honours visibility and surfaced', () => {
    const result = buildImagePageToolbarProps(
      {
        filterState: { ...INITIAL_FILTER_STATE, filmFilter: 'film' },
        availableOptions,
        filterCounts,
        visibility: { ...allVisible, tags: false, dateSort: false },
      },
      ['selectedTags', 'selectedFilmTypes', 'selectedLenses']
    );
    expect(Object.keys(result.dimensions)).toEqual(['selectedFilmTypes', 'selectedLenses']);
    expect(result.dimensions.selectedFilmTypes?.label).toBe('Film stock');
    expect(result.dimensions.selectedLenses?.label).toBe('Lenses');
    expect(result.showDateSort).toBe(false);
  });
});
