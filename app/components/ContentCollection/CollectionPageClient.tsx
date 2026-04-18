'use client';

import { useCallback, useMemo, useState } from 'react';

import ContentBlockWithFullScreen from '@/app/components/Content/ContentBlockWithFullScreen';
import { type CollectionModel } from '@/app/types/Collection';
import { type ContentImageModel } from '@/app/types/Content';
import {
  type CollectionFilterState,
  INITIAL_COLLECTION_FILTER_STATE,
  type LensType,
} from '@/app/types/GalleryFilter';
import { extractFilterOptions, filterContent, isImageContent } from '@/app/utils/contentFilter';
import { processContentBlocks } from '@/app/utils/contentLayout';
import { isContentCollection } from '@/app/utils/contentTypeGuards';
import { getLensType } from '@/app/utils/focalLength';
import { sortByDate } from '@/app/utils/sortByDate';

import { CollectionFilterProvider } from './CollectionFilterContext';

interface CollectionPageClientProps {
  collection: CollectionModel;
  chunkSize?: number;
}

/**
 * Extracts filter options specific to collection pages.
 * Uses the shared extractFilterOptions with 90% tag exclusion, plus
 * the >1 distinct rule for cameras/lenses and lens type categories.
 */
function extractCollectionFilterOptions(images: ContentImageModel[]): {
  tags: string[];
  people: string[];
  cameras: string[];
  lenses: string[];
  lensTypes: LensType[];
} {
  const baseOptions = extractFilterOptions(images, 0.9);

  // Cameras/lenses: only show if more than 1 distinct
  const cameras = baseOptions.cameras.length > 1 ? baseOptions.cameras : [];
  const lenses = baseOptions.lenses.length > 1 ? baseOptions.lenses : [];

  // Lens types: only show if 2+ distinct categories present
  const lensTypeSet = new Set<LensType>();
  for (const img of images) {
    const lt = getLensType(img.focalLength);
    if (lt !== null) lensTypeSet.add(lt);
  }
  const typeOrder: LensType[] = ['wide', 'normal', 'telephoto'];
  const lensTypes = lensTypeSet.size >= 2 ? typeOrder.filter(t => lensTypeSet.has(t)) : [];

  return { tags: baseOptions.tags, people: baseOptions.people, cameras, lenses, lensTypes };
}

export default function CollectionPageClient({ collection, chunkSize }: CollectionPageClientProps) {
  const [filterState, setFilterState] = useState<CollectionFilterState>(
    INITIAL_COLLECTION_FILTER_STATE
  );

  const allContent = useMemo(() => collection.content ?? [], [collection.content]);

  const allImages = useMemo(() => allContent.filter(isImageContent), [allContent]);

  const allCollections = useMemo(() => allContent.filter(isContentCollection), [allContent]);

  // A page is "collection-dominant" when it has more child-collection items than images.
  // On these pages, image-specific filters (people, cameras, lenses, focal length, highly rated)
  // are suppressed since the page's purpose is browsing sub-collections, not filtering images.
  const isCollectionDominant = allCollections.length > allImages.length;

  const baseCollectionOptions = useMemo(() => {
    const options = extractCollectionFilterOptions(allImages);
    if (isCollectionDominant) {
      return {
        tags: options.tags,
        people: [],
        cameras: [],
        lenses: [],
        lensTypes: [] as LensType[],
      };
    }
    return options;
  }, [allImages, isCollectionDominant]);

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
      filterState.selectedLensTypes.length > 0,
    [filterState]
  );

  // Filter only images (for filter UI); non-image content (COLLECTION, TEXT, etc.) passes through
  const filteredContent = useMemo(() => {
    if (!hasActiveFilters) return allContent;
    let filtered = filterContent(allImages, criteria).filter(isImageContent);

    // Apply lens type filter — images without parseable focalLength are
    // included intentionally so they aren't silently hidden by a lens-type chip.
    if (filterState.selectedLensTypes.length > 0) {
      filtered = filtered.filter(img => {
        const lt = getLensType(img.focalLength);
        return lt === null || filterState.selectedLensTypes.includes(lt);
      });
    }

    const filteredImageIds = new Set(filtered.map(img => img.id));
    // Keep non-image content as-is, only filter images
    return allContent.filter(item => !isImageContent(item) || filteredImageIds.has(item.id));
  }, [allContent, allImages, criteria, hasActiveFilters, filterState.selectedLensTypes]);

  const filteredImages = useMemo(() => filteredContent.filter(isImageContent), [filteredContent]);

  // Date sort is applied after processContentBlocks (which has its own orderIndex sort)

  const hasRatingVariance = useMemo(() => {
    if (allImages.length === 0) return false;
    const ratings = new Set(allImages.map(img => img.rating ?? 0));
    return ratings.size > 1;
  }, [allImages]);

  const showHighlyRated = hasRatingVariance && !isCollectionDominant;

  // Available options from filtered results — used to determine which chips are "available" vs "unavailable"
  const filteredAvailableOptions = useMemo(() => {
    if (!hasActiveFilters) return null;
    return extractCollectionFilterOptions(filteredImages);
  }, [hasActiveFilters, filteredImages]);

  // All base options are always shown; filteredAvailableOptions determines grey-out state
  const availableOptions = useMemo(
    () => ({
      ...baseCollectionOptions,
      showHighlyRated,
    }),
    [baseCollectionOptions, showHighlyRated]
  );

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
      filteredAvailable: filteredAvailableOptions,
      onFilterChange: handleFilterChange,
    }),
    [filterState, availableOptions, filteredAvailableOptions, handleFilterChange]
  );

  const pageSize = collection.contentPerPage ?? 30;

  const hasDateVariance = useMemo(() => {
    const dates = new Set(allImages.map(img => img.captureDate).filter(Boolean));
    return dates.size > 1;
  }, [allImages]);

  const hasOptions =
    showHighlyRated ||
    hasDateVariance ||
    baseCollectionOptions.tags.length > 0 ||
    baseCollectionOptions.people.length > 0 ||
    baseCollectionOptions.cameras.length > 0 ||
    baseCollectionOptions.lenses.length > 0 ||
    baseCollectionOptions.lensTypes.length > 0;

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
        <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
          No images match your filters.
        </p>
      )}
    </>
  );

  // Only wrap with filter context if there are options to filter by
  if (!hasOptions) return content;

  return <CollectionFilterProvider value={filterContextValue}>{content}</CollectionFilterProvider>;
}
