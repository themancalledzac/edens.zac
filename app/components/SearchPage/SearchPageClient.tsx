'use client';

import { useMemo } from 'react';

import ContentBlockWithFullScreen from '@/app/components/Content/ContentBlockWithFullScreen';
import { CollectionHeader } from '@/app/components/ui/CollectionHeader/CollectionHeader';
import { FilterToolbar } from '@/app/components/ui/FilterToolbar/FilterToolbar';
import { buildImagePageToolbarProps } from '@/app/components/ui/FilterToolbar/filterToolbarUtils';
import { EmptyState } from '@/app/components/ui/StatusText/EmptyState';
import { useFilteredImagePage } from '@/app/hooks/useFilteredImagePage';
import { type ContentImageModel } from '@/app/types/Content';
import { type ArrayFilterKey, INITIAL_FILTER_STATE } from '@/app/types/GalleryFilter';
import { isImageContent } from '@/app/utils/contentFilter';
import { processContentBlocks } from '@/app/utils/contentLayout';
import { type SsrViewport } from '@/app/utils/ssrViewport';

import { FilteredEmptyState } from './FilteredEmptyState';
import { buildSearchCriteria, seedFilterState } from './searchFilters';

const SURFACED: readonly ArrayFilterKey[] = [
  'selectedTags',
  'selectedPeople',
  'selectedLocations',
  'selectedCameras',
  'selectedLenses',
  'selectedFilmTypes',
];

interface SearchPageClientProps {
  images: ContentImageModel[];
  ssrViewport?: SsrViewport;
}

/**
 * The public search surface: the shared {@link FilterToolbar} over the whole image corpus.
 *
 * Surfaces every image-derived dimension, gated by {@link computeFilterVisibility} so a dimension
 * that cannot narrow anything is hidden. Filters client-side over the corpus the route fetched.
 * `ssrViewport` lets the grid lay out on the server. The empty corpus and empty result states
 * are separate on purpose, because they need different fixes.
 */
export default function SearchPageClient({ images, ssrViewport }: SearchPageClientProps) {
  const {
    filterState,
    handleFilterChange,
    availableOptions,
    visibility,
    filterCounts,
    filteredContent,
  } = useFilteredImagePage(images, buildSearchCriteria, seedFilterState);

  const filteredImages = useMemo(() => filteredContent.filter(isImageContent), [filteredContent]);

  const contentBlocks = useMemo(() => processContentBlocks(filteredImages, true), [filteredImages]);

  const clearFilters = () =>
    handleFilterChange({
      ...INITIAL_FILTER_STATE,
      dateSortDirection: filterState.dateSortDirection,
    });

  return (
    <>
      <CollectionHeader title="Search" count={filteredImages.length} />

      <FilterToolbar
        filterState={filterState}
        onFilterChange={handleFilterChange}
        {...buildImagePageToolbarProps(
          { filterState, availableOptions, filterCounts, visibility },
          SURFACED
        )}
      />

      {contentBlocks.length > 0 && (
        <ContentBlockWithFullScreen
          content={contentBlocks}
          priorityBlockIndex={0}
          enableFullScreenView
          initialPageSize={30}
          chunkSize={4}
          ssrViewport={ssrViewport}
        />
      )}

      {contentBlocks.length === 0 && images.length > 0 && (
        <FilteredEmptyState onClear={clearFilters}>
          No photos match the current filters.
        </FilteredEmptyState>
      )}

      {images.length === 0 && (
        <EmptyState align="page">There are no photos to search yet.</EmptyState>
      )}
    </>
  );
}
