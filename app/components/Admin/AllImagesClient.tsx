'use client';

import { useEffect, useMemo, useRef } from 'react';

import CollectionPage from '@/app/components/ContentCollection/CollectionPage';
import { useInViewport } from '@/app/hooks/inViewport';
import { useImageBrowser } from '@/app/hooks/useImageBrowser';
import { type PagedImages } from '@/app/lib/api/content';
import { type CollectionModel, CollectionType } from '@/app/types/Collection';
import { CollectionVisibility } from '@/app/types/CollectionVisibility';
import { type SsrViewport } from '@/app/utils/ssrViewport';

import styles from './AllImagesClient.module.scss';

interface AllImagesClientProps {
  initial: PagedImages;
  ssrViewport?: SsrViewport;
}

/**
 * Client wrapper for /all-images. Renders through the standard
 * {@link CollectionPage} pipeline by synthesizing a {@link CollectionModel}.
 *
 * Pagination: {@link useImageBrowser} owns the growing items array; an
 * IntersectionObserver sentinel triggers {@code loadNext()} as the user
 * scrolls within one viewport of the bottom.
 *
 * Order preservation: the BE returns images in {@code capture_date ASC}
 * order. We assign a sequential {@code orderIndex} per array position and
 * use {@code displayMode: 'ORDERED'} so the layout pipeline preserves that
 * order. Without this, downstream sorts (which key on {@code createdAt} for
 * {@code CHRONOLOGICAL} mode) would slot newly-loaded pages into the middle
 * of the grid for any backfilled photos.
 */
export default function AllImagesClient({ initial, ssrViewport }: AllImagesClientProps) {
  const { items, loadNext, isLoading, isDone, error } = useImageBrowser(initial);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const { isVisible: sentinelVisible } = useInViewport(sentinelRef, {
    rootMargin: '100% 0px',
  });

  // Bridge the IO state to the hook's loadNext call. The hook's internal
  // fetchingRef and isDone guards make duplicate triggers safe.
  useEffect(() => {
    if (sentinelVisible && !isLoading && !isDone) {
      loadNext();
    }
  }, [sentinelVisible, isLoading, isDone, loadNext]);

  const orderedItems = useMemo(
    () => items.map((item, index) => ({ ...item, orderIndex: index })),
    [items]
  );

  const mockCollection: CollectionModel = useMemo(
    () => ({
      id: 0,
      type: CollectionType.MISC,
      title: 'All Images',
      slug: 'all-images',
      description: 'All images ordered by capture date ascending (oldest first)',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      visibility: CollectionVisibility.LISTED,
      displayMode: 'ORDERED',
      contentPerPage: Number.MAX_SAFE_INTEGER,
      content: orderedItems,
      contentCount: orderedItems.length,
      locations: [],
    }),
    [orderedItems]
  );

  return (
    <>
      <CollectionPage collection={mockCollection} chunkSize={4} ssrViewport={ssrViewport} />

      <div ref={sentinelRef} className={styles.sentinel} aria-hidden />

      {isLoading && (
        <div className={styles.status} role="status">
          Loading more…
        </div>
      )}

      {error && (
        <div className={styles.status} role="alert">
          Failed to load more images.{' '}
          <button type="button" className={styles.retry} onClick={loadNext}>
            Retry
          </button>
        </div>
      )}
    </>
  );
}
