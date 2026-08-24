'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useFullScreenImage } from '@/app/hooks/useFullScreenImage';
import { collectionStorage } from '@/app/lib/storage/collectionStorage';
import { type CollectionModel } from '@/app/types/Collection';
import { type AnyContentModel, type ViewableContent } from '@/app/types/Content';
import { isCollectionCard } from '@/app/utils/contentRatingUtils';

import Component from './Component';
import styles from './ContentBlockWithFullScreen.module.scss';
import { type SharedRendererProps } from './RendererContext';

const FullScreenModal = dynamic(() =>
  import('@/app/components/FullScreenModal/FullScreenModal').then(m => ({
    default: m.FullScreenModal,
  }))
);

const LOAD_MORE_THRESHOLD = '400px';
const DEFAULT_CHUNK_SIZE = 50;

interface ContentBlockWithFullScreenProps extends SharedRendererProps {
  content: AnyContentModel[];
  priorityBlockIndex?: number;
  initialPageSize?: number;
  chunkSize?: number;
  /** Mobile-scale density (1-5) forwarded to the layout; see {@link Component}. */
  mobileChunkSize?: number;
  collectionSlug?: string;
  collectionData?: CollectionModel;
  /** Build the header metadata rail even with no metadata text; see {@link Component}. */
  forceHeaderRail?: boolean;
  /** Mean width-cost of the UNFILTERED content, so filtering does not resize every photo. */
  widthCostBaseline?: number;
  /** SSR fallback viewport, forwarded to Component. */
  serverContentWidth?: number;
  serverViewportHeight?: number;
  serverIsMobile?: boolean;
}
export default function ContentBlockWithFullScreen({
  content: allBlocks,
  priorityBlockIndex,
  initialPageSize,
  chunkSize,
  mobileChunkSize,
  collectionSlug,
  collectionData,
  forceHeaderRail,
  widthCostBaseline,
  serverContentWidth,
  serverViewportHeight,
  serverIsMobile,
  ...shared
}: ContentBlockWithFullScreenProps) {
  const {
    showImage,
    fullScreenState,
    loadedImageIds,
    setLoadedImageIds,
    modalRef,
    zoomTargetRef,
    isZoomed,
    immersive,
    toggleImmersive,
    hideImage,
    isSwiping,
    showMetadata,
    toggleMetadata,
    navigateToNext,
    navigateToPrevious,
  } = useFullScreenImage();

  useEffect(() => {
    if (collectionSlug && collectionData) {
      collectionStorage.set(collectionSlug, collectionData);
    }
  }, [collectionSlug, collectionData]);

  /**
   * Every content block that can open in the fullscreen viewer — still images, parallax images,
   * and animated GIF/MP4 blocks. The fullscreen prev/next navigation walks this list, so adding
   * GIFs here means they get the same swipe/arrow-key flow as images.
   *
   * Child-collection CARDS are excluded: `convertCollectionContentToParallax` stamps them
   * `contentType: 'IMAGE'`, so a plain contentType check would put a collection cover into
   * prev/next as a photograph with no EXIF and no route into the collection. Keyed on
   * {@link isCollectionCard} so this can never disagree with the layout/badge code. The
   * `?image=<id>` deep-link restore below reads the same list, so it is covered too.
   */
  const viewableBlocks = useMemo(() => {
    return allBlocks.filter(
      (block): block is ViewableContent =>
        (block.contentType === 'IMAGE' || block.contentType === 'GIF') && !isCollectionCard(block)
    );
  }, [allBlocks]);

  // Deep-link restore: if the page loads with ?image=<id> and we have that block,
  // open the viewer to it. Runs once on mount. showImage only replaceState-syncs
  // the URL here (the param is already present), so no extra history entry is
  // pushed and Back still returns to whatever preceded this page.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const id = new URLSearchParams(window.location.search).get('image');
    if (!id) return;
    const parsed = Number.parseInt(id, 10);
    if (Number.isNaN(parsed)) return;
    const block = viewableBlocks.find(b => b.id === parsed);
    if (block) showImage(block, viewableBlocks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * The image arg may be a synthetic from {@link CollectionContentRenderer}'s click handler — it
   * only carries id + contentType + imageUrl/gifUrl. Look up the real block in {@link allBlocks}
   * so the modal has full metadata (title, locations, captureDate, etc).
   */
  const handleFullScreenImageClick = (image: ViewableContent) => {
    const real = viewableBlocks.find(b => b.id === image.id);
    showImage(real ?? image, viewableBlocks);
  };

  const [visibleCount, setVisibleCount] = useState(
    initialPageSize && initialPageSize > 0 ? initialPageSize : allBlocks.length
  );
  const [showButton, setShowButton] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  /** Gates the FullScreenModal so it never renders during SSR. */
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

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
        {...shared}
        content={visibleBlocks}
        priorityIndex={priorityBlockIndex}
        onFullScreenImageClick={handleFullScreenImageClick}
        chunkSize={chunkSize}
        mobileChunkSize={mobileChunkSize}
        collectionData={collectionData}
        forceHeaderRail={forceHeaderRail}
        widthCostBaseline={widthCostBaseline}
        serverContentWidth={serverContentWidth}
        serverViewportHeight={serverViewportHeight}
        serverIsMobile={serverIsMobile}
      />

      {hasMore && (
        <div>
          <div ref={sentinelRef} className={styles.sentinel} />
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

      {mounted && (
        <FullScreenModal
          fullScreenState={fullScreenState}
          loadedImageIds={loadedImageIds}
          setLoadedImageIds={setLoadedImageIds}
          modalRef={modalRef}
          zoomTargetRef={zoomTargetRef}
          isZoomed={isZoomed}
          immersive={immersive}
          toggleImmersive={toggleImmersive}
          hideImage={hideImage}
          isSwiping={isSwiping}
          showMetadata={showMetadata}
          toggleMetadata={toggleMetadata}
          collectionData={collectionData}
          navigateToNext={navigateToNext}
          navigateToPrevious={navigateToPrevious}
        />
      )}
    </>
  );
}
