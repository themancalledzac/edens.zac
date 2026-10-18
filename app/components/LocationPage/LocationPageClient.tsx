'use client';

import { useMemo } from 'react';

import ContentBlockWithFullScreen from '@/app/components/Content/ContentBlockWithFullScreen';
import { FilteredEmptyState } from '@/app/components/SearchPage/FilteredEmptyState';
import { FilterToolbar } from '@/app/components/ui/FilterToolbar/FilterToolbar';
import { buildImagePageToolbarProps } from '@/app/components/ui/FilterToolbar/filterToolbarUtils';
import { useFilteredImagePage } from '@/app/hooks/useFilteredImagePage';
import { type CollectionModel } from '@/app/types/Collection';
import { type ViewableContent } from '@/app/types/Content';
import {
  type ArrayFilterKey,
  type FilterState,
  INITIAL_FILTER_STATE,
} from '@/app/types/GalleryFilter';
import {
  buildLocationCriteria,
  type ContentFilterCriteria,
  filmFilterFromIsFilm,
} from '@/app/utils/contentFilter';
import { processContentBlocks } from '@/app/utils/contentLayout';

import LocationCollections from './LocationCollections';

const SURFACED: readonly ArrayFilterKey[] = ['selectedTags', 'selectedPeople', 'selectedFilmTypes'];

/**
 * Seeds the location page's filter state from the URL criteria it understands: rating, film
 * filter, tags, people and film stock.
 */
function seedLocationState(initialCriteria: ContentFilterCriteria): FilterState {
  return {
    ...INITIAL_FILTER_STATE,
    highlyRatedOnly: initialCriteria.minRating !== undefined && initialCriteria.minRating >= 4,
    filmFilter: filmFilterFromIsFilm(initialCriteria.isFilm),
    selectedTags: initialCriteria.tags ?? [],
    selectedPeople: initialCriteria.people ?? [],
    selectedFilmTypes: initialCriteria.filmTypes ?? [],
  };
}

interface LocationPageClientProps {
  images: ViewableContent[];
  collections: CollectionModel[];
}

export default function LocationPageClient({ images, collections }: LocationPageClientProps) {
  const {
    filterState,
    handleFilterChange,
    availableOptions,
    visibility,
    filterCounts,
    filteredContent,
  } = useFilteredImagePage(images, buildLocationCriteria, seedLocationState);

  const contentBlocks = useMemo(
    () => processContentBlocks(filteredContent, true),
    [filteredContent]
  );

  const clearFilters = () =>
    handleFilterChange({
      ...INITIAL_FILTER_STATE,
      dateSortDirection: filterState.dateSortDirection,
    });

  return (
    <>
      <LocationCollections collections={collections} />

      <FilterToolbar
        filterState={filterState}
        onFilterChange={handleFilterChange}
        {...buildImagePageToolbarProps(
          { filterState, availableOptions, filterCounts, visibility },
          SURFACED
        )}
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
        <FilteredEmptyState onClear={clearFilters}>
          No images match the current filters.
        </FilteredEmptyState>
      )}
    </>
  );
}
