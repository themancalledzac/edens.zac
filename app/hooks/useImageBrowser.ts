'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getAllImages, type PagedImages } from '@/app/lib/api/content';
import { type ContentImageModel } from '@/app/types/Content';

export interface UseImageBrowserResult {
  items: ContentImageModel[];
  loadNext: () => void;
  isLoading: boolean;
  isDone: boolean;
  error: Error | null;
}

const DEFAULT_PAGE_SIZE = 150;

/**
 * Paginated all-images browser. SSR seeds page 0; on mount we auto-prefetch
 * page 1 so it's cached before the user scrolls. {@link loadNext} appends
 * subsequent pages on demand. {@code fetchingRef} prevents concurrent fetches
 * — pages are sequential, so a queue is overkill.
 */
export function useImageBrowser(initial: PagedImages): UseImageBrowserResult {
  const [pages, setPages] = useState<PagedImages[]>([initial]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchingRef = useRef(false);
  const pageSize = initial.items.length > 0 ? initial.items.length : DEFAULT_PAGE_SIZE;

  const items = useMemo(() => pages.flatMap(p => p.items), [pages]);
  const isDone = pages.at(-1)?.isLast ?? true;

  const fetchPage = useCallback(
    async (page: number) => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      setIsLoading(true);
      setError(null);
      try {
        const result = await getAllImages({ page, size: pageSize });
        setPages(prev => [...prev, result]);
      } catch (error_) {
        setError(error_ instanceof Error ? error_ : new Error(String(error_)));
      } finally {
        setIsLoading(false);
        fetchingRef.current = false;
      }
    },
    [pageSize]
  );

  const loadNext = useCallback(() => {
    if (isDone) return;
    const nextPage = (pages.at(-1)?.page ?? -1) + 1;
    void fetchPage(nextPage);
  }, [isDone, pages, fetchPage]);

  // Auto-prefetch page 1 once on mount, unless the SSR page already covers everything.
  const didMountPrefetchRef = useRef(false);
  useEffect(() => {
    if (didMountPrefetchRef.current) return;
    didMountPrefetchRef.current = true;
    if (initial.isLast) return;
    void fetchPage(1);
    // Intentionally mount-only — fetchPage and initial are captured by design.
  }, []);

  return { items, loadNext, isLoading, isDone, error };
}
