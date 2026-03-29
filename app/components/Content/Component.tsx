'use client';

import { Fragment, useMemo } from 'react';

import { type ReorderMove } from '@/app/(admin)/collection/manage/[[...slug]]/manageUtils';
import { LAYOUT } from '@/app/constants';
import { useViewport } from '@/app/hooks/useViewport';
import { type CollectionModel, CollectionType } from '@/app/types/Collection';
import {
  type AnyContentModel,
  type ContentImageModel,
  type ContentParallaxImageModel,
} from '@/app/types/Content';
import {
  type CalculatedContentSize,
  isContentVisibleInCollection,
  processContentForDisplay,
  type RowWithPatternAndSizes,
} from '@/app/utils/contentLayout';
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
  /** Accepts any image type (normalized in renderer) */
  onFullScreenImageClick?: (image: ContentImageModel | ContentParallaxImageModel) => void;
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
}: ContentComponentProps) {
  const { contentWidth, isMobile, viewportHeight } = useViewport();

  const { rows, layoutError } = useMemo(() => {
    if (!contentWidth) {
      return { rows: [], layoutError: null };
    }

    // If no content and no collectionData, return empty
    if ((!content || content.length === 0) && !collectionData) {
      return { rows: [], layoutError: null };
    }

    const targetAR =
      viewportHeight > 0 ? Math.max(1.5, Math.min(3.0, contentWidth / viewportHeight)) : 1.5;

    try {
      const result = processContentForDisplay(content || [], contentWidth, chunkSize, {
        isMobile,
        collectionData,
        displayMode: collectionData?.displayMode,
        targetAR,
      });
      return { rows: result, layoutError: null };
    } catch (error) {
      console.error('[Component] processContentForDisplay error', error);
      const message = error instanceof Error ? error.message : 'Unknown layout error';
      return { rows: [], layoutError: message };
    }
  }, [content, contentWidth, chunkSize, isMobile, collectionData, viewportHeight]);

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
        <div className={cbStyles.layoutError}>
          Failed to render content layout: {layoutError}
        </div>
      </div>
    );
  }

  if (rows.length === 0) return <div />;

  /** Renders a row using BoxRenderer (recursive). */
  const renderRow = (row: RowWithPatternAndSizes, rowIndex: number) => {
    const { templateKey, items, boxTree } = row;
    const rowKey = `row-${items.map(i => `${i.content.contentType}-${i.content.id}`).join('-')}`;

    // If boxTree is missing (shouldn't happen), create a fallback
    const tree = boxTree || createSimpleBoxTree(items);

    const sizesMap = new Map(
      items.map(item => [item.content.id, { width: item.width, height: item.height }])
    );

    const dataPattern = typeof templateKey === 'string' ? templateKey : `${templateKey.h}h-${templateKey.v}v`;

    const isClientGallery = collectionData?.type === CollectionType.CLIENT_GALLERY;

    return (
      <div key={rowKey} className={cbStyles.row} data-pattern={dataPattern}>
        <BoxRenderer
          tree={tree}
          sizes={sizesMap}
          isMobile={isMobile}
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
          const rowKey = `row-${row.items.map(i => `${i.content.contentType}-${i.content.id}`).join('-')}`;

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
