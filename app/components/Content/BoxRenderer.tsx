'use client';

import { type ReorderMove } from '@/app/components/ContentCollection/edit/collectionEditUtils';
import type { ViewableContent } from '@/app/types/Content';
import { type CollectionContentRendererProps } from '@/app/types/ContentRenderer';
import { determineContentRendererProps } from '@/app/utils/contentRendererUtils';
import { isBlankContent, isPanelContent } from '@/app/utils/contentTypeGuards';
import { logger } from '@/app/utils/logger';
import { type BoxTree } from '@/app/utils/rowCombination';

import { AdminPanelRenderer } from './AdminPanelRenderer';
import styles from './BoxRenderer.module.scss';
import { computeReorderFlags } from './boxRendererUtils';
import CollectionContentRenderer from './CollectionContentRenderer';
import cbStyles from './ContentComponent.module.scss';

interface BoxRendererProps {
  tree: BoxTree;
  sizes: Map<number, { width: number; height: number }>;
  isMobile: boolean;
  /** Pass-through props for child renderers */
  onImageClick?: (imageId: number) => void;
  enableFullScreenView?: boolean;
  onFullScreenImageClick?: (image: ViewableContent) => void;
  selectedIds?: number[];
  currentCollectionId?: number;
  isSelectingCoverImage?: boolean;
  currentCoverImageId?: number;
  justClickedImageId?: number | null;
  /** Reorder mode props */
  isReorderMode?: boolean;
  reorderMoves?: ReorderMove[];
  pickedUpImageId?: number | null;
  reorderDisplayOrder?: number[];
  onArrowMove?: (contentId: number, direction: -1 | 1) => void;
  onPickUp?: (contentId: number) => void;
  onPlace?: (targetId: number) => void;
  onCancelImageMove?: (contentId: number) => void;
  priority?: boolean;
  onImageLoadError?: (contentId: number) => void;
  /** Client gallery props */
  canDownload?: boolean;
  collectionSlug?: string;
}

export function BoxRenderer({
  tree,
  sizes,
  isMobile,
  onImageClick,
  enableFullScreenView,
  onFullScreenImageClick,
  selectedIds = [],
  currentCollectionId,
  isSelectingCoverImage,
  currentCoverImageId,
  justClickedImageId,
  isReorderMode,
  reorderMoves,
  pickedUpImageId,
  reorderDisplayOrder,
  onArrowMove,
  onPickUp,
  onPlace,
  onCancelImageMove,
  priority,
  onImageLoadError,
  canDownload,
  collectionSlug,
}: BoxRendererProps) {
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
      return <AdminPanelRenderer content={tree.content} width={size.width} height={size.height} />;
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

    const fullProps: CollectionContentRendererProps = {
      ...rendererProps,
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

  const childProps = {
    sizes,
    isMobile,
    onImageClick,
    enableFullScreenView,
    onFullScreenImageClick,
    selectedIds,
    currentCollectionId,
    isSelectingCoverImage,
    currentCoverImageId,
    justClickedImageId,
    isReorderMode,
    reorderMoves,
    pickedUpImageId,
    reorderDisplayOrder,
    onArrowMove,
    onPickUp,
    onPlace,
    onCancelImageMove,
    priority,
    onImageLoadError,
    canDownload,
    collectionSlug,
  };

  return (
    <div className={containerClass}>
      <BoxRenderer tree={tree.children[0]} {...childProps} />
      <BoxRenderer tree={tree.children[1]} {...childProps} />
    </div>
  );
}
