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
  /**
   * Chronological sequence: capture date for images/GIFs, collection date for collection tiles.
   * `off` keeps the collection's curated orderIndex.
   */
  dateSortDirection: DateSortDirection;
  /**
   * Admin-only: drop collections whose visibility is `HIDDEN`, previewing the list as a
   * non-admin sees it. Off by default, so an admin's default view stays the full picture they
   * already get today — this only ever SUBTRACTS from what the backend already sent.
   *
   * `UNLISTED` collections are unaffected either way: they are reachable by direct slug and are
   * not part of what this control previews away.
   */
  hideHidden: boolean;
  highlyRatedOnly: boolean;
  filmFilter: FilmFilter;
  readonly selectedTags: readonly string[];
  readonly selectedPeople: readonly string[];
  readonly selectedCameras: readonly string[];
  readonly selectedLenses: readonly string[];
  readonly selectedLocations: readonly string[];
  /** ISO calendar days ('YYYY-MM-DD') to include. OR logic: an image matches any selected day. */
  readonly selectedDates: readonly string[];
}

export const INITIAL_FILTER_STATE: FilterState = Object.freeze({
  dateSortDirection: 'off' as const,
  hideHidden: false,
  highlyRatedOnly: false,
  filmFilter: 'off' as const,
  selectedTags: Object.freeze([] as readonly string[]),
  selectedPeople: Object.freeze([] as readonly string[]),
  selectedCameras: Object.freeze([] as readonly string[]),
  selectedLenses: Object.freeze([] as readonly string[]),
  selectedLocations: Object.freeze([] as readonly string[]),
  selectedDates: Object.freeze([] as readonly string[]),
});

/** Keys of FilterState whose value is a readonly string array. */
export type ArrayFilterKey =
  | 'selectedDates'
  | 'selectedTags'
  | 'selectedPeople'
  | 'selectedCameras'
  | 'selectedLenses'
  | 'selectedLocations';

/**
 * The canonical list of array dimensions in {@link FilterState} — the single source of truth for
 * "which keys are arrays" (mirrors the array fields in {@link INITIAL_FILTER_STATE}). Consumers
 * iterate this to surface dropdowns and detect active array filters. `selectedDates` is listed
 * first so Date leads the dropdown fallback rendering.
 */
export const ARRAY_FILTER_KEYS: readonly ArrayFilterKey[] = [
  'selectedDates',
  'selectedTags',
  'selectedPeople',
  'selectedCameras',
  'selectedLenses',
  'selectedLocations',
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
 * Two-state date-sort cycle for views where the date filter is always engaged
 * (e.g. CHRONOLOGICAL collections, which are inherently date-ordered): asc <-> desc,
 * never `off`. `off` is not reachable here, but is mapped to `asc` defensively so the
 * collection stays oldest-first if it ever lands there.
 */
export function cycleDateSortTwoState(current: DateSortDirection): DateSortDirection {
  return current === 'asc' ? 'desc' : 'asc';
}

/**
 * Initial date-sort direction for a collection. CHRONOLOGICAL collections are already
 * stored oldest-first (see contentLayout `sortContentByCreatedAt`), so their Order control
 * defaults ON at `asc` to match that order; every other view starts neutral (`off`).
 */
export function initialDateSortDirection(displayMode?: string): DateSortDirection {
  return displayMode === 'CHRONOLOGICAL' ? 'asc' : 'off';
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
 * Array dimensions whose values are mutually exclusive on a single item, making a multi-select
 * meaningless in both combine modes: an image has exactly one capture day and exactly one lens.
 * Two dates OR two disjoint sets (a selection that only ever widens the result); two lenses AND
 * two disjoint sets (a selection that always yields nothing — see `lensMatchMode: 'AND'` in
 * `buildCollectionCriteria`). Both are therefore single-choice, not accumulating.
 */
const EXCLUSIVE_FILTER_KEYS: readonly ArrayFilterKey[] = ['selectedDates', 'selectedLenses'];

/**
 * Toggle a value in one of the array dimensions and emit a Partial update.
 * Shared by the filter toolbar and the tag-click handlers in
 * CollectionContentRenderer.
 *
 * Dimensions in {@link EXCLUSIVE_FILTER_KEYS} hold at most one value: picking a different option
 * switches the selection to it, and picking the current sole selection clears the dimension. Every
 * other dimension accumulates — picking a second tag narrows by both.
 */
export function toggleArrayFilter(
  state: FilterState,
  onChange: (update: Partial<FilterState>) => void,
  key: ArrayFilterKey,
  value: string
): void {
  const current = state[key] as readonly string[];
  if (EXCLUSIVE_FILTER_KEYS.includes(key)) {
    const isSoleSelection = current.length === 1 && current[0] === value;
    onChange({ [key]: isSoleSelection ? [] : [value] });
    return;
  }
  const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
  onChange({ [key]: next });
}
