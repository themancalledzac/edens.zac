'use client';

import { type GalleryFilterState } from '@/app/types/GalleryFilter';
import { type ContentFilterOptions, type FilterCounts } from '@/app/utils/contentFilter';

import styles from './LocationFilterBar.module.scss';

interface LocationFilterBarProps {
  filterState: GalleryFilterState;
  onFilterChange: (update: Partial<GalleryFilterState>) => void;
  availableOptions: ContentFilterOptions;
  filterCounts: FilterCounts;
}

export default function LocationFilterBar({
  filterState,
  onFilterChange,
  availableOptions,
  filterCounts,
}: LocationFilterBarProps) {
  const showTagRow = availableOptions.tags.length > 0;
  const showPeopleRow = availableOptions.people.length >= 2;

  const cycleDateSort = () => {
    const next: Record<
      GalleryFilterState['dateSortDirection'],
      GalleryFilterState['dateSortDirection']
    > = {
      off: 'desc',
      desc: 'asc',
      asc: 'off',
    };
    onFilterChange({ dateSortDirection: next[filterState.dateSortDirection] });
  };

  const cycleFilmFilter = () => {
    const next: Record<GalleryFilterState['filmFilter'], GalleryFilterState['filmFilter']> = {
      off: 'film',
      film: 'digital',
      digital: 'off',
    };
    onFilterChange({ filmFilter: next[filterState.filmFilter] });
  };

  const toggleTag = (tag: string) => {
    const current = filterState.selectedTags;
    const next = current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag];
    onFilterChange({ selectedTags: next });
  };

  const togglePerson = (person: string) => {
    const current = filterState.selectedPeople;
    const next = current.includes(person)
      ? current.filter(p => p !== person)
      : [...current, person];
    onFilterChange({ selectedPeople: next });
  };

  const dateSortLabels: Record<typeof filterState.dateSortDirection, string> = {
    desc: 'Date \u2193',
    asc: 'Date \u2191',
    off: 'Date',
  };
  const dateSortLabel = dateSortLabels[filterState.dateSortDirection];

  return (
    <div className={styles.filterBar}>
      <div className={styles.toggleRow}>
        <button
          type="button"
          aria-pressed={filterState.dateSortDirection !== 'off'}
          className={`${styles.chip} ${filterState.dateSortDirection !== 'off' ? styles.chipActive : ''}`}
          onClick={cycleDateSort}
        >
          {dateSortLabel}
        </button>

        <button
          type="button"
          aria-pressed={filterState.highlyRatedOnly}
          className={`${styles.chip} ${filterState.highlyRatedOnly ? styles.chipActive : ''}`}
          onClick={() => onFilterChange({ highlyRatedOnly: !filterState.highlyRatedOnly })}
        >
          Highly Rated
          <span className={styles.count}>{filterCounts.highlyRated}</span>
        </button>

        <button
          type="button"
          aria-pressed={filterState.filmFilter !== 'off'}
          className={`${styles.chip} ${filterState.filmFilter === 'film' ? styles.chipFilm : ''}${filterState.filmFilter === 'digital' ? styles.chipDigital : ''}`}
          onClick={cycleFilmFilter}
        >
          {filterState.filmFilter === 'digital' ? 'Digital' : 'Film'}
          {filterState.filmFilter !== 'off' && (
            <span className={styles.count}>
              {filterState.filmFilter === 'film' ? filterCounts.film : filterCounts.digital}
            </span>
          )}
        </button>
      </div>

      {showTagRow && (
        <div className={styles.wrapRow}>
          {availableOptions.tags.map(tag => {
            const isSelected = filterState.selectedTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={isSelected}
                className={`${styles.chip} ${isSelected ? styles.chipActive : ''}`}
                onClick={() => toggleTag(tag)}
              >
                {tag}
                <span className={styles.count}>{filterCounts.tags[tag] ?? 0}</span>
              </button>
            );
          })}
        </div>
      )}

      {showPeopleRow && (
        <div className={styles.wrapRow}>
          {availableOptions.people.map(person => {
            const isSelected = filterState.selectedPeople.includes(person);
            return (
              <button
                key={person}
                type="button"
                aria-pressed={isSelected}
                className={`${styles.chip} ${isSelected ? styles.chipActive : ''}`}
                onClick={() => togglePerson(person)}
              >
                {person}
                <span className={styles.count}>{filterCounts.people[person] ?? 0}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
