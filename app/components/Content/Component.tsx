'use client';

import React, { useMemo } from 'react';

import { LAYOUT } from '@/app/constants';
import { useViewport } from '@/app/hooks/useViewport';
import { type CollectionModel } from '@/app/types/Collection';
import { type AnyContentModel } from '@/app/types/Content';
import { type CollectionContentRendererProps } from '@/app/types/ContentRenderer';
import {
  type CalculatedContentSize,
  isContentVisibleInCollection,
  processContentForDisplay,
  type RowWithPatternAndSizes,
} from '@/app/utils/contentLayout';
import { determineContentRendererProps } from '@/app/utils/contentRendererUtils';

import CollectionContentRenderer from './CollectionContentRenderer';
import cbStyles from './ContentComponent.module.scss';

export interface ContentComponentProps {
  content: AnyContentModel[];
  isSelectingCoverImage?: boolean;
  currentCoverImageId?: number;
  onImageClick?: (imageId: number) => void;
  justClickedImageId?: number | null;
  priorityIndex?: number; // Index of content to prioritize for LCP (usually 0 for hero)
  enableFullScreenView?: boolean; // Enable full-screen image viewing on click
  onFullScreenImageClick?: (image: any) => void; // Accepts any image type (normalized in renderer)
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

  // Helper to build full props for a renderer
  const buildRendererProps = (
    item: CalculatedContentSize,
    totalInRow: number,
    index: number,
    positionOverride?: string
  ): CollectionContentRendererProps => {
    const rendererProps = determineContentRendererProps(item, totalInRow, index, isMobile, {
      imageSingle: cbStyles.imageSingle || '',
      imageLeft: cbStyles.imageLeft || '',
      imageRight: cbStyles.imageRight || '',
      imageMiddle: cbStyles.imageMiddle || '',
    });

    // Apply position override if provided (for stacked layouts)
    if (positionOverride) {
      rendererProps.className = positionOverride;
    }

    return {
      ...rendererProps,
      enableDragAndDrop,
      draggedImageId,
      onImageClick,
      enableFullScreenView,
      onFullScreenImageClick,
      selectedImageIds,
      currentCollectionId,
      isSelectingCoverImage,
      currentCoverImageId,
      justClickedImageId,
      onDragStart,
      onDragOver,
      onDrop,
      onDragEnd,
    };
  };

  // Check if pattern requires stacked layout (main + stacked secondaries)
  const isStackedPattern = (patternType: string): boolean => {
    return [
      'main-stacked',
      'panorama-vertical',
      'five-star-vertical-2v',
      'five-star-vertical-2h',
      'five-star-vertical-mixed',
    ].includes(patternType);
  };

  // Render a row based on its pattern type
  const renderRow = (row: RowWithPatternAndSizes) => {
    const { pattern, items } = row;
    const rowKey = `row-${items.map(item => item.content.id).join('-')}`;

    // Stacked patterns: main image + vertically stacked secondaries
    if (isStackedPattern(pattern.type) && items.length >= 3) {
      const mainItem = items[0];
      const stackedItems = items.slice(1);

      if (!mainItem) {
        return null;
      }

      // Check if main should be positioned on the right
      const isMainOnRight =
        pattern.type === 'main-stacked' &&
        'mainPosition' in pattern &&
        pattern.mainPosition === 'right';

      const mainProps = buildRendererProps(
        mainItem,
        2,
        0,
        isMainOnRight ? cbStyles.imageRight : cbStyles.imageLeft
      );

      const stackedContainerClass = isMainOnRight
        ? `${cbStyles.stackedContainer} ${cbStyles.stackedContainerRight}`
        : cbStyles.stackedContainer;

      return (
        <div key={rowKey} className={cbStyles.row}>
          {isMainOnRight ? (
            // Flipped layout: stacked container first, then main
            <>
              <div className={stackedContainerClass}>
                {stackedItems.map((item, stackIndex) => {
                  const stackedProps = buildRendererProps(
                    item,
                    stackedItems.length,
                    stackIndex,
                    cbStyles.imageSingle
                  );
                  return <CollectionContentRenderer key={item.content.id} {...stackedProps} />;
                })}
              </div>
              <CollectionContentRenderer {...mainProps} />
            </>
          ) : (
            // Normal layout: main first, then stacked container
            <>
              <CollectionContentRenderer {...mainProps} />
              <div className={stackedContainerClass}>
                {stackedItems.map((item, stackIndex) => {
                  const stackedProps = buildRendererProps(
                    item,
                    stackedItems.length,
                    stackIndex,
                    cbStyles.imageSingle
                  );
                  return <CollectionContentRenderer key={item.content.id} {...stackedProps} />;
                })}
              </div>
            </>
          )}
        </div>
      );
    }

    // Standard/standalone patterns: horizontal layout
    return (
      <div key={rowKey} className={cbStyles.row}>
        {items.map((item, index) => {
          const fullProps = buildRendererProps(item, items.length, index);
          return <CollectionContentRenderer key={item.content.id} {...fullProps} />;
        })}
      </div>
    );
  };

  return (
    <div className={cbStyles.wrapper}>
      <div className={cbStyles.inner}>
        {rows.map((row, rowIndex) => {
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
