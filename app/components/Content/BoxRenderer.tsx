'use client';

import React from 'react';

import type { ContentImageModel, ContentParallaxImageModel } from '@/app/types/Content';
import { type CollectionContentRendererProps } from '@/app/types/ContentRenderer';
import { determineContentRendererProps } from '@/app/utils/contentRendererUtils';
import { type BoxTree } from '@/app/utils/rowCombination';

import styles from './BoxRenderer.module.scss';
import CollectionContentRenderer from './CollectionContentRenderer';
import cbStyles from './ContentComponent.module.scss';

interface BoxRendererProps {
  tree: BoxTree;
  sizes: Map<string, { width: number; height: number }>;
  isMobile: boolean;
  // Pass-through props for child renderers
  enableDragAndDrop?: boolean;
  draggedImageId?: number | null;
  onImageClick?: (imageId: number) => void;
  enableFullScreenView?: boolean;
  onFullScreenImageClick?: (image: ContentImageModel | ContentParallaxImageModel) => void;
  selectedImageIds?: number[];
  currentCollectionId?: number;
  isSelectingCoverImage?: boolean;
  currentCoverImageId?: number;
  justClickedImageId?: number | null;
  onDragStart?: (imageId: number) => void;
  onDragOver?: (e: React.DragEvent, imageId: number) => void;
  onDrop?: (e: React.DragEvent, imageId: number) => void;
  onDragEnd?: () => void;
  priority?: boolean;
}

export function BoxRenderer({
  tree,
  sizes,
  isMobile,
  enableDragAndDrop,
  draggedImageId,
  onImageClick,
  enableFullScreenView,
  onFullScreenImageClick,
  selectedImageIds = [],
  currentCollectionId,
  isSelectingCoverImage,
  currentCoverImageId,
  justClickedImageId,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  priority,
}: BoxRendererProps) {
  // Base case: single leaf
  if (tree.type === 'leaf') {
    const size = sizes.get(String(tree.content.id));
    if (!size) return null;

    // Build renderer props similar to how Component.tsx does it
    const rendererProps = determineContentRendererProps(
      { content: tree.content, ...size },
      1, // totalInRow - not really applicable for BoxRenderer
      0, // index - not really applicable for BoxRenderer
      isMobile,
      {
        imageSingle: cbStyles.imageSingle || '',
        imageLeft: cbStyles.imageLeft || '',
        imageRight: cbStyles.imageRight || '',
        imageMiddle: cbStyles.imageMiddle || '',
      }
    );

    const fullProps: CollectionContentRendererProps = {
      ...rendererProps,
      enableDragAndDrop,
      draggedImageId,
      onImageClick,
      enableFullScreenView,
      onFullScreenImageClick,
      selectedImageIds,
      currentCollectionId,
      isSelectingCoverImage,
      currentCoverImageId,
      justClickedImageId,
      onDragStart,
      onDragOver,
      onDrop,
      onDragEnd,
    };

    return <CollectionContentRenderer {...fullProps} />;
  }

  // Recursive case: combined box
  const containerClass = tree.direction === 'horizontal' ? styles.hbox : styles.vbox;

  return (
    <div className={containerClass}>
      <BoxRenderer
        tree={tree.children[0]}
        sizes={sizes}
        isMobile={isMobile}
        enableDragAndDrop={enableDragAndDrop}
        draggedImageId={draggedImageId}
        onImageClick={onImageClick}
        enableFullScreenView={enableFullScreenView}
        onFullScreenImageClick={onFullScreenImageClick}
        selectedImageIds={selectedImageIds}
        currentCollectionId={currentCollectionId}
        isSelectingCoverImage={isSelectingCoverImage}
        currentCoverImageId={currentCoverImageId}
        justClickedImageId={justClickedImageId}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        priority={priority}
      />
      <BoxRenderer
        tree={tree.children[1]}
        sizes={sizes}
        isMobile={isMobile}
        enableDragAndDrop={enableDragAndDrop}
        draggedImageId={draggedImageId}
        onImageClick={onImageClick}
        enableFullScreenView={enableFullScreenView}
        onFullScreenImageClick={onFullScreenImageClick}
        selectedImageIds={selectedImageIds}
        currentCollectionId={currentCollectionId}
        isSelectingCoverImage={isSelectingCoverImage}
        currentCoverImageId={currentCoverImageId}
        justClickedImageId={justClickedImageId}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        priority={priority}
      />
    </div>
  );
}
