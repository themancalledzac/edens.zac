'use client';

import { Fragment, useCallback, useRef, useState } from 'react';

import { FilterChip } from '@/app/components/ui/FilterChip/FilterChip';
import {
  type DensityTier,
  DensityTierControl,
} from '@/app/components/ui/FilterToolbar/DensityTierControl';
import { SegmentedChip } from '@/app/components/ui/SegmentedChip/SegmentedChip';
import { useClickOutside } from '@/app/hooks/useClickOutside';
import {
  ARRAY_FILTER_KEYS,
  type ArrayFilterKey,
  cycleDateSort,
  cycleDateSortTwoState,
  cycleFilmFilter,
  type FilterState,
  INITIAL_FILTER_STATE,
  toggleArrayFilter,
} from '@/app/types/GalleryFilter';

import { CHIP_WEIGHT, type ToolbarExtra } from './chipWeights';
import styles from './FilterToolbar.module.scss';
import {
  collectActiveFilterBadges,
  computeHasActiveFilters,
  isOptionAvailable,
} from './filterToolbarUtils';

/** One filterable dimension: which state key it writes, its dropdown label, its options, and optional value->label/count maps. */
export interface ToolbarDimension {
  label: string;
  options: readonly string[];
  /** Optional display labels for option values (e.g. date '2026-07-20' -> 'Jul 20'). */
  optionLabels?: Record<string, string>;
  /** Optional per-option contextual counts. */
  counts?: Record<string, number>;
}

/** Aggregate counts for the standalone toggles. */
export interface ToolbarCounts {
  highlyRated?: number;
  film?: number;
  digital?: number;
  /**
   * How many collections are non-public (every known non-`LISTED` tile). Badges the admin-only
   * Hidden chip, whose count is what switching it OFF would remove.
   */
  hidden?: number;
  /**
   * How many collections on this page the viewer follows. Badges the Following chip, whose count
   * is what switching it ON would leave.
   */
  following?: number;
}

/**
 * One mutually-exclusive page section (e.g. Collections / Images / Saved), rendered as a segment
 * of the `SegmentedChip` in the bar's upper tier.
 *
 * Sections are a SINGLE-select dimension addressed by a search param, which is why they are not
 * part of {@link FilterState} like every other dimension here: exactly one is always chosen, and
 * the choice must stay shareable, bookmarkable and walkable with the back button. Each segment is
 * a real link to its `?tab=` URL; `onSectionSelect` intercepts a plain click so the page switches
 * sections client-side.
 */
export interface ToolbarSection {
  /** Stable key, also the search-param value. */
  key: string;
  label: string;
  /**
   * Item count in this section, shown as the chip's badge.
   *
   * OMITTED when the count is not known — a section whose read failed has no count, and badging it
   * `0` would assert the section is empty in the one place a caller has already stopped making
   * that claim in the body. Absent renders as the bare label, never an empty badge: `FilterChip`
   * drops the whole count node on `undefined`.
   */
  count?: number;
  /** Destination selecting this section. */
  href: string;
}

export interface FilterToolbarProps {
  filterState: FilterState;
  onFilterChange: (update: Partial<FilterState>) => void;
  /**
   * Mutually-exclusive page sections for the upper tier. Absent on unsectioned pages, which is
   * every collection page; `/user`, `/admin`, `/admin/users/[id]` and `/s/[token]` pass them.
   */
  sections?: readonly ToolbarSection[];
  /** Key of the section currently rendered. Ignored when {@link sections} is absent. */
  activeSectionKey?: string;
  /** Intercepts a section click for client-side switching. Passed to `SegmentedChip` as `onSelect`. */
  onSectionSelect?: (key: string, href: string) => void;
  /** Page-level chips for the upper tier (Share, Contact, …), ordered by weight with the sections. */
  extras?: readonly ToolbarExtra[];
  /** Which array dimensions to surface as dropdowns, keyed by the FilterState array key. */
  dimensions: Partial<Record<ArrayFilterKey, ToolbarDimension>>;
  /** Subset of options still reachable under current filters; absent options render unavailable. null/undefined = all available. */
  filteredAvailable?: Partial<Record<ArrayFilterKey, readonly string[]>> | null;
  /** Aggregate counts for the highly-rated / film / digital toggles. */
  counts?: ToolbarCounts;
  showDateSort?: boolean;
  /**
   * When true, the Order chip is always active and toggles only between directions
   * (asc <-> desc, never `off`) — for views that are inherently date-ordered (CHRONOLOGICAL
   * collections). Defaults to false (the neutral off/asc/desc tri-state).
   */
  dateTwoState?: boolean;
  showHighlyRated?: boolean;
  /**
   * Renders the admin-only Hidden toggle. Callers gate this on the viewer being an admin AND the
   * payload actually carrying visibility data, so the chip is never a no-op.
   */
  showHiddenToggle?: boolean;
  /**
   * Renders the Following toggle, which narrows a collection list to the ones the viewer follows
   * themselves.
   *
   * It sits in the filter cluster, never in the upper tier with the sections.
   *
   * Callers gate this on actually knowing the viewer's follow set, so the chip is never a control
   * that reports every collection as unfollowed.
   */
  showFollowingToggle?: boolean;
  showFilm?: boolean;
  /** When provided, renders the photo-size control (density min 1, max {@link densityMax}). */
  density?: number;
  /** Upper bound of the fine slider. Defaults to 10 (desktop scale). */
  densityMax?: number;
  onDensityChange?: (value: number) => void;
  /**
   * Which density affordance to render. Visitors get `tiers` (three photo-size presets); edit mode
   * gets `slider`, the fine 1-{@link densityMax} control, so a curator can still land on an
   * off-tier value. Defaults to `tiers`.
   */
  densityVariant?: 'tiers' | 'slider';
  /** Tier presets, already resolved to the same scale as {@link density}. Required for `tiers`. */
  densityTiers?: readonly DensityTier[];
  /** Key of the tier nearest {@link density}; drives which segment renders active. */
  activeDensityTier?: string;
  /**
   * Receives a tier's value verbatim. Separate from {@link onDensityChange} because tier values are
   * canonical desktop-scale and must not go through that handler's viewport mapping.
   */
  onDensityTierSelect?: (value: number) => void;
}

/**
 * The sort chip's trailing direction glyph. Named "Order" rather than "Date" because it controls
 * SEQUENCE, not membership: `off` shows a collection's curated orderIndex, asc/desc re-sort
 * chronologically. The `Date` name now belongs to the per-day membership filter.
 *
 * The label itself stays the fixed string "Order" -- only this trailing glyph changes -- so the
 * chip's rendered width is a function of the fixed-width trailing slot, never of which direction
 * is selected.
 */
const ORDER_GLYPHS: Record<FilterState['dateSortDirection'], string> = {
  asc: '^',
  desc: 'v',
  off: '',
};

/**
 * Above this many distinct days, the Date dimension collapses from flat chips into the standard
 * dropdown so the bar cannot overflow. A fixed count rather than a measured width: available width
 * is unknown at SSR, and measuring would make the chips visibly reflow after hydration.
 */
export const MAX_FLAT_DATE_CHIPS = 5;

/**
 * The Year dimension's collapse threshold: three or fewer years stay flat chips, four or more
 * become the single-select "Year" dropdown, which closes on select.
 */
export const MAX_FLAT_YEAR_CHIPS = 3;

/**
 * A dimension that should render as flat chips rather than a dropdown: present, non-empty, and
 * within `cap` options. Returns null when it should collapse into the standard dropdown instead.
 */
function flatDimension(dim: ToolbarDimension | undefined, cap: number): ToolbarDimension | null {
  return dim !== undefined && dim.options.length > 0 && dim.options.length <= cap ? dim : null;
}

/**
 * Canonical, config-driven filter toolbar: dropdowns with a 3-state availability model, count
 * badges, highly-rated / film (neutral tri-state) / digital toggles, and an optional density slider.
 *
 * A dropdown shows that it is active but not which values are selected, so every selection also
 * renders as a removable badge after the controls — see {@link collectActiveFilterBadges} for what
 * is summarised and what is deliberately left out. Clearing everything at once is the trailing ×.
 *
 * Three behaviours worth keeping straight. `resetAll` preserves the direction under
 * {@link dateTwoState}, where views are inherently date-ordered and `off` is not a valid value.
 * The Order chip stays lit in that mode for the same reason. And the admin Hidden chip reads
 * inverted from the others: lit means the non-public collections ARE on screen, which is an
 * admin's default, and switching it off previews the list as the general audience sees it.
 */
export function FilterToolbar({
  filterState,
  onFilterChange,
  sections,
  activeSectionKey,
  onSectionSelect,
  extras,
  dimensions,
  filteredAvailable,
  counts,
  showDateSort = false,
  dateTwoState = false,
  showHighlyRated = false,
  showHiddenToggle = false,
  showFollowingToggle = false,
  showFilm = false,
  density,
  densityMax = 10,
  onDensityChange,
  densityVariant = 'tiers',
  densityTiers,
  activeDensityTier,
  onDensityTierSelect,
}: FilterToolbarProps) {
  const [openDropdown, setOpenDropdown] = useState<ArrayFilterKey | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  /**
   * The trigger that opened the current panel. Selecting an option unmounts the focused chip, which
   * would otherwise drop focus to `document.body` on every single selection; restoring it here
   * keeps a keyboard user in the bar. Same on close-by-Escape and click-outside.
   */
  const triggerRefs = useRef<Partial<Record<ArrayFilterKey, HTMLButtonElement | null>>>({});

  const closeAll = useCallback(() => {
    if (openDropdown !== null) triggerRefs.current[openDropdown]?.focus();
    setOpenDropdown(null);
  }, [openDropdown]);
  useClickOutside(barRef, openDropdown !== null, closeAll);

  const toggleOpen = (key: ArrayFilterKey) => setOpenDropdown(prev => (prev === key ? null : key));

  /**
   * Cycle the film/digital toggle, dropping any film-stock selection on the way out of `film`.
   * Stock is a secondary dimension under this toggle, so leaving `film` takes its control off the
   * bar — and a filter still narrowing the results from behind a control that is no longer there
   * is the failure this avoids.
   */
  const cycleFilm = () => {
    const filmFilter = cycleFilmFilter(filterState.filmFilter);
    onFilterChange({
      filmFilter,
      ...(filmFilter === 'film' ? {} : { selectedFilmTypes: [] }),
    });
  };

  const filmCount = filterState.filmFilter === 'off' ? undefined : counts?.[filterState.filmFilter];

  const hasActiveFilters = computeHasActiveFilters(filterState, ARRAY_FILTER_KEYS, dateTwoState);

  const resetAll = () => {
    onFilterChange({
      ...INITIAL_FILTER_STATE,
      ...(dateTwoState ? { dateSortDirection: filterState.dateSortDirection } : {}),
    });
    closeAll();
  };

  const flatDates = flatDimension(dimensions.selectedDates, MAX_FLAT_DATE_CHIPS);
  const flatYears = flatDimension(dimensions.selectedYears, MAX_FLAT_YEAR_CHIPS);

  const activeBadges = collectActiveFilterBadges(filterState, dimensions, ARRAY_FILTER_KEYS, [
    ...(flatDates ? (['selectedDates'] as const) : []),
    ...(flatYears ? (['selectedYears'] as const) : []),
  ]);

  const upper: ToolbarExtra[] = [
    ...(sections && sections.length > 0
      ? [
          {
            key: 'sections',
            weight: CHIP_WEIGHT.sections,
            node: (
              <SegmentedChip
                ariaLabel="Sections"
                onSelect={onSectionSelect}
                segments={sections.map(section => ({
                  key: section.key,
                  label: section.label,
                  count: section.count,
                  href: section.href,
                  current: section.key === activeSectionKey,
                }))}
              />
            ),
          },
        ]
      : []),
    ...(extras ?? []),
  ].sort((a, b) => b.weight - a.weight);

  return (
    <div ref={barRef} className={styles.bar}>
      {upper.length > 0 && (
        <div className={styles.upper}>
          {upper.map(entry => (
            <Fragment key={entry.key}>{entry.node}</Fragment>
          ))}
        </div>
      )}
      <div className={styles.toolbar}>
        <div className={styles.controls}>
          {showDateSort && (
            <FilterChip
              label="Order"
              trailing={ORDER_GLYPHS[filterState.dateSortDirection]}
              active={dateTwoState || filterState.dateSortDirection !== 'off'}
              onToggle={() =>
                onFilterChange({
                  dateSortDirection: dateTwoState
                    ? cycleDateSortTwoState(filterState.dateSortDirection)
                    : cycleDateSort(filterState.dateSortDirection),
                })
              }
            />
          )}

          {showHighlyRated && (
            <FilterChip
              label="Highly Rated"
              count={counts?.highlyRated}
              active={filterState.highlyRatedOnly}
              onToggle={() => onFilterChange({ highlyRatedOnly: !filterState.highlyRatedOnly })}
            />
          )}

          {showFollowingToggle && (
            <FilterChip
              label="Following"
              count={counts?.following}
              active={filterState.followedOnly}
              onToggle={() => onFilterChange({ followedOnly: !filterState.followedOnly })}
            />
          )}

          {showHiddenToggle && (
            <FilterChip
              label="Hidden"
              count={counts?.hidden}
              active={filterState.showHidden}
              onToggle={() => onFilterChange({ showHidden: !filterState.showHidden })}
            />
          )}

          {showFilm && (
            <FilterChip
              label={filterState.filmFilter === 'digital' ? 'Digital' : 'Film'}
              count={filmCount}
              tone={filterState.filmFilter === 'digital' ? 'digital' : 'film'}
              active={filterState.filmFilter !== 'off'}
              onToggle={cycleFilm}
            />
          )}

          {flatYears?.options.map(year => {
            const isSelected = filterState.selectedYears.includes(year);
            const available =
              isSelected || isOptionAvailable(filteredAvailable, 'selectedYears', year);
            return (
              <FilterChip
                key={`year-${year}`}
                label={year}
                active={isSelected}
                state={available ? 'available' : 'unavailable'}
                onToggle={() =>
                  toggleArrayFilter(filterState, onFilterChange, 'selectedYears', year)
                }
              />
            );
          })}

          {flatDates?.options.map(day => {
            const isSelected = filterState.selectedDates.includes(day);
            const available =
              isSelected || isOptionAvailable(filteredAvailable, 'selectedDates', day);
            return (
              <FilterChip
                key={`date-${day}`}
                label={flatDates.optionLabels?.[day] ?? day}
                active={isSelected}
                state={available ? 'available' : 'unavailable'}
                onToggle={() =>
                  toggleArrayFilter(filterState, onFilterChange, 'selectedDates', day)
                }
              />
            );
          })}

          {ARRAY_FILTER_KEYS.map(key => {
            if (key === 'selectedDates' && flatDates) return null;
            if (key === 'selectedYears' && flatYears) return null;
            const dim = dimensions[key];
            if (!dim || dim.options.length === 0) return null;
            const selected = filterState[key] as readonly string[];
            const isOpen = openDropdown === key;
            return (
              <div key={key} className={styles.dropdown}>
                <FilterChip
                  ref={node => {
                    triggerRefs.current[key] = node;
                  }}
                  label={dim.label}
                  trailing={isOpen ? '▴' : '▾'}
                  active={isOpen}
                  ariaExpanded={isOpen}
                  ariaHasPopup="true"
                  onToggle={() => toggleOpen(key)}
                />
                {isOpen && (
                  <div className={styles.panel}>
                    {dim.options.map(option => {
                      const isSelected = selected.includes(option);
                      const available =
                        isSelected || isOptionAvailable(filteredAvailable, key, option);
                      return (
                        <FilterChip
                          key={`${key}-${option}`}
                          label={dim.optionLabels?.[option] ?? option}
                          count={dim.counts?.[option]}
                          active={isSelected}
                          state={available ? 'available' : 'unavailable'}
                          onToggle={() => {
                            toggleArrayFilter(filterState, onFilterChange, key, option);
                            closeAll();
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {activeBadges.length > 0 && (
            <>
              <span className={styles.separator} aria-hidden="true" />
              {activeBadges.map(badge => (
                <FilterChip
                  key={`active-${badge.key}-${badge.value}`}
                  label={badge.label}
                  ariaLabel={badge.removeLabel}
                  trailing="×"
                  active
                  onToggle={() =>
                    toggleArrayFilter(filterState, onFilterChange, badge.key, badge.value)
                  }
                />
              ))}
            </>
          )}
        </div>

        <div className={styles.trailing}>
          <button
            type="button"
            className={`${styles.reset} ${hasActiveFilters ? '' : styles.resetInactive}`}
            onClick={resetAll}
            disabled={!hasActiveFilters}
            aria-label="Reset all filters"
          >
            ×
          </button>

          {onDensityChange && density !== undefined && (
            <div className={styles.densitySlot}>
              {densityVariant === 'tiers' && densityTiers ? (
                <DensityTierControl
                  tiers={densityTiers}
                  activeKey={activeDensityTier ?? ''}
                  onSelect={onDensityTierSelect ?? onDensityChange}
                />
              ) : (
                <label className={styles.slider}>
                  <span className={styles.sliderLabel} aria-hidden="true">
                    Density {density}
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={densityMax}
                    step={1}
                    value={density}
                    onChange={e => onDensityChange(Number(e.target.value))}
                    aria-label="Row density"
                  />
                </label>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
