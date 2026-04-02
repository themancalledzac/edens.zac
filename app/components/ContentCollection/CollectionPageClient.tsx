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
 * Parse a numeric focal length from a string like "50mm", "50 mm", "50.0mm".
 * Returns null if the string is missing or has no numeric content.
 */
function parseFocalLength(fl: string | null | undefined): number | null {
  if (!fl) return null;
  const match = fl.match(/(\d+(?:\.\d+)?)/);
  return match?.[1] ? Number.parseFloat(match[1]) : null;
}

/**
 * Sorts images by captureDate. Uses createdAt as a tiebreaker for same-day images
 * (upload sequence approximates capture sequence; captureDate has no intra-day precision).
 */
function sortByDate(images: ContentImageModel[], direction: 'asc' | 'desc'): ContentImageModel[] {
  return [...images].sort((a, b) => {
    const dateA = a.captureDate ? new Date(a.captureDate).getTime() : 0;
    const dateB = b.captureDate ? new Date(b.captureDate).getTime() : 0;
    if (dateA !== dateB) return direction === 'asc' ? dateA - dateB : dateB - dateA;

    const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return direction === 'asc' ? createdA - createdB : createdB - createdA;
  });
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
  focalLengthStops: number[];
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

  // Focal length stops: sorted distinct values, only show if 2+ distinct
  const flSet = new Set<number>();
  for (const img of images) {
    const fl = parseFocalLength(img.focalLength);
    if (fl !== null) flSet.add(fl);
  }
  const focalLengthStops = flSet.size >= 2 ? Array.from(flSet).sort((a, b) => a - b) : [];

  return { tags, people, cameras, lenses, focalLengthStops };
}

export default function CollectionPageClient({ collection, chunkSize }: CollectionPageClientProps) {
  const [filterState, setFilterState] = useState<CollectionFilterState>(
    INITIAL_COLLECTION_FILTER_STATE
  );

  const allContent = useMemo(() => collection.content ?? [], [collection.content]);

  const allImages = useMemo(() => allContent.filter(isImageContent), [allContent]);

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
      filterState.selectedLenses.length > 0 ||
      filterState.focalLengthRange !== null,
    [filterState]
  );

  // Filter only images (for filter UI); non-image content (COLLECTION, TEXT, etc.) passes through
  const filteredContent = useMemo(() => {
    if (!hasActiveFilters) return allContent;
    let filtered = filterContent(allImages, criteria).filter(isImageContent);

    // Apply focal length range filter (images without focalLength always pass through)
    if (filterState.focalLengthRange) {
      const [min, max] = filterState.focalLengthRange;
      filtered = filtered.filter(img => {
        const fl = parseFocalLength(img.focalLength);
        return fl === null || (fl >= min && fl <= max);
      });
    }

    const filteredImageIds = new Set(filtered.map(img => img.id));
    // Keep non-image content as-is, only filter images
    return allContent.filter(item => !isImageContent(item) || filteredImageIds.has(item.id));
  }, [allContent, allImages, criteria, hasActiveFilters, filterState.focalLengthRange]);

  const filteredImages = useMemo(() => filteredContent.filter(isImageContent), [filteredContent]);

  // Date sort is applied after processContentBlocks (which has its own orderIndex sort)

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
      focalLengthStops: baseCollectionOptions.focalLengthStops,
    };
  }, [hasActiveFilters, filteredImages, baseCollectionOptions, filterState]);

  const contentBlocks = useMemo(() => {
    const processed = processContentBlocks(
      filteredContent,
      true,
      collection.id,
      collection.displayMode
    );
    if (filterState.dateSortDirection === 'off') return processed;
    // Apply date sort after layout processing to override orderIndex sort
    const images = processed.filter(isImageContent);
    const sorted = sortByDate(images, filterState.dateSortDirection);
    let imageIdx = 0;
    return processed.map(item => {
      if (!isImageContent(item)) return item;
      return sorted[imageIdx++] ?? item;
    });
  }, [filteredContent, collection.id, collection.displayMode, filterState.dateSortDirection]);

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

  const hasRatingVariance = useMemo(() => {
    if (allImages.length === 0) return false;
    const ratings = new Set(allImages.map(img => img.rating ?? 0));
    return ratings.size > 1;
  }, [allImages]);

  const hasDateVariance = useMemo(() => {
    const dates = new Set(allImages.map(img => img.captureDate).filter(Boolean));
    return dates.size > 1;
  }, [allImages]);

  const hasFocalLengthVariance = baseCollectionOptions.focalLengthStops.length > 0;

  const hasOptions =
    hasRatingVariance ||
    hasDateVariance ||
    hasFocalLengthVariance ||
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
