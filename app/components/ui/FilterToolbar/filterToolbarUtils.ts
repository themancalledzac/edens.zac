/**
 * Pure helpers for the {@link FilterToolbar} — availability lookup and the active-filter check.
 * Kept out of the component so the JSX stays thin and the logic is unit-testable. The film-filter
 * cycle and the canonical array-key list live in {@link app/types/GalleryFilter} next to the other
 * filter-state derivations (the project's home for filter-state logic).
 */

import { type ArrayFilterKey, type FilterState } from '@/app/types/GalleryFilter';

/**
 * Whether a dropdown option is still reachable under the current filters. With no
 * `filteredAvailable` map (null/undefined), every option is available; otherwise an option is
 * available only when it appears in that dimension's reachable subset.
 */
export function isOptionAvailable(
  filteredAvailable: Partial<Record<ArrayFilterKey, readonly string[]>> | null | undefined,
  key: ArrayFilterKey,
  value: string
): boolean {
  const avail = filteredAvailable?.[key];
  if (!avail) return true;
  return avail.includes(value);
}

/**
 * Whether any filter is active: a date sort, the highly-rated toggle, the film/digital filter, or
 * any non-empty array dimension. Drives the reset (×) button's visibility.
 *
 * In two-state mode ({@link FilterToolbarProps.dateTwoState}) the date sort is structurally
 * always engaged (CHRONOLOGICAL collections, asc <-> desc, never `off`), so it is NOT counted as
 * an active filter — otherwise the reset button would show on load for every chronological view.
 */
export function computeHasActiveFilters(
  filterState: FilterState,
  arrayKeys: readonly ArrayFilterKey[],
  dateTwoState = false
): boolean {
  const dateActive = !dateTwoState && filterState.dateSortDirection !== 'off';
  return (
    dateActive ||
    filterState.highlyRatedOnly ||
    filterState.filmFilter !== 'off' ||
    arrayKeys.some(k => (filterState[k] as readonly string[]).length > 0)
  );
}
