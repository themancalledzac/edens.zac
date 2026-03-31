'use client';

import { type CollectionFilterState } from '@/app/types/GalleryFilter';

import cbStyles from '../Content/ContentComponent.module.scss';

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
  filterOptions: { tags: string[]; people: string[]; cameras: string[]; lenses: string[] };
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

  const hasAnySections = sections.some(s => s.options.length > 0);

  if (!hasAnySections) return null;

  return (
    <div className={cbStyles.filterChipsSection}>
      <button
        type="button"
        className={`${cbStyles.filterChipToggle} ${filterState.highlyRatedOnly ? cbStyles.filterChipActive : ''}`}
        onClick={() => onFilterChange({ highlyRatedOnly: !filterState.highlyRatedOnly })}
      >
        Highly Rated
      </button>
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
