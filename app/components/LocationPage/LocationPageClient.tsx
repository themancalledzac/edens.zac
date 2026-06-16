'use client';

import { useCallback, useMemo, useState } from 'react';

import ContentBlockWithFullScreen from '@/app/components/Content/ContentBlockWithFullScreen';
import { FilterToolbar } from '@/app/components/ui/FilterToolbar/FilterToolbar';
import { useFilterUrlState } from '@/app/hooks/useFilterUrlState';
import { type CollectionModel } from '@/app/types/Collection';
import { type ContentImageModel } from '@/app/types/Content';
import { type FilterState, INITIAL_FILTER_STATE } from '@/app/types/GalleryFilter';
import {
  applyActiveOverride,
  buildLocationCriteria,
  computeFilterCounts,
  computeFilterVisibility,
  extractFilterOptions,
  filmFilterFromIsFilm,
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
  const { initialCriteria, syncToUrl } = useFilterUrlState();

  const [filterState, setFilterState] = useState<FilterState>(() => ({
    ...INITIAL_FILTER_STATE,
    highlyRatedOnly: initialCriteria.minRating !== undefined && initialCriteria.minRating >= 4,
    filmFilter: filmFilterFromIsFilm(initialCriteria.isFilm),
    selectedTags: initialCriteria.tags ?? [],
    selectedPeople: initialCriteria.people ?? [],
  }));

  const availableOptions = useMemo(() => extractFilterOptions(images), [images]);

  const baseVisibility = useMemo(() => computeFilterVisibility(images), [images]);
  const visibility = useMemo(
    () => applyActiveOverride(baseVisibility, filterState),
    [baseVisibility, filterState]
  );

  const criteria = useMemo(() => buildLocationCriteria(filterState), [filterState]);

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

  const handleFilterChange = useCallback(
    (update: Partial<FilterState>) => {
      setFilterState(prev => {
        const next = { ...prev, ...update };
        // Single source of truth with the `criteria` memo. dateSortDirection /
        // lens dimensions have no URL key in serializeFilterToParams and stay
        // local by design.
        syncToUrl(buildLocationCriteria(next));
        return next;
      });
    },
    [syncToUrl]
  );

  return (
    <>
      <LocationCollections collections={collections} />

      <FilterToolbar
        filterState={filterState}
        onFilterChange={handleFilterChange}
        dimensions={{
          ...(visibility.tags
            ? {
                selectedTags: {
                  label: 'Tags',
                  options: availableOptions.tags,
                  counts: filterCounts.tags,
                },
              }
            : {}),
          ...(visibility.people
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
        showDateSort={visibility.dateSort}
        showHighlyRated={visibility.highlyRated}
        showFilm={visibility.film}
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
