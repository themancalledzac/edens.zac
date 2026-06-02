'use client';

import { useCallback, useMemo, useState } from 'react';

import ContentBlockWithFullScreen from '@/app/components/Content/ContentBlockWithFullScreen';
import { FilterToolbar } from '@/app/components/ui/FilterToolbar/FilterToolbar';
import { type CollectionModel } from '@/app/types/Collection';
import { type ContentImageModel } from '@/app/types/Content';
import { type FilterState, INITIAL_FILTER_STATE } from '@/app/types/GalleryFilter';
import {
  computeFilterCounts,
  extractFilterOptions,
  filterContent,
  type FilterCounts,
} from '@/app/utils/contentFilter';
import { processContentBlocks } from '@/app/utils/contentLayout';
import { logger } from '@/app/utils/logger';
import { sortByDate } from '@/app/utils/sortByDate';

import LocationCollections from './LocationCollections';
import styles from './LocationPageClient.module.scss';

interface LocationPageClientProps {
  images: ContentImageModel[];
  collections: CollectionModel[];
}

export default function LocationPageClient({ images, collections }: LocationPageClientProps) {
  const [filterState, setFilterState] = useState<FilterState>(INITIAL_FILTER_STATE);

  const availableOptions = useMemo(() => extractFilterOptions(images), [images]);

  const criteria = useMemo(
    () => ({
      ...(filterState.highlyRatedOnly ? { minRating: 4 } : {}),
      ...(filterState.filmFilter === 'film' ? { isFilm: true as const } : {}),
      ...(filterState.filmFilter === 'digital' ? { isFilm: false as const } : {}),
      ...(filterState.selectedTags.length > 0 ? { tags: filterState.selectedTags } : {}),
      ...(filterState.selectedPeople.length > 0 ? { people: filterState.selectedPeople } : {}),
    }),
    [filterState]
  );

  const filteredImages = useMemo(() => {
    const filtered = filterContent(images, criteria).filter(
      (item): item is ContentImageModel => item.contentType === 'IMAGE'
    );
    if (filterState.dateSortDirection !== 'off') {
      return sortByDate(filtered, filterState.dateSortDirection);
    }
    return filtered;
  }, [images, criteria, filterState.dateSortDirection]);

  const filterCounts: FilterCounts = useMemo(() => {
    try {
      return computeFilterCounts(images, criteria, availableOptions);
    } catch (error) {
      logger.error('LocationPageClient', 'Failed to compute filter counts', error);
      return {
        highlyRated: 0,
        film: 0,
        digital: 0,
        collections: {},
        tags: {},
        people: {},
        cameras: {},
        lenses: {},
        locations: {},
      };
    }
  }, [images, criteria, availableOptions]);

  const contentBlocks = useMemo(() => processContentBlocks(filteredImages, true), [filteredImages]);

  const handleFilterChange = useCallback((update: Partial<FilterState>) => {
    setFilterState(prev => ({ ...prev, ...update }));
  }, []);

  return (
    <>
      <LocationCollections collections={collections} />

      <FilterToolbar
        filterState={filterState}
        onFilterChange={handleFilterChange}
        dimensions={{
          ...(availableOptions.tags.length > 0
            ? {
                selectedTags: {
                  label: 'Tags',
                  options: availableOptions.tags,
                  counts: filterCounts.tags,
                },
              }
            : {}),
          ...(availableOptions.people.length >= 2
            ? {
                selectedPeople: {
                  label: 'People',
                  options: availableOptions.people,
                  counts: filterCounts.people,
                },
              }
            : {}),
        }}
        counts={{
          highlyRated: filterCounts.highlyRated,
          film: filterCounts.film,
          digital: filterCounts.digital,
        }}
        showDateSort
        showHighlyRated
        showFilm
      />

      {contentBlocks.length > 0 ? (
        <ContentBlockWithFullScreen
          content={contentBlocks}
          priorityBlockIndex={0}
          enableFullScreenView
          initialPageSize={30}
          chunkSize={4}
        />
      ) : (
        <p className={styles.emptyState}>No images match the current filters.</p>
      )}
    </>
  );
}
