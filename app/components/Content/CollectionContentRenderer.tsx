'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useMemo } from 'react';

import ClientGalleryDownload from '@/app/components/ClientGalleryDownload/ClientGalleryDownload';
import ImageDownloadOverlay from '@/app/components/ClientGalleryDownload/ImageDownloadOverlay';
import { useParallax } from '@/app/hooks/useParallax';
import { type ContentImageModel, type ContentParallaxImageModel } from '@/app/types/Content';
import { type CollectionContentRendererProps } from '@/app/types/ContentRenderer';
import {
  checkImageVisibility,
  createContentClickHandler,
} from '@/app/utils/contentComponentHandlers';
import {
  buildParallaxWrapperClassName,
  buildWrapperClassName,
} from '@/app/utils/contentRendererUtils';

import { BadgeOverlay } from './BadgeOverlay';
import cbStyles from './ContentComponent.module.scss';
import { ImageOverlays } from './ImageOverlays';
import variantStyles from './ParallaxImageRenderer.module.scss';
import ReorderOverlay from './ReorderOverlay';

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
  hasSlug: _hasSlug,
  isCollection = false,
  contentType,
  textItems,
  isGif = false,
  // Reorder mode props
  isReorderMode = false,
  isPickedUp = false,
  pickedUpImageId,
  hasMoved = false,
  isFirstInOrder = false,
  isLastInOrder = false,
  onArrowMove,
  onPickUp,
  onPlace,
  onCancelImageMove,
  // Click handlers
  onImageClick,
  enableFullScreenView,
  onFullScreenImageClick,
  selectedImageIds = [],
  currentCollectionId,
  isSelectingCoverImage = false,
  currentCoverImageId,
  justClickedImageId,
  isClientGallery = false,
  collectionSlug,
}: CollectionContentRendererProps) {
  const router = useRouter();

  // Parallax hook (always called, but disabled if enableParallax = false)
  const parallaxRef = useParallax({ enableParallax });

  // Unified click handler - delegates to parent via onImageClick callback
  const handleClick = useMemo(() => {
    // TEXT content is not clickable
    if (contentType === 'TEXT') {
      return;
    }

    // In reorder mode, clicks are handled by ReorderOverlay
    if (isReorderMode) {
      return;
    }

    // Collections with slug should navigate to collection page
    if (_hasSlug && !onImageClick) {
      return () => {
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
      onImageClick,
      enableFullScreenView,
      onFullScreenImageClick,
      fullScreenContent
    );
  }, [
    contentId,
    contentType,
    imageUrl,
    alt,
    onImageClick,
    enableFullScreenView,
    onFullScreenImageClick,
    _hasSlug,
    router,
    isReorderMode,
  ]);

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
          hasClickHandler: false,
          isSelected: false,
        })}
        style={{
          width: Number.isFinite(width) ? width : 300,
          height: height > 0 ? height : 'auto',
          boxSizing: 'border-box',
        }}
      >
        <div className={cbStyles.blockContainer}>
          <div className={cbStyles.metadataBlockInner}>
            {(dateItem || locationItem) && (
              <div className={cbStyles.metadataHeaderRow}>
                {dateItem && (
                  <div className={cbStyles[`textItem-${dateItem.type}`]}>{dateItem.value}</div>
                )}
                {locationItem && (
                  <div className={cbStyles[`textItem-${locationItem.type}`]}>
                    {locationItem.value}
                  </div>
                )}
              </div>
            )}
            {filterItems.length > 0 && (
              <div className={cbStyles.metadataFilters}>
                {filterItems.map(item => (
                  <div
                    key={`filter-${contentId}-${item.type}-${item.value}`}
                    className={cbStyles.filterItem}
                  >
                    {item.value}
                  </div>
                ))}
              </div>
            )}
            {descriptionItem && (
              <div className={cbStyles.metadataDescriptionContainer}>
                <div className={cbStyles[`textItem-${descriptionItem.type}`]}>
                  {descriptionItem.value}
                </div>
              </div>
            )}
            {isClientGallery && collectionSlug && (
              <ClientGalleryDownload collectionSlug={collectionSlug} />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render image content (IMAGE, COLLECTION, GIF)
  const hasValidImage = imageUrl && imageUrl.trim() !== '';

  if (!hasValidImage) {
    const placeholderWidth = width || 300;
    const placeholderHeight = height || (placeholderWidth * 2) / 3;

    return (
      <div
        key={contentId}
        className={buildWrapperClassName(className, cbStyles, {
          includeDragContainer: false,
          enableParallax: false,
          isMobile,
          hasClickHandler: false,
          isSelected: false,
        })}
        style={{
          width: placeholderWidth,
          height: placeholderHeight,
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
  const shouldShowOverlay =
    contentType === 'IMAGE' && ((isSelectingCoverImage && isCurrentCover) || isJustClicked);

  const isNotVisible =
    contentType === 'IMAGE' &&
    checkImageVisibility(
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

  const imageProps = {
    src: imageUrl,
    alt,
    width: imageWidth,
    height: imageHeight,
    loading: 'lazy' as const,
    unoptimized: isGif,
    ...(enableParallax
      ? {
          className: `parallax-bg ${variantStyles.parallaxImage}`,
        }
      : {
          className: cbStyles.nonParallaxImage,
          style: {
            cursor: handleClick ? ('pointer' as const) : ('default' as const),
          },
        }),
  };

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

  // NaN fallback logic
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    console.error('[CollectionContentRenderer] NaN detected in props:', {
      contentId,
      contentType,
      width,
      height,
      imageWidth,
      imageHeight,
      isMobile,
      enableParallax,
    });
  }

  let validWidth = width;
  let validHeight = height;

  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    if (imageWidth && imageHeight && imageWidth > 0 && imageHeight > 0) {
      if (!Number.isFinite(width) && Number.isFinite(height)) {
        validWidth = (height * imageWidth) / imageHeight;
      } else if (!Number.isFinite(height) && Number.isFinite(width)) {
        validHeight = (width * imageHeight) / imageWidth;
      } else {
        validWidth = 300;
        validHeight = 200;
      }
    } else {
      if (!Number.isFinite(width)) {
        validWidth = Number.isFinite(height) ? height * 1.5 : 300;
      }
      if (!Number.isFinite(height)) {
        validHeight = Number.isFinite(width) ? width / 1.5 : 200;
      }
      if (!Number.isFinite(validWidth) && !Number.isFinite(validHeight)) {
        validWidth = 300;
        validHeight = 200;
      }
    }
  }

  const wrapperProps = {
    className: enableParallax
      ? buildParallaxWrapperClassName(className, cbStyles, {
          isMobile,
          isSelected: contentType === 'IMAGE' && selectedImageIds.includes(contentId),
        })
      : buildWrapperClassName(className, cbStyles, {
          includeDragContainer: false,
          enableParallax,
          isMobile,
          hasClickHandler: !!handleClick,
          isSelected: contentType === 'IMAGE' && selectedImageIds.includes(contentId),
        }),
    style: {
      width: validWidth,
      height: validHeight,
      boxSizing: 'border-box' as const,
      position: 'relative' as const,
      cursor: handleClick ? 'pointer' : 'default',
    },
    ...(enableParallax && { ref: parallaxRef }),
  };

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
      {isClientGallery && contentType === 'IMAGE' && (
        <ImageDownloadOverlay imageId={contentId} />
      )}
      {isReorderMode &&
        onArrowMove &&
        onPickUp &&
        onPlace &&
        onCancelImageMove &&
        contentId !== currentCoverImageId && (
          <ReorderOverlay
            isPickedUp={isPickedUp}
            pickedUpImageId={pickedUpImageId}
            hasMoved={hasMoved}
            isFirst={isFirstInOrder}
            isLast={isLastInOrder}
            onArrowLeft={() => onArrowMove(contentId, -1)}
            onArrowRight={() => onArrowMove(contentId, 1)}
            onPickUp={() => onPickUp(contentId)}
            onPlace={() => onPlace(contentId)}
            onCancel={() => onCancelImageMove(contentId)}
          />
        )}
    </div>
  );
}
