'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

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
import { slugify } from '@/app/utils/locationUtils';

import { BadgeOverlay } from './BadgeOverlay';
import cbStyles from './ContentComponent.module.scss';
import { ImageOverlays } from './ImageOverlays';
import variantStyles from './ParallaxImageRenderer.module.scss';
import ReorderOverlay from './ReorderOverlay';

/**
 * Renders a single content item: IMAGE, GIF, COLLECTION, or TEXT metadata block.
 * Handles parallax, reorder mode, client gallery download, and image error fallback.
 */
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
  thumbnailUrl,
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
  priority = false,
  onImageLoadError,
  isClientGallery = false,
  collectionSlug,
}: CollectionContentRendererProps) {
  const router = useRouter();

  const [failedImageIds, setFailedImageIds] = useState<Set<number>>(new Set());

  // Parallax hook (always called, but disabled if enableParallax = false)
  const parallaxRef = useParallax({ enableParallax });

  const handleClick = useMemo(() => {
    if (contentType === 'TEXT') {
      return;
    }

    if (isReorderMode) {
      return;
    }

    if (_hasSlug && !onImageClick) {
      return () => {
        router.push(`/${_hasSlug}`);
      };
    }

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

  // Must be defined before any early return to satisfy Rules of Hooks
  const handleImageError = useCallback(() => {
    setFailedImageIds(prev => new Set(prev).add(contentId));
    onImageLoadError?.(contentId);
  }, [contentId, onImageLoadError]);

  if (contentType === 'TEXT') {
    if (!textItems || textItems.length === 0) {
      return null;
    }

    const dateItem = textItems.find(item => item.type === 'date');
    const locationItem = textItems.find(item => item.type === 'location');
    const descriptionItem = textItems.find(item => item.type === 'description');
    const tagItems = textItems.filter(item => item.type === 'tag');
    const filterItems = textItems.filter(item => item.type === 'text');

    const handleTagClick = (tagName: string, tagSlug?: string) => {
      router.push(`/tag/${tagSlug ?? slugify(tagName)}`);
    };

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
                  <div className={cbStyles.metadataDate}>{dateItem.value}</div>
                )}
                {locationItem && (
                  <Link
                    href={`/location/${locationItem.slug ?? slugify(locationItem.value)}`}
                    className={cbStyles.metadataLocation}
                  >
                    {locationItem.value}
                  </Link>
                )}
              </div>
            )}
            {descriptionItem && (
              <div className={cbStyles.metadataDescriptionContainer}>
                <p className={cbStyles.metadataDescription}>
                  {descriptionItem.value}
                </p>
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
            {tagItems.length > 0 && (
              <div className={cbStyles.metadataTagsContainer}>
                <div className={cbStyles.metadataTagsRow}>
                  {tagItems.map(item => (
                    <button
                      key={`tag-${contentId}-${item.value}`}
                      type="button"
                      className={cbStyles.metadataTag}
                      onClick={() => handleTagClick(item.value, item.slug)}
                    >
                      {item.value}
                    </button>
                  ))}
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

  // GIF content is stored as MP4
  if (contentType === 'GIF' && imageUrl && imageUrl.trim() !== '') {
    return (
      <div
        key={contentId}
        className={buildWrapperClassName(className, cbStyles, {
          includeDragContainer: false,
          enableParallax: false,
          isMobile,
          hasClickHandler: !!handleClick,
          isSelected: false,
        })}
        style={{
          width: Number.isFinite(width) ? width : 300,
          height: Number.isFinite(height) ? height : 200,
          boxSizing: 'border-box',
          position: 'relative',
          cursor: handleClick ? 'pointer' : 'default',
        }}
      >
        <div className={cbStyles.imageWrapper} onClick={handleClick}>
          <video
            autoPlay
            loop
            muted
            playsInline
            poster={thumbnailUrl || undefined}
            width={imageWidth || undefined}
            height={imageHeight || undefined}
            className={cbStyles.nonParallaxImage}
            style={{ cursor: handleClick ? 'pointer' : 'default' }}
          >
            <source src={imageUrl} type="video/mp4" />
          </video>
          {overlayText && <div className={cbStyles.textOverlay}>{overlayText}</div>}
        </div>
        {isReorderMode &&
          onArrowMove &&
          onPickUp &&
          onPlace &&
          onCancelImageMove && (
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

  if (failedImageIds.has(contentId)) {
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
        }}
      >
        <div
          className={cbStyles.placeholderImage}
          style={{ width: placeholderWidth, height: placeholderHeight }}
        >
          Image unavailable
        </div>
      </div>
    );
  }

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
    sizes: `(max-width: 768px) 100vw, ${Math.round(width)}px`,
    loading: priority ? ('eager' as const) : ('lazy' as const),
    priority: priority ?? false,
    unoptimized: isGif,
    onError: handleImageError,
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

  // Guard: log and recover from NaN dimensions before rendering
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
    <div
      key={contentId}
      {...wrapperProps}
      {...(enableParallax ? { 'data-parallax-container': '' } : { 'data-image-wrapper': '' })}
    >
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
