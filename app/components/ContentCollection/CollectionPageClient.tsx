'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import ContentBlockWithFullScreen from '@/app/components/Content/ContentBlockWithFullScreen';
import MetadataModal from '@/app/components/Metadata/MetadataModal';
import TextBlockCreateModal from '@/app/components/TextBlockCreateModal/TextBlockCreateModal';
import { EditBar } from '@/app/components/ui/EditBar/EditBar';
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
import CollectionEditSheet from './edit/CollectionEditSheet';
import { useCollectionEdit } from './edit/useCollectionEdit';

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
   * click-routing) on this light surface. When false/absent the page renders byte-identically to
   * the public view and the edit hook is inert.
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
  const router = useRouter();

  // Soft-navigate back to the public view (drops ?manage) — same route, no remount.
  const handleExitManage = useCallback(() => {
    router.push(`/${collection.slug}`);
  }, [router, collection.slug]);

  // Always-on (Rules of Hooks). Inert when `enabled` is false: no fetch, browse defaults — its
  // return surface MUST NOT be read in the public render path below.
  const edit = useCollectionEdit({
    collection,
    slug: collection.slug,
    enabled: Boolean(editMode),
    onExitManage: editMode ? handleExitManage : undefined,
  });

  // Escape steps back one level: an open sub-view (edit sheet / select / add) returns to the manage
  // page; on the manage page it exits to the public collection (same as the bar's ✕). The image/
  // text-block modals own Escape first (they close themselves), so defer while one is open.
  useEffect(() => {
    if (!editMode) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (edit.editingContent || edit.isTextBlockModalOpen) return;
      if (edit.manageMode !== 'browse') {
        edit.exitToBrowse();
      } else {
        handleExitManage();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // Depend on the specific edit.* fields, not the whole `edit` object (a fresh reference each
    // render, which would re-bind the listener constantly).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    editMode,
    edit.editingContent,
    edit.isTextBlockModalOpen,
    edit.manageMode,
    edit.exitToBrowse,
    handleExitManage,
  ]);

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

  // In edit mode the base content comes from the admin metadata payload (full editable content,
  // incl. hidden) when loaded; otherwise the public collection content. editMode=false → identical
  // to the original `collection.content ?? []`.
  const allContent = useMemo(
    () =>
      editMode
        ? (edit.currentState?.collection?.content ?? collection.content ?? [])
        : (collection.content ?? []),
    [editMode, edit.currentState, collection.content]
  );

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
  const criteria = useMemo(() => buildCollectionCriteria(filterState), [filterState]);

  const hasActiveFilters = useMemo(() => hasAnyActiveFilter(filterState), [filterState]);

  // Filter only images (for filter UI); non-image content (COLLECTION, TEXT, etc.) passes through
  const filteredContent = useMemo(() => {
    if (!hasActiveFilters) return allContent;
    return applyCollectionFilters(allContent, allImages, criteria, filterState.selectedLensTypes);
  }, [allContent, allImages, criteria, hasActiveFilters, filterState.selectedLensTypes]);

  const filteredImages = useMemo(() => filteredContent.filter(isImageContent), [filteredContent]);

  // Date sort is applied after processContentBlocks (which has its own orderIndex sort)

  // Stringify so a rating of 0 (falsy) still counts as a distinct value — the
  // helper drops falsy selector outputs (intended for date variance below).
  const hasRatingVariance = useMemo(
    () => hasValueVariance(allImages, img => String(img.rating ?? 0)),
    [allImages]
  );

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
    // Edit mode keeps hidden content visible (filterVisible=false) so it can be managed; the public
    // path filters it out exactly as before.
    const processed = processContentBlocks(
      filteredContent,
      !editMode,
      collection.id,
      collection.displayMode
    );
    if (filterState.dateSortDirection === 'off') return processed;
    // Apply date sort after layout processing to override orderIndex sort
    const sorted = sortByDate(processed.filter(isImageContent), filterState.dateSortDirection);
    return mergeDateSortedImages(processed, sorted);
  }, [
    filteredContent,
    collection.id,
    collection.displayMode,
    filterState.dateSortDirection,
    editMode,
  ]);

  const handleFilterChange = useCallback(
    (update: Partial<FilterState>) => {
      setFilterState(prev => {
        const next = { ...prev, ...update };
        // Single source of truth with the `criteria` memo. selectedLenses /
        // selectedLensTypes have no URL key in serializeFilterToParams (lens-type
        // is derived) so they're silently dropped, and dateSortDirection is a
        // sort, not a filter — all stay local by design.
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

  // ── One render for both modes ────────────────────────────────────────────────
  // The edit page IS the public render (same filter provider, toolbar, layout). editMode only swaps
  // the grid's interaction props and overlays the EditBar/sheet/modals. editMode=false renders
  // byte-identically to before.
  const reorderActive = editMode && edit.reorder.active;

  // During an active reorder the hook's pre-ordered list drives the grid; otherwise the shared
  // filter pipeline (contentBlocks) does, so the toolbar stays functional in edit mode too.
  const grid = editMode ? (
    <ContentBlockWithFullScreen
      content={reorderActive ? edit.displayContent : contentBlocks}
      priorityBlockIndex={0}
      enableFullScreenView={false}
      isSelectingCoverImage={edit.isSelectingCoverImage}
      currentCoverImageId={edit.currentCoverImageId}
      onImageClick={reorderActive ? undefined : edit.handleImageClick}
      justClickedImageId={edit.justClickedImageId}
      selectedIds={edit.isMultiSelectMode ? edit.selectedIds : []}
      currentCollectionId={collection.id}
      collectionSlug={collection.slug}
      collectionData={collection}
      isReorderMode={reorderActive}
      reorderMoves={reorderActive ? edit.reorder.moves : undefined}
      pickedUpImageId={reorderActive ? edit.reorder.pickedUpImageId : undefined}
      reorderDisplayOrder={reorderActive ? edit.reorder.displayOrder : undefined}
      onArrowMove={reorderActive ? edit.reorder.onArrowMove : undefined}
      onPickUp={reorderActive ? edit.reorder.onPickUp : undefined}
      onPlace={reorderActive ? edit.reorder.onPlace : undefined}
      onCancelImageMove={reorderActive ? edit.reorder.onCancelImageMove : undefined}
    />
  ) : (
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

  const content = (
    <>
      {/* In edit mode the canvas leaves room for the fixed EditBar so content isn't hidden. */}
      {editMode ? <div className={styles.editCanvas}>{grid}</div> : grid}
      {!editMode && hasActiveFilters && filteredImages.length === 0 && (
        <p className={styles.emptyState}>No images match your filters.</p>
      )}
    </>
  );

  // Client galleries get the select/download provider so the in-tree Download control can drive
  // (and read) the page-level selection state. In edit mode the EditBar owns selection instead.
  const maybeWrappedContent =
    isClientGallery && !editMode ? (
      <ClientGalleryDownloadProvider value={downloadContextValue}>
        {content}
      </ClientGalleryDownloadProvider>
    ) : (
      content
    );

  // Edit affordances overlay the same render — only the bar/sheet/modals are added.
  const editOverlays = editMode ? (
    <>
      {/* Collection-edit sheet — the active tab's fields. The tab row + Save live in the bar. */}
      {edit.manageMode === 'edit' && <CollectionEditSheet edit={edit} />}

      {/* Fixed bottom bar — above the edit sheet so its tabs + Save are reachable. Hidden while a
          modal (image editor / text-block) is open, since the modal owns the bottom then and the
          bar must not bleed over it. */}
      {!edit.editingContent && !edit.isTextBlockModalOpen && (
        <EditBar
          ariaLabel="Manage"
          fixed
          cells={edit.bottomBarCells}
          tabs={edit.bottomBarTabs}
          activeTab={edit.editTab}
          // EditBar's generic `onTabChange` is `(id: string) => void`; it only ever fires with one
          // of `bottomBarTabs[].id` (info·tags·structure), so narrowing here is safe.
          onTabChange={id => edit.setEditTab(id as typeof edit.editTab)}
        />
      )}

      {/* Unified image/GIF metadata editor. */}
      {edit.editingContent && edit.contentToEdit.length > 0 && (
        <MetadataModal
          onClose={edit.closeEditor}
          onSaveSuccess={edit.handleMetadataSaveSuccess}
          onGifSaveSuccess={edit.handleGifSaveSuccess}
          onDeleteSuccess={edit.handleDeleteSuccess}
          onRemoveFromCollectionSuccess={edit.handleDeleteSuccess}
          availableTags={edit.currentState?.tags || []}
          availablePeople={edit.currentState?.people || []}
          availableCameras={edit.currentState?.cameras || []}
          availableLenses={edit.currentState?.lenses || []}
          availableFilmTypes={edit.currentState?.filmTypes || []}
          availableFilmFormats={edit.currentState?.filmFormats || []}
          availableCollections={edit.allCollections}
          availableLocations={edit.currentState?.locations || []}
          selectedIds={edit.selectedIds}
          selectedImages={edit.contentToEdit}
          currentCollectionId={collection.id}
        />
      )}

      {/* Text-block create modal. */}
      {edit.isTextBlockModalOpen && (
        <TextBlockCreateModal
          onClose={edit.closeTextBlockModal}
          onSubmit={edit.handleTextBlockSubmit}
        />
      )}
    </>
  ) : null;

  // Only wrap with filter context if there are options to filter by — identical for both modes, so
  // the filter toolbar renders in edit mode exactly as it does on the public page.
  if (!hasOptions) {
    return editMode ? (
      <>
        {maybeWrappedContent}
        {editOverlays}
      </>
    ) : (
      maybeWrappedContent
    );
  }

  return (
    <CollectionFilterProvider value={filterContextValue}>
      {maybeWrappedContent}
      {editMode && editOverlays}
    </CollectionFilterProvider>
  );
}
