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
  hasSlug,
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
  
  
  // Render TEXT content
  if (contentType === 'TEXT') {
    if (!textItems || textItems.length === 0) {
      return null;
    }
    
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
            {textItems.map((item) => (
              <div 
                key={`text-item-${contentId}-${item.type}-${item.value.slice(0, 20)}`}
                className={cbStyles[`textItem-${item.type}`] || cbStyles.textItem || ''}
              >
                {item.label && (
                  <span className={cbStyles.textItemLabel || ''}>{item.label}: </span>
                )}
                <span>{item.value}</span>
              </div>
            ))}
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
  
  // Determine if we need imageWrapper (for overlays OR parallax)
  const needsImageWrapper = hasOverlays || enableParallax;
  
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
          style: {
            width: '100%',
            height: '100%',
            objectFit: 'cover' as const,
            display: 'block' as const,
            cursor: handleClick ? 'pointer' as const : 'default' as const,
            ...(isMobile ? { height: 'auto' } : {}),
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
      width: isMobile ? (needsImageWrapper ? '100%' : undefined) : width,
      height: isMobile ? (enableParallax ? 'auto' : undefined) : height,
      aspectRatio: isMobile && needsImageWrapper ? width / height : undefined,
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
      {needsImageWrapper ? (
        <div className={cbStyles.imageWrapper} onClick={handleClick}>
          {imageWrapperContent}
        </div>
      ) : (
        <Image {...imageProps} />
      )}
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
