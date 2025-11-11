'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useMemo, useRef } from 'react';

import { useParallax } from '@/app/hooks/useParallax';
import { type ContentImageModel } from '@/app/types/Content';
import { type CollectionContentRendererProps } from '@/app/types/ContentRenderer';
import {
  checkImageVisibility,
  createDragHandlers,
  createImageClickHandler,
  createParallaxImageClickHandler,
} from '@/app/utils/contentComponentHandlers';

import { BadgeOverlay } from './BadgeOverlay';
import cbStyles from './ContentComponent.module.scss';
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
  hasSlug,
  isCollection = false,
  contentType,
  textContent,
  textAlign,
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
  const router = useRouter();
  const isDraggingRef = useRef(false);
  
  // Parallax hook (always called, but disabled if enableParallax = false)
  const parallaxRef = useParallax({ enableParallax });
  
  // Click handler - based on hasSlug (collection navigation) or image click
  const handleClick = useMemo(() => {
    if (hasSlug) {
      // Collection navigation
      return createParallaxImageClickHandler(
        { slug: hasSlug },
        onImageClick,
        enableFullScreenView,
        onFullScreenImageClick,
        router.push
      );
    }
    
    if (contentType === 'IMAGE' || contentType === 'GIF') {
      // Image click (metadata or fullscreen)
      // Create minimal content object for handler
      const imageContent = {
        id: contentId,
        contentType: contentType === 'GIF' ? 'GIF' : 'IMAGE',
        imageUrl,
        title: alt,
      } as ContentImageModel;
      
      return createImageClickHandler(
        imageContent,
        isDraggingRef,
        onImageClick,
        enableFullScreenView,
        onFullScreenImageClick
      );
    }
  }, [hasSlug, contentType, contentId, imageUrl, alt, onImageClick, enableFullScreenView, onFullScreenImageClick, router]);
  
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
  
  // Build wrapper class - position class always first, then conditional classes
  const buildWrapperClass = (includeDragContainer: boolean) => {
    return [
      className, // Position class (imageLeft/imageRight/imageSingle/imageMiddle) - MUST be first
      includeDragContainer ? cbStyles.dragContainer : '',
      enableParallax ? cbStyles.parallaxContainer : '',
      enableParallax ? cbStyles.overlayContainer : '',
      isMobile ? cbStyles.mobile : '',
      isDragged ? cbStyles.dragging : '',
      enableDragAndDrop ? '' : (handleClick ? cbStyles.clickable : cbStyles.default),
      contentType === 'IMAGE' && selectedImageIds.includes(contentId) ? cbStyles.selected : '',
    ].filter(Boolean).join(' ');
  };
  
  // Render TEXT content
  if (contentType === 'TEXT' && textContent) {
    return (
      <div
        key={contentId}
        className={buildWrapperClass(false)}
        style={{
          width: isMobile ? '100%' : width,
          height: isMobile ? 'auto' : height,
          boxSizing: 'border-box',
        }}
      >
        <div className={cbStyles.blockContainer}>
          <div className={textAlign === 'left' ? cbStyles.blockInnerLeft : cbStyles.blockInner}>
            {textContent.split('\n').map((line, idx) => (
              // eslint-disable-next-line react/no-array-index-key
              <div key={`text-line-${contentId}-${idx}`} style={{ width: '100%' }}>{line}</div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  // Render image content (IMAGE, COLLECTION, GIF)
  const hasValidImage = imageUrl && imageUrl.trim() !== '';
  
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
  
  // For non-parallax images, use ContentWrapper structure
  if (!enableParallax && contentType !== 'TEXT') {
    return (
      <div
        key={contentId}
        draggable={enableDragAndDrop && !!onDragStart}
        onDragStart={dragHandlers.handleDragStartEvent}
        onDragOver={dragHandlers.handleDragOverEvent}
        onDrop={dragHandlers.handleDropEvent}
        onDragEnd={dragHandlers.handleDragEndEvent}
        onClick={handleClick}
        className={buildWrapperClass(enableDragAndDrop)}
        style={{
          // ContentWrapper structure: outer div with position class and dimensions
          width: isMobile ? (hasOverlays ? '100%' : undefined) : width,
          height: isMobile ? undefined : height,
          aspectRatio: isMobile && hasOverlays ? width / height : undefined,
          cursor: handleClick ? 'pointer' : 'default',
          boxSizing: 'border-box',
        }}
      >
        {/* Inner container to constrain content within padding boundaries (from ContentWrapper) */}
        <div style={{ width: '100%', height: '100%', boxSizing: 'border-box' }}>
          {hasOverlays ? (
            // Add imageWrapper for proper overlay positioning on images with overlays
            <div className={cbStyles.imageWrapper}>
              {hasValidImage && (
                <Image
                  src={imageUrl}
                  alt={alt}
                  width={imageWidth}
                  height={imageHeight}
                  loading="lazy"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    cursor: handleClick ? 'pointer' : 'default',
                    ...(isMobile ? { height: 'auto' } : {}),
                  }}
                  onClick={handleClick}
                  unoptimized={isGif}
                />
              )}
              {overlayText && <div className={cbStyles.textOverlay}>{overlayText}</div>}
              {cardTypeBadge && (
                <BadgeOverlay
                  contentType={isCollection ? 'collection' : 'content'}
                  badgeValue={cardTypeBadge}
                />
              )}
            </div>
          ) : (
            // No overlays - render image directly
            hasValidImage && (
              <Image
                src={imageUrl}
                alt={alt}
                width={imageWidth}
                height={imageHeight}
                loading="lazy"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  cursor: handleClick ? 'pointer' : 'default',
                  ...(isMobile ? { height: 'auto' } : {}),
                }}
                onClick={handleClick}
                unoptimized={isGif}
              />
            )
          )}
          
          {/* Image-specific overlays (only for IMAGE type) */}
          {contentType === 'IMAGE' && (
            <>
              {isNotVisible && <div className={cbStyles.visibilityOverlay} />}
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
            </>
          )}
        </div>
      </div>
    );
  }
  
  // For parallax images (collections), use parallax structure
  return (
    <div
      key={contentId}
      ref={parallaxRef}
      draggable={enableDragAndDrop && !!onDragStart}
      onDragStart={dragHandlers.handleDragStartEvent}
      onDragOver={dragHandlers.handleDragOverEvent}
      onDrop={dragHandlers.handleDropEvent}
      onDragEnd={dragHandlers.handleDragEndEvent}
      className={buildWrapperClass(false)}
      style={{
        width: isMobile ? '100%' : width,
        height: isMobile ? 'auto' : height,
        aspectRatio: isMobile ? width / height : undefined,
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      <div className={cbStyles.imageWrapper} onClick={handleClick}>
        {hasValidImage ? (
          <Image
            src={imageUrl}
            alt={alt}
            width={imageWidth}
            height={imageHeight}
            loading="lazy"
            className={`parallax-bg ${variantStyles.parallaxImage}`}
            priority={false}
          />
        ) : (
          <div className={`parallax-bg ${variantStyles.parallaxImage} ${variantStyles.placeholderImage}`}>
            No Image
          </div>
        )}
        {overlayText && <div className={cbStyles.textOverlay}>{overlayText}</div>}
        {cardTypeBadge && (
          <BadgeOverlay
            contentType={isCollection ? 'collection' : 'content'}
            badgeValue={cardTypeBadge}
          />
        )}
      </div>
    </div>
  );
}
