'use client';

import { type ReorderMove } from '@/app/(admin)/collection/manage/[[...slug]]/manageUtils';
import type { ContentImageModel, ContentParallaxImageModel } from '@/app/types/Content';
import { type CollectionContentRendererProps } from '@/app/types/ContentRenderer';
import { determineContentRendererProps } from '@/app/utils/contentRendererUtils';
import { logger } from '@/app/utils/logger';
import { type BoxTree } from '@/app/utils/rowCombination';

import styles from './BoxRenderer.module.scss';
import CollectionContentRenderer from './CollectionContentRenderer';
import cbStyles from './ContentComponent.module.scss';

interface BoxRendererProps {
  tree: BoxTree;
  sizes: Map<number, { width: number; height: number }>;
  isMobile: boolean;
  /** Pass-through props for child renderers */
  onImageClick?: (imageId: number) => void;
  enableFullScreenView?: boolean;
  onFullScreenImageClick?: (image: ContentImageModel | ContentParallaxImageModel) => void;
  selectedImageIds?: number[];
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
  isClientGallery?: boolean;
  collectionSlug?: string;
}

export function BoxRenderer({
  tree,
  sizes,
  isMobile,
  onImageClick,
  enableFullScreenView,
  onFullScreenImageClick,
  selectedImageIds = [],
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
  isClientGallery,
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
    const isPickedUp = isReorderMode && pickedUpImageId === contentId;
    const hasMoved = isReorderMode && (reorderMoves?.some(m => m.imageId === contentId) ?? false);
    const orderIndex = reorderDisplayOrder?.indexOf(contentId) ?? -1;
    const isFirstInOrder = orderIndex === 0;
    const isLastInOrder = orderIndex === (reorderDisplayOrder?.length ?? 0) - 1;

    const fullProps: CollectionContentRendererProps = {
      ...rendererProps,
      onImageClick,
      enableFullScreenView,
      onFullScreenImageClick,
      selectedImageIds,
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
      isClientGallery,
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
    selectedImageIds,
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
    isClientGallery,
    collectionSlug,
  };

  return (
    <div className={containerClass}>
      <BoxRenderer tree={tree.children[0]} {...childProps} />
      <BoxRenderer tree={tree.children[1]} {...childProps} />
    </div>
  );
}
