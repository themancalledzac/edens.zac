import {
  ARRAY_FILTER_KEYS,
  cycleDateSort,
  cycleDateSortTwoState,
  cycleFilmFilter,
  type FilterState,
  INITIAL_FILTER_STATE,
  initialDateSortDirection,
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
    expect(INITIAL_FILTER_STATE.selectedLocations).toEqual([]);
  });

  it('does not carry a lens-type dimension', () => {
    expect(ARRAY_FILTER_KEYS).not.toContain('selectedLensTypes');
    expect(INITIAL_FILTER_STATE).not.toHaveProperty('selectedLensTypes');
  });

  it('has no selectedCollectionIds field (dead field removed)', () => {
    expect('selectedCollectionIds' in INITIAL_FILTER_STATE).toBe(false);
  });

  it('carries a dates dimension', () => {
    expect(ARRAY_FILTER_KEYS).toContain('selectedDates');
    expect(INITIAL_FILTER_STATE.selectedDates).toEqual([]);
  });

  it('leads ARRAY_FILTER_KEYS with selectedDates (task 6 dropdown-fallback ordering depends on this)', () => {
    expect(ARRAY_FILTER_KEYS[0]).toBe('selectedDates');
  });

  it('cycleDateSort uses one canonical order: off -> asc -> desc -> off', () => {
    expect(cycleDateSort('off')).toBe('asc');
    expect(cycleDateSort('asc')).toBe('desc');
    expect(cycleDateSort('desc')).toBe('off');
  });

  it('cycleDateSortTwoState toggles only between asc and desc (never off)', () => {
    expect(cycleDateSortTwoState('asc')).toBe('desc');
    expect(cycleDateSortTwoState('desc')).toBe('asc');
    // 'off' is not a reachable state in the two-state cycle; defaulting to asc
    // keeps a chronological collection sorted oldest-first if it somehow lands there.
    expect(cycleDateSortTwoState('off')).toBe('asc');
  });

  it('initialDateSortDirection defaults to asc for CHRONOLOGICAL, off otherwise', () => {
    expect(initialDateSortDirection('CHRONOLOGICAL')).toBe('asc');
    expect(initialDateSortDirection('ORDERED')).toBe('off');
    expect(initialDateSortDirection('FIXED')).toBe('off');
    expect(initialDateSortDirection()).toBe('off');
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

  it('toggleArrayFilter selects the first date into an empty dimension', () => {
    const state: FilterState = { ...INITIAL_FILTER_STATE };
    const updates: Partial<FilterState>[] = [];
    toggleArrayFilter(state, u => updates.push(u), 'selectedDates', '2026-07-20');
    expect(updates).toEqual([{ selectedDates: ['2026-07-20'] }]);
  });

  it('toggleArrayFilter switches the date instead of accumulating a second one', () => {
    const state: FilterState = { ...INITIAL_FILTER_STATE, selectedDates: ['2026-07-20'] };
    const updates: Partial<FilterState>[] = [];
    toggleArrayFilter(state, u => updates.push(u), 'selectedDates', '2026-07-22');
    expect(updates).toEqual([{ selectedDates: ['2026-07-22'] }]);
  });

  it('toggleArrayFilter clears the date when the chosen one is clicked again', () => {
    const state: FilterState = { ...INITIAL_FILTER_STATE, selectedDates: ['2026-07-20'] };
    const updates: Partial<FilterState>[] = [];
    toggleArrayFilter(state, u => updates.push(u), 'selectedDates', '2026-07-20');
    expect(updates).toEqual([{ selectedDates: [] }]);
  });

  it('toggleArrayFilter switches the lens instead of accumulating a second one', () => {
    const state: FilterState = { ...INITIAL_FILTER_STATE, selectedLenses: ['35mm f/1.4'] };
    const updates: Partial<FilterState>[] = [];
    toggleArrayFilter(state, u => updates.push(u), 'selectedLenses', '85mm f/1.8');
    expect(updates).toEqual([{ selectedLenses: ['85mm f/1.8'] }]);
  });

  it('toggleArrayFilter clears the lens when the chosen one is clicked again', () => {
    const state: FilterState = { ...INITIAL_FILTER_STATE, selectedLenses: ['35mm f/1.4'] };
    const updates: Partial<FilterState>[] = [];
    toggleArrayFilter(state, u => updates.push(u), 'selectedLenses', '35mm f/1.4');
    expect(updates).toEqual([{ selectedLenses: [] }]);
  });

  it('toggleArrayFilter still accumulates the non-exclusive dimensions', () => {
    const state: FilterState = { ...INITIAL_FILTER_STATE, selectedCameras: ['Leica M6'] };
    const updates: Partial<FilterState>[] = [];
    toggleArrayFilter(state, u => updates.push(u), 'selectedCameras', 'Nikon F3');
    expect(updates).toEqual([{ selectedCameras: ['Leica M6', 'Nikon F3'] }]);
  });

  it('toggleArrayFilter narrows a multi-date URL seed down to the clicked day', () => {
    const state: FilterState = {
      ...INITIAL_FILTER_STATE,
      selectedDates: ['2026-07-20', '2026-07-22'],
    };
    const updates: Partial<FilterState>[] = [];
    toggleArrayFilter(state, u => updates.push(u), 'selectedDates', '2026-07-20');
    expect(updates).toEqual([{ selectedDates: ['2026-07-20'] }]);
  });
});
