'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type Ref, useCallback, useState } from 'react';

import ClientGalleryDownload from '@/app/components/ClientGalleryDownload/ClientGalleryDownload';
import { useCollectionFilter } from '@/app/components/ContentCollection/CollectionFilterContext';
import { InlineEditableText } from '@/app/components/ContentCollection/edit/InlineEditableText';
import { useInlineEdit } from '@/app/components/ContentCollection/edit/InlineEditContext';
import { useSendMessageEnabled } from '@/app/components/ContentCollection/SendMessageContext';
import { SendMessageButton } from '@/app/components/SendMessageButton/SendMessageButton';
import { Badge } from '@/app/components/ui/Badge/Badge';
import { FilterToolbar } from '@/app/components/ui/FilterToolbar/FilterToolbar';
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
import { isLocalEnvironment } from '@/app/utils/environment';
import { slugify } from '@/app/utils/locationUtils';
import { logger } from '@/app/utils/logger';
import { manageHref } from '@/app/utils/manageUrl';

/**
 * Sentinel content id used by createCoverImageBlock (app/utils/contentLayout.ts) for the
 * header cover image. Lets the renderer single out the cover without a new prop.
 */
const COVER_IMAGE_CONTENT_ID = -1;

/**
 * Sentinel content id used by createMetadataTextBlock / createTextOnlyHeaderRow
 * (app/utils/contentLayout.ts) for the header metadata text block — the block that hosts
 * the filter bar. Lets the renderer scope header-only affordances (the send-message
 * button) to it rather than to every TEXT block.
 */
const METADATA_CONTENT_ID = -2;

import { getClickEligibility, toCollectionDimensions } from './collectionContentRendererUtils';
import cbStyles from './ContentComponent.module.scss';
import { ImageOverlays } from './ImageOverlays';
import variantStyles from './ParallaxImageRenderer.module.scss';
import ReorderOverlay from './ReorderOverlay';
import { SaveHeart } from './SaveHeart';
import { SelectStar } from './SelectStar';

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
  hasSlug,
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
    hasSlug: hasSlug,
    onImageClick,
    enableFullScreenView,
    onFullScreenImageClick,
  });

  const handleClick = useCallback(() => {
    if (contentType === 'TEXT') return;
    if (isReorderMode) return;
    if (hasSlug && !onImageClick) return; // navigation handled by <Tile href>

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
    hasSlug,
    isReorderMode,
  ]);

  // Must be defined before any early return to satisfy Rules of Hooks
  const handleImageError = useCallback(() => {
    setFailedImageIds(prev => new Set(prev).add(contentId));
    onImageLoadError?.(contentId);
  }, [contentId, onImageLoadError]);

  const collectionFilter = useCollectionFilter();
  const sendMessageEnabled = useSendMessageEnabled();
  const inlineEdit = useInlineEdit();

  // Localhost-only shortcut into manage mode, pinned to the header cover image. Shown only on the
  // public view (manage path sets currentCollectionId) for the cover block (contentId === -1).
  // Hidden on the signed-in user's own /user page for now — the send-message context is enabled
  // only there, so it doubles as the user-page signal.
  const showCoverUpdateShortcut =
    contentType === 'IMAGE' &&
    contentId === COVER_IMAGE_CONTENT_ID &&
    currentCollectionId == null &&
    !!collectionSlug &&
    !sendMessageEnabled &&
    isLocalEnvironment();

  const handleCoverUpdateClick = useCallback(
    (event: { stopPropagation: () => void }) => {
      // Stop the click from bubbling to the parallax wrapper (which opens fullscreen).
      event.stopPropagation();
      if (collectionSlug) {
        router.push(manageHref(collectionSlug));
      }
    },
    [collectionSlug, router]
  );

  if (contentType === 'TEXT') {
    if (!textItems || textItems.length === 0) {
      return null;
    }

    const dateItem = textItems.find(item => item.type === 'date');
    const locationItem = textItems.find(item => item.type === 'location');
    const descriptionItem = textItems.find(item => item.type === 'description');
    const tagItems = textItems.filter(item => item.type === 'tag');
    const filterItems = textItems.filter(item => item.type === 'text');
    const collectionItems = textItems.filter(
      (item): item is (typeof textItems)[number] & { slug: string } =>
        item.type === 'collection' && item.slug != null
    );

    const handleTagClick = (tagName: string, tagSlug?: string) => {
      if (collectionFilter) {
        toggleArrayFilter(
          collectionFilter.filterState,
          collectionFilter.onFilterChange,
          'selectedTags',
          tagName
        );
      } else {
        router.push(`/${tagSlug ?? slugify(tagName)}`);
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
            {inlineEdit && (
              <div className={cbStyles.metadataTitleRow}>
                <InlineEditableText
                  as="input"
                  value={inlineEdit.title}
                  onCommit={value => inlineEdit.onCommitField('title', value)}
                  readOnlyClassName={cbStyles.metadataTitle}
                  placeholder="Title"
                  ariaLabel="Collection title"
                />
              </div>
            )}
            {(dateItem || locationItem || inlineEdit) && (
              <div className={cbStyles.metadataHeaderRow}>
                {dateItem && <div className={cbStyles.metadataDate}>{dateItem.value}</div>}
                {inlineEdit ? (
                  <button
                    type="button"
                    className={cbStyles.metadataLocation}
                    onClick={inlineEdit.onEditLocation}
                  >
                    {locationItem ? locationItem.value : 'Add location'}
                  </button>
                ) : (
                  locationItem && (
                    <Link
                      href={`/location/${locationItem.slug ?? slugify(locationItem.value)}`}
                      className={cbStyles.metadataLocation}
                    >
                      {locationItem.value}
                    </Link>
                  )
                )}
              </div>
            )}
            {/* Always render the description container so it stays the
                flex-grow spacer that pushes the download bar + toolbar to the
                bottom — even when this gallery has no description text. */}
            <div className={cbStyles.metadataDescriptionContainer}>
              {inlineEdit ? (
                <InlineEditableText
                  as="textarea"
                  value={inlineEdit.description}
                  onCommit={value => inlineEdit.onCommitField('description', value)}
                  readOnlyClassName={cbStyles.metadataDescription}
                  placeholder="Add a description"
                  ariaLabel="Collection description"
                />
              ) : (
                descriptionItem && (
                  <p className={cbStyles.metadataDescription}>{descriptionItem.value}</p>
                )
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
            {collectionItems.length > 0 &&
              (collectionItems.some(item => item.coverImageUrl) ? (
                // Card path: at least one sibling has a cover image. Render a wrapping
                // row of ~2:1 cover cards; siblings still lacking a cover fall back to a
                // text-link chip inside the same row (no blank placeholder).
                <div className={cbStyles.metadataSiblingsContainer}>
                  <span className={cbStyles.metadataSiblingLabel}>Related</span>
                  <div className={cbStyles.metadataSiblingCardRow}>
                    {collectionItems.map(item =>
                      item.coverImageUrl ? (
                        <Link
                          key={`sibling-${contentId}-${item.slug}`}
                          href={item.slug}
                          className={cbStyles.metadataSiblingCard}
                          aria-label={item.value}
                        >
                          <Image
                            src={item.coverImageUrl}
                            alt={item.value}
                            fill
                            sizes="(max-width: 768px) 140px, 200px"
                            className={cbStyles.metadataSiblingCardImage}
                          />
                          <span className={cbStyles.metadataSiblingCardOverlay}>
                            <span className={cbStyles.metadataSiblingCardTitle}>{item.value}</span>
                          </span>
                        </Link>
                      ) : (
                        <Link
                          key={`sibling-${contentId}-${item.slug}`}
                          href={item.slug}
                          className={cbStyles.metadataSiblingChip}
                        >
                          {item.value}
                        </Link>
                      )
                    )}
                  </div>
                </div>
              ) : (
                // Fallback path: no sibling has a cover image (e.g. backend not yet
                // deployed). Keep the original plain text-link row.
                <div className={cbStyles.metadataSiblingsContainer}>
                  <span className={cbStyles.metadataSiblingLabel}>Related</span>
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
              ))}
            {isClientGallery && collectionSlug && (
              <ClientGalleryDownload collectionSlug={collectionSlug} />
            )}
          </div>
          {(collectionFilter || (sendMessageEnabled && contentId === METADATA_CONTENT_ID)) && (
            <div className={cbStyles.filterBarWrapper}>
              {collectionFilter && (
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
                  showDateSort={collectionFilter.filterOptions.showDateSort}
                  dateTwoState={collectionFilter.dateTwoState}
                  showHighlyRated={collectionFilter.filterOptions.showHighlyRated}
                  density={collectionFilter.density}
                  densityMax={collectionFilter.densityMax}
                  onDensityChange={collectionFilter.onDensityChange}
                />
              )}
              {sendMessageEnabled && contentId === METADATA_CONTENT_ID && <SendMessageButton />}
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
    const placeholderClassName = `${buildWrapperClassName(className, cbStyles, {
      includeDragContainer: false,
      enableParallax: false,
      isMobile,
      hasClickHandler,
      isSelected: false,
    })} ${cbStyles.imagePlaceholder}`;

    if (isSlugNav) {
      return (
        <Tile
          key={contentId}
          href={`/${hasSlug}`}
          aria-label={overlayText ?? alt}
          className={placeholderClassName}
          style={{ width: placeholderWidth, height: placeholderHeight }}
        >
          {overlayText || 'No Image'}
        </Tile>
      );
    }

    return (
      <div
        key={contentId}
        className={placeholderClassName}
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
    // currentCollectionId is only threaded down on the manage path (EditModeLayer);
    // the public CollectionPageClient grid, TaxonomyPage, and LocationPage never set it.
    const isManage = currentCollectionId != null;

    if (!isManage) {
      return null;
    }

    const placeholderWidth = width || 300;
    const placeholderHeight = height || (placeholderWidth * 2) / 3;
    const placeholderClassName = `${buildWrapperClassName(className, cbStyles, {
      includeDragContainer: false,
      enableParallax: false,
      isMobile,
      hasClickHandler,
      isSelected: false,
    })} ${cbStyles.contentBox}`;

    // Manage view: keep the "Image unavailable" box and make it clickable so the admin
    // can open the edit/delete modal and remove the broken image. Mirrors the click
    // wiring of the empty-URL ("No Image") placeholder above.
    return (
      <div
        key={contentId}
        className={placeholderClassName}
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

  // Selects (favorites) star. SelectStar self-gates on CLIENT membership + an active SelectsProvider;
  // on public client-gallery views it resolves to the star, elsewhere (manage/taxonomy/location,
  // where no SelectsProvider is mounted) it resolves to null.
  const selectStar = contentType === 'IMAGE' ? <SelectStar contentId={contentId} /> : null;

  // Save (bookmark) heart. SaveHeart self-gates on any logged-in viewer + an active SavesProvider;
  // resolves to null for anonymous viewers or where no SavesProvider is mounted.
  const saveHeart = contentType === 'IMAGE' ? <SaveHeart contentId={contentId} /> : null;

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
        href={`/${hasSlug}`}
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
            star={selectStar}
            save={saveHeart}
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
      {showCoverUpdateShortcut && (
        <button
          type="button"
          className={cbStyles.coverUpdateShortcut}
          onClick={handleCoverUpdateClick}
        >
          Update
        </button>
      )}
      {!enableParallax && (
        <ImageOverlays
          contentType={contentType}
          isNotVisible={isNotVisible}
          shouldShowOverlay={shouldShowOverlay}
          isSelected={isSelected}
          star={selectStar}
          save={saveHeart}
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
