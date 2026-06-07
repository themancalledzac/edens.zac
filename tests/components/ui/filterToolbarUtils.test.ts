/**
 * Unit tests for the pure helpers extracted from {@link FilterToolbar}.
 */

import {
  computeHasActiveFilters,
  isOptionAvailable,
} from '@/app/components/ui/FilterToolbar/filterToolbarUtils';
import {
  ARRAY_FILTER_KEYS,
  type FilterState,
  INITIAL_FILTER_STATE,
} from '@/app/types/GalleryFilter';

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
    // An empty array is falsy-by-length but the guard is `!avail`, so it falls through to includes.
    expect(isOptionAvailable({ selectedTags: [] }, 'selectedTags', 'sunset')).toBe(false);
  });
});

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
    // selectedTags is non-empty but excluded from the scanned keys -> still no active filter.
    expect(computeHasActiveFilters(state, ['selectedPeople'])).toBe(false);
  });
});
