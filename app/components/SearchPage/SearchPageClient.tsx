'use client';

import { useCallback, useMemo, useState } from 'react';

import ContentBlockWithFullScreen from '@/app/components/Content/ContentBlockWithFullScreen';
import { CollectionHeader } from '@/app/components/ui/CollectionHeader/CollectionHeader';
import { FilterToolbar } from '@/app/components/ui/FilterToolbar/FilterToolbar';
import { EmptyState } from '@/app/components/ui/StatusText/EmptyState';
import { useFilterUrlState } from '@/app/hooks/useFilterUrlState';
import { type ContentImageModel } from '@/app/types/Content';
import { type FilterState } from '@/app/types/GalleryFilter';
import {
  applyActiveOverride,
  computeFilterCounts,
  computeFilterVisibility,
  extractFilterOptions,
  filterContent,
  type FilterCounts,
} from '@/app/utils/contentFilter';
import { processContentBlocks } from '@/app/utils/contentLayout';
import { logger } from '@/app/utils/logger';
import { sortByDate } from '@/app/utils/sortByDate';

import { buildSearchCriteria, seedFilterState } from './searchFilters';

const EMPTY_COUNTS: FilterCounts = {
  highlyRated: 0,
  film: 0,
  digital: 0,
  collections: {},
  tags: {},
  people: {},
  cameras: {},
  lenses: {},
  filmTypes: {},
  locations: {},
};

interface SearchPageClientProps {
  images: ContentImageModel[];
}

/**
 * The public search surface: the shared {@link FilterToolbar} over the whole image corpus.
 *
 * Surfaces every image-derived dimension, gated by {@link computeFilterVisibility} so a dimension
 * that cannot narrow anything is hidden. Filters client-side over the corpus the route fetched.
 * The empty corpus and empty result states are separate on purpose — they need different fixes.
 */
export default function SearchPageClient({ images }: SearchPageClientProps) {
  const { initialCriteria, syncToUrl } = useFilterUrlState();

  const [filterState, setFilterState] = useState<FilterState>(() =>
    seedFilterState(initialCriteria)
  );

  const availableOptions = useMemo(() => extractFilterOptions(images), [images]);

  const baseVisibility = useMemo(() => computeFilterVisibility(images), [images]);
  const visibility = useMemo(
    () => applyActiveOverride(baseVisibility, filterState),
    [baseVisibility, filterState]
  );

  const criteria = useMemo(() => buildSearchCriteria(filterState), [filterState]);

  const filteredImages = useMemo(() => {
    const filtered = filterContent(images, criteria).filter(
      (item): item is ContentImageModel => item.contentType === 'IMAGE'
    );
    if (filterState.dateSortDirection === 'off') return filtered;
    return sortByDate(filtered, filterState.dateSortDirection);
  }, [images, criteria, filterState.dateSortDirection]);

  const filterCounts: FilterCounts = useMemo(() => {
    try {
      return computeFilterCounts(images, criteria, availableOptions);
    } catch (error) {
      logger.error('SearchPageClient', 'Failed to compute filter counts', error);
      return EMPTY_COUNTS;
    }
  }, [images, criteria, availableOptions]);

  const contentBlocks = useMemo(() => processContentBlocks(filteredImages, true), [filteredImages]);

  const handleFilterChange = useCallback(
    (update: Partial<FilterState>) => {
      setFilterState(prev => {
        const next = { ...prev, ...update };
        syncToUrl(buildSearchCriteria(next));
        return next;
      });
    },
    [syncToUrl]
  );

  return (
    <>
      <CollectionHeader title="Search" count={filteredImages.length} />

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
          ...(visibility.locations
            ? {
                selectedLocations: {
                  label: 'Locations',
                  options: availableOptions.locations,
                  counts: filterCounts.locations,
                },
              }
            : {}),
          ...(visibility.cameras
            ? {
                selectedCameras: {
                  label: 'Cameras',
                  options: availableOptions.cameras,
                  counts: filterCounts.cameras,
                },
              }
            : {}),
          ...(visibility.lenses
            ? {
                selectedLenses: {
                  label: 'Lenses',
                  options: availableOptions.lenses,
                  counts: filterCounts.lenses,
                },
              }
            : {}),
          ...(visibility.filmTypes && filterState.filmFilter === 'film'
            ? {
                selectedFilmTypes: {
                  label: 'Film stock',
                  options: availableOptions.filmTypes,
                  counts: filterCounts.filmTypes,
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

      {contentBlocks.length > 0 && (
        <ContentBlockWithFullScreen
          content={contentBlocks}
          priorityBlockIndex={0}
          enableFullScreenView
          initialPageSize={30}
          chunkSize={4}
        />
      )}

      {contentBlocks.length === 0 && images.length > 0 && (
        <EmptyState align="page">No photos match the current filters.</EmptyState>
      )}

      {images.length === 0 && (
        <EmptyState align="page">There are no photos to search yet.</EmptyState>
      )}
    </>
  );
}
