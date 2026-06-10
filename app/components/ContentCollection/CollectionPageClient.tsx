'use client';

import dynamic from 'next/dynamic';
import { useCallback, useMemo, useState } from 'react';

import ContentBlockWithFullScreen from '@/app/components/Content/ContentBlockWithFullScreen';
import { fromMobileDensity, LAYOUT, toMobileDensity } from '@/app/constants';
import { useFilterUrlState } from '@/app/hooks/useFilterUrlState';
import { useViewport } from '@/app/hooks/useViewport';
import { type CollectionModel, CollectionType } from '@/app/types/Collection';
import { type FilterState, INITIAL_FILTER_STATE, type LensType } from '@/app/types/GalleryFilter';
import {
  applyCollectionFilters,
  buildCollectionCriteria,
  extractCollectionFilterOptions,
  hasAnyActiveFilter,
  hasFilterableOptions,
  hasValueVariance,
  isImageContent,
  mergeDateSortedImages,
} from '@/app/utils/contentFilter';
import { processContentBlocks } from '@/app/utils/contentLayout';
import { isContentCollection } from '@/app/utils/contentTypeGuards';
import { toggleImageSelection } from '@/app/utils/imageSelection';
import { sortByDate } from '@/app/utils/sortByDate';

import {
  type ClientGalleryDownloadContextValue,
  ClientGalleryDownloadProvider,
} from './ClientGalleryDownloadContext';
import { CollectionFilterProvider, type CollectionInfoOptions } from './CollectionFilterContext';
import styles from './CollectionPageClient.module.scss';

/**
 * The entire edit experience (useCollectionEdit, EditBar, edit sheet, modals, inline-edit
 * context) lives in EditModeLayer, loaded as a separate client-only chunk so public visitors
 * never download admin code. editMode is server-gated to local dev, so on public pages this
 * dynamic factory is never invoked and the chunk is never requested.
 */
const EditModeLayer = dynamic(() => import('./edit/EditModeLayer'), { ssr: false });

type CollectionDimensions = Omit<CollectionInfoOptions, 'showHighlyRated'>;

interface CollectionPageClientProps {
  collection: CollectionModel;
  chunkSize?: number;
  /** SSR fallback viewport, forwarded to Component. */
  serverContentWidth?: number;
  serverViewportHeight?: number;
  serverIsMobile?: boolean;
  /**
   * When true, mount the consolidated edit experience (EditBar, edit sheet, image/text modals,
   * click-routing) on this light surface via the dynamically imported EditModeLayer. When
   * false/absent the page renders byte-identically to the public view and no edit code is
   * loaded.
   */
  editMode?: boolean;
}

const EMPTY_STRING_DIM = { values: [] as readonly string[], filterable: true };
const EMPTY_LENSTYPE_DIM = { values: [] as readonly LensType[], filterable: true };

export default function CollectionPageClient({
  collection,
  chunkSize,
  serverContentWidth,
  serverViewportHeight,
  serverIsMobile,
  editMode = false,
}: CollectionPageClientProps) {
  /**
   * While the edit chunk streams in, the public grid doubles as the loading fallback so an
   * edit-mode load never flashes blank. EditModeLayer flips this flag pre-paint on mount and
   * takes over the grid render — edit affordances appearing a beat after the content is
   * consistent with the layer's own editReady gating.
   */
  const [editLayerMounted, setEditLayerMounted] = useState(false);
  const handleEditLayerMounted = useCallback(() => setEditLayerMounted(true), []);

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

  const isClientGallery = collection.type === CollectionType.CLIENT_GALLERY;
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const handleSelectToggle = useCallback((imageId: number) => {
    setSelectedIds(prev => toggleImageSelection(imageId, prev));
  }, []);

  const enterSelectMode = useCallback(() => setIsSelectMode(true), []);
  const exitSelectMode = useCallback(() => {
    setIsSelectMode(false);
    setSelectedIds([]);
  }, []);

  const downloadContextValue = useMemo<ClientGalleryDownloadContextValue>(
    () => ({ isSelectMode, selectedIds, enterSelectMode, exitSelectMode }),
    [isSelectMode, selectedIds, enterSelectMode, exitSelectMode]
  );

  // The public render works off the server seed; live (post-save) content is EditModeLayer's
  // concern, which runs its own content pipeline against the admin DTO.
  const allContent = useMemo(() => collection.content ?? [], [collection.content]);

  const allImages = useMemo(() => allContent.filter(isImageContent), [allContent]);

  const allCollections = useMemo(() => allContent.filter(isContentCollection), [allContent]);

  const isCollectionDominant = allCollections.length > allImages.length;

  const baseCollectionOptions = useMemo<CollectionDimensions>(() => {
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

  const criteria = useMemo(() => buildCollectionCriteria(filterState), [filterState]);

  const hasActiveFilters = useMemo(() => hasAnyActiveFilter(filterState), [filterState]);

  const filteredContent = useMemo(() => {
    if (!hasActiveFilters) return allContent;
    return applyCollectionFilters(allContent, allImages, criteria, filterState.selectedLensTypes);
  }, [allContent, allImages, criteria, hasActiveFilters, filterState.selectedLensTypes]);

  const filteredImages = useMemo(() => filteredContent.filter(isImageContent), [filteredContent]);

  const hasRatingVariance = useMemo(
    () => hasValueVariance(allImages, img => String(img.rating ?? 0)),
    [allImages]
  );

  const showHighlyRated = hasRatingVariance && !isCollectionDominant;

  const filteredAvailableOptions = useMemo(() => {
    if (!hasActiveFilters) return null;
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
    const sorted = sortByDate(processed.filter(isImageContent), filterState.dateSortDirection);
    return mergeDateSortedImages(processed, sorted);
  }, [filteredContent, collection.id, collection.displayMode, filterState.dateSortDirection]);

  const handleFilterChange = useCallback(
    (update: Partial<FilterState>) => {
      setFilterState(prev => {
        const next = { ...prev, ...update };
        syncToUrl(buildCollectionCriteria(next));
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

  const hasDateVariance = useMemo(
    () => hasValueVariance(allImages, img => img.captureDate),
    [allImages]
  );

  const hasOptions = hasFilterableOptions(baseCollectionOptions, showHighlyRated, hasDateVariance);

  const grid = (
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
      selectedIds={isClientGallery ? selectedIds : undefined}
      onImageClick={isClientGallery && isSelectMode ? handleSelectToggle : undefined}
    />
  );

  const content = editMode ? (
    <>
      {!editLayerMounted && grid}
      <EditModeLayer
        collection={collection}
        filterState={filterState}
        setFilterState={setFilterState}
        syncToUrl={syncToUrl}
        onMounted={handleEditLayerMounted}
      />
    </>
  ) : (
    <>
      {grid}
      {hasActiveFilters && filteredImages.length === 0 && (
        <p className={styles.emptyState}>No images match your filters.</p>
      )}
    </>
  );

  const maybeWrappedContent =
    isClientGallery && !editMode ? (
      <ClientGalleryDownloadProvider value={downloadContextValue}>
        {content}
      </ClientGalleryDownloadProvider>
    ) : (
      content
    );

  if (!hasOptions) {
    return maybeWrappedContent;
  }

  return (
    <CollectionFilterProvider value={filterContextValue}>
      {maybeWrappedContent}
    </CollectionFilterProvider>
  );
}
