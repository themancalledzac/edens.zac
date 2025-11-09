'use client';

import { useCallback, useEffect, useState } from 'react';

import { handleApiError } from '@/app/(admin)/collection/manage/[[...slug]]/manageUtils';
import { getCollectionUpdateMetadata } from '@/app/lib/api/collections';
import { collectionStorage } from '@/app/lib/storage/collectionStorage';
import { type CollectionUpdateResponseDTO } from '@/app/types/Collection';

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

        // Always fetch fresh data in manage page to ensure we have complete collection data
        // (including collections arrays on content items)
        const response = await getCollectionUpdateMetadata(slug);

        if (isMounted && !abortController.signal.aborted) {
          // Update cache with complete data (includes collections arrays on content items)
          collectionStorage.update(slug, response.collection);
          
          // Notify parent component of successful load
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
      collectionStorage.update(slug, response.collection);
      onLoadSuccess(response);
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

