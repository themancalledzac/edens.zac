'use client';

import { useCallback, useMemo, useState } from 'react';

import ContentBlockWithFullScreen from '@/app/components/Content/ContentBlockWithFullScreen';
import { fromMobileDensity, LAYOUT, toMobileDensity } from '@/app/constants';
import { useFilterUrlState } from '@/app/hooks/useFilterUrlState';
import { useViewport } from '@/app/hooks/useViewport';
import { type CollectionModel, CollectionType } from '@/app/types/Collection';
import { type ContentCollectionModel, type ContentImageModel } from '@/app/types/Content';
import { type FilterState, INITIAL_FILTER_STATE, type LensType } from '@/app/types/GalleryFilter';
import { extractFilterOptions, filterContent, isImageContent } from '@/app/utils/contentFilter';
import { processContentBlocks } from '@/app/utils/contentLayout';
import { isContentCollection } from '@/app/utils/contentTypeGuards';
import { getLensType } from '@/app/utils/focalLength';
import { toggleImageSelection } from '@/app/utils/imageSelection';
import { sortByDate } from '@/app/utils/sortByDate';

import {
  type ClientGalleryDownloadContextValue,
  ClientGalleryDownloadProvider,
} from './ClientGalleryDownloadContext';
import { CollectionFilterProvider, type CollectionInfoOptions } from './CollectionFilterContext';
import styles from './CollectionPageClient.module.scss';

type CollectionDimensions = Omit<CollectionInfoOptions, 'showHighlyRated'>;

interface CollectionPageClientProps {
  collection: CollectionModel;
  chunkSize?: number;
  /** SSR fallback viewport, forwarded to Component. */
  serverContentWidth?: number;
  serverViewportHeight?: number;
  serverIsMobile?: boolean;
}

/**
 * Extracts filter options specific to collection pages.
 *
 * Returns per-dimension data with a `filterable` flag. When a dimension has
 * exactly one value and the dimension's policy allows info-mode (cameras /
 * lenses / locations), filterable is set to false so the bar renders it as
 * an inline info chip instead of a dropdown.
 */
function extractCollectionFilterOptions(
  images: ContentImageModel[],
  collectionRefs: ContentCollectionModel[] = []
): CollectionDimensions {
  // Pass images + refs together so extractFilterOptions can aggregate filter
  // dimensions from collection refs too. This is what populates the filter bar
  // on synthetic PARENT pages whose `content` is 100% collection refs and 0
  // images (e.g. /all-collections, /all-blog).
  const baseOptions = extractFilterOptions([...images, ...collectionRefs], 0.9);

  // Lens types: only show if 2+ distinct categories present (image-only signal)
  const lensTypeSet = new Set<LensType>();
  for (const img of images) {
    const lt = getLensType(img.focalLength);
    if (lt !== null) lensTypeSet.add(lt);
  }
  const typeOrder: LensType[] = ['wide', 'normal', 'telephoto'];
  const lensTypes =
    lensTypeSet.size >= 2 && baseOptions.lenses.length >= 2
      ? typeOrder.filter(t => lensTypeSet.has(t))
      : [];

  return {
    tags: { values: baseOptions.tags, filterable: true },
    people: { values: baseOptions.people, filterable: true },
    cameras: { values: baseOptions.cameras, filterable: baseOptions.cameras.length >= 2 },
    lenses: { values: baseOptions.lenses, filterable: baseOptions.lenses.length >= 2 },
    locations: { values: baseOptions.locations, filterable: baseOptions.locations.length >= 2 },
    lensTypes: { values: lensTypes, filterable: true },
  };
}

const EMPTY_STRING_DIM = { values: [] as readonly string[], filterable: true };
const EMPTY_LENSTYPE_DIM = { values: [] as readonly LensType[], filterable: true };

export default function CollectionPageClient({
  collection,
  chunkSize,
  serverContentWidth,
  serverViewportHeight,
  serverIsMobile,
}: CollectionPageClientProps) {
  const { initialCriteria, syncToUrl } = useFilterUrlState();

  const [filterState, setFilterState] = useState<FilterState>(() => ({
    ...INITIAL_FILTER_STATE,
    highlyRatedOnly: initialCriteria.minRating !== undefined && initialCriteria.minRating >= 4,
    selectedTags: initialCriteria.tags ?? [],
    selectedPeople: initialCriteria.people ?? [],
    selectedCameras: initialCriteria.cameras ?? [],
    selectedLocations: initialCriteria.locations ?? [],
  }));

  const [density, setDensity] = useState(chunkSize ?? LAYOUT.defaultChunkSize);

  const measured = useViewport();
  const isMobile = measured.width > 0 ? measured.isMobile : (serverIsMobile ?? false);

  const mobileDensity = toMobileDensity(density);
  const displayDensity = isMobile ? mobileDensity : density;
  const densityMax = isMobile ? LAYOUT.maxDensityMobile : LAYOUT.maxDensityDesktop;

  const handleDensityChange = useCallback(
    (value: number) => {
      setDensity(
        isMobile
          ? fromMobileDensity(value)
          : Math.max(LAYOUT.minDensity, Math.min(LAYOUT.maxDensityDesktop, Math.round(value)))
      );
    },
    [isMobile]
  );

  // ── Client-gallery "Select to download" state ──────────────────────────────
  // Owned here so the deep-in-the-tree ClientGalleryDownload control (and the grid images) can both
  // see it via ClientGalleryDownloadContext. When select mode is on, an onImageClick toggle is
  // threaded to the images so a tap selects instead of opening fullscreen.
  const isClientGallery = collection.type === CollectionType.CLIENT_GALLERY;
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedImageIds, setSelectedImageIds] = useState<number[]>([]);

  const handleSelectToggle = useCallback((imageId: number) => {
    setSelectedImageIds(prev => toggleImageSelection(imageId, prev));
  }, []);

  const enterSelectMode = useCallback(() => setIsSelectMode(true), []);
  const exitSelectMode = useCallback(() => {
    setIsSelectMode(false);
    setSelectedImageIds([]);
  }, []);

  const downloadContextValue = useMemo<ClientGalleryDownloadContextValue>(
    () => ({ isSelectMode, selectedImageIds, enterSelectMode, exitSelectMode }),
    [isSelectMode, selectedImageIds, enterSelectMode, exitSelectMode]
  );

  const allContent = useMemo(() => collection.content ?? [], [collection.content]);

  const allImages = useMemo(() => allContent.filter(isImageContent), [allContent]);

  const allCollections = useMemo(() => allContent.filter(isContentCollection), [allContent]);

  // A page is "collection-dominant" when it has more child-collection items than images.
  // On these pages, image-specific filters (people, cameras, lenses, focal length, highly rated)
  // are suppressed since the page's purpose is browsing sub-collections, not filtering images.
  const isCollectionDominant = allCollections.length > allImages.length;

  const baseCollectionOptions = useMemo<CollectionDimensions>(() => {
    // On collection-dominant pages we still want tags/people/locations aggregated
    // from collection refs, so we always pass refs through. The post-filter below
    // suppresses image-only dimensions (cameras/lenses/lensTypes) on those pages,
    // but keeps tags, people, AND locations from collection-ref aggregation.
    const options = extractCollectionFilterOptions(allImages, allCollections);
    if (isCollectionDominant) {
      return {
        ...options,
        cameras: EMPTY_STRING_DIM,
        lenses: EMPTY_STRING_DIM,
        lensTypes: EMPTY_LENSTYPE_DIM,
      };
    }
    return options;
  }, [allImages, allCollections, isCollectionDominant]);

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
      ...(filterState.selectedLocations.length > 0
        ? { locations: filterState.selectedLocations }
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
      filterState.selectedLensTypes.length > 0 ||
      filterState.selectedLocations.length > 0,
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
    // Collection refs aren't filtered (image-only filters don't touch them),
    // so the full collection-ref list still contributes to "available" tags.
    const dims = extractCollectionFilterOptions(filteredImages, allCollections);
    return {
      tags: dims.tags.values,
      people: dims.people.values,
      cameras: dims.cameras.values,
      lenses: dims.lenses.values,
      lensTypes: dims.lensTypes.values,
      locations: dims.locations.values,
    };
  }, [hasActiveFilters, filteredImages, allCollections]);

  // All base options are always shown; filteredAvailableOptions determines grey-out state
  const availableOptions = useMemo<CollectionInfoOptions>(
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

  const handleFilterChange = useCallback(
    (update: Partial<FilterState>) => {
      setFilterState(prev => {
        const next = { ...prev, ...update };
        // Mirror the `criteria` mapping above so the URL faithfully serializes
        // the live filter. selectedLenses / selectedLensTypes have no URL key in
        // serializeFilterToParams (it has no `lens` key; lens-type is derived),
        // and dateSortDirection is a sort, not a filter — all stay local by design.
        syncToUrl({
          ...(next.highlyRatedOnly ? { minRating: 4 } : {}),
          ...(next.selectedTags.length > 0
            ? { tags: [...next.selectedTags], tagMatchMode: 'AND' }
            : {}),
          ...(next.selectedPeople.length > 0
            ? { people: [...next.selectedPeople], peopleMatchMode: 'AND' }
            : {}),
          ...(next.selectedCameras.length > 0
            ? { cameras: [...next.selectedCameras], cameraMatchMode: 'AND' }
            : {}),
          ...(next.selectedLocations.length > 0 ? { locations: [...next.selectedLocations] } : {}),
        });
        return next;
      });
    },
    [syncToUrl]
  );

  const filterContextValue = useMemo(
    () => ({
      filterState,
      filterOptions: availableOptions,
      filteredAvailable: filteredAvailableOptions,
      onFilterChange: handleFilterChange,
      density: displayDensity,
      densityMax,
      onDensityChange: handleDensityChange,
    }),
    [
      filterState,
      availableOptions,
      filteredAvailableOptions,
      handleFilterChange,
      displayDensity,
      densityMax,
      handleDensityChange,
    ]
  );

  const pageSize = collection.contentPerPage ?? 30;

  const hasDateVariance = useMemo(() => {
    const dates = new Set(allImages.map(img => img.captureDate).filter(Boolean));
    return dates.size > 1;
  }, [allImages]);

  const hasOptions =
    showHighlyRated ||
    hasDateVariance ||
    baseCollectionOptions.tags.values.length > 0 ||
    baseCollectionOptions.people.values.length > 0 ||
    baseCollectionOptions.cameras.values.length > 0 ||
    baseCollectionOptions.lenses.values.length > 0 ||
    baseCollectionOptions.lensTypes.values.length > 0 ||
    // Locations contributes only when multi-value (filterable) — single-value
    // locations are intentionally not surfaced (extractCollectionFilterOptions
    // marks them non-filterable) and so should not trigger the toolbar alone.
    baseCollectionOptions.locations.filterable;

  const content = (
    <>
      <ContentBlockWithFullScreen
        content={contentBlocks}
        priorityBlockIndex={0}
        enableFullScreenView
        initialPageSize={pageSize}
        chunkSize={density}
        mobileChunkSize={mobileDensity}
        collectionSlug={collection.slug}
        collectionData={collection}
        serverContentWidth={serverContentWidth}
        serverViewportHeight={serverViewportHeight}
        serverIsMobile={serverIsMobile}
        selectedImageIds={isClientGallery ? selectedImageIds : undefined}
        onImageClick={isClientGallery && isSelectMode ? handleSelectToggle : undefined}
      />
      {hasActiveFilters && filteredImages.length === 0 && (
        <p className={styles.emptyState}>No images match your filters.</p>
      )}
    </>
  );

  // Client galleries get the select/download provider so the in-tree Download control can drive
  // (and read) the page-level selection state.
  const maybeWrappedContent = isClientGallery ? (
    <ClientGalleryDownloadProvider value={downloadContextValue}>
      {content}
    </ClientGalleryDownloadProvider>
  ) : (
    content
  );

  // Only wrap with filter context if there are options to filter by
  if (!hasOptions) return maybeWrappedContent;

  return (
    <CollectionFilterProvider value={filterContextValue}>
      {maybeWrappedContent}
    </CollectionFilterProvider>
  );
}
