'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type Ref, useCallback, useState } from 'react';

import ClientGalleryDownload from '@/app/components/ClientGalleryDownload/ClientGalleryDownload';
import ImageDownloadOverlay from '@/app/components/ClientGalleryDownload/ImageDownloadOverlay';
import { useCollectionFilter } from '@/app/components/ContentCollection/CollectionFilterContext';
import { Badge } from '@/app/components/ui/Badge/Badge';
import {
  FilterToolbar,
  type ToolbarDimension,
} from '@/app/components/ui/FilterToolbar/FilterToolbar';
import { Tile } from '@/app/components/ui/Tile/Tile';
import { useParallax } from '@/app/hooks/useParallax';
import {
  type ContentGifModel,
  type ContentImageModel,
  type ViewableContent,
} from '@/app/types/Content';
import { type CollectionContentRendererProps } from '@/app/types/ContentRenderer';
import { type ArrayFilterKey, toggleArrayFilter } from '@/app/types/GalleryFilter';
import {
  checkImageVisibility,
  createContentClickHandler,
} from '@/app/utils/contentComponentHandlers';
import {
  buildParallaxWrapperClassName,
  buildWrapperClassName,
} from '@/app/utils/contentRendererUtils';
import { slugify } from '@/app/utils/locationUtils';
import { logger } from '@/app/utils/logger';

import cbStyles from './ContentComponent.module.scss';
import { ImageOverlays } from './ImageOverlays';
import variantStyles from './ParallaxImageRenderer.module.scss';
import ReorderOverlay from './ReorderOverlay';

/**
 * Maps the collection page's CollectionInfoOptions (per-dimension `filterable`
 * + values) into the toolbar's `dimensions` config. Only filterable dimensions
 * with at least one value become dropdowns; lens names and lens-type chips are
 * surfaced as separate dropdowns (types carry display labels).
 */
function toCollectionDimensions(
  options: NonNullable<ReturnType<typeof useCollectionFilter>>['filterOptions']
): Partial<Record<ArrayFilterKey, ToolbarDimension>> {
  const dims: Partial<Record<ArrayFilterKey, ToolbarDimension>> = {};
  if (options.people.filterable && options.people.values.length > 0) {
    dims.selectedPeople = { label: 'People', options: options.people.values };
  }
  if (options.tags.filterable && options.tags.values.length > 0) {
    dims.selectedTags = { label: 'Tags', options: options.tags.values };
  }
  if (options.cameras.filterable && options.cameras.values.length > 0) {
    dims.selectedCameras = { label: 'Camera', options: options.cameras.values };
  }
  if (options.locations.filterable && options.locations.values.length > 0) {
    dims.selectedLocations = { label: 'Location', options: options.locations.values };
  }
  if (
    (options.lenses.filterable && options.lenses.values.length > 0) ||
    (options.lensTypes.filterable && options.lensTypes.values.length > 0)
  ) {
    // Lens is surfaced as two dropdowns: NAMES and TYPES.
    dims.selectedLenses = {
      label: 'Lens',
      options: options.lenses.values,
    };
    if (options.lensTypes.values.length > 0) {
      dims.selectedLensTypes = {
        label: 'Lens type',
        options: options.lensTypes.values,
        optionLabels: { wide: 'Wide', normal: 'Normal', telephoto: 'Telephoto' },
      };
    }
  }
  return dims;
}

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

  // COLLECTION tiles navigate via href; IMAGE/GIF fullscreen stays on onClick.
  const isSlugNav = !!_hasSlug && !onImageClick && !isReorderMode && contentType !== 'TEXT';

  // Whether a meaningful click action exists for this item (used for cursor/style checks).
  // Mirrors the guard logic in handleClick: TEXT and reorder mode produce no action,
  // slug-only navigation fires when _hasSlug is set and no onImageClick is present,
  // otherwise a handler exists when onImageClick or fullscreen is configured.
  const hasClickHandler =
    contentType !== 'TEXT' &&
    !isReorderMode &&
    ((_hasSlug !== undefined && !onImageClick) ||
      !!onImageClick ||
      !!(enableFullScreenView && onFullScreenImageClick));

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
            {descriptionItem && (
              <div className={cbStyles.metadataDescriptionContainer}>
                <p className={cbStyles.metadataDescription}>{descriptionItem.value}</p>
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
            {!collectionFilter && tagItems.length > 0 && (
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
              <div className={cbStyles.metadataSiblingsContainer}>
                <span className={cbStyles.metadataSiblingLabel}>Related:</span>
                <div className={cbStyles.metadataSiblingsRow}>
                  {collectionItems.map(item => (
                    <Link
                      key={`sibling-${contentId}-${item.slug}`}
                      href={item.slug!}
                      className={cbStyles.metadataSiblingCollection}
                    >
                      {item.value}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {isClientGallery && collectionSlug && (
              <ClientGalleryDownload collectionSlug={collectionSlug} />
            )}
          </div>
          {collectionFilter && (
            <div className={cbStyles.filterBarWrapper}>
              <FilterToolbar
                filterState={collectionFilter.filterState}
                onFilterChange={collectionFilter.onFilterChange}
                dimensions={toCollectionDimensions(collectionFilter.filterOptions)}
                filteredAvailable={
                  collectionFilter.filteredAvailable
                    ? {
                        selectedTags: collectionFilter.filteredAvailable.tags,
                        selectedPeople: collectionFilter.filteredAvailable.people,
                        selectedCameras: collectionFilter.filteredAvailable.cameras,
                        selectedLenses: collectionFilter.filteredAvailable.lenses,
                        selectedLensTypes: collectionFilter.filteredAvailable.lensTypes,
                        selectedLocations: collectionFilter.filteredAvailable.locations,
                      }
                    : null
                }
                showDateSort
                showHighlyRated={collectionFilter.filterOptions.showHighlyRated}
                density={collectionFilter.density}
                onDensityChange={collectionFilter.onDensityChange}
              />
            </div>
          )}
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
          hasClickHandler: hasClickHandler,
          isSelected: contentType === 'IMAGE' && selectedImageIds.includes(contentId),
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
      {isClientGallery && contentType === 'IMAGE' && <ImageDownloadOverlay imageId={contentId} />}
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
