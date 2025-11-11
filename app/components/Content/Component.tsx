'use client';

import React, { useMemo } from 'react';

import { useViewport } from '@/app/hooks/useViewport';
import { type AnyContentModel } from '@/app/types/Content';
import { type CollectionContentRendererProps } from '@/app/types/ContentRenderer';
import { processContentForDisplay } from '@/app/utils/contentLayout';
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
  priorityIndex: _priorityIndex = 0,
  enableFullScreenView = false,
  onFullScreenImageClick,
  selectedImageIds = [],
  currentCollectionId,
  enableDragAndDrop = false,
  draggedImageId,
  dragOverImageId: _dragOverImageId,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: ContentComponentProps) {
  const chunkSize = 2;
  const { contentWidth, isMobile } = useViewport();

  const rows = useMemo(() => {
    if (!content || content.length === 0 || !contentWidth) {
      return [];
    }

    try {
      return processContentForDisplay(content, contentWidth, chunkSize);
    } catch {
      return [];
    }
  }, [content, contentWidth, chunkSize]);

  // Early return for empty state
  if (rows.length === 0) return <div />;

  return (
    <div className={cbStyles.wrapper}>
      <div className={cbStyles.inner}>
        {rows.map((row, _rowIndex) => {
          const totalInRow = row.length;

          return (
            <div key={`row-${row.map(item => item.content.id).join('-')}`} className={cbStyles.row}>
              {row.map((item, index) => {
                // Normalize content to renderer props (replaces determineBaseProps + all type checking)
                const rendererProps = determineContentRendererProps(
                  item,
                  totalInRow,
                  index,
                  isMobile,
                  {
                    imageSingle: cbStyles.imageSingle || '',
                    imageLeft: cbStyles.imageLeft || '',
                    imageRight: cbStyles.imageRight || '',
                    imageMiddle: cbStyles.imageMiddle || '',
                  }
                );

                // Add all handler props
                const fullProps: CollectionContentRendererProps = {
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

                return <CollectionContentRenderer key={item.content.id} {...fullProps} />;
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
