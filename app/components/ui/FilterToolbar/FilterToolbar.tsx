'use client';

import { useCallback, useRef, useState } from 'react';

import { FilterChip } from '@/app/components/ui/FilterChip/FilterChip';
import {
  type DensityTier,
  DensityTierControl,
} from '@/app/components/ui/FilterToolbar/DensityTierControl';
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

import styles from './FilterToolbar.module.scss';
import { computeHasActiveFilters, isOptionAvailable } from './filterToolbarUtils';

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
}

/**
 * One mutually-exclusive page section (e.g. `/user`'s Collections / Images / Saved / Following),
 * rendered as a navigating chip at the head of the bar.
 *
 * Sections are a SINGLE-select dimension addressed by a search param, which is why they are not
 * part of {@link FilterState} like every other dimension here: exactly one is always chosen, and
 * the choice must stay shareable, bookmarkable and walkable with the back button. Keeping them as
 * links also keeps a sectioned page a Server Component — each section's blocks come from a
 * different server read.
 */
export interface ToolbarSection {
  /** Stable key, also the search-param value. */
  key: string;
  label: string;
  /** Item count in this section, shown as the chip's badge. */
  count: number;
  /** Destination selecting this section. */
  href: string;
}

export interface FilterToolbarProps {
  filterState: FilterState;
  onFilterChange: (update: Partial<FilterState>) => void;
  /**
   * Mutually-exclusive page sections, leading the bar. Absent on unsectioned pages, which is
   * every collection page — only `/user` is sectioned today.
   */
  sections?: readonly ToolbarSection[];
  /** Key of the section currently rendered. Ignored when {@link sections} is absent. */
  activeSectionKey?: string;
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
 * Canonical, config-driven filter toolbar: dropdowns with a 3-state availability model, count
 * badges, highly-rated / film (neutral tri-state) / digital toggles, and an optional density slider.
 */
export function FilterToolbar({
  filterState,
  onFilterChange,
  sections,
  activeSectionKey,
  dimensions,
  filteredAvailable,
  counts,
  showDateSort = false,
  dateTwoState = false,
  showHighlyRated = false,
  showHiddenToggle = false,
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

  const cycleFilm = () => onFilterChange({ filmFilter: cycleFilmFilter(filterState.filmFilter) });

  const filmCount = filterState.filmFilter === 'off' ? undefined : counts?.[filterState.filmFilter];

  const hasActiveFilters = computeHasActiveFilters(filterState, ARRAY_FILTER_KEYS, dateTwoState);

  const resetAll = () => {
    onFilterChange({
      ...INITIAL_FILTER_STATE,
      // Two-state views are inherently date-ordered, so `off` is invalid there:
      // preserve the current direction and only clear the other filters.
      ...(dateTwoState ? { dateSortDirection: filterState.dateSortDirection } : {}),
    });
    closeAll();
  };

  const dateDim = dimensions.selectedDates;
  const flatDates =
    dateDim !== undefined &&
    dateDim.options.length > 0 &&
    dateDim.options.length <= MAX_FLAT_DATE_CHIPS
      ? dateDim
      : null;

  return (
    <div ref={barRef} className={styles.toolbar}>
      <div className={styles.controls}>
        {sections && sections.length > 0 && (
          <>
            {sections.map(section => (
              <FilterChip
                key={`section-${section.key}`}
                label={section.label}
                count={section.count}
                active={section.key === activeSectionKey}
                href={section.href}
              />
            ))}
            <span className={styles.separator} aria-hidden="true" />
          </>
        )}

        {showDateSort && (
          <FilterChip
            label="Order"
            trailing={ORDER_GLYPHS[filterState.dateSortDirection]}
            // In two-state mode the date sort is always engaged, so the chip stays active.
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

        {showHiddenToggle && (
          <FilterChip
            label="Hidden"
            count={counts?.hidden}
            // Lit means the non-public collections ARE on screen, which is an admin's default.
            // Switching it off previews the list as the general audience sees it.
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
              onToggle={() => toggleArrayFilter(filterState, onFilterChange, 'selectedDates', day)}
            />
          );
        })}

        {ARRAY_FILTER_KEYS.map(key => {
          if (key === 'selectedDates' && flatDates) return null;
          const dim = dimensions[key];
          if (!dim || dim.options.length === 0) return null;
          const selected = filterState[key] as readonly string[];
          const isOpen = openDropdown === key;
          return (
            <div key={key} className={styles.dropdown}>
              <button
                ref={node => {
                  triggerRefs.current[key] = node;
                }}
                type="button"
                aria-haspopup="true"
                aria-expanded={isOpen}
                className={`${styles.dropdownTrigger} ${selected.length > 0 ? styles.dropdownTriggerActive : ''}`}
                onClick={() => toggleOpen(key)}
              >
                {dim.label}
                <span className={styles.chevron} aria-hidden="true">
                  {isOpen ? '▴' : '▾'}
                </span>
              </button>
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

        <button
          type="button"
          className={`${styles.reset} ${hasActiveFilters ? '' : styles.resetInactive}`}
          onClick={resetAll}
          disabled={!hasActiveFilters}
          aria-label="Reset all filters"
        >
          ×
        </button>
      </div>

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
              {/* aria-hidden: the range input already announces its value natively. */}
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
  );
}
