'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

import { useFullScreenImage } from '@/app/hooks/useFullScreenImage';
import {
  type AnyContentBlock,
  type ImageContentBlock,
  type ParallaxImageContentBlock,
} from '@/app/types/ContentBlock';

import ContentBlockComponent from './ContentBlockComponent';
import styles from './ContentBlockWithFullScreen.module.scss';

interface ContentBlockWithFullScreenProps {
  blocks: AnyContentBlock[];
  priorityBlockIndex?: number;
  enableFullScreenView?: boolean;
  initialPageSize?: number; // How many blocks to show initially (default: show all)
}

/**
 * Wrapper component that provides full screen image functionality
 * to ContentBlockComponent using the new simplified hook.
 * Supports client-side pagination for large collections.
 */
export default function ContentBlockWithFullScreen({
  blocks: allBlocks,
  priorityBlockIndex,
  enableFullScreenView,
  initialPageSize
}: ContentBlockWithFullScreenProps) {
  const { showImage, FullScreenModal } = useFullScreenImage();

  // Extract all image blocks for navigation
  // TODO: why are we filtering by images? is this causing us to lose Text Blocks?
  const imageBlocks = useMemo(() => {
    return allBlocks.filter(
      (block): block is ImageContentBlock | ParallaxImageContentBlock =>
        block.blockType === 'IMAGE' || block.blockType === 'PARALLAX'
    );
  }, [allBlocks]);

  // Wrapper function to pass all images for navigation
  const handleFullScreenImageClick = (
    image: ImageContentBlock | ParallaxImageContentBlock
  ) => {
    showImage(image, imageBlocks);
  };

  // If initialPageSize is provided, support pagination
  const [visibleCount, setVisibleCount] = useState(
    initialPageSize && initialPageSize > 0 ? initialPageSize : allBlocks.length
  );
  const [showButton, setShowButton] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // TODO: Do we really need 'visibleBLocks' or could we instead just have 'maxNumber' of blocks visible initially, and clicking the button just shows the rest?
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
      <ContentBlockComponent
        blocks={visibleBlocks}
        priorityBlockIndex={priorityBlockIndex}
        enableFullScreenView={enableFullScreenView}
        onFullScreenImageClick={handleFullScreenImageClick}
      />

      {hasMore && (
        <div className={styles.loadMoreWrapper}>
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