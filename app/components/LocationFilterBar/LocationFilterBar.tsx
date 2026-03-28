'use client';

import Image from 'next/image';

import { type CollectionModel } from '@/app/types/Collection';
import { type GalleryFilterState } from '@/app/types/GalleryFilter';
import { type ContentFilterOptions, type FilterCounts } from '@/app/utils/contentFilter';

import styles from './LocationFilterBar.module.scss';

interface LocationFilterBarProps {
  filterState: GalleryFilterState;
  onFilterChange: (update: Partial<GalleryFilterState>) => void;
  collections: CollectionModel[];
  availableOptions: ContentFilterOptions;
  filterCounts: FilterCounts;
}

export default function LocationFilterBar({
  filterState,
  onFilterChange,
  collections,
  availableOptions,
  filterCounts,
}: LocationFilterBarProps) {
  const showCollectionRow = collections.length >= 2;
  const showTagRow = availableOptions.tags.length > 0;
  const showPeopleRow = availableOptions.people.length >= 2;

  const cycleDateSort = () => {
    const next: Record<GalleryFilterState['dateSortDirection'], GalleryFilterState['dateSortDirection']> = {
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

  const toggleCollectionId = (id: number) => {
    const current = filterState.selectedCollectionIds;
    const next = current.includes(id)
      ? current.filter(cid => cid !== id)
      : [...current, id];
    onFilterChange({ selectedCollectionIds: next });
  };

  const toggleTag = (tag: string) => {
    const current = filterState.selectedTags;
    const next = current.includes(tag)
      ? current.filter(t => t !== tag)
      : [...current, tag];
    onFilterChange({ selectedTags: next });
  };

  const togglePerson = (person: string) => {
    const current = filterState.selectedPeople;
    const next = current.includes(person)
      ? current.filter(p => p !== person)
      : [...current, person];
    onFilterChange({ selectedPeople: next });
  };

  const dateSortLabel =
    filterState.dateSortDirection === 'desc'
      ? 'Date \u2193'
      : (filterState.dateSortDirection === 'asc'
        ? 'Date \u2191'
        : 'Date');

  return (
    <div className={styles.filterBar}>
      {/* Row 1: Toggle filters */}
      <div className={styles.toggleRow}>
        <button
          type="button"
          className={`${styles.chip} ${filterState.dateSortDirection !== 'off' ? styles.chipActive : ''}`}
          onClick={cycleDateSort}
        >
          {dateSortLabel}
        </button>

        <button
          type="button"
          className={`${styles.chip} ${filterState.highlyRatedOnly ? styles.chipActive : ''}`}
          onClick={() => onFilterChange({ highlyRatedOnly: !filterState.highlyRatedOnly })}
        >
          Highly Rated
          <span className={styles.count}>{filterCounts.highlyRated}</span>
        </button>

        {(availableOptions.hasFilm && availableOptions.hasDigital) && (
          <button
            type="button"
            className={`${styles.chip} ${
              filterState.filmFilter === 'film'
                ? styles.chipFilm
                : (filterState.filmFilter === 'digital' ? styles.chipDigital : '')
            }`}
            onClick={cycleFilmFilter}
          >
            {filterState.filmFilter === 'digital' ? 'Digital' : 'Film'}
            {filterState.filmFilter !== 'off' && (
              <span className={styles.count}>
                {filterState.filmFilter === 'film' ? filterCounts.film : filterCounts.digital}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Row 2: Collection mini-cards */}
      {showCollectionRow && (
        <div className={styles.collectionRow}>
          {collections.map(collection => {
            const isSelected = filterState.selectedCollectionIds.includes(collection.id);
            return (
              <button
                key={collection.id}
                type="button"
                className={`${styles.collectionCard} ${isSelected ? styles.collectionCardActive : ''}`}
                onClick={() => toggleCollectionId(collection.id)}
              >
                {collection.coverImage?.imageUrl && (
                  <div className={styles.collectionThumbnail}>
                    <Image
                      src={collection.coverImage.imageUrl}
                      alt={collection.title}
                      fill
                      sizes="(min-width: 768px) 180px, 120px"
                      className={styles.collectionThumbnailImage}
                    />
                  </div>
                )}
                <span className={styles.collectionTitle}>
                  {collection.title}
                  {filterCounts.collections[collection.id] !== undefined && (
                    <span className={styles.collectionCount}>
                      {filterCounts.collections[collection.id]}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Row 3: Tag chips */}
      {showTagRow && (
        <div className={styles.wrapRow}>
          {availableOptions.tags.map(tag => {
            const isSelected = filterState.selectedTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
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

      {/* Row 4: People chips */}
      {showPeopleRow && (
        <div className={styles.wrapRow}>
          {availableOptions.people.map(person => {
            const isSelected = filterState.selectedPeople.includes(person);
            return (
              <button
                key={person}
                type="button"
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
