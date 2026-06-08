'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type Ref, useCallback, useState } from 'react';

import ClientGalleryDownload from '@/app/components/ClientGalleryDownload/ClientGalleryDownload';
import { useCollectionFilter } from '@/app/components/ContentCollection/CollectionFilterContext';
import { Badge } from '@/app/components/ui/Badge/Badge';
import { Tile } from '@/app/components/ui/Tile/Tile';
import { useParallax } from '@/app/hooks/useParallax';
import {
  type ContentGifModel,
  type ContentImageModel,
  type ViewableContent,
} from '@/app/types/Content';
import { type CollectionContentRendererProps } from '@/app/types/ContentRenderer';
import { toggleArrayFilter } from '@/app/types/GalleryFilter';
import {
  checkImageVisibility,
  createContentClickHandler,
} from '@/app/utils/contentComponentHandlers';
import {
  buildParallaxWrapperClassName,
  buildWrapperClassName,
  resolveValidDimensions,
} from '@/app/utils/contentRendererUtils';
import { slugify } from '@/app/utils/locationUtils';
import { logger } from '@/app/utils/logger';

import { getClickEligibility } from './collectionContentRendererUtils';
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
  selectedIds = [],
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

  // COLLECTION tiles navigate via href; IMAGE/GIF fullscreen stays on onClick. `hasClickHandler`
  // mirrors the guard logic in handleClick (TEXT/reorder produce no action).
  const { hasClickHandler, isSlugNav } = getClickEligibility({
    contentType,
    isReorderMode,
    hasSlug: _hasSlug,
    onImageClick,
    enableFullScreenView,
    onFullScreenImageClick,
  });

  const handleClick = useCallback(() => {
    if (contentType === 'TEXT') return;
    if (isReorderMode) return;
    if (_hasSlug && !onImageClick) return; // navigation handled by <Tile href>

    const fullScreenContent: ViewableContent =
      contentType === 'GIF'
        ? ({
            id: contentId,
            contentType: 'GIF',
            gifUrl: imageUrl || '',
            title: alt,
            orderIndex: 0,
            visible: true,
          } as ContentGifModel)
        : ({
            id: contentId,
            contentType: 'IMAGE',
            imageUrl: imageUrl || '',
            title: alt,
            orderIndex: 0,
            visible: true,
          } as ContentImageModel);

    const handler = createContentClickHandler(
      contentId,
      onImageClick,
      enableFullScreenView,
      onFullScreenImageClick,
      fullScreenContent
    );
    handler?.();
  }, [
    contentId,
    contentType,
    imageUrl,
    alt,
    onImageClick,
    enableFullScreenView,
    onFullScreenImageClick,
    _hasSlug,
    isReorderMode,
  ]);

  // Must be defined before any early return to satisfy Rules of Hooks
  const handleImageError = useCallback(() => {
    setFailedImageIds(prev => new Set(prev).add(contentId));
    onImageLoadError?.(contentId);
  }, [contentId, onImageLoadError]);

  // Used by handleTagClick: when a filter context is present, tag clicks toggle
  // the in-page filter instead of navigating to the tag route.
  const collectionFilter = useCollectionFilter();

  if (contentType === 'TEXT') {
    if (!textItems || textItems.length === 0) {
      return null;
    }

    const dateItem = textItems.find(item => item.type === 'date');
    const locationItem = textItems.find(item => item.type === 'location');
    const descriptionItem = textItems.find(item => item.type === 'description');
    const tagItems = textItems.filter(item => item.type === 'tag');
    const filterItems = textItems.filter(item => item.type === 'text');
    const collectionItems = textItems.filter(item => item.type === 'collection');

    const handleTagClick = (tagName: string, tagSlug?: string) => {
      if (collectionFilter) {
        toggleArrayFilter(
          collectionFilter.filterState,
          collectionFilter.onFilterChange,
          'selectedTags',
          tagName
        );
      } else {
        router.push(`/tag/${tagSlug ?? slugify(tagName)}`);
      }
    };

    const hasCoverTiles = collectionItems.some(item => !!item.imageUrl);

    return (
      <div
        key={contentId}
        className={`${buildWrapperClassName(className, cbStyles, {
          includeDragContainer: false,
          enableParallax: false,
          isMobile,
          hasClickHandler: false,
          isSelected: false,
        })} ${cbStyles.contentBox}`}
        style={{
          width: Number.isFinite(width) ? width : 300,
          height: height > 0 ? height : 'auto',
        }}
      >
        <div className={cbStyles.blockContainer}>
          <div className={cbStyles.metadataBlockInner}>
            {(dateItem || locationItem) && (
              <div className={cbStyles.metadataHeaderRow}>
                {dateItem && <div className={cbStyles.metadataDate}>{dateItem.value}</div>}
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
            {/* Description grows to fill available space, anchoring content below to the bottom. */}
            <div className={cbStyles.metadataDescriptionContainer}>
              {descriptionItem && (
                <p className={cbStyles.metadataDescription}>{descriptionItem.value}</p>
              )}
            </div>
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
            {collectionItems.length > 0 && (
              <div className={cbStyles.seriesSection}>
                <span className={cbStyles.seriesLabel}>More in this series</span>
                {hasCoverTiles ? (
                  <div className={cbStyles.seriesTilesRow}>
                    {collectionItems.map(item => (
                      <Link
                        key={`series-tile-${contentId}-${item.slug}`}
                        href={item.slug!}
                        className={cbStyles.seriesTile}
                        aria-label={item.value}
                      >
                        <span className={cbStyles.seriesTileFrame}>
                          <Image
                            src={item.imageUrl!}
                            alt={item.value}
                            fill
                            className={cbStyles.seriesTileImage}
                            sizes="96px"
                          />
                        </span>
                        <span className={cbStyles.seriesTileName}>{item.value}</span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className={cbStyles.seriesLinksRow}>
                    {collectionItems.map(item => (
                      <Link
                        key={`series-link-${contentId}-${item.slug}`}
                        href={item.slug!}
                        className={cbStyles.seriesLink}
                      >
                        {item.value}
                      </Link>
                    ))}
                  </div>
                )}
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
        className={`${buildWrapperClassName(className, cbStyles, {
          includeDragContainer: false,
          enableParallax: false,
          isMobile,
          hasClickHandler: hasClickHandler,
          isSelected: false,
        })} ${cbStyles.contentBox}`}
        style={{
          width: Number.isFinite(width) ? width : 300,
          height: Number.isFinite(height) ? height : 200,
          cursor: hasClickHandler ? 'pointer' : 'default',
        }}
      >
        <div className={cbStyles.imageWrapper} onClick={handleClick}>
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            poster={thumbnailUrl || undefined}
            width={imageWidth || undefined}
            height={imageHeight || undefined}
            className={cbStyles.nonParallaxImage}
          >
            <source src={imageUrl} type="video/mp4" />
          </video>
          {overlayText && <div className={cbStyles.textOverlay}>{overlayText}</div>}
        </div>
        {isReorderMode && onArrowMove && onPickUp && onPlace && onCancelImageMove && (
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
        className={`${buildWrapperClassName(className, cbStyles, {
          includeDragContainer: false,
          enableParallax: false,
          isMobile,
          hasClickHandler,
          isSelected: false,
        })} ${cbStyles.imagePlaceholder}`}
        onClick={hasClickHandler ? handleClick : undefined}
        role={hasClickHandler ? 'button' : undefined}
        tabIndex={hasClickHandler ? 0 : undefined}
        onKeyDown={
          hasClickHandler
            ? e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleClick();
                }
              }
            : undefined
        }
        style={{
          width: placeholderWidth,
          height: placeholderHeight,
          cursor: hasClickHandler ? 'pointer' : 'default',
        }}
      >
        {overlayText || 'No Image'}
      </div>
    );
  }

  if (failedImageIds.has(contentId)) {
    const placeholderWidth = width || 300;
    const placeholderHeight = height || (placeholderWidth * 2) / 3;

    return (
      <div
        key={contentId}
        className={`${buildWrapperClassName(className, cbStyles, {
          includeDragContainer: false,
          enableParallax: false,
          isMobile,
          hasClickHandler: false,
          isSelected: false,
        })} ${cbStyles.contentBox}`}
        style={{
          width: placeholderWidth,
          height: placeholderHeight,
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
  const isSelected = contentType === 'IMAGE' && selectedIds.includes(contentId);
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
        locations: [],
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
    fetchPriority: priority ? ('high' as const) : undefined,
    unoptimized: isGif,
    onError: handleImageError,
    ...(enableParallax
      ? {
          className: `parallax-bg ${variantStyles.parallaxImage}`,
        }
      : {
          className: cbStyles.nonParallaxImage,
          style: {
            cursor: hasClickHandler ? ('pointer' as const) : ('default' as const),
          },
        }),
  };

  const imageWrapperContent = (
    <>
      <Image {...imageProps} />
      {overlayText && <div className={cbStyles.textOverlay}>{overlayText}</div>}
      {cardTypeBadge && <Badge label={cardTypeBadge} tone={isCollection ? 'card' : 'date'} />}
    </>
  );

  // Guard: log and recover from NaN dimensions before rendering
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    logger.error('CollectionContentRenderer', 'NaN detected in props', undefined, {
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

  const { width: validWidth, height: validHeight } = resolveValidDimensions({
    width,
    height,
    imageWidth,
    imageHeight,
  });

  const wrapperProps = {
    className: enableParallax
      ? buildParallaxWrapperClassName(className, cbStyles, {
          isMobile,
          isSelected: contentType === 'IMAGE' && selectedIds.includes(contentId),
        })
      : buildWrapperClassName(className, cbStyles, {
          includeDragContainer: false,
          enableParallax,
          isMobile,
          hasClickHandler: hasClickHandler,
          isSelected: contentType === 'IMAGE' && selectedIds.includes(contentId),
        }),
    style: {
      width: validWidth,
      height: validHeight,
      boxSizing: 'border-box' as const,
      position: 'relative' as const,
      cursor: hasClickHandler ? 'pointer' : 'default',
    },
    ...(enableParallax && { ref: parallaxRef }),
  };

  if (isSlugNav) {
    return (
      <Tile
        key={contentId}
        href={`/${_hasSlug}`}
        aria-label={overlayText ?? alt}
        className={wrapperProps.className}
        style={wrapperProps.style}
        {...(enableParallax
          ? { ref: parallaxRef as Ref<HTMLAnchorElement>, 'data-parallax-container': '' }
          : { 'data-image-wrapper': '' })}
      >
        <span className={cbStyles.imageWrapper}>{imageWrapperContent}</span>
        {!enableParallax && (
          <ImageOverlays
            contentType={contentType}
            isNotVisible={isNotVisible}
            shouldShowOverlay={shouldShowOverlay}
            isSelected={isSelected}
          />
        )}
      </Tile>
    );
  }

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
