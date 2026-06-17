'use client';

import { Fragment, useCallback, useMemo, useState } from 'react';

import { type ReorderMove } from '@/app/components/ContentCollection/edit/collectionEditUtils';
import { LAYOUT } from '@/app/constants';
import { useViewport } from '@/app/hooks/useViewport';
import { type CollectionModel, CollectionType } from '@/app/types/Collection';
import { type AnyContentModel, type ViewableContent } from '@/app/types/Content';
import { type RowWithPatternAndSizes } from '@/app/utils/contentLayout';

import { BoxRenderer } from './BoxRenderer';
import {
  buildContentRows,
  computeFirstNonVisibleRowIndex,
  createSimpleBoxTree,
  excludeFailedImages,
  resolveEffectiveViewport,
} from './componentUtils';
import cbStyles from './ContentComponent.module.scss';

export interface ContentComponentProps {
  content: AnyContentModel[];
  isSelectingCoverImage?: boolean;
  currentCoverImageId?: number;
  onImageClick?: (imageId: number) => void;
  justClickedImageId?: number | null;
  /** Index of content to prioritize for LCP (usually 0 for hero) */
  priorityIndex?: number;
  /** Enable full-screen image viewing on click */
  enableFullScreenView?: boolean;
  /** Accepts any viewable content (image, parallax image, or GIF/MP4 — normalized in renderer) */
  onFullScreenImageClick?: (image: ViewableContent) => void;
  /** Array of selected image IDs for bulk editing */
  selectedIds?: number[];
  /** ID of current collection (for checking collection-specific visibility) */
  currentCollectionId?: number;
  /** Number of images per row (default: 2) */
  chunkSize?: number;
  /**
   * Mobile-scale density (1-5) driving the row-width budget on mobile. Forwarded
   * to the layout so the collection page's density slider takes effect on touch
   * viewports; omit it to keep the default narrow mobile layout.
   */
  mobileChunkSize?: number;
  /** Collection model for creating header row (cover image + metadata) */
  collectionData?: CollectionModel;
  /** Reorder mode props */
  isReorderMode?: boolean;
  reorderMoves?: ReorderMove[];
  pickedUpImageId?: number | null;
  reorderDisplayOrder?: number[];
  onArrowMove?: (contentId: number, direction: -1 | 1) => void;
  onPickUp?: (contentId: number) => void;
  onPlace?: (targetId: number) => void;
  onCancelImageMove?: (contentId: number) => void;
  onImageLoadError?: (contentId: number) => void;
  /** SSR fallback viewport. Used when `useViewport()` hasn't measured yet. */
  serverContentWidth?: number;
  serverViewportHeight?: number;
  serverIsMobile?: boolean;
}

/**
 * Content  Component
 *
 * High-performance content rendering system that processes and displays
 * mixed content (images, text, etc.) in optimized responsive layouts.
 * Features memoized calculations, responsive chunking, and type-safe specialized renderers.
 */
export default function Component({
  content,
  isSelectingCoverImage = false,
  currentCoverImageId,
  onImageClick,
  justClickedImageId,
  priorityIndex = 0,
  enableFullScreenView = false,
  onFullScreenImageClick,
  selectedIds = [],
  currentCollectionId,
  chunkSize = LAYOUT.defaultChunkSize,
  mobileChunkSize,
  collectionData,
  isReorderMode = false,
  reorderMoves,
  pickedUpImageId,
  reorderDisplayOrder,
  onArrowMove,
  onPickUp,
  onPlace,
  onCancelImageMove,
  onImageLoadError,
  serverContentWidth,
  serverViewportHeight,
  serverIsMobile,
}: ContentComponentProps) {
  const measured = useViewport();

  const viewport = useMemo(
    () =>
      resolveEffectiveViewport(
        measured,
        { serverContentWidth, serverViewportHeight, serverIsMobile },
        LAYOUT.ssrRecomputeToleranceWidth
      ),
    [measured, serverContentWidth, serverViewportHeight, serverIsMobile]
  );

  // Images whose URL 404s only fail at load time, after the BoxTree slot is allocated. On the
  // public view we drop the failed image and let the row reflow rather than leaving its slot as a
  // blank void; manage (currentCollectionId set) keeps it so an admin can open + delete it.
  const isPublicView = currentCollectionId == null;
  const [failedImageIds, setFailedImageIds] = useState<ReadonlySet<number>>(() => new Set());

  const handleImageLoadError = useCallback(
    (contentId: number) => {
      setFailedImageIds(prev => (prev.has(contentId) ? prev : new Set(prev).add(contentId)));
      onImageLoadError?.(contentId);
    },
    [onImageLoadError]
  );

  // Note: a failed id is not cleared if `content` is later refetched with a fixed URL — the image
  // stays hidden until this Component remounts (e.g. navigation). Keying a reset on the `content`
  // reference would risk a render loop if the parent passes a fresh array each render.
  const displayContent = useMemo(
    () => (isPublicView ? excludeFailedImages(content, failedImageIds) : content),
    [isPublicView, content, failedImageIds]
  );

  const { rows, layoutError } = useMemo(
    () => buildContentRows(displayContent, collectionData, viewport, chunkSize, mobileChunkSize),
    [displayContent, collectionData, viewport, chunkSize, mobileChunkSize]
  );

  // Must be computed before the early returns to satisfy the Rules of Hooks.
  const firstNonVisibleRowIndex = useMemo(
    () => computeFirstNonVisibleRowIndex(rows, currentCollectionId),
    [rows, currentCollectionId]
  );

  if (layoutError) {
    return (
      <div className={cbStyles.wrapper}>
        <div className={cbStyles.layoutError}>Failed to render content layout: {layoutError}</div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className={cbStyles.wrapper}>
        <div className={cbStyles.layoutSkeleton} aria-hidden="true" data-testid="layout-skeleton" />
      </div>
    );
  }

  /** Renders a row using BoxRenderer (recursive). */
  const renderRow = (row: RowWithPatternAndSizes, rowIndex: number) => {
    const { rowType, items, boxTree } = row;
    const rowKey = `row-${rowIndex}-${items.map(i => `${i.content.contentType}-${i.content.id ?? i.content.orderIndex}`).join('-')}`;

    // If boxTree is missing (shouldn't happen), create a fallback
    const tree = boxTree || createSimpleBoxTree(items);

    const sizesMap = new Map(
      items.map(item => [item.content.id, { width: item.width, height: item.height }])
    );

    const dataPattern = rowType;

    const isClientGallery = collectionData?.type === CollectionType.CLIENT_GALLERY;

    return (
      <div key={rowKey} className={cbStyles.row} data-pattern={dataPattern}>
        <BoxRenderer
          tree={tree}
          sizes={sizesMap}
          isMobile={viewport.isMobile}
          onImageClick={onImageClick}
          enableFullScreenView={enableFullScreenView}
          onFullScreenImageClick={onFullScreenImageClick}
          selectedIds={selectedIds}
          currentCollectionId={currentCollectionId}
          isSelectingCoverImage={isSelectingCoverImage}
          currentCoverImageId={currentCoverImageId}
          justClickedImageId={justClickedImageId}
          isReorderMode={isReorderMode}
          reorderMoves={reorderMoves}
          pickedUpImageId={pickedUpImageId}
          reorderDisplayOrder={reorderDisplayOrder}
          onArrowMove={onArrowMove}
          onPickUp={onPickUp}
          onPlace={onPlace}
          onCancelImageMove={onCancelImageMove}
          priority={rowIndex === priorityIndex}
          onImageLoadError={handleImageLoadError}
          isClientGallery={isClientGallery}
          collectionSlug={collectionData?.slug}
        />
      </div>
    );
  };

  return (
    <div className={cbStyles.wrapper}>
      <div className={cbStyles.inner}>
        {rows.map((row, rowIndex) => {
          const shouldShowSeparator =
            firstNonVisibleRowIndex !== -1 && rowIndex === firstNonVisibleRowIndex;
          const rowKey = `row-${rowIndex}-${row.items.map(i => `${i.content.contentType}-${i.content.id ?? i.content.orderIndex}`).join('-')}`;

          return (
            <Fragment key={rowKey}>
              {shouldShowSeparator && (
                <div className={cbStyles.visibilitySeparator}>
                  <div className={cbStyles.separatorLine} />
                  <div className={cbStyles.separatorLabel}>Non-Visible Content</div>
                  <div className={cbStyles.separatorLine} />
                </div>
              )}
              {renderRow(row, rowIndex)}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
