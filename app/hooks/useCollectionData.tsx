'use client';

import { useCallback, useEffect, useState } from 'react';

import { getCollectionUpdateMetadata } from '@/app/lib/api/collections';
import { collectionStorage } from '@/app/lib/storage/collectionStorage';
import { type CollectionUpdateResponseDTO } from '@/app/types/Collection';
import { handleApiError } from '@/app/utils/apiUtils';

/**
 * Custom hook for loading collection data in manage page
 * Handles loading state, error state, and data fetching with proper cleanup
 *
 * @param slug - Collection slug to load (undefined for CREATE mode)
 * @param currentSlug - Current collection slug in state (to skip unnecessary fetches)
 * @param onLoadSuccess - Callback when data is successfully loaded
 * @returns Object containing loading state, error state, and refetch function
 */
export function useCollectionData(
  slug: string | undefined,
  currentSlug: string | undefined,
  onLoadSuccess: (data: CollectionUpdateResponseDTO) => void
): {
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const [loading, setLoading] = useState(!!slug);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      // CREATE mode - no data to fetch
      setLoading(false);
      return;
    }

    // Skip fetch if we already have this exact collection loaded
    if (currentSlug === slug) {
      setLoading(false);
      return;
    }

    const abortController = new AbortController();
    let isMounted = true;

    const loadCollectionData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check full cache first for instant load (includes metadata arrays)
        const cachedResponse = collectionStorage.getFull(slug);

        if (cachedResponse) {
          // Full cache hit - use cached data immediately for instant UI
          if (isMounted && !abortController.signal.aborted) {
            onLoadSuccess(cachedResponse);
            setLoading(false);
          }
          return;
        }

        // Check basic cache (populated by public page visits) for instant shell
        const cachedBasic = collectionStorage.get(slug);
        if (cachedBasic && isMounted && !abortController.signal.aborted) {
          // Show collection data immediately while we fetch full metadata
          onLoadSuccess({ collection: cachedBasic } as CollectionUpdateResponseDTO);
          setLoading(false);
        }

        // Fetch full data (fresh or to supplement basic cache)
        const response = await getCollectionUpdateMetadata(slug);

        if (isMounted && !abortController.signal.aborted && response !== null) {
          // Update both caches
          collectionStorage.update(slug, response.collection);
          collectionStorage.updateFull(slug, response);

          // Notify parent component with full data
          onLoadSuccess(response);
        }
      } catch (error_) {
        if (!abortController.signal.aborted && isMounted) {
          setError(handleApiError(error_, 'Failed to load collection data'));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadCollectionData();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [slug, currentSlug, onLoadSuccess]);

  const refetch = useCallback(async () => {
    if (!slug) return;

    try {
      setLoading(true);
      setError(null);

      const response = await getCollectionUpdateMetadata(slug);
      if (response !== null) {
        // Update both caches
        collectionStorage.update(slug, response.collection);
        collectionStorage.updateFull(slug, response);
        onLoadSuccess(response);
      }
    } catch (error_) {
      setError(handleApiError(error_, 'Failed to load collection data'));
    } finally {
      setLoading(false);
    }
  }, [slug, onLoadSuccess]);

  return {
    loading,
    error,
    refetch,
  };
}
