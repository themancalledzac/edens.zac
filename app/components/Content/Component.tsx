'use client';

import { Fragment, useMemo } from 'react';

import { type ReorderMove } from '@/app/(admin)/collection/manage/[[...slug]]/manageUtils';
import { LAYOUT, shouldUseMeasuredWidth } from '@/app/constants';
import { useViewport } from '@/app/hooks/useViewport';
import { type CollectionModel, CollectionType } from '@/app/types/Collection';
import { type AnyContentModel, type ViewableContent } from '@/app/types/Content';
import {
  type CalculatedContentSize,
  isContentVisibleInCollection,
  processContentForDisplay,
  type RowWithPatternAndSizes,
} from '@/app/utils/contentLayout';
import { logger } from '@/app/utils/logger';
import { type BoxTree } from '@/app/utils/rowCombination';

import { BoxRenderer } from './BoxRenderer';
import cbStyles from './ContentComponent.module.scss';

/**
 * Builds a simple horizontal BoxTree from a flat list of items.
 * Module-level: does not depend on component state.
 */
function createSimpleBoxTree(items: CalculatedContentSize[]): BoxTree {
  const contents = items.map(item => item.content);

  if (contents.length === 1) {
    return { type: 'leaf' as const, content: contents[0]! };
  }

  if (contents.length === 2) {
    return {
      type: 'combined' as const,
      direction: 'horizontal' as const,
      children: [
        { type: 'leaf' as const, content: contents[0]! },
        { type: 'leaf' as const, content: contents[1]! },
      ],
    };
  }

  // For 3+ items: build left-associative tree
  let tree: BoxTree = {
    type: 'combined',
    direction: 'horizontal',
    children: [
      { type: 'leaf', content: contents[0]! },
      { type: 'leaf', content: contents[1]! },
    ],
  };

  for (let i = 2; i < contents.length; i++) {
    tree = {
      type: 'combined',
      direction: 'horizontal',
      children: [tree, { type: 'leaf', content: contents[i]! }],
    };
  }

  return tree;
}

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
  selectedImageIds?: number[];
  /** ID of current collection (for checking collection-specific visibility) */
  currentCollectionId?: number;
  /** Number of images per row (default: 2) */
  chunkSize?: number;
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
  selectedImageIds = [],
  currentCollectionId,
  chunkSize = LAYOUT.defaultChunkSize,
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

  // Prefer the measured width; fall back to the SSR width within tolerance to avoid a reflow.
  const useMeasured = shouldUseMeasuredWidth(
    measured.contentWidth,
    serverContentWidth,
    LAYOUT.ssrRecomputeToleranceWidth
  );

  const effectiveContentWidth = useMeasured
    ? measured.contentWidth
    : (serverContentWidth ?? measured.contentWidth ?? 0);
  const effectiveViewportHeight = useMeasured
    ? measured.viewportHeight
    : (serverViewportHeight ?? measured.viewportHeight ?? 0);
  const effectiveIsMobile = useMeasured ? measured.isMobile : (serverIsMobile ?? measured.isMobile);

  const { rows, layoutError } = useMemo(() => {
    if (!effectiveContentWidth) {
      return { rows: [], layoutError: null };
    }

    // If no content and no collectionData, return empty
    if ((!content || content.length === 0) && !collectionData) {
      return { rows: [], layoutError: null };
    }

    // Row AR ≈ screen AR so each row ≈ one screenful; density then drives image size. Clamp [1.0, 2.5].
    const targetAR =
      effectiveViewportHeight > 0
        ? Math.max(1.0, Math.min(2.5, effectiveContentWidth / effectiveViewportHeight))
        : 1.5;

    try {
      const result = processContentForDisplay(content || [], effectiveContentWidth, chunkSize, {
        isMobile: effectiveIsMobile,
        collectionData,
        displayMode: collectionData?.displayMode,
        targetAR,
      });
      return { rows: result, layoutError: null };
    } catch (error) {
      logger.error('Component', 'processContentForDisplay error', error);
      const message = error instanceof Error ? error.message : 'Unknown layout error';
      return { rows: [], layoutError: message };
    }
  }, [
    content,
    effectiveContentWidth,
    chunkSize,
    effectiveIsMobile,
    collectionData,
    effectiveViewportHeight,
  ]);

  // Must be called before early return to satisfy React Hooks rules
  const firstNonVisibleRowIndex = useMemo(() => {
    if (!currentCollectionId || rows.length === 0) return -1;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;

      const hasNonVisible = row.items.some(
        item => !isContentVisibleInCollection(item.content, currentCollectionId)
      );

      if (hasNonVisible) {
        if (i > 0) {
          return i;
        }
        const hasVisible = row.items.some(item =>
          isContentVisibleInCollection(item.content, currentCollectionId)
        );
        return hasVisible ? i : -1;
      }
    }

    return -1;
  }, [rows, currentCollectionId]);

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
          isMobile={effectiveIsMobile}
          onImageClick={onImageClick}
          enableFullScreenView={enableFullScreenView}
          onFullScreenImageClick={onFullScreenImageClick}
          selectedImageIds={selectedImageIds}
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
          onImageLoadError={onImageLoadError}
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
