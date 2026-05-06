'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  getAllImages,
  type GetAllImagesParams,
  type PagedImages,
} from '@/app/lib/api/content';
import { type ContentImageModel } from '@/app/types/Content';

export interface UseImageBrowserResult {
  items: ContentImageModel[];
  filters: GetAllImagesParams;
  setFilters: (next: Partial<GetAllImagesParams>) => void;
  loadNext: () => void;
  isLoading: boolean;
  isDone: boolean;
  error: Error | null;
}

const DEFAULT_PAGE_SIZE = 50;

/**
 * Manages paginated + filtered image fetching for the admin all-images browser.
 *
 * State machine:
 * - Server-side rendered page 0 seeds {@code pages}.
 * - On mount, eagerly prefetch the next page so it's cached before the user
 *   scrolls (only when `initial.isLast === false`).
 * - {@code loadNext} appends the next page; a {@code fetchingRef} lock prevents
 *   concurrent fetches (pages are sequential, queue is overkill).
 * - {@code setFilters} resets {@code pages} to empty and refetches page 0 with
 *   the new filter set. A {@code requestIdRef} guards against stale in-flight
 *   responses landing after a newer filter request.
 */
export function useImageBrowser(initial: PagedImages): UseImageBrowserResult {
  const [pages, setPages] = useState<PagedImages[]>([initial]);
  const [filters, setFiltersState] = useState<GetAllImagesParams>({
    page: 0,
    size: initial.items.length > 0 ? initial.items.length : DEFAULT_PAGE_SIZE,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchingRef = useRef(false);
  const requestIdRef = useRef(0);

  const items = useMemo(() => pages.flatMap(p => p.items), [pages]);
  const isDone = pages.length === 0 ? false : (pages.at(-1)?.isLast ?? true);

  // Internal: fetch a page for the current filter set. If `replace` is true,
  // wipe `pages` and seed with the response (used for filter changes).
  const fetchPage = useCallback(
    async (page: number, baseFilters: GetAllImagesParams, replace: boolean) => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      setIsLoading(true);
      setError(null);
      const requestId = ++requestIdRef.current;
      try {
        const result = await getAllImages({
          ...baseFilters,
          page,
          size: baseFilters.size ?? DEFAULT_PAGE_SIZE,
        });
        // Stale-response guard: a newer setFilters/loadNext invalidated us.
        if (requestId !== requestIdRef.current) return;
        setPages(prev => (replace ? [result] : [...prev, result]));
      } catch (error_) {
        if (requestId !== requestIdRef.current) return;
        setError(error_ instanceof Error ? error_ : new Error(String(error_)));
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
        fetchingRef.current = false;
      }
    },
    []
  );

  const loadNext = useCallback(() => {
    if (isDone) return;
    const nextPage = pages.length === 0 ? 0 : (pages.at(-1)?.page ?? -1) + 1;
    void fetchPage(nextPage, filters, false);
  }, [filters, pages, isDone, fetchPage]);

  const setFilters = useCallback(
    (next: Partial<GetAllImagesParams>) => {
      const merged: GetAllImagesParams = { ...filters, ...next, page: 0 };
      setFiltersState(merged);
      // Bump the request id BEFORE fetching so any in-flight response is dropped.
      requestIdRef.current += 1;
      // Also clear the fetching lock so the new request can proceed even if a
      // prior one was mid-flight (its response will be discarded by the guard).
      fetchingRef.current = false;
      setPages([]);
      void fetchPage(0, merged, true);
    },
    [filters, fetchPage]
  );

  // Auto-prefetch page 1 immediately on mount so it's cached by the time the
  // user scrolls. Skip if SSR already returned the last page. The mount-only
  // ref guard ensures this fires exactly once per component instance even if
  // React StrictMode double-invokes the effect.
  const didMountPrefetchRef = useRef(false);
  // Stable refs for mount-time fetch — avoids re-running on filter/fetchPage updates.
  const initialIsLastRef = useRef(initial.isLast);
  const fetchPageRef = useRef(fetchPage);
  fetchPageRef.current = fetchPage;
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  useEffect(() => {
    if (didMountPrefetchRef.current) return;
    didMountPrefetchRef.current = true;
    if (initialIsLastRef.current) return;
    void fetchPageRef.current(1, filtersRef.current, false);
  }, []);

  return { items, filters, setFilters, loadNext, isLoading, isDone, error };
}
