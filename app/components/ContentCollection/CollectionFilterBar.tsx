'use client';

import { useCallback, useRef, useState } from 'react';

import { useClickOutside } from '@/app/hooks/useClickOutside';
import {
  type CollectionFilterState,
  INITIAL_COLLECTION_FILTER_STATE,
} from '@/app/types/GalleryFilter';

import cbStyles from '../Content/ContentComponent.module.scss';
import {
  type CollectionFilterOptions,
  type FilteredAvailableOptions,
} from './CollectionFilterContext';

type ArrayFilterKey =
  | 'selectedTags'
  | 'selectedPeople'
  | 'selectedCameras'
  | 'selectedLenses'
  | 'selectedLensTypes';

const LENS_TYPE_LABELS: Record<string, string> = {
  wide: 'Wide',
  normal: 'Normal',
  telephoto: 'Telephoto',
};

export function toggleArrayFilter(
  state: CollectionFilterState,
  onChange: (update: Partial<CollectionFilterState>) => void,
  key: ArrayFilterKey,
  value: string
) {
  const current = state[key] as readonly string[];
  const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
  onChange({ [key]: next });
}

// ── Dropdown item ──

interface FilterDropdownProps {
  label: string;
  isActive: boolean;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function FilterDropdown({ label, isActive, isOpen, onToggle, children }: FilterDropdownProps) {
  return (
    <div className={cbStyles.filterBarDropdown}>
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={isOpen}
        className={`${cbStyles.filterBarItem} ${isActive ? cbStyles.filterBarItemActive : ''}`}
        onClick={onToggle}
      >
        {label}
        <span className={cbStyles.filterBarChevron} aria-hidden="true">
          {isOpen ? '\u25B4' : '\u25BE'}
        </span>
      </button>
      {isOpen && <div className={cbStyles.filterBarPanel}>{children}</div>}
    </div>
  );
}

// ── Main component ──

interface CollectionFilterBarProps {
  filterState: CollectionFilterState;
  filterOptions: CollectionFilterOptions;
  filteredAvailable: FilteredAvailableOptions;
  onFilterChange: (update: Partial<CollectionFilterState>) => void;
}

export default function CollectionFilterBar({
  filterState,
  filterOptions,
  filteredAvailable,
  onFilterChange,
}: CollectionFilterBarProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const closeAll = useCallback(() => setOpenDropdown(null), []);
  useClickOutside(barRef, openDropdown !== null, closeAll);

  const toggle = (id: string) => setOpenDropdown(prev => (prev === id ? null : id));

  // ── Availability check (3-state logic) ──
  const isAvailable = (key: ArrayFilterKey, value: string): boolean => {
    if (!filteredAvailable) return true;
    const map: Record<ArrayFilterKey, string[]> = {
      selectedPeople: filteredAvailable.people,
      selectedCameras: filteredAvailable.cameras,
      selectedLenses: filteredAvailable.lenses,
      selectedLensTypes: filteredAvailable.lensTypes,
      selectedTags: filteredAvailable.tags,
    };
    return map[key].includes(value);
  };

  // ── Render a chip inside a dropdown panel ──
  const renderChip = (
    stateKey: ArrayFilterKey,
    option: string,
    selected: readonly string[],
    label?: string
  ) => {
    const isSelected = selected.includes(option);
    const available = isSelected || isAvailable(stateKey, option);
    return (
      <button
        key={`${stateKey}-${option}`}
        type="button"
        className={`${cbStyles.filterBarChip} ${isSelected ? cbStyles.filterBarChipActive : ''} ${!available ? cbStyles.filterBarChipUnavailable : ''}`}
        onClick={() => {
          if (!available) return;
          toggleArrayFilter(filterState, onFilterChange, stateKey, option);
          closeAll();
        }}
        disabled={!available}
      >
        {label ?? option}
      </button>
    );
  };

  // ── Date toggle ──
  const dateSortLabels: Record<CollectionFilterState['dateSortDirection'], string> = {
    asc: 'Date \u2191',
    desc: 'Date \u2193',
    off: 'Date',
  };

  const cycleDateSort = () => {
    const next: Record<
      CollectionFilterState['dateSortDirection'],
      CollectionFilterState['dateSortDirection']
    > = { off: 'asc', asc: 'desc', desc: 'off' };
    onFilterChange({ dateSortDirection: next[filterState.dateSortDirection] });
  };

  // ── Which dropdowns exist ──
  const hasPeople = filterOptions.people.length > 0;
  const hasTags = filterOptions.tags.length > 0;
  const hasCameras = filterOptions.cameras.length > 0;
  // Lens dropdown shown if we have lens names OR lens types
  const hasLensNames = filterOptions.lenses.length > 0;
  const hasLensTypes = filterOptions.lensTypes.length > 0;
  const hasLens = hasLensNames || hasLensTypes;

  // Active state per dropdown (has any selection)
  const isPeopleActive = filterState.selectedPeople.length > 0;
  const isTagsActive = filterState.selectedTags.length > 0;
  const isCamerasActive = filterState.selectedCameras.length > 0;
  const isLensActive =
    filterState.selectedLenses.length > 0 || filterState.selectedLensTypes.length > 0;

  const hasActiveFilters =
    filterState.dateSortDirection !== 'off' ||
    filterState.highlyRatedOnly ||
    isPeopleActive ||
    isTagsActive ||
    isCamerasActive ||
    isLensActive;

  const resetAll = () => {
    onFilterChange({ ...INITIAL_COLLECTION_FILTER_STATE });
    closeAll();
  };

  return (
    <div ref={barRef} className={cbStyles.filterBar}>
      {/* Date toggle — direct action, no dropdown */}
      <button
        type="button"
        className={`${cbStyles.filterBarItem} ${filterState.dateSortDirection !== 'off' ? cbStyles.filterBarItemActive : ''}`}
        onClick={cycleDateSort}
      >
        {dateSortLabels[filterState.dateSortDirection]}
      </button>

      {/* Rated toggle — direct action, no dropdown */}
      {filterOptions.showHighlyRated && (
        <button
          type="button"
          className={`${cbStyles.filterBarItem} ${filterState.highlyRatedOnly ? cbStyles.filterBarItemActive : ''}`}
          onClick={() => onFilterChange({ highlyRatedOnly: !filterState.highlyRatedOnly })}
        >
          Rated
        </button>
      )}

      {/* People dropdown */}
      {hasPeople && (
        <FilterDropdown
          label="People"
          isActive={isPeopleActive}
          isOpen={openDropdown === 'people'}
          onToggle={() => toggle('people')}
        >
          {filterOptions.people.map(p =>
            renderChip('selectedPeople', p, filterState.selectedPeople)
          )}
        </FilterDropdown>
      )}

      {/* Tags dropdown */}
      {hasTags && (
        <FilterDropdown
          label="Tags"
          isActive={isTagsActive}
          isOpen={openDropdown === 'tags'}
          onToggle={() => toggle('tags')}
        >
          {filterOptions.tags.map(t => renderChip('selectedTags', t, filterState.selectedTags))}
        </FilterDropdown>
      )}

      {/* Camera dropdown */}
      {hasCameras && (
        <FilterDropdown
          label="Camera"
          isActive={isCamerasActive}
          isOpen={openDropdown === 'cameras'}
          onToggle={() => toggle('cameras')}
        >
          {filterOptions.cameras.map(c =>
            renderChip('selectedCameras', c, filterState.selectedCameras)
          )}
        </FilterDropdown>
      )}

      {/* Lens dropdown — lens types first, then lens names */}
      {hasLens && (
        <FilterDropdown
          label="Lens"
          isActive={isLensActive}
          isOpen={openDropdown === 'lens'}
          onToggle={() => toggle('lens')}
        >
          {hasLensTypes &&
            filterOptions.lensTypes.map(lt =>
              renderChip(
                'selectedLensTypes',
                lt,
                filterState.selectedLensTypes,
                LENS_TYPE_LABELS[lt] ?? lt
              )
            )}
          {hasLensTypes && hasLensNames && <div className={cbStyles.filterBarPanelDivider} />}
          {hasLensNames &&
            filterOptions.lenses.map(l =>
              renderChip('selectedLenses', l, filterState.selectedLenses)
            )}
        </FilterDropdown>
      )}

      {/* Reset button — only visible when filters are active */}
      {hasActiveFilters && (
        <button
          type="button"
          className={cbStyles.filterBarReset}
          onClick={resetAll}
          aria-label="Reset all filters"
        >
          ×
        </button>
      )}
    </div>
  );
}
