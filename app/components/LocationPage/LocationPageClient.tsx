'use client';

import { useCallback, useMemo, useState } from 'react';

import ContentBlockWithFullScreen from '@/app/components/Content/ContentBlockWithFullScreen';
import LocationFilterBar from '@/app/components/LocationFilterBar/LocationFilterBar';
import { type CollectionModel } from '@/app/types/Collection';
import { type ContentImageModel } from '@/app/types/Content';
import { type GalleryFilterState, INITIAL_GALLERY_FILTER_STATE } from '@/app/types/GalleryFilter';
import {
  computeFilterCounts,
  extractFilterOptions,
  filterContent,
  type FilterCounts,
} from '@/app/utils/contentFilter';
import { processContentBlocks } from '@/app/utils/contentLayout';

import LocationCollections from './LocationCollections';

interface LocationPageClientProps {
  images: ContentImageModel[];
  collections: CollectionModel[];
}

function sortByDate(images: ContentImageModel[], direction: 'asc' | 'desc'): ContentImageModel[] {
  return [...images].sort((a, b) => {
    // captureDate is date-only ("2025-10-07") — no intra-day precision.
    // Use createdAt as tiebreaker so images shot the same day get a stable,
    // meaningful order (upload sequence approximates capture sequence).
    const dateA = a.captureDate ? new Date(a.captureDate).getTime() : 0;
    const dateB = b.captureDate ? new Date(b.captureDate).getTime() : 0;
    if (dateA !== dateB) return direction === 'asc' ? dateA - dateB : dateB - dateA;

    const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return direction === 'asc' ? createdA - createdB : createdB - createdA;
  });
}

export default function LocationPageClient({ images, collections }: LocationPageClientProps) {
  const [filterState, setFilterState] = useState<GalleryFilterState>(INITIAL_GALLERY_FILTER_STATE);

  const availableOptions = useMemo(() => extractFilterOptions(images), [images]);

  const criteria = useMemo(() => ({
    ...(filterState.highlyRatedOnly ? { minRating: 4 } : {}),
    ...(filterState.filmFilter === 'film' ? { isFilm: true as const } : {}),
    ...(filterState.filmFilter === 'digital' ? { isFilm: false as const } : {}),
    ...(filterState.selectedCollectionIds.length > 0
      ? { collectionIds: filterState.selectedCollectionIds }
      : {}),
    ...(filterState.selectedTags.length > 0
      ? { tags: filterState.selectedTags }
      : {}),
    ...(filterState.selectedPeople.length > 0
      ? { people: filterState.selectedPeople }
      : {}),
  }), [filterState]);

  const filteredImages = useMemo(() => {
    const filtered = filterContent(images, criteria).filter(
      (item): item is ContentImageModel => item.contentType === 'IMAGE'
    );
    if (filterState.dateSortDirection !== 'off') {
      return sortByDate(filtered, filterState.dateSortDirection);
    }
    return filtered;
  }, [images, criteria, filterState.dateSortDirection]);

  const filterCounts: FilterCounts = useMemo(
    () => computeFilterCounts(images, criteria, availableOptions),
    [images, criteria, availableOptions]
  );

  const contentBlocks = useMemo(
    () => processContentBlocks(filteredImages, true),
    [filteredImages]
  );

  const handleFilterChange = useCallback((update: Partial<GalleryFilterState>) => {
    setFilterState(prev => ({ ...prev, ...update }));
  }, []);

  return (
    <>
      <LocationCollections collections={collections} />

      <LocationFilterBar
        filterState={filterState}
        onFilterChange={handleFilterChange}
        availableOptions={availableOptions}
        filterCounts={filterCounts}
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
        <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary, #888)' }}>
          No images match the current filters.
        </p>
      )}
    </>
  );
}
