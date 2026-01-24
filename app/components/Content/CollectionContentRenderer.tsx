'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useMemo, useRef } from 'react';

import { useParallax } from '@/app/hooks/useParallax';
import { type ContentImageModel, type ContentParallaxImageModel } from '@/app/types/Content';
import { type CollectionContentRendererProps } from '@/app/types/ContentRenderer';
import {
  checkImageVisibility,
  createContentClickHandler,
  createDragHandlers,
} from '@/app/utils/contentComponentHandlers';
import {
  buildParallaxWrapperClassName,
  buildWrapperClassName,
} from '@/app/utils/contentRendererUtils';

import { BadgeOverlay } from './BadgeOverlay';
import cbStyles from './ContentComponent.module.scss';
import { ImageOverlays } from './ImageOverlays';
import variantStyles from './ParallaxImageRenderer.module.scss';

export default function CollectionContentRenderer({
  contentId,
  className,
  width,
  height,
  isMobile,
  imageUrl,
  imageWidth,
  imageHeight,
  alt,
  overlayText,
  cardTypeBadge,
  enableParallax,
  hasSlug: _hasSlug, // Used for collection navigation on public pages
  isCollection = false,
  contentType,
  textItems,
  isGif = false,
  enableDragAndDrop = false,
  draggedImageId,
  onImageClick,
  enableFullScreenView,
  onFullScreenImageClick,
  selectedImageIds = [],
  currentCollectionId,
  isSelectingCoverImage = false,
  currentCoverImageId,
  justClickedImageId,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: CollectionContentRendererProps) {
  const isDraggingRef = useRef(false);
  const router = useRouter();
  
  // Parallax hook (always called, but disabled if enableParallax = false)
  const parallaxRef = useParallax({ enableParallax });
  
  // Unified click handler - delegates to parent via onImageClick callback
  // Parent component (ManageClient) decides: navigate for collections, edit for images
  // For public pages without onImageClick, falls back to fullscreen view
  // Collections with slug navigate to collection page instead of fullscreen
  const handleClick = useMemo(() => {
    // TEXT content is not clickable
    if (contentType === 'TEXT') {
      return;
    }
    
    // Collections with slug should navigate to collection page, not open fullscreen
    // This handles public pages where collections are displayed (e.g., home page)
    if (_hasSlug && !onImageClick) {
      return () => {
        if (isDraggingRef.current) {
          isDraggingRef.current = false;
          return;
        }
        router.push(`/${_hasSlug}`);
      };
    }
    
    // Create minimal content object for fullscreen fallback (public pages)
    const fullScreenContent: ContentImageModel | ContentParallaxImageModel = {
      id: contentId,
      contentType: contentType === 'GIF' ? 'GIF' : 'IMAGE',
      imageUrl: imageUrl || '',
      title: alt,
      orderIndex: 0,
      visible: true,
    } as ContentImageModel;
      
    return createContentClickHandler(
      contentId,
      isDraggingRef,
      onImageClick,
      enableFullScreenView,
      onFullScreenImageClick,
      fullScreenContent
    );
  }, [contentId, contentType, imageUrl, alt, onImageClick, enableFullScreenView, onFullScreenImageClick, _hasSlug, router]);
  
  // Drag handlers
  const isDragged = enableDragAndDrop && draggedImageId === contentId;
  // Create minimal content object for drag handlers (only needs id and contentType)
  const minimalContent = {
    id: contentId,
    contentType: contentType as 'IMAGE' | 'TEXT' | 'GIF' | 'COLLECTION',
    orderIndex: 0,
  } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const dragHandlers = createDragHandlers(
    minimalContent,
    enableDragAndDrop,
    draggedImageId,
    isDraggingRef,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd
  );
  
  
  // Render TEXT content
  if (contentType === 'TEXT') {
    if (!textItems || textItems.length === 0) {
      return null;
    }

    const dateItem = textItems.find(item => item.type === 'date');
    const locationItem = textItems.find(item => item.type === 'location');
    const descriptionItem = textItems.find(item => item.type === 'description');
    const filterItems = textItems.filter(item => item.type === 'text');
    
    return (
      <div
        key={contentId}
        className={buildWrapperClassName(className, cbStyles, {
          includeDragContainer: false,
          enableParallax: false,
          isMobile,
          isDragged,
          enableDragAndDrop,
          hasClickHandler: false,
          isSelected: false,
        })}
        style={{
          width: isMobile ? '100%' : width,
          height: isMobile ? 'auto' : height,
          boxSizing: 'border-box',
        }}
      >
        <div className={cbStyles.blockContainer}>
          <div className={cbStyles.metadataBlockInner}>
            {/* Top Row: Date and Location */}
            {(dateItem || locationItem) && (
              <div className={cbStyles.metadataHeaderRow}>
                {dateItem && (
                  <div className={cbStyles[`textItem-${dateItem.type}`]}>
                    {dateItem.value}
                  </div>
                )}
                {locationItem && (
                  <div className={cbStyles[`textItem-${locationItem.type}`]}>
                    {locationItem.value}
                  </div>
                )}
              </div>
            )}

            {/* Middle: Filters (Tags/People) */}
            {filterItems.length > 0 && (
              <div className={cbStyles.metadataFilters}>
                {filterItems.map((item) => (
                  <div 
                    key={`filter-${contentId}-${item.type}-${item.value}`}
                    className={cbStyles.filterItem}
                  >
                    {item.value}
                  </div>
                ))}
              </div>
            )}

            {/* Bottom: Description */}
            {descriptionItem && (
              <div className={cbStyles.metadataDescriptionContainer}>
                <div className={cbStyles[`textItem-${descriptionItem.type}`]}>
                  {descriptionItem.value}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // Render image content (IMAGE, COLLECTION, GIF)
  const hasValidImage = imageUrl && imageUrl.trim() !== '';
  
  // Early return for invalid images - render placeholder
  if (!hasValidImage) {
    // Default aspect ratio 3:2 if dimensions don't exist
    const placeholderWidth = width || 300;
    const placeholderHeight = height || (placeholderWidth * 2 / 3);
    
    return (
      <div
        key={contentId}
        className={buildWrapperClassName(className, cbStyles, {
          includeDragContainer: false,
          enableParallax: false,
          isMobile,
          isDragged,
          enableDragAndDrop,
          hasClickHandler: false,
          isSelected: false,
        })}
        style={{
          width: isMobile ? '100%' : placeholderWidth,
          height: isMobile ? 'auto' : placeholderHeight,
          aspectRatio: isMobile ? '3/2' : undefined,
          boxSizing: 'border-box',
          position: 'relative',
          backgroundColor: '#e0e0e0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#757575',
        }}
      >
        No Image
      </div>
    );
  }
  
  // Image-specific overlays (only for IMAGE type)
  const isCurrentCover = contentType === 'IMAGE' && currentCoverImageId === contentId;
  const isJustClicked = contentType === 'IMAGE' && justClickedImageId === contentId;
  const isSelected = contentType === 'IMAGE' && selectedImageIds.includes(contentId);
  const shouldShowOverlay = contentType === 'IMAGE' && ((isSelectingCoverImage && isCurrentCover) || isJustClicked);
  
  // For IMAGE type, check visibility (need to create minimal content object)
  const isNotVisible = contentType === 'IMAGE' && checkImageVisibility(
    {
      id: contentId,
      contentType: 'IMAGE',
      imageUrl: imageUrl || '',
      orderIndex: 0,
      collections: [],
      visible: true,
    } as ContentImageModel,
    currentCollectionId
  );
  
  // Determine if we have overlays (for imageWrapper structure)
  const hasOverlays = !!(overlayText || cardTypeBadge);
  
  // Unified Image component props - conditionally includes parallax className or inline styles
  const imageProps = {
    src: imageUrl,
    alt,
    width: imageWidth,
    height: imageHeight,
    loading: 'lazy' as const,
    unoptimized: isGif,
    // Parallax: use CSS classes, no inline styles
    // Non-parallax: use inline styles for sizing/objectFit
    ...(enableParallax
      ? {
          className: `parallax-bg ${variantStyles.parallaxImage}`,
        }
      : {
          className: cbStyles.nonParallaxImage,
          style: {
            cursor: handleClick ? 'pointer' as const : 'default' as const,
          },
          onClick: handleClick,
        }),
  };
  
  // Common imageWrapper content (Image + overlays) - used by both parallax and non-parallax
  const imageWrapperContent = (
    <>
      <Image {...imageProps} />
      {overlayText && <div className={cbStyles.textOverlay}>{overlayText}</div>}
      {cardTypeBadge && (
        <BadgeOverlay
          contentType={isCollection ? 'collection' : 'content'}
          badgeValue={cardTypeBadge}
        />
      )}
    </>
  );
  
  // Unified wrapper props - works for both parallax and non-parallax
  // Note: key is passed directly to JSX (React requirement)
  const wrapperProps = {
    draggable: enableDragAndDrop && !!onDragStart,
    onDragStart: dragHandlers.handleDragStartEvent,
    onDragOver: dragHandlers.handleDragOverEvent,
    onDrop: dragHandlers.handleDropEvent,
    onDragEnd: dragHandlers.handleDragEndEvent,
    className: enableParallax
      ? buildParallaxWrapperClassName(className, cbStyles, {
          isMobile,
          isDragged,
          isSelected: contentType === 'IMAGE' && selectedImageIds.includes(contentId),
        })
      : buildWrapperClassName(className, cbStyles, {
          includeDragContainer: enableDragAndDrop && !enableParallax,
          enableParallax,
          isMobile,
          isDragged,
          enableDragAndDrop,
          hasClickHandler: !!handleClick,
          isSelected: contentType === 'IMAGE' && selectedImageIds.includes(contentId),
        }),
    style: {
      width: isMobile ? '100%' : width,
      height: isMobile ? 'auto' : height,
      aspectRatio: width / height,
      boxSizing: 'border-box' as const,
      position: 'relative' as const,
      cursor: handleClick ? 'pointer' : 'default',
    },
    ...(enableParallax && { ref: parallaxRef }),
    ...(!enableParallax && handleClick && { onClick: handleClick }),
  };
  
  
  // Render image content (IMAGE, COLLECTION, GIF)
  // Unified structure for both parallax and non-parallax
  return (
    <div key={contentId} {...wrapperProps}>
      <div className={cbStyles.imageWrapper} onClick={handleClick}>
        {imageWrapperContent}
      </div>
      {!enableParallax && (
        <ImageOverlays
          contentType={contentType}
          isNotVisible={isNotVisible}
          shouldShowOverlay={shouldShowOverlay}
          isSelected={isSelected}
        />
      )}
    </div>
  );
}
