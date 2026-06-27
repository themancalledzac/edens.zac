'use client';

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
import MetadataModal from '@/app/components/Metadata/MetadataModal';
import TextBlockCreateModal from '@/app/components/TextBlockCreateModal/TextBlockCreateModal';
import { EditBar } from '@/app/components/ui/EditBar/EditBar';
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
  mergeDateSortedImages,
} from '@/app/utils/contentFilter';
import { processContentBlocks } from '@/app/utils/contentLayout';
import { sortByDate } from '@/app/utils/sortByDate';

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

  // JS breakpoint: desktop shows both panels side-by-side; mobile uses a tab chooser.
  // Safe to call — this component is dynamically imported ssr:false.
  const { isMobile } = useViewport();
  const twoColumn = !isMobile;

  // Signal before paint so the public-grid fallback swaps out in the same frame — no double-grid flash.
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
      // Inline editors preventDefault their own Escape; bail so one keypress never both reverts
      // an inline edit AND exits manage mode. The activeElement guard is a backup.
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

  // Prefer the admin DTO (reflects saves) over the frozen server seed — e.g. displayMode updates
  // after a Reorder only appear in the admin DTO.
  const liveCollection = edit.currentState?.collection ?? collection;

  // Falls back to the seed's content if the admin DTO omits it.
  const allContent = useMemo(
    () => liveCollection.content ?? collection.content ?? [],
    [liveCollection.content, collection.content]
  );

  // Mirror live content to parent (see onLiveContentChange contract); cleanup resets to seed.
  useEffect(() => {
    onLiveContentChange?.(allContent);
    return () => onLiveContentChange?.(null);
  }, [allContent, onLiveContentChange]);

  const allImages = useMemo(() => allContent.filter(isImageContent), [allContent]);

  const criteria = useMemo(() => buildCollectionCriteria(filterState), [filterState]);

  const hasActiveFilters = useMemo(() => hasAnyActiveFilter(filterState), [filterState]);

  const filteredContent = useMemo(() => {
    if (!hasActiveFilters) return allContent;
    return applyCollectionFilters(allContent, allImages, criteria, filterState.selectedLensTypes);
  }, [allContent, allImages, criteria, hasActiveFilters, filterState.selectedLensTypes]);

  const contentBlocks = useMemo(() => {
    // filterVisible=false: admins must see hidden blocks to manage them.
    const processed = processContentBlocks(
      filteredContent,
      false,
      liveCollection.id,
      liveCollection.displayMode
    );
    if (filterState.dateSortDirection === 'off') return processed;
    const sorted = sortByDate(processed.filter(isImageContent), filterState.dateSortDirection);
    return mergeDateSortedImages(processed, sorted);
  }, [
    filteredContent,
    liveCollection.id,
    liveCollection.displayMode,
    filterState.dateSortDirection,
  ]);

  const reorderActive = edit.reorder.active;

  // Reorder and select must operate on the full unfiltered list; clear active filters on entry.
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

  const inlineEditValue = useMemo<InlineEditContextValue>(
    () => ({
      title: edit.updateData.title ?? '',
      description: edit.updateData.description ?? '',
      onCommitField: handleCommitField,
      onEditLocation: handleEditLocation,
    }),
    [edit.updateData.title, edit.updateData.description, handleCommitField, handleEditLocation]
  );

  const grid = (
    <ContentBlockWithFullScreen
      content={reorderActive ? edit.displayContent : contentBlocks}
      priorityBlockIndex={0}
      enableFullScreenView={false}
      chunkSize={chunkSize}
      mobileChunkSize={mobileChunkSize}
      isSelectingCoverImage={edit.isSelectingCoverImage}
      currentCoverImageId={edit.currentCoverImageId}
      onImageClick={reorderActive || !editReady ? undefined : edit.handleImageClick}
      justClickedImageId={edit.justClickedImageId}
      selectedIds={edit.isMultiSelectMode ? edit.selectedIds : []}
      currentCollectionId={collection.id}
      collectionSlug={collection.slug}
      collectionData={liveCollection}
      isReorderMode={reorderActive}
      reorderMoves={reorderActive ? edit.reorder.moves : undefined}
      pickedUpImageId={reorderActive ? edit.reorder.pickedUpImageId : undefined}
      reorderDisplayOrder={reorderActive ? edit.reorder.displayOrder : undefined}
      onArrowMove={reorderActive ? edit.reorder.onArrowMove : undefined}
      onPickUp={reorderActive ? edit.reorder.onPickUp : undefined}
      onPlace={reorderActive ? edit.reorder.onPlace : undefined}
      onCancelImageMove={reorderActive ? edit.reorder.onCancelImageMove : undefined}
    />
  );

  return (
    <>
      {editReady ? (
        <InlineEditProvider value={inlineEditValue}>
          <div className={styles.editCanvas}>{grid}</div>
        </InlineEditProvider>
      ) : (
        // No provider while the admin DTO loads — header card degrades to read-only.
        <div className={styles.editCanvas}>{grid}</div>
      )}

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

      {edit.manageMode === 'edit' && <CollectionEditSheet edit={edit} twoColumn={twoColumn} />}

      {!edit.editingContent && !edit.isTextBlockModalOpen && (
        <EditBar
          ariaLabel="Manage"
          fixed
          cells={edit.bottomBarCells}
          // On desktop both panels are shown side-by-side, so the Info/Structure chooser is dropped.
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
