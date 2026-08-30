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
  locations: {},
};

interface SearchPageClientProps {
  images: ContentImageModel[];
}

/**
 * The public search surface: the shared {@link FilterToolbar} over the whole image corpus.
 *
 * Every other gallery view arrives already narrowed — to a collection, a tag, a location — and
 * wires the subset of dimensions that narrowing leaves meaningful. Search arrives at everything,
 * so it surfaces all five image-derived dropdowns plus the order, rating and film controls, gated
 * only by {@link computeFilterVisibility}: a dimension that every image shares, or that none
 * carries, cannot narrow anything and is hidden rather than rendered as a dead control.
 *
 * Filtering is client-side over a corpus the route fetched once. The backend's search endpoint
 * takes ids while the URL carries names, so pushing the filters down would mean resolving names
 * to ids on every keystroke — a second round trip per interaction to reproduce work the tested
 * in-memory helpers already do. The location and tag pages made the same trade.
 *
 * Two states are deliberately distinct. No filters and no corpus means the backend returned
 * nothing; filters with no survivors means the query is too narrow. They read differently because
 * the fix differs, and a single "no results" would hide which one happened.
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
