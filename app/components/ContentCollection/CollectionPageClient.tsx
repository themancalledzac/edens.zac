'use client';

import { useCallback, useMemo, useState } from 'react';

import ContentBlockWithFullScreen from '@/app/components/Content/ContentBlockWithFullScreen';
import { type CollectionModel } from '@/app/types/Collection';
import { type ContentImageModel } from '@/app/types/Content';
import {
  type CollectionFilterState,
  INITIAL_COLLECTION_FILTER_STATE,
} from '@/app/types/GalleryFilter';
import {
  type ContentFilterOptions,
  extractFilterOptions,
  filterContent,
  isImageContent,
} from '@/app/utils/contentFilter';
import { processContentBlocks } from '@/app/utils/contentLayout';

import { CollectionFilterProvider } from './CollectionFilterContext';

interface CollectionPageClientProps {
  collection: CollectionModel;
  chunkSize?: number;
}

/**
 * Extracts filter options specific to collection pages.
 * Applies the 90% exclusion rule for tags (near-universal tags are not useful as filters)
 * and the >1 distinct rule for cameras/lenses.
 */
function extractCollectionFilterOptions(
  images: ContentImageModel[],
  baseOptions: ContentFilterOptions
): {
  tags: string[];
  people: string[];
  cameras: string[];
  lenses: string[];
} {
  const imageCount = images.length;

  // Tags: exclude those on ≥90% of images (near-universal tags aren't useful filters)
  const tagFrequency = new Map<string, number>();
  for (const img of images) {
    for (const t of img.tags ?? []) {
      tagFrequency.set(t.name, (tagFrequency.get(t.name) ?? 0) + 1);
    }
  }
  const exclusionThreshold = imageCount * 0.9;
  const tags = Array.from(tagFrequency.entries())
    .filter(([, freq]) => freq < exclusionThreshold)
    .sort(([nameA, freqA], [nameB, freqB]) => freqB - freqA || nameA.localeCompare(nameB))
    .slice(0, 10)
    .map(([name]) => name);

  // People: show if any exist
  const people = baseOptions.people;

  // Cameras: only show if more than 1 distinct
  const cameras = baseOptions.cameras.length > 1 ? baseOptions.cameras : [];

  // Lenses: only show if more than 1 distinct
  const lenses = baseOptions.lenses.length > 1 ? baseOptions.lenses : [];

  return { tags, people, cameras, lenses };
}

export default function CollectionPageClient({ collection, chunkSize }: CollectionPageClientProps) {
  const [filterState, setFilterState] = useState<CollectionFilterState>(
    INITIAL_COLLECTION_FILTER_STATE
  );

  const allImages = useMemo(
    () => (collection.content ?? []).filter(isImageContent),
    [collection.content]
  );

  const baseOptions = useMemo(() => extractFilterOptions(allImages), [allImages]);

  const baseCollectionOptions = useMemo(
    () => extractCollectionFilterOptions(allImages, baseOptions),
    [allImages, baseOptions]
  );

  // Build criteria from filter state — all AND mode for collection page
  const criteria = useMemo(
    () => ({
      ...(filterState.highlyRatedOnly ? { minRating: 4 } : {}),
      ...(filterState.selectedTags.length > 0
        ? { tags: filterState.selectedTags, tagMatchMode: 'AND' as const }
        : {}),
      ...(filterState.selectedPeople.length > 0
        ? { people: filterState.selectedPeople, peopleMatchMode: 'AND' as const }
        : {}),
      ...(filterState.selectedCameras.length > 0
        ? { cameras: filterState.selectedCameras, cameraMatchMode: 'AND' as const }
        : {}),
      ...(filterState.selectedLenses.length > 0
        ? { lenses: filterState.selectedLenses, lensMatchMode: 'AND' as const }
        : {}),
    }),
    [filterState]
  );

  const hasActiveFilters = useMemo(
    () =>
      filterState.highlyRatedOnly ||
      filterState.selectedTags.length > 0 ||
      filterState.selectedPeople.length > 0 ||
      filterState.selectedCameras.length > 0 ||
      filterState.selectedLenses.length > 0,
    [filterState]
  );

  const filteredImages = useMemo(() => {
    if (!hasActiveFilters) return allImages;
    return filterContent(allImages, criteria).filter(isImageContent);
  }, [allImages, criteria, hasActiveFilters]);

  // Dynamic available options: only show options present in filtered results
  const availableOptions = useMemo(() => {
    if (!hasActiveFilters) return baseCollectionOptions;
    const filteredOptions = extractCollectionFilterOptions(
      filteredImages,
      extractFilterOptions(filteredImages)
    );
    return {
      // Keep active selections visible even if they'd otherwise be hidden
      tags: baseCollectionOptions.tags.filter(
        t => filteredOptions.tags.includes(t) || filterState.selectedTags.includes(t)
      ),
      people: baseCollectionOptions.people.filter(
        p => filteredOptions.people.includes(p) || filterState.selectedPeople.includes(p)
      ),
      cameras: baseCollectionOptions.cameras.filter(
        c => filteredOptions.cameras.includes(c) || filterState.selectedCameras.includes(c)
      ),
      lenses: baseCollectionOptions.lenses.filter(
        l => filteredOptions.lenses.includes(l) || filterState.selectedLenses.includes(l)
      ),
    };
  }, [hasActiveFilters, filteredImages, baseCollectionOptions, filterState]);

  const contentBlocks = useMemo(
    () => processContentBlocks(filteredImages, true, collection.id, collection.displayMode),
    [filteredImages, collection.id, collection.displayMode]
  );

  const handleFilterChange = useCallback((update: Partial<CollectionFilterState>) => {
    setFilterState(prev => ({ ...prev, ...update }));
  }, []);

  const filterContextValue = useMemo(
    () => ({
      filterState,
      filterOptions: availableOptions,
      onFilterChange: handleFilterChange,
    }),
    [filterState, availableOptions, handleFilterChange]
  );

  const pageSize = collection.contentPerPage ?? 30;

  const hasOptions =
    baseCollectionOptions.tags.length > 0 ||
    baseCollectionOptions.people.length > 0 ||
    baseCollectionOptions.cameras.length > 0 ||
    baseCollectionOptions.lenses.length > 0;

  const content = (
    <>
      <ContentBlockWithFullScreen
        content={contentBlocks}
        priorityBlockIndex={0}
        enableFullScreenView
        initialPageSize={pageSize}
        chunkSize={chunkSize}
        collectionSlug={collection.slug}
        collectionData={collection}
      />
      {hasActiveFilters && filteredImages.length === 0 && (
        <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary, #888)' }}>
          No images match your filters.
        </p>
      )}
    </>
  );

  // Only wrap with filter context if there are options to filter by
  if (!hasOptions) return content;

  return <CollectionFilterProvider value={filterContextValue}>{content}</CollectionFilterProvider>;
}
