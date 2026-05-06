'use client';

import { useEffect, useMemo, useRef } from 'react';

import CollectionPage from '@/app/components/ContentCollection/CollectionPage';
import { useInViewport } from '@/app/hooks/inViewport';
import { useImageBrowser } from '@/app/hooks/useImageBrowser';
import { type PagedImages } from '@/app/lib/api/content';
import { type CollectionModel,CollectionType } from '@/app/types/Collection';
import { CollectionVisibility } from '@/app/types/CollectionVisibility';

import styles from './AllImagesClient.module.scss';

interface AllImagesClientProps {
  initial: PagedImages;
}

/**
 * Client wrapper for /all-images. Renders the same way as every other
 * collection page (header, filter bar, grid) by feeding a synthetic
 * {@link CollectionModel} into the standard {@link CollectionPage} pipeline.
 *
 * Pagination is bolted on top: {@link useImageBrowser} owns the growing items
 * array and an IntersectionObserver sentinel triggers {@code loadNext()} when
 * the user scrolls within one viewport of the bottom.
 *
 * The mock collection's {@code contentPerPage} is set to {@code MAX_SAFE_INTEGER}
 * so {@link ContentBlockWithFullScreen}'s built-in client-side render cap never
 * engages — every loaded item renders immediately, since pagination is already
 * handled at the data layer here.
 *
 * Filtering on this page comes for free from {@link CollectionPageClient}'s
 * standard filter bar (client-side, operating on currently-loaded items).
 * Future enhancement: wire {@link useImageBrowser.setFilters} to push filters
 * server-side for full-database filter coverage.
 */
export default function AllImagesClient({ initial }: AllImagesClientProps) {
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
      displayMode: 'CHRONOLOGICAL',
      contentPerPage: Number.MAX_SAFE_INTEGER,
      content: items,
      contentCount: items.length,
      locations: [],
    }),
    [items]
  );

  return (
    <>
      <CollectionPage collection={mockCollection} chunkSize={4} />

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
