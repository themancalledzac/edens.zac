/**
 * Unified filter state for every gallery view (collection detail pages,
 * location/tag/people taxonomy pages, parent pages). One shape with all
 * dimensions present-as-empty-arrays; a given page wires only the dimensions
 * it surfaces. All fields are URL-serializable (see contentFilter.ts) so the
 * state can be synced to search params.
 */
export type DateSortDirection = 'asc' | 'desc' | 'off';

/** 'film' = film only, 'digital' = digital only, 'off' = no film/digital filter. */
export type FilmFilter = 'film' | 'digital' | 'off';

export type LensType = 'wide' | 'normal' | 'telephoto';

export interface FilterState {
  dateSortDirection: DateSortDirection;
  highlyRatedOnly: boolean;
  filmFilter: FilmFilter;
  readonly selectedTags: readonly string[];
  readonly selectedPeople: readonly string[];
  readonly selectedCameras: readonly string[];
  readonly selectedLenses: readonly string[];
  readonly selectedLocations: readonly string[];
  readonly selectedLensTypes: readonly LensType[];
}

export const INITIAL_FILTER_STATE: FilterState = Object.freeze({
  dateSortDirection: 'off' as const,
  highlyRatedOnly: false,
  filmFilter: 'off' as const,
  selectedTags: Object.freeze([] as readonly string[]),
  selectedPeople: Object.freeze([] as readonly string[]),
  selectedCameras: Object.freeze([] as readonly string[]),
  selectedLenses: Object.freeze([] as readonly string[]),
  selectedLocations: Object.freeze([] as readonly string[]),
  selectedLensTypes: Object.freeze([] as readonly LensType[]),
});

/** Keys of FilterState whose value is a readonly string-or-LensType array. */
export type ArrayFilterKey =
  | 'selectedTags'
  | 'selectedPeople'
  | 'selectedCameras'
  | 'selectedLenses'
  | 'selectedLocations'
  | 'selectedLensTypes';

/**
 * The canonical list of array dimensions in {@link FilterState} — the single source of truth for
 * "which keys are arrays" (mirrors the array fields in {@link INITIAL_FILTER_STATE}). Consumers
 * iterate this to surface dropdowns and detect active array filters.
 */
export const ARRAY_FILTER_KEYS: readonly ArrayFilterKey[] = [
  'selectedTags',
  'selectedPeople',
  'selectedCameras',
  'selectedLenses',
  'selectedLocations',
  'selectedLensTypes',
];

/**
 * The single canonical date-sort cycle: off -> asc -> desc -> off.
 */
export function cycleDateSort(current: DateSortDirection): DateSortDirection {
  const next: Record<DateSortDirection, DateSortDirection> = {
    off: 'asc',
    asc: 'desc',
    desc: 'off',
  };
  return next[current];
}

/**
 * The single canonical film-filter cycle: off -> film -> digital -> off.
 */
export function cycleFilmFilter(current: FilmFilter): FilmFilter {
  const next: Record<FilmFilter, FilmFilter> = {
    off: 'film',
    film: 'digital',
    digital: 'off',
  };
  return next[current];
}

/**
 * Toggle a value in one of the array dimensions and emit a Partial update.
 * Shared by the filter toolbar and the tag-click handlers in
 * CollectionContentRenderer.
 */
export function toggleArrayFilter(
  state: FilterState,
  onChange: (update: Partial<FilterState>) => void,
  key: ArrayFilterKey,
  value: string
): void {
  const current = state[key] as readonly string[];
  const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
  onChange({ [key]: next });
}
