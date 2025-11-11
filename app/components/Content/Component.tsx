'use client';

import { useRouter } from 'next/navigation';
import React, { useMemo, useRef } from 'react';

import { useViewport } from '@/app/hooks/useViewport';
import {
  type AnyContentModel,
  type ImageContentModel,
  type ParallaxImageContentModel,
} from '@/app/types/Content';
import {
  checkImageVisibility,
  createDragHandlers,
  createImageClickHandler,
  createParallaxImageClickHandler,
} from '@/app/utils/contentComponentHandlers';
import { processContentForDisplay } from '@/app/utils/contentLayout';
import {
  isCollectionContent,
  isContentImage,
  isGifContent,
  isParallaxImageContent,
  isTextContent,
} from '@/app/utils/contentTypeGuards';

import CollectionContentRenderer from './CollectionContentRenderer';
import cbStyles from './ContentComponent.module.scss';
import { GifContentBlockRenderer } from './GifContentBlockRenderer';
import { ContentImageRenderer } from './ImageBlockRenderer';
import { ParallaxImageRenderer } from './ParallaxImageRenderer';
import { TextBlockRenderer } from './TextBlockRenderer';

/**
 * Determines base props for a content block including width, height, className, and block
 * @param item - The processed content block item with calculated dimensions
 * @param totalInRow - Total number of items in the row
 * @param index - Current item's index in the row (0-based)
 * @returns Object containing width, height, className, and block
 */
function determineBaseProps(
  item: { content: AnyContentModel; width: number; height: number },
  totalInRow: number,
  index: number
) {
  let className = '';
  if (totalInRow === 1) className = cbStyles.imageSingle || '';
  else if (index === 0) className = cbStyles.imageLeft || '';
  else if (index === totalInRow - 1) className = cbStyles.imageRight || '';
  else className = cbStyles.imageMiddle || '';

  return {
    width: Math.round(item.width),
    height: Math.round(item.height),
    className,
    content: item.content,
  };
}

export interface ContentComponentProps {
  content: AnyContentModel[];
  isSelectingCoverImage?: boolean;
  currentCoverImageId?: number;
  onImageClick?: (imageId: number) => void;
  justClickedImageId?: number | null;
  priorityIndex?: number; // Index of content to prioritize for LCP (usually 0 for hero)
  enableFullScreenView?: boolean; // Enable full-screen image viewing on click
  onFullScreenImageClick?: (image: ImageContentModel | ParallaxImageContentModel) => void; // NEW SIMPLE VERSION
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
  onFullScreenImageClick, // NEW SIMPLE VERSION
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
  const router = useRouter();
  const chunkSize = 2;
  const { contentWidth, isMobile } = useViewport();
  const isDraggingRef = useRef(false);

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
                const { content: itemContent, className, width, height } = determineBaseProps(
                  item,
                  totalInRow,
                  index
                );

                // Renderer lookup map - check most specific types first
                if (isCollectionContent(itemContent)) {
                  return (
                    <CollectionContentRenderer
                      key={itemContent.id}
                      itemContent={itemContent}
                      className={className}
                      width={width}
                      height={height}
                      enableDragAndDrop={enableDragAndDrop}
                      draggedImageId={draggedImageId}
                      onImageClick={onImageClick}
                      enableFullScreenView={enableFullScreenView}
                      onFullScreenImageClick={onFullScreenImageClick}
                      onDragStart={onDragStart}
                      onDragOver={onDragOver}
                      onDrop={onDrop}
                      onDragEnd={onDragEnd}
                    />
                  );
                }
                if (isParallaxImageContent(itemContent) && itemContent.enableParallax) {
                  const isCollection = !!('slug' in itemContent && itemContent.slug);
                  const handleClick = createParallaxImageClickHandler(
                    itemContent,
                    onImageClick,
                    enableFullScreenView,
                    onFullScreenImageClick,
                    router.push
                  );

                  // Add drag handlers for reordering (works for both regular parallax and collection content)
                  const isDragged = enableDragAndDrop && draggedImageId === itemContent.id;
                  const {
                    handleDragStartEvent,
                    handleDragOverEvent,
                    handleDropEvent,
                    handleDragEndEvent,
                  } = createDragHandlers(
                    itemContent,
                    enableDragAndDrop,
                    draggedImageId,
                    isDraggingRef,
                    onDragStart,
                    onDragOver,
                    onDrop,
                    onDragEnd
                  );

                  // Use ParallaxImageRenderer with proper container structure for parallax effect
                  const parallaxContainerClass = [
                    className,
                    cbStyles.overlayContainer,
                    cbStyles.parallaxContainer,
                    isMobile ? cbStyles.mobile : cbStyles.desktop,
                    isDragged ? cbStyles.dragging : '',
                    enableDragAndDrop ? '' : (handleClick ? cbStyles.clickable : cbStyles.default),
                  ].filter(Boolean).join(' ');

                  return (
                    <div
                      key={itemContent.id}
                      draggable={enableDragAndDrop && !!onDragStart}
                      onDragStart={handleDragStartEvent}
                      onDragOver={handleDragOverEvent}
                      onDrop={handleDropEvent}
                      onDragEnd={handleDragEndEvent}
                      className={parallaxContainerClass}
                      style={{
                        // Dynamic styles that depend on content dimensions
                        width: isMobile ? '100%' : width,
                        height: isMobile ? 'auto' : height,
                        aspectRatio: isMobile ? width / height : undefined,
                      }}
                    >
                      <div
                        className={cbStyles.imageWrapper}
                        onClick={handleClick}
                      >
                        <ParallaxImageRenderer
                          content={itemContent}
                          contentType={isCollection ? 'collection' : 'content'}
                          cardTypeBadge={isCollection && 'collectionType' in itemContent ? itemContent.collectionType : itemContent.cardTypeBadge}
                          priority={false}
                          onClick={handleClick}
                        />
                      </div>
                    </div>
                  );
                }
                if (isContentImage(itemContent)) {
                  const isCurrentCover = currentCoverImageId === itemContent.id;
                  const isJustClicked = justClickedImageId === itemContent.id;
                  const isSelected = selectedImageIds.includes(itemContent.id);
                  const shouldShowOverlay =
                    (isSelectingCoverImage && isCurrentCover) || isJustClicked;
                  const isDragged = enableDragAndDrop && draggedImageId === itemContent.id;
                  const isNotVisible = checkImageVisibility(itemContent, currentCollectionId);
                  const handleClick = createImageClickHandler(
                    itemContent,
                    isDraggingRef,
                    onImageClick,
                    enableFullScreenView,
                    onFullScreenImageClick
                  );
                  const isClickable = !!onImageClick || enableFullScreenView;

                  const {
                    handleDragStartEvent,
                    handleDragOverEvent,
                    handleDropEvent,
                    handleDragEndEvent,
                  } = createDragHandlers(
                    itemContent,
                    enableDragAndDrop,
                    draggedImageId,
                    isDraggingRef,
                    onDragStart,
                    onDragOver,
                    onDrop,
                    onDragEnd
                  );

                  const dragContainerClass = [
                    cbStyles.dragContainer,
                    isDragged ? cbStyles.dragging : '',
                    enableDragAndDrop ? '' : (isClickable ? cbStyles.clickable : cbStyles.default),
                  ].filter(Boolean).join(' ');

                  const imageWrapperClass = [
                    cbStyles.imageContentWrapper,
                    isClickable ? '' : cbStyles.default,
                    isSelected ? cbStyles.selected : '',
                  ].filter(Boolean).join(' ');

                  return (
                    <div
                      key={itemContent.id}
                      draggable={enableDragAndDrop && !!onDragStart}
                      onDragStart={handleDragStartEvent}
                      onDragOver={handleDragOverEvent}
                      onDrop={handleDropEvent}
                      onDragEnd={handleDragEndEvent}
                      className={dragContainerClass}
                      onClick={handleClick}
                    >
                      <div className={imageWrapperClass}>
                        <ContentImageRenderer
                          block={itemContent}
                          width={width}
                          height={height}
                          className={className}
                          isMobile={isMobile}
                        />
                      </div>
                      {/* Grey opacity overlay for non-visible images */}
                      {isNotVisible && (
                        <div className={cbStyles.visibilityOverlay} />
                      )}
                      {shouldShowOverlay && (
                        <div className={cbStyles.coverImageOverlay}>
                          <svg className={cbStyles.coverImageCheckmark} viewBox="0 0 24 24">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      )}
                      {isSelected && (
                        <div className={cbStyles.selectedIndicator}>
                          <svg className={cbStyles.selectedIndicatorX} viewBox="0 0 24 24">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </div>
                      )}
                    </div>
                  );
                }
                if (isGifContent(itemContent))
                  return (
                    <GifContentBlockRenderer
                      key={itemContent.id}
                      block={itemContent}
                      width={width}
                      height={height}
                      className={className}
                      isMobile={isMobile}
                    />
                  );
                if (isTextContent(itemContent))
                  return (
                    <TextBlockRenderer
                      key={itemContent.id}
                      block={itemContent}
                      width={width}
                      height={height}
                      className={className}
                      isMobile={isMobile}
                    />
                  );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
