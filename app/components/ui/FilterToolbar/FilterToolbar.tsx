'use client';

import { useCallback, useRef, useState } from 'react';

import { FilterChip } from '@/app/components/ui/FilterChip/FilterChip';
import { useClickOutside } from '@/app/hooks/useClickOutside';
import {
  type ArrayFilterKey,
  cycleDateSort,
  type FilmFilter,
  type FilterState,
  INITIAL_FILTER_STATE,
  toggleArrayFilter,
} from '@/app/types/GalleryFilter';

import styles from './FilterToolbar.module.scss';

/** One filterable dimension: which state key it writes, its dropdown label, its options, and optional value->label/count maps. */
export interface ToolbarDimension {
  label: string;
  options: readonly string[];
  /** Optional display labels for option values (e.g. lens-type 'wide' -> 'Wide'). */
  optionLabels?: Record<string, string>;
  /** Optional per-option contextual counts. */
  counts?: Record<string, number>;
}

/** Aggregate counts for the standalone toggles. */
export interface ToolbarCounts {
  highlyRated?: number;
  film?: number;
  digital?: number;
}

export interface FilterToolbarProps {
  filterState: FilterState;
  onFilterChange: (update: Partial<FilterState>) => void;
  /** Which array dimensions to surface as dropdowns, keyed by the FilterState array key. */
  dimensions: Partial<Record<ArrayFilterKey, ToolbarDimension>>;
  /** Subset of options still reachable under current filters; absent options render unavailable. null/undefined = all available. */
  filteredAvailable?: Partial<Record<ArrayFilterKey, readonly string[]>> | null;
  /** Aggregate counts for the highly-rated / film / digital toggles. */
  counts?: ToolbarCounts;
  showDateSort?: boolean;
  showHighlyRated?: boolean;
  showFilm?: boolean;
  /** When provided, renders the row-density slider (1-10). */
  density?: number;
  onDensityChange?: (value: number) => void;
}

const ARRAY_KEYS: readonly ArrayFilterKey[] = [
  'selectedTags',
  'selectedPeople',
  'selectedCameras',
  'selectedLenses',
  'selectedLocations',
  'selectedLensTypes',
];

const DATE_LABELS: Record<FilterState['dateSortDirection'], string> = {
  asc: 'Date ↑',
  desc: 'Date ↓',
  off: 'Date',
};

/**
 * Canonical, config-driven filter toolbar: dropdowns with a 3-state availability model, count
 * badges, highly-rated / film (neutral tri-state) / digital toggles, and an optional density slider.
 */
export function FilterToolbar({
  filterState,
  onFilterChange,
  dimensions,
  filteredAvailable,
  counts,
  showDateSort = false,
  showHighlyRated = false,
  showFilm = false,
  density,
  onDensityChange,
}: FilterToolbarProps) {
  const [openDropdown, setOpenDropdown] = useState<ArrayFilterKey | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const closeAll = useCallback(() => setOpenDropdown(null), []);
  useClickOutside(barRef, openDropdown !== null, closeAll);

  const toggleOpen = (key: ArrayFilterKey) => setOpenDropdown(prev => (prev === key ? null : key));

  const isAvailable = (key: ArrayFilterKey, value: string): boolean => {
    const avail = filteredAvailable?.[key];
    if (!avail) return true;
    return avail.includes(value);
  };

  const cycleFilm = () => {
    const next: Record<FilmFilter, FilmFilter> = { off: 'film', film: 'digital', digital: 'off' };
    onFilterChange({ filmFilter: next[filterState.filmFilter] });
  };

  const filmCount = filterState.filmFilter === 'off' ? undefined : counts?.[filterState.filmFilter];

  const hasActiveFilters =
    filterState.dateSortDirection !== 'off' ||
    filterState.highlyRatedOnly ||
    filterState.filmFilter !== 'off' ||
    ARRAY_KEYS.some(k => (filterState[k] as readonly string[]).length > 0);

  const resetAll = () => {
    onFilterChange({ ...INITIAL_FILTER_STATE });
    closeAll();
  };

  return (
    <div ref={barRef} className={styles.toolbar}>
      {showDateSort && (
        <FilterChip
          label={DATE_LABELS[filterState.dateSortDirection]}
          active={filterState.dateSortDirection !== 'off'}
          onToggle={() =>
            onFilterChange({ dateSortDirection: cycleDateSort(filterState.dateSortDirection) })
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

      {showFilm && (
        <FilterChip
          label={filterState.filmFilter === 'digital' ? 'Digital' : 'Film'}
          count={filmCount}
          tone={filterState.filmFilter === 'digital' ? 'digital' : 'film'}
          active={filterState.filmFilter !== 'off'}
          onToggle={cycleFilm}
        />
      )}

      {ARRAY_KEYS.map(key => {
        const dim = dimensions[key];
        if (!dim || dim.options.length === 0) return null;
        const selected = filterState[key] as readonly string[];
        const isOpen = openDropdown === key;
        return (
          <div key={key} className={styles.dropdown}>
            <button
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
                  const available = isSelected || isAvailable(key, option);
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

      {hasActiveFilters && (
        <button
          type="button"
          className={styles.reset}
          onClick={resetAll}
          aria-label="Reset all filters"
        >
          ×
        </button>
      )}

      {onDensityChange && density !== undefined && (
        <label className={styles.slider}>
          {/* aria-hidden: the range input already announces its value natively. */}
          <span className={styles.sliderLabel} aria-hidden="true">
            Density {density}
          </span>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={density}
            onChange={e => onDensityChange(Number(e.target.value))}
            aria-label="Row density"
          />
        </label>
      )}
    </div>
  );
}
