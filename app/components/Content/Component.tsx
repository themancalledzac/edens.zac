'use client';

import React, { useMemo } from 'react';

import { useViewport } from '@/app/hooks/useViewport';
import {
  type AnyContentModel,
  type ImageContentModel,
  type ParallaxImageContentModel,
} from '@/app/types/Content';
import { processContentForDisplay } from '@/app/utils/contentLayout';
import {
  isGifContent,
  isContentImage,
  isParallaxImageContent,
  isTextContent,
} from '@/app/utils/contentTypeGuards';

import cbStyles from './ContentBlockComponent.module.scss';
import { GifContentBlockRenderer } from './GifContentBlockRenderer';
import { ImageContentBlockRenderer } from './ImageBlockRenderer';
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
}

/**
 * Content  Component
 *
 * High-performance content rendering system that processes and displays
 * mixed content (images, text, etc.) in optimized responsive layouts.
 * Features memoized calculations, responsive chunking, and type-safe specialized renderers.
 */
export default function ContentComponent({
  content,
  isSelectingCoverImage = false,
  currentCoverImageId,
  onImageClick,
  justClickedImageId,
  priorityIndex = 0,
  enableFullScreenView = false,
  onFullScreenImageClick, // NEW SIMPLE VERSION
  selectedImageIds = [],
}: ContentComponentProps) {
  const chunkSize = 2;
  const { contentWidth, isMobile } = useViewport();

  const rows = useMemo(() => {
    if (!content || content.length === 0 || !contentWidth) {
      return [];
    }

    try {
      return processContentForDisplay(content, contentWidth, chunkSize);
    } catch (error) {
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.error('ContentComponent sizing error:', error);
      }
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

                // Determine if this block should have priority loading (for LCP optimization)
                const shouldPrioritize =
                  content.findIndex(c => c.id === itemContent.id) === priorityIndex;

                // Renderer lookup map - check most specific types first
                if (isParallaxImageContent(itemContent) && itemContent.enableParallax) {
                  // Handle parallax image with proper container structure for collections
                  return (
                    <div
                      key={itemContent.id}
                      className={`${className} ${cbStyles.overlayContainer}`}
                      style={{
                        width: isMobile ? '100%' : width,
                        height: isMobile ? 'auto' : height,
                        aspectRatio: isMobile ? width / height : undefined,
                        cursor: 'default',
                        boxSizing: 'border-box',
                        position: 'relative',
                      }}
                    >
                      <div
                        className={cbStyles.imageWrapper}
                        style={{
                          width: '100%',
                          height: '100%',
                          boxSizing: 'border-box',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        <ParallaxImageRenderer
                          content={itemContent}
                          contentType="content"
                          cardTypeBadge={itemContent.cardTypeBadge}
                          priority={shouldPrioritize}
                          onClick={
                            enableFullScreenView && onFullScreenImageClick
                              ? () => onFullScreenImageClick(itemContent)
                              : undefined
                          }
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

                  // Determine which click handler to use
                  const handleClick = () => {
                    if (onImageClick) {
                      // Always use onImageClick if provided (for cover selection or metadata editing)
                      onImageClick(itemContent.id);
                    } else if (enableFullScreenView && onFullScreenImageClick) {
                      // Fall back to fullscreen handler if no onImageClick provided
                      onFullScreenImageClick(itemContent);
                    }
                  };

                  const isClickable = !!onImageClick || enableFullScreenView;

                  return (
                    <div
                      key={itemContent.id}
                      style={{
                        position: 'relative',
                        cursor: isClickable ? 'pointer' : 'default',
                      }}
                      onClick={handleClick}
                    >
                      <div style={{
                        cursor: isClickable ? 'pointer' : 'default',
                        opacity: isSelected ? 0.6 : 1,
                        transition: 'opacity 0.2s ease',
                      }}>
                        <ImageContentBlockRenderer
                          block={itemContent}
                          width={width}
                          height={height}
                          className={className}
                          isMobile={isMobile}
                        />
                      </div>
                      {shouldShowOverlay && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            pointerEvents: 'none',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <svg
                            width="60"
                            height="60"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="white"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      )}
                      {isSelected && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            width: '32px',
                            height: '32px',
                            backgroundColor: 'rgba(220, 38, 38, 0.9)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'none',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                          }}
                        >
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="white"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
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
