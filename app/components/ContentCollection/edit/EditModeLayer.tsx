'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
} from 'react';

import ContentBlockWithFullScreen from '@/app/components/Content/ContentBlockWithFullScreen';
import {
  type RendererContextValue,
  RendererProvider,
} from '@/app/components/Content/RendererContext';
import MetadataModal from '@/app/components/Metadata/MetadataModal';
import TextBlockCreateModal from '@/app/components/TextBlockCreateModal/TextBlockCreateModal';
import { EditBar } from '@/app/components/ui/EditBar/EditBar';
import { IconButton } from '@/app/components/ui/IconButton/IconButton';
import { IMAGE } from '@/app/constants';
import { useViewport } from '@/app/hooks/useViewport';
import { type CollectionModel } from '@/app/types/Collection';
import { type AnyContentModel } from '@/app/types/Content';
import { type FilterState, INITIAL_FILTER_STATE } from '@/app/types/GalleryFilter';
import {
  applyCollectionFilters,
  buildCollectionCriteria,
  type ContentFilterCriteria,
  hasAnyActiveFilter,
  isImageContent,
} from '@/app/utils/contentFilter';
import { processContentBlocks } from '@/app/utils/contentLayout';
import { applySort } from '@/app/utils/sortContent';

import CollectionEditSheet from './CollectionEditSheet';
import styles from './EditModeLayer.module.scss';
import {
  type InlineEditContextValue,
  type InlineEditField,
  InlineEditProvider,
} from './InlineEditContext';
import { useCollectionEdit } from './useCollectionEdit';

export interface EditModeLayerProps {
  /** The server-fetched seed collection (shown until the richer admin DTO loads). */
  collection: CollectionModel;
  /**
   * Row-density budget (desktop scale), mirrored from CollectionPageClient so the edit grid lays
   * out at the same density as the public page (which derives it from `collection.rowsWide`).
   */
  chunkSize?: number;
  /** Row-density budget on the mobile scale, mirrored from CollectionPageClient. */
  mobileChunkSize?: number;
  /** Page-level filter state owned by CollectionPageClient (shared with the public filter UI). */
  filterState: FilterState;
  setFilterState: Dispatch<SetStateAction<FilterState>>;
  /** Mirrors filter changes into the URL (from useFilterUrlState in the parent). */
  syncToUrl: (criteria: ContentFilterCriteria) => void;
  /** Fired pre-paint on mount so the parent can drop its public-grid loading fallback. */
  onMounted: () => void;
  /**
   * Reports this layer's live content upward. Contract: called with the content array whenever
   * its identity changes (seed on mount, then the admin DTO's content once loaded and after
   * every save), and with null on unmount so the parent falls back to the server seed. The
   * parent derives the filter options from this, keeping the filter UI in sync with the
   * content this layer's grid actually renders.
   */
  onLiveContentChange?: (content: AnyContentModel[] | null) => void;
}

/**
 * Consolidated edit experience for a collection page: grid, inline-edit context, Escape handler,
 * filter reset, and all edit overlays (EditBar, sheet, metadata + text-block modals).
 * Loaded via `next/dynamic` with `ssr: false` — admin-only deps stay out of the public bundle.
 *
 * Content comes from the admin DTO (it reflects saves, such as displayMode after a Reorder), falling
 * back to the server seed. Escape exits manage mode only when no inline editor claimed it. Reorder
 * and select clear active filters on entry. Cover picking is unavailable until the admin DTO loads
 * and in modes that claim grid clicks; child-collection images get their own picker because the
 * grid shows them only as the child's card.
 */
export default function EditModeLayer({
  collection,
  chunkSize,
  mobileChunkSize,
  filterState,
  setFilterState,
  syncToUrl,
  onMounted,
  onLiveContentChange,
}: EditModeLayerProps) {
  const router = useRouter();

  const { isMobile } = useViewport();
  const twoColumn = !isMobile;

  useLayoutEffect(() => {
    onMounted();
  }, [onMounted]);

  const handleExitManage = useCallback(() => {
    router.push(`/${collection.slug}`);
  }, [router, collection.slug]);

  const edit = useCollectionEdit({
    collection,
    slug: collection.slug,
    enabled: true,
    onExitManage: handleExitManage,
  });

  /** True once the admin DTO has loaded; until then edit affordances are disabled. */
  const editReady = !edit.isLoadingState && edit.currentState !== null;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (event.defaultPrevented) return;
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
    edit.editingContent,
    edit.isTextBlockModalOpen,
    edit.manageMode,
    edit.exitToBrowse,
    handleExitManage,
  ]);

  const liveCollection = edit.currentState?.collection ?? collection;

  const allContent = useMemo(
    () => liveCollection.content ?? collection.content ?? [],
    [liveCollection.content, collection.content]
  );

  useEffect(() => {
    onLiveContentChange?.(allContent);
    return () => onLiveContentChange?.(null);
  }, [allContent, onLiveContentChange]);

  const allImages = useMemo(() => allContent.filter(isImageContent), [allContent]);

  /** Whether any image can seed a GIF's capture date — drives the metadata sheet's pick button. */
  const hasDatedImages = useMemo(() => allImages.some(img => img.captureDate), [allImages]);

  const criteria = useMemo(() => buildCollectionCriteria(filterState), [filterState]);

  const hasActiveFilters = useMemo(() => hasAnyActiveFilter(filterState), [filterState]);

  const filteredContent = useMemo(() => {
    if (!hasActiveFilters) return allContent;
    return applyCollectionFilters(allContent, allImages, criteria);
  }, [allContent, allImages, criteria, hasActiveFilters]);

  const reorderActive = edit.reorder.active;

  const contentBlocks = useMemo(() => {
    if (reorderActive) return [];
    const processed = processContentBlocks(
      filteredContent,
      false,
      liveCollection.id,
      liveCollection.displayMode,
      true
    );
    return applySort(processed, filterState.dateSortDirection);
  }, [
    reorderActive,
    filteredContent,
    liveCollection.id,
    liveCollection.displayMode,
    filterState.dateSortDirection,
  ]);

  useEffect(() => {
    if (edit.manageMode !== 'reorder' && edit.manageMode !== 'select') return;
    if (!hasAnyActiveFilter(filterState)) return;
    setFilterState(INITIAL_FILTER_STATE);
    syncToUrl(buildCollectionCriteria(INITIAL_FILTER_STATE));
  }, [edit.manageMode, filterState, setFilterState, syncToUrl]);

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

  const isPickingCover = edit.manageMode === 'pick-cover';

  const handleTogglePickCover = useCallback(() => {
    edit.setIsSelectingCoverImage(!edit.isSelectingCoverImage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edit.isSelectingCoverImage, edit.setIsSelectingCoverImage]);

  const canPickCover =
    editReady && (isPickingCover || edit.manageMode === 'browse' || edit.manageMode === 'edit');

  const inlineEditValue = useMemo<InlineEditContextValue>(
    () => ({
      title: edit.updateData.title ?? '',
      description: edit.updateData.description ?? '',
      onCommitField: handleCommitField,
      onEditLocation: handleEditLocation,
      onTogglePickCover: canPickCover ? handleTogglePickCover : null,
      isPickingCover,
      hasCover: liveCollection.coverImage != null,
    }),
    [
      edit.updateData.title,
      edit.updateData.description,
      handleCommitField,
      handleEditLocation,
      canPickCover,
      handleTogglePickCover,
      isPickingCover,
      liveCollection.coverImage,
    ]
  );

  const childCoverCandidates = edit.childCollectionImages ?? [];

  /**
   * The edit-only slice of the grid's render-constant props. This layer is the only caller that
   * sets any of them, so they reach the renderer through the context instead of as twelve props
   * every public caller would have to declare and forward.
   *
   * Not memoized, deliberately: the sole consumer is the `Component` inside `grid`, which is not
   * wrapped in `memo` and re-renders with this layer regardless.
   */
  const rendererEditValue: RendererContextValue = {
    currentCollectionId: collection.id,
    isSelectingCoverImage: edit.isSelectingCoverImage,
    currentCoverImageId: edit.currentCoverImageId,
    justClickedImageId: edit.justClickedImageId,
    isReorderMode: reorderActive,
    reorderMoves: reorderActive ? edit.reorder.moves : undefined,
    pickedUpImageId: reorderActive ? edit.reorder.pickedUpImageId : undefined,
    reorderDisplayOrder: reorderActive ? edit.reorder.displayOrder : undefined,
    onArrowMove: reorderActive ? edit.reorder.onArrowMove : undefined,
    onPickUp: reorderActive ? edit.reorder.onPickUp : undefined,
    onPlace: reorderActive ? edit.reorder.onPlace : undefined,
    onCancelImageMove: reorderActive ? edit.reorder.onCancelImageMove : undefined,
  };

  const grid = (
    <RendererProvider value={rendererEditValue}>
      <ContentBlockWithFullScreen
        content={reorderActive ? edit.displayContent : contentBlocks}
        priorityBlockIndex={0}
        enableFullScreenView={false}
        chunkSize={chunkSize}
        mobileChunkSize={mobileChunkSize}
        onImageClick={reorderActive || !editReady ? undefined : edit.handleImageClick}
        selectedIds={edit.isMultiSelectMode ? edit.selectedIds : []}
        collectionSlug={collection.slug}
        collectionData={liveCollection}
      />
    </RendererProvider>
  );

  return (
    <>
      {editReady ? (
        <InlineEditProvider value={inlineEditValue}>
          <div className={styles.editCanvas}>{grid}</div>
        </InlineEditProvider>
      ) : (
        <div className={styles.editCanvas}>{grid}</div>
      )}

      {edit.error && (
        <div className={styles.errorBanner} role="alert">
          <span className={styles.errorBannerText}>{edit.error}</span>
          <IconButton
            size="sm"
            className={styles.errorBannerDismiss}
            aria-label="Dismiss error"
            onClick={edit.clearError}
          >
            <span aria-hidden="true">×</span>
          </IconButton>
        </div>
      )}

      {edit.manageMode === 'pick-date' && (
        <div className={styles.hintBanner} role="status">
          Click an image to copy its capture date.
        </div>
      )}

      {isPickingCover && (
        <div className={styles.hintBanner} role="status">
          <span>Click any image to make it the cover.</span>
          {childCoverCandidates.length > 0 && (
            <div className={styles.coverCandidateStrip}>
              {childCoverCandidates.map(img => (
                <button
                  type="button"
                  key={img.id}
                  className={styles.coverCandidate}
                  onClick={() => edit.handleCoverImageClick(img.id)}
                  aria-label={`Set ${img.title || 'image'} as cover`}
                >
                  <Image
                    src={img.imageUrl}
                    alt={img.title || ''}
                    width={96}
                    height={64}
                    quality={IMAGE.quality}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {edit.manageMode === 'edit' && <CollectionEditSheet edit={edit} twoColumn={twoColumn} />}

      {!edit.editingContent && !edit.isTextBlockModalOpen && (
        <EditBar
          ariaLabel="Manage"
          fixed
          cells={edit.bottomBarCells}
          tabs={twoColumn ? undefined : edit.bottomBarTabs}
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
          onPickCaptureDate={hasDatedImages ? edit.startCaptureDatePick : undefined}
        />
      )}

      {edit.isTextBlockModalOpen && (
        <TextBlockCreateModal
          onClose={edit.closeTextBlockModal}
          onSubmit={edit.handleTextBlockSubmit}
        />
      )}
    </>
  );
}
