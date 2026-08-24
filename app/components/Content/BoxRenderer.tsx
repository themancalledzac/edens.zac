'use client';

import { type CollectionContentRendererProps } from '@/app/types/ContentRenderer';
import { isContentVisibleInCollection } from '@/app/utils/contentLayout';
import { determineContentRendererProps } from '@/app/utils/contentRendererUtils';
import { isBlankContent, isPanelContent } from '@/app/utils/contentTypeGuards';
import { logger } from '@/app/utils/logger';
import { type BoxTree } from '@/app/utils/rowCombination';

import { AdminPanelRenderer } from './AdminPanelRenderer';
import styles from './BoxRenderer.module.scss';
import { computeReorderFlags } from './boxRendererUtils';
import CollectionContentRenderer from './CollectionContentRenderer';
import cbStyles from './ContentComponent.module.scss';
import { useRenderer } from './RendererContext';

interface BoxRendererProps {
  tree: BoxTree;
  sizes: Map<number, { width: number; height: number }>;
  isMobile: boolean;
  /**
   * Eager-load flag for this row (`rowIndex <= priorityRowIndex`). Stays a prop because it is the
   * one value in this chain that is per-row rather than render-constant.
   */
  priority?: boolean;
}

/**
 * Renders a `BoxTree` node: recurses through hbox/vbox splits and hands each leaf's normalized
 * props to {@link CollectionContentRenderer}.
 *
 * This is also where `notVisible` is derived, because it is the last point in the chain that still
 * holds the real content block — `determineContentRendererProps` flattens the block down to
 * primitives (`contentId`, `imageUrl`, `contentType`) and drops the `visible` flag and the
 * `collections` entries the check needs.
 *
 * The `currentCollectionId != null` gate is the manage-view test used throughout the render path
 * (`isPublicView` in `Component.tsx`, the early return in `computeFirstNonVisibleRowIndex`). Public
 * views already drop hidden blocks via `filterVisibleBlocks`, so the gray tint would be both
 * unreachable and wrong there; manage deliberately keeps hidden blocks in place and marks them.
 *
 * Everything except `tree`/`sizes`/`isMobile`/`priority` arrives through {@link useRenderer}. The
 * defaults applied below are the ones `Component` used to apply on the way in, kept here so the
 * leaf sees the same values it always has.
 */
export function BoxRenderer({ tree, sizes, isMobile, priority }: BoxRendererProps) {
  const {
    onImageClick,
    enableFullScreenView = false,
    onFullScreenImageClick,
    selectedIds = [],
    currentCollectionId,
    isSelectingCoverImage = false,
    currentCoverImageId,
    justClickedImageId,
    isReorderMode = false,
    reorderMoves,
    pickedUpImageId,
    reorderDisplayOrder,
    onArrowMove,
    onPickUp,
    onPlace,
    onCancelImageMove,
    onImageLoadError,
    canDownload,
    collectionSlug,
  } = useRenderer();

  if (tree.type === 'leaf') {
    const size = sizes.get(tree.content.id);
    if (!size) {
      logger.error(
        'BoxRenderer',
        `no size entry for content ID ${tree.content.id} — image will not render`
      );
      return <div className={styles.missingImage}>Image unavailable</div>;
    }

    if (isBlankContent(tree.content)) {
      return (
        <div
          className={styles.blankSpacer}
          style={{ width: size.width, height: size.height }}
          aria-hidden
        />
      );
    }

    if (isPanelContent(tree.content)) {
      return (
        <AdminPanelRenderer
          content={tree.content}
          width={size.width}
          height={size.height}
          positionClassName={cbStyles.imageSingle || ''}
        />
      );
    }

    const rendererProps = determineContentRendererProps(
      { content: tree.content, ...size },
      1,
      0,
      isMobile,
      {
        imageSingle: cbStyles.imageSingle || '',
        imageLeft: cbStyles.imageLeft || '',
        imageRight: cbStyles.imageRight || '',
        imageMiddle: cbStyles.imageMiddle || '',
      }
    );

    const contentId = tree.content.id;
    const { isPickedUp, hasMoved, isFirstInOrder, isLastInOrder } = computeReorderFlags(contentId, {
      isReorderMode,
      pickedUpImageId,
      reorderMoves,
      reorderDisplayOrder,
    });

    const notVisible =
      currentCollectionId != null &&
      !isContentVisibleInCollection(tree.content, currentCollectionId);

    const fullProps: CollectionContentRendererProps = {
      ...rendererProps,
      notVisible,
      onImageClick,
      enableFullScreenView,
      onFullScreenImageClick,
      selectedIds,
      currentCollectionId,
      isSelectingCoverImage,
      currentCoverImageId,
      justClickedImageId,
      isReorderMode,
      isPickedUp,
      pickedUpImageId,
      hasMoved,
      isFirstInOrder,
      isLastInOrder,
      onArrowMove,
      onPickUp,
      onPlace,
      onCancelImageMove,
      priority,
      onImageLoadError,
      canDownload,
      collectionSlug,
    };

    return <CollectionContentRenderer {...fullProps} />;
  }

  const containerClass = tree.direction === 'horizontal' ? styles.hbox : styles.vbox;

  return (
    <div className={containerClass}>
      <BoxRenderer tree={tree.children[0]} sizes={sizes} isMobile={isMobile} priority={priority} />
      <BoxRenderer tree={tree.children[1]} sizes={sizes} isMobile={isMobile} priority={priority} />
    </div>
  );
}
