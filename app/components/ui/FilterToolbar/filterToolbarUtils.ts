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
 * Whether any filter is active: a date sort, the highly-rated toggle, the admin hide-hidden
 * preview, the film/digital filter, or any non-empty array dimension. Drives the reset (×)
 * button's visibility.
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
    !filterState.showHidden ||
    filterState.filmFilter !== 'off' ||
    arrayKeys.some(k => (filterState[k] as readonly string[]).length > 0)
  );
}

/** The parts of a toolbar dimension a summary badge needs: its name, and how to render a value. */
interface BadgeDimension {
  label: string;
  optionLabels?: Record<string, string>;
}

/** One selected value, named well enough to stand on its own away from its dropdown. */
export interface ActiveFilterBadge {
  key: ArrayFilterKey;
  value: string;
  /** Dimension and value together, e.g. `Camera: Nikon FM2` — the badge's whole visible text. */
  label: string;
  /**
   * Accessible name, e.g. `Remove Nikon FM2 from Camera`. The visible text cannot serve as one:
   * it opens with the same word as the dropdown trigger a few chips away, so the two announce
   * alike, and it never says that activating the badge removes the filter.
   */
  removeLabel: string;
}

/**
 * Every selected value across the surfaced array dimensions, flattened into badges.
 *
 * The bar shows a dropdown as active but never says WHICH values are selected, so the only way to
 * read the current filter was to open each dropdown in turn. These badges are that answer, and
 * removing one is a plain toggle of the value it names.
 *
 * Two deliberate omissions. Dimensions the page does not surface are skipped — with no dropdown
 * there is no label to render, and this slice does not invent one. Anything already visible as its
 * own chip is skipped via `excludeKeys`, which is how the flat date chips avoid appearing twice;
 * the standalone toggles (Order, Highly Rated, Film, Hidden) are left out for the same reason,
 * since each is lit in the bar already.
 */
export function collectActiveFilterBadges(
  filterState: FilterState,
  dimensions: Partial<Record<ArrayFilterKey, BadgeDimension>>,
  arrayKeys: readonly ArrayFilterKey[],
  excludeKeys: readonly ArrayFilterKey[] = []
): ActiveFilterBadge[] {
  const badges: ActiveFilterBadge[] = [];
  for (const key of arrayKeys) {
    if (excludeKeys.includes(key)) continue;
    const dimension = dimensions[key];
    if (!dimension) continue;
    for (const value of filterState[key] as readonly string[]) {
      const shown = dimension.optionLabels?.[value] ?? value;
      badges.push({
        key,
        value,
        label: `${dimension.label}: ${shown}`,
        removeLabel: `Remove ${shown} from ${dimension.label}`,
      });
    }
  }
  return badges;
}
