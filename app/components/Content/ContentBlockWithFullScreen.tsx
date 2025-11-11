'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

import { useFullScreenImage } from '@/app/hooks/useFullScreenImage';
import { collectionStorage } from '@/app/lib/storage/collectionStorage';
import { type CollectionModel } from '@/app/types/Collection';
import {
  type AnyContentModel,
  type ImageContentModel,
  type ParallaxImageContentModel,
} from '@/app/types/Content';

import Component from './Component';
import styles from './ContentBlockWithFullScreen.module.scss';

interface ContentBlockWithFullScreenProps {
  content: AnyContentModel[];
  priorityBlockIndex?: number;
  enableFullScreenView?: boolean;
  initialPageSize?: number; // How many blocks to show initially (default: show all)
  // Collection caching for manage page optimization
  collectionSlug?: string; // If provided, will cache collection data
  collectionData?: CollectionModel; // The full collection to cache
  // Manage page props (optional, for admin/manage pages)
  isSelectingCoverImage?: boolean;
  currentCoverImageId?: number;
  onImageClick?: (imageId: number) => void;
  justClickedImageId?: number | null;
  selectedImageIds?: number[];
  currentCollectionId?: number;
  // Drag-and-drop props for reordering
  enableDragAndDrop?: boolean;
  draggedImageId?: number | null;
  dragOverImageId?: number | null;
  onDragStart?: (imageId: number) => void;
  onDragOver?: (e: React.DragEvent, imageId: number) => void;
  onDrop?: (e: React.DragEvent, imageId: number) => void;
  onDragEnd?: () => void;
}

/**
 * Wrapper component that provides full screen image functionality
 * to ContentBlockComponent using the new simplified hook.
 * Supports client-side pagination for large collections.
 *
 * Performance Optimization:
 * When collectionSlug and collectionData are provided, caches the collection
 * in sessionStorage for fast loading in the manage page (avoids 6s refetch).
 */
export default function ContentBlockWithFullScreen({
  content: allBlocks,
  priorityBlockIndex,
  enableFullScreenView,
  initialPageSize,
  collectionSlug,
  collectionData,
  isSelectingCoverImage,
  currentCoverImageId,
  onImageClick,
  justClickedImageId,
  selectedImageIds,
  currentCollectionId,
  enableDragAndDrop = false,
  draggedImageId,
  dragOverImageId,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: ContentBlockWithFullScreenProps) {
  const { showImage, FullScreenModal } = useFullScreenImage();

  // Cache collection data for manage page optimization
  useEffect(() => {
    if (collectionSlug && collectionData) {
      collectionStorage.set(collectionSlug, collectionData);
    }
  }, [collectionSlug, collectionData]);

  // Extract all image blocks for fullscreen navigation
  // Only IMAGE and PARALLAX blocks are included since text blocks don't support fullscreen viewing
  const imageBlocks = useMemo(() => {
    return allBlocks.filter(
      (block): block is ImageContentModel | ParallaxImageContentModel =>
        block.contentType === 'IMAGE' || block.contentType === 'PARALLAX'
    );
  }, [allBlocks]);

  // Wrapper function to pass all images for navigation
  const handleFullScreenImageClick = (
    image: ImageContentModel | ParallaxImageContentModel
  ) => {
    showImage(image, imageBlocks);
  };

  // If initialPageSize is provided, support pagination
  const [visibleCount, setVisibleCount] = useState(
    initialPageSize && initialPageSize > 0 ? initialPageSize : allBlocks.length
  );
  const [showButton, setShowButton] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Slice blocks to show only the visible count for pagination
  const visibleBlocks = initialPageSize ? allBlocks.slice(0, visibleCount) : allBlocks;
  const hasMore = visibleCount < allBlocks.length;

  // Use Intersection Observer to show button only when user scrolls near bottom
  useEffect(() => {
    if (!hasMore || !sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShowButton(true);
          }
        }
      },
      {
        rootMargin: '400px', // Show button 400px before sentinel is visible
      }
    );

    observer.observe(sentinelRef.current);

    return () => observer.disconnect();
  }, [hasMore]);

  const handleLoadMore = () => {
    setVisibleCount(prev => Math.min(prev + (initialPageSize || 50), allBlocks.length));
    setShowButton(false); // Hide button after clicking, will reappear when scrolled near new bottom
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
        enableDragAndDrop={enableDragAndDrop}
        draggedImageId={draggedImageId}
        dragOverImageId={dragOverImageId}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
      />

      {hasMore && (
        <div>
          {/* Invisible sentinel element to detect when user is near bottom */}
          <div ref={sentinelRef} style={{ height: '1px', visibility: 'hidden' }} />

          {showButton && (
            <div className={styles.loadMoreContainer}>
              <button
                type="button"
                onClick={handleLoadMore}
                className={styles.loadMoreButton}
              >
                Load More
              </button>
              <div className={styles.paginationInfo}>
                Showing {visibleCount} of {allBlocks.length} items
              </div>
            </div>
          )}
        </div>
      )}

      {FullScreenModal}
    </>
  );
}
