import {
  ARRAY_FILTER_KEYS,
  cycleDateSort,
  cycleFilmFilter,
  type FilterState,
  INITIAL_FILTER_STATE,
  toggleArrayFilter,
} from '@/app/types/GalleryFilter';

describe('FilterState helpers', () => {
  it('INITIAL_FILTER_STATE has every dimension empty and sorts/toggles off', () => {
    expect(INITIAL_FILTER_STATE.dateSortDirection).toBe('off');
    expect(INITIAL_FILTER_STATE.highlyRatedOnly).toBe(false);
    expect(INITIAL_FILTER_STATE.filmFilter).toBe('off');
    expect(INITIAL_FILTER_STATE.selectedTags).toEqual([]);
    expect(INITIAL_FILTER_STATE.selectedPeople).toEqual([]);
    expect(INITIAL_FILTER_STATE.selectedCameras).toEqual([]);
    expect(INITIAL_FILTER_STATE.selectedLenses).toEqual([]);
    expect(INITIAL_FILTER_STATE.selectedLensTypes).toEqual([]);
    expect(INITIAL_FILTER_STATE.selectedLocations).toEqual([]);
  });

  it('has no selectedCollectionIds field (dead field removed)', () => {
    expect('selectedCollectionIds' in INITIAL_FILTER_STATE).toBe(false);
  });

  it('cycleDateSort uses one canonical order: off -> asc -> desc -> off', () => {
    expect(cycleDateSort('off')).toBe('asc');
    expect(cycleDateSort('asc')).toBe('desc');
    expect(cycleDateSort('desc')).toBe('off');
  });

  it('cycleFilmFilter uses one canonical order: off -> film -> digital -> off', () => {
    expect(cycleFilmFilter('off')).toBe('film');
    expect(cycleFilmFilter('film')).toBe('digital');
    expect(cycleFilmFilter('digital')).toBe('off');
  });

  it('ARRAY_FILTER_KEYS lists exactly the array dimensions of INITIAL_FILTER_STATE', () => {
    const arrayKeysFromState = Object.entries(INITIAL_FILTER_STATE)
      .filter(([, value]) => Array.isArray(value))
      .map(([key]) => key)
      .sort();
    expect([...ARRAY_FILTER_KEYS].sort()).toEqual(arrayKeysFromState);
  });

  it('toggleArrayFilter adds a value not present', () => {
    const state: FilterState = { ...INITIAL_FILTER_STATE };
    const updates: Partial<FilterState>[] = [];
    toggleArrayFilter(state, u => updates.push(u), 'selectedTags', 'sunset');
    expect(updates).toEqual([{ selectedTags: ['sunset'] }]);
  });

  it('toggleArrayFilter removes a value already present', () => {
    const state: FilterState = { ...INITIAL_FILTER_STATE, selectedPeople: ['Ana', 'Bo'] };
    const updates: Partial<FilterState>[] = [];
    toggleArrayFilter(state, u => updates.push(u), 'selectedPeople', 'Ana');
    expect(updates).toEqual([{ selectedPeople: ['Bo'] }]);
  });
});
