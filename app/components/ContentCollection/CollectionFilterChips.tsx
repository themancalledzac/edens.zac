'use client';

import { type CollectionFilterState } from '@/app/types/GalleryFilter';

import cbStyles from '../Content/ContentComponent.module.scss';
import { type CollectionFilterOptions } from './CollectionFilterContext';
import FocalLengthRangeSlider from './FocalLengthRangeSlider';

type ArrayFilterKey = 'selectedTags' | 'selectedPeople' | 'selectedCameras' | 'selectedLenses';

export function toggleArrayFilter(
  state: CollectionFilterState,
  onChange: (update: Partial<CollectionFilterState>) => void,
  key: ArrayFilterKey,
  value: string
) {
  const current = state[key];
  const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
  onChange({ [key]: next });
}

interface CollectionFilterChipsProps {
  filterState: CollectionFilterState;
  filterOptions: CollectionFilterOptions;
  onFilterChange: (update: Partial<CollectionFilterState>) => void;
}

export default function CollectionFilterChips({
  filterState,
  filterOptions,
  onFilterChange,
}: CollectionFilterChipsProps) {
  const sections: Array<{
    label: string;
    options: string[];
    stateKey: ArrayFilterKey;
    selected: readonly string[];
  }> = [
    {
      label: 'Tags',
      options: filterOptions.tags,
      stateKey: 'selectedTags',
      selected: filterState.selectedTags,
    },
    {
      label: 'People',
      options: filterOptions.people,
      stateKey: 'selectedPeople',
      selected: filterState.selectedPeople,
    },
    {
      label: 'Cameras',
      options: filterOptions.cameras,
      stateKey: 'selectedCameras',
      selected: filterState.selectedCameras,
    },
    {
      label: 'Lenses',
      options: filterOptions.lenses,
      stateKey: 'selectedLenses',
      selected: filterState.selectedLenses,
    },
  ];

  const dateSortLabels: Record<CollectionFilterState['dateSortDirection'], string> = {
    asc: 'Date \u2191',
    desc: 'Date \u2193',
    off: 'Date',
  };
  const dateSortLabel = dateSortLabels[filterState.dateSortDirection];

  const cycleDateSort = () => {
    const next: Record<
      CollectionFilterState['dateSortDirection'],
      CollectionFilterState['dateSortDirection']
    > = {
      off: 'asc',
      asc: 'desc',
      desc: 'off',
    };
    onFilterChange({ dateSortDirection: next[filterState.dateSortDirection] });
  };

  const showFocalLength = filterOptions.focalLengthStops.length >= 2;

  return (
    <div className={cbStyles.filterChipsSection}>
      <div className={cbStyles.filterChipOptions}>
        <button
          type="button"
          className={`${cbStyles.filterChipToggle} ${filterState.dateSortDirection !== 'off' ? cbStyles.filterChipActive : ''}`}
          onClick={cycleDateSort}
        >
          {dateSortLabel}
        </button>
        {filterOptions.showHighlyRated && (
          <button
            type="button"
            className={`${cbStyles.filterChipToggle} ${filterState.highlyRatedOnly ? cbStyles.filterChipActive : ''}`}
            onClick={() => onFilterChange({ highlyRatedOnly: !filterState.highlyRatedOnly })}
          >
            Highly Rated
          </button>
        )}
        {showFocalLength && (
          <FocalLengthRangeSlider
            stops={filterOptions.focalLengthStops}
            value={filterState.focalLengthRange}
            onChange={range => onFilterChange({ focalLengthRange: range })}
          />
        )}
      </div>

      {sections
        .filter(s => s.options.length > 0)
        .map(({ label, options, stateKey, selected }, idx) => (
          <div key={label}>
            {idx > 0 && <div className={cbStyles.filterChipDivider} />}
            <div className={cbStyles.filterChipOptions}>
              {options.map(option => (
                <button
                  key={option}
                  type="button"
                  className={`${cbStyles.filterChip} ${selected.includes(option) ? cbStyles.filterChipActive : ''}`}
                  onClick={() => toggleArrayFilter(filterState, onFilterChange, stateKey, option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
