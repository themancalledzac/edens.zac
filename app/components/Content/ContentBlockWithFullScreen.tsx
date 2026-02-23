'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

import { type ReorderMove } from '@/app/(admin)/collection/manage/[[...slug]]/manageUtils';
import { FullScreenModal } from '@/app/components/FullScreenModal/FullScreenModal';
import { useFullScreenImage } from '@/app/hooks/useFullScreenImage';
import { collectionStorage } from '@/app/lib/storage/collectionStorage';
import { type CollectionModel } from '@/app/types/Collection';
import {
  type AnyContentModel,
  type ContentImageModel,
  type ContentParallaxImageModel,
} from '@/app/types/Content';

import Component from './Component';
import styles from './ContentBlockWithFullScreen.module.scss';

const LOAD_MORE_THRESHOLD = '400px';
const DEFAULT_CHUNK_SIZE = 50;

interface ContentBlockWithFullScreenProps {
  content: AnyContentModel[];
  priorityBlockIndex?: number;
  enableFullScreenView?: boolean;
  initialPageSize?: number;
  chunkSize?: number;
  collectionSlug?: string;
  collectionData?: CollectionModel;
  isSelectingCoverImage?: boolean;
  currentCoverImageId?: number;
  onImageClick?: (imageId: number) => void;
  justClickedImageId?: number | null;
  selectedImageIds?: number[];
  currentCollectionId?: number;
  // Reorder mode props
  isReorderMode?: boolean;
  reorderMoves?: ReorderMove[];
  pickedUpImageId?: number | null;
  reorderDisplayOrder?: number[];
  onArrowMove?: (contentId: number, direction: -1 | 1) => void;
  onPickUp?: (contentId: number) => void;
  onPlace?: (targetId: number) => void;
  onCancelImageMove?: (contentId: number) => void;
}
export default function ContentBlockWithFullScreen({
  content: allBlocks,
  priorityBlockIndex,
  enableFullScreenView,
  initialPageSize,
  chunkSize,
  collectionSlug,
  collectionData,
  isSelectingCoverImage,
  currentCoverImageId,
  onImageClick,
  justClickedImageId,
  selectedImageIds,
  currentCollectionId,
  isReorderMode = false,
  reorderMoves,
  pickedUpImageId,
  reorderDisplayOrder,
  onArrowMove,
  onPickUp,
  onPlace,
  onCancelImageMove,
}: ContentBlockWithFullScreenProps) {
  const {
    showImage,
    fullScreenState,
    loadedImageIds,
    setLoadedImageIds,
    modalRef,
    hideImage,
    isSwiping,
    showMetadata,
    toggleMetadata,
    router,
  } = useFullScreenImage();

  useEffect(() => {
    if (collectionSlug && collectionData) {
      collectionStorage.set(collectionSlug, collectionData);
    }
  }, [collectionSlug, collectionData]);

  const imageBlocks = useMemo(() => {
    return allBlocks.filter(
      (block): block is ContentImageModel | ContentParallaxImageModel =>
        block.contentType === 'IMAGE'
    );
  }, [allBlocks]);

  const handleFullScreenImageClick = (image: ContentImageModel | ContentParallaxImageModel) => {
    showImage(image, imageBlocks);
  };

  const [visibleCount, setVisibleCount] = useState(
    initialPageSize && initialPageSize > 0 ? initialPageSize : allBlocks.length
  );
  const [showButton, setShowButton] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const visibleBlocks = initialPageSize ? allBlocks.slice(0, visibleCount) : allBlocks;
  const hasMore = visibleCount < allBlocks.length;

  useEffect(() => {
    if (!hasMore || !sentinelRef.current) return;

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShowButton(true);
          }
        }
      },
      { rootMargin: LOAD_MORE_THRESHOLD }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore]);

  const handleLoadMore = () => {
    setVisibleCount(prev =>
      Math.min(prev + (initialPageSize || DEFAULT_CHUNK_SIZE), allBlocks.length)
    );
    setShowButton(false);
  };

  return (
    <>
      <Component
        content={visibleBlocks}
        priorityIndex={priorityBlockIndex}
        enableFullScreenView={enableFullScreenView}
        onFullScreenImageClick={handleFullScreenImageClick}
        isSelectingCoverImage={isSelectingCoverImage}
        currentCoverImageId={currentCoverImageId}
        onImageClick={onImageClick}
        justClickedImageId={justClickedImageId}
        selectedImageIds={selectedImageIds}
        currentCollectionId={currentCollectionId}
        chunkSize={chunkSize}
        collectionData={collectionData}
        isReorderMode={isReorderMode}
        reorderMoves={reorderMoves}
        pickedUpImageId={pickedUpImageId}
        reorderDisplayOrder={reorderDisplayOrder}
        onArrowMove={onArrowMove}
        onPickUp={onPickUp}
        onPlace={onPlace}
        onCancelImageMove={onCancelImageMove}
      />

      {hasMore && (
        <div>
          <div ref={sentinelRef} style={{ height: '1px', visibility: 'hidden' }} />
          {showButton && (
            <div className={styles.loadMoreContainer}>
              <button type="button" onClick={handleLoadMore} className={styles.loadMoreButton}>
                Load More
              </button>
              <div className={styles.paginationInfo}>
                Showing {visibleCount} of {allBlocks.length} items
              </div>
            </div>
          )}
        </div>
      )}

      <FullScreenModal
        fullScreenState={fullScreenState}
        loadedImageIds={loadedImageIds}
        setLoadedImageIds={setLoadedImageIds}
        modalRef={modalRef}
        hideImage={hideImage}
        isSwiping={isSwiping}
        showMetadata={showMetadata}
        toggleMetadata={toggleMetadata}
        router={router}
      />
    </>
  );
}
