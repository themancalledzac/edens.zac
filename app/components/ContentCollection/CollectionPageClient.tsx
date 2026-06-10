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
import {
  type InlineEditContextValue,
  type InlineEditField,
  InlineEditProvider,
} from './edit/InlineEditContext';
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

  const handleExitManage = useCallback(() => {
    router.push(`/${collection.slug}`);
  }, [router, collection.slug]);

  const edit = useCollectionEdit({
    collection,
    slug: collection.slug,
    enabled: Boolean(editMode),
    onExitManage: editMode ? handleExitManage : undefined,
  });

  /**
   * Edit interactions are gated until the richer admin DTO (`currentState`) is in. Before that,
   * inline commits and post-save refreshes hit `!currentState` early-returns in the hook and
   * silently drop — so until ready the page shows the public read-only render plus a disabled
   * bar instead of edit affordances that cannot act.
   */
  const editReady = !edit.isLoadingState && edit.currentState !== null;

  useEffect(() => {
    if (!editMode) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (edit.editingContent || edit.isTextBlockModalOpen) return;
      if (
        document.activeElement instanceof HTMLElement &&
        document.activeElement.closest('[data-inline-editing]')
      ) {
        return;
      }
      if (edit.manageMode !== 'browse') {
        edit.exitToBrowse();
      } else {
        handleExitManage();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
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

  const allContent = useMemo(
    () =>
      editMode
        ? (edit.currentState?.collection?.content ?? collection.content ?? [])
        : (collection.content ?? []),
    [editMode, edit.currentState, collection.content]
  );

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
      !editMode,
      collection.id,
      collection.displayMode
    );
    if (filterState.dateSortDirection === 'off') return processed;
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

  const reorderActive = editMode && edit.reorder.active;

  useEffect(() => {
    if (!editMode || edit.manageMode !== 'reorder') return;
    if (!hasAnyActiveFilter(filterState)) return;
    setFilterState(INITIAL_FILTER_STATE);
    syncToUrl(buildCollectionCriteria(INITIAL_FILTER_STATE));
  }, [editMode, edit.manageMode, filterState, syncToUrl]);

  const handleCommitField = useCallback(
    (field: InlineEditField, value: string) => {
      edit.setUpdateField(field, value);
      void edit.handleUpdate({ [field]: value });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [edit.setUpdateField, edit.handleUpdate]
  );

  const handleEditLocation = useCallback(() => {
    edit.enterEdit();
    edit.setEditTab('info');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edit.enterEdit, edit.setEditTab]);

  const inlineEditValue = useMemo<InlineEditContextValue>(
    () => ({
      title: edit.updateData.title ?? '',
      description: edit.updateData.description ?? '',
      onCommitField: handleCommitField,
      onEditLocation: handleEditLocation,
    }),
    [edit.updateData.title, edit.updateData.description, handleCommitField, handleEditLocation]
  );

  const grid = editMode ? (
    <ContentBlockWithFullScreen
      content={reorderActive ? edit.displayContent : contentBlocks}
      priorityBlockIndex={0}
      enableFullScreenView={false}
      isSelectingCoverImage={edit.isSelectingCoverImage}
      currentCoverImageId={edit.currentCoverImageId}
      onImageClick={reorderActive || !editReady ? undefined : edit.handleImageClick}
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
      {editMode ? (
        editReady ? (
          <InlineEditProvider value={inlineEditValue}>
            <div className={styles.editCanvas}>{grid}</div>
          </InlineEditProvider>
        ) : (
          // No provider while the admin DTO loads → the header card degrades to the public
          // read-only render, so a tap cannot buffer an edit the hook would silently drop.
          <div className={styles.editCanvas}>{grid}</div>
        )
      ) : (
        grid
      )}
      {!editMode && hasActiveFilters && filteredImages.length === 0 && (
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

  const editOverlays = editMode ? (
    <>
      {edit.error && (
        <div className={styles.errorBanner} role="alert">
          <span className={styles.errorBannerText}>{edit.error}</span>
          <button
            type="button"
            className={styles.errorBannerDismiss}
            aria-label="Dismiss error"
            onClick={edit.clearError}
          >
            ×
          </button>
        </div>
      )}

      {edit.manageMode === 'edit' && <CollectionEditSheet edit={edit} />}

      {!edit.editingContent && !edit.isTextBlockModalOpen && (
        <EditBar
          ariaLabel="Manage"
          fixed
          cells={edit.bottomBarCells}
          tabs={edit.bottomBarTabs}
          activeTab={edit.editTab}
          onTabChange={id => edit.setEditTab(id as typeof edit.editTab)}
        />
      )}

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

      {edit.isTextBlockModalOpen && (
        <TextBlockCreateModal
          onClose={edit.closeTextBlockModal}
          onSubmit={edit.handleTextBlockSubmit}
        />
      )}
    </>
  ) : null;

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
