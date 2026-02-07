'use client';

import React, { useMemo } from 'react';

import { LAYOUT } from '@/app/constants';
import { useViewport } from '@/app/hooks/useViewport';
import { type CollectionModel } from '@/app/types/Collection';
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

export interface ContentComponentProps {
  content: AnyContentModel[];
  isSelectingCoverImage?: boolean;
  currentCoverImageId?: number;
  onImageClick?: (imageId: number) => void;
  justClickedImageId?: number | null;
  priorityIndex?: number; // Index of content to prioritize for LCP (usually 0 for hero)
  enableFullScreenView?: boolean; // Enable full-screen image viewing on click
  onFullScreenImageClick?: (image: ContentImageModel | ContentParallaxImageModel) => void; // Accepts any image type (normalized in renderer)
  selectedImageIds?: number[]; // Array of selected image IDs for bulk editing
  currentCollectionId?: number; // ID of current collection (for checking collection-specific visibility)
  chunkSize?: number; // Number of images per row (default: 2)
  collectionData?: CollectionModel; // Collection model for creating header row (cover image + metadata)
  // Drag-and-drop props for reordering
  enableDragAndDrop?: boolean;
  draggedImageId?: number | null;
  dragOverImageId?: number | null;
  onDragStart?: (imageId: number) => void;
  onDragOver?: (e: React.DragEvent, imageId: number) => void;
  onDrop?: (e: React.DragEvent, imageId: number) => void;
  onDragEnd?: () => void;
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
  // priorityIndex reserved for future LCP optimization
  enableFullScreenView = false,
  onFullScreenImageClick,
  selectedImageIds = [],
  currentCollectionId,
  chunkSize = LAYOUT.defaultChunkSize,
  collectionData,
  enableDragAndDrop = false,
  draggedImageId,
  dragOverImageId: _dragOverImageId, // Reserved for drag feedback styling
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: ContentComponentProps) {
  const { contentWidth, isMobile } = useViewport();

  const rows = useMemo(() => {
    if (!contentWidth) {
      return [];
    }

    // If no content and no collectionData, return empty
    if ((!content || content.length === 0) && !collectionData) {
      return [];
    }

    try {
      // Pattern detection enabled on desktop, disabled on mobile
      // Pass collectionData to create header row if provided
      return processContentForDisplay(content || [], contentWidth, chunkSize, {
        isMobile,
        collectionData,
      });
    } catch (error) {
      console.error('[Component] processContentForDisplay error', error);
      return [];
    }
  }, [content, contentWidth, chunkSize, isMobile, collectionData]);

  // Find the first row index that contains non-visible content
  // Only check if we're on the manage page (currentCollectionId is provided)
  // Must be called before early return to satisfy React Hooks rules
  const firstNonVisibleRowIndex = useMemo(() => {
    if (!currentCollectionId || rows.length === 0) return -1; // Not on manage page or no rows, no separator needed

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;

      // Check if any item in this row is non-visible
      const hasNonVisible = row.items.some(
        item => !isContentVisibleInCollection(item.content, currentCollectionId)
      );

      if (hasNonVisible) {
        // Only show separator if there's at least one visible row before this one
        // This prevents showing separator at the very top if all content is non-visible
        if (i > 0) {
          return i;
        }
        // For the first row: only show separator if it's mixed (has both visible and non-visible)
        const hasVisible = row.items.some(item =>
          isContentVisibleInCollection(item.content, currentCollectionId)
        );
        return hasVisible ? i : -1;
      }
    }

    return -1; // All content is visible, no separator needed
  }, [rows, currentCollectionId]);

  // Early return for empty state
  if (rows.length === 0) return <div />;

  // Create a simple horizontal BoxTree from content items as fallback
  const createSimpleBoxTree = (items: CalculatedContentSize[]): BoxTree => {
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
          { type: 'leaf' as const, content: contents[1]! }
        ]
      };
    }

    // For 3+ items: build left-associative tree
    let tree: BoxTree = {
      type: 'combined',
      direction: 'horizontal',
      children: [
        { type: 'leaf', content: contents[0]! },
        { type: 'leaf', content: contents[1]! }
      ]
    };

    for (let i = 2; i < contents.length; i++) {
      tree = {
        type: 'combined',
        direction: 'horizontal',
        children: [tree, { type: 'leaf', content: contents[i]! }]
      };
    }

    return tree;
  };

  // Render a row using BoxRenderer (generic recursive renderer)
  const renderRow = (row: RowWithPatternAndSizes) => {
    const { patternName, items, boxTree } = row;
    const rowKey = `row-${items.map(item => item.content.id).join('-')}`;

    // Safety: If boxTree is missing (shouldn't happen), create a fallback
    const tree = boxTree || createSimpleBoxTree(items);

    // Build sizes map from items (convert ID to string for Map key)
    const sizesMap = new Map(
      items.map(item => [String(item.content.id), { width: item.width, height: item.height }])
    );

    return (
      <div key={rowKey} className={cbStyles.row} data-pattern={patternName}>
        <BoxRenderer
          tree={tree}
          sizes={sizesMap}
          isMobile={isMobile}
          enableDragAndDrop={enableDragAndDrop}
          draggedImageId={draggedImageId}
          onImageClick={onImageClick}
          enableFullScreenView={enableFullScreenView}
          onFullScreenImageClick={onFullScreenImageClick}
          selectedImageIds={selectedImageIds}
          currentCollectionId={currentCollectionId}
          isSelectingCoverImage={isSelectingCoverImage}
          currentCoverImageId={currentCoverImageId}
          justClickedImageId={justClickedImageId}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onDragEnd={onDragEnd}
        />
      </div>
    );
  };

  return (
    <div className={cbStyles.wrapper}>
      <div className={cbStyles.inner}>
        {rows.map((row, rowIndex) => {
          // TODO: Should we be doing 'logic' here, or should we pull this into a helper function outside of the react code
          //  - 
          const shouldShowSeparator =
            firstNonVisibleRowIndex !== -1 && rowIndex === firstNonVisibleRowIndex;
          const rowKey = `row-${row.items.map(item => item.content.id).join('-')}`;

          return (
            <React.Fragment key={rowKey}>
              {shouldShowSeparator && (
                <div className={cbStyles.visibilitySeparator}>
                  <div className={cbStyles.separatorLine} />
                  <div className={cbStyles.separatorLabel}>Non-Visible Content</div>
                  <div className={cbStyles.separatorLine} />
                </div>
              )}
              {renderRow(row)}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
