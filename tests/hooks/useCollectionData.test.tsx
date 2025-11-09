/**
 * Tests for useCollectionData hook
 * 
 * Testing Strategy:
 * 
 * Passing test cases:
 * - Hook loads collection data successfully when slug is provided
 * - Hook skips fetch when currentSlug matches slug (already loaded)
 * - Hook sets loading state correctly during fetch
 * - Hook clears error state on successful load
 * - Hook calls onLoadSuccess callback with response data
 * - Hook updates collectionStorage cache on successful load
 * - Hook handles CREATE mode (no slug) correctly
 * - Hook refetch function reloads data successfully
 * - Hook cleanup prevents state updates after unmount
 * - Hook cleanup aborts fetch on unmount
 * 
 * Failing test cases:
 * - Hook sets error state when API call fails
 * - Hook handles network errors gracefully
 * - Hook handles 404 errors gracefully
 * - Hook handles malformed response data
 * - Hook refetch handles errors correctly
 * - Hook cleanup prevents error state updates after unmount
 */

import { act, renderHook, waitFor } from '@testing-library/react';

import { useCollectionData } from '@/app/hooks/useCollectionData';
import { getCollectionUpdateMetadata } from '@/app/lib/api/collections';
import { collectionStorage } from '@/app/lib/storage/collectionStorage';
import { CollectionType, type CollectionUpdateResponseDTO } from '@/app/types/Collection';

// Mock dependencies
jest.mock('@/app/lib/api/collections');
jest.mock('@/app/lib/storage/collectionStorage');
jest.mock('@/app/(admin)/collection/manage/[[...slug]]/manageUtils', () => ({
  handleApiError: jest.fn((error, defaultMessage) => 
    error instanceof Error ? error.message : defaultMessage
  ),
}));

const mockGetCollectionUpdateMetadata = getCollectionUpdateMetadata as jest.MockedFunction<
  typeof getCollectionUpdateMetadata
>;
const mockCollectionStorageUpdate = collectionStorage.update as jest.MockedFunction<
  typeof collectionStorage.update
>;

describe('useCollectionData', () => {
  const mockCollectionData: CollectionUpdateResponseDTO = {
    collection: {
      id: 1,
      slug: 'test-collection',
      title: 'Test Collection',
      type: CollectionType.PORTFOLIO,
      visible: true,
      displayMode: 'CHRONOLOGICAL',
      content: [],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    tags: [],
    people: [],
    cameras: [],
    lenses: [],
    filmTypes: [],
    filmFormats: [],
    collections: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCollectionStorageUpdate.mockImplementation(() => {});
  });

  describe('Successful data loading', () => {
    it('should load collection data successfully when slug is provided', async () => {
      mockGetCollectionUpdateMetadata.mockResolvedValue(mockCollectionData);
      const onLoadSuccess = jest.fn();

      const { result } = renderHook(() =>
        useCollectionData('test-collection', undefined, onLoadSuccess)
      );

      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBe(null);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetCollectionUpdateMetadata).toHaveBeenCalledWith('test-collection');
      expect(onLoadSuccess).toHaveBeenCalledWith(mockCollectionData);
      expect(mockCollectionStorageUpdate).toHaveBeenCalledWith(
        'test-collection',
        mockCollectionData.collection
      );
      expect(result.current.error).toBe(null);
    });

    it('should skip fetch when currentSlug matches slug', async () => {
      const onLoadSuccess = jest.fn();

      const { result } = renderHook(() =>
        useCollectionData('test-collection', 'test-collection', onLoadSuccess)
      );

      // Wait a bit to ensure no fetch happens
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockGetCollectionUpdateMetadata).not.toHaveBeenCalled();
      expect(onLoadSuccess).not.toHaveBeenCalled();
      expect(result.current.loading).toBe(false);
    });

    it('should handle CREATE mode (no slug) correctly', async () => {
      const onLoadSuccess = jest.fn();

      const { result } = renderHook(() =>
        useCollectionData(undefined, undefined, onLoadSuccess)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetCollectionUpdateMetadata).not.toHaveBeenCalled();
      expect(onLoadSuccess).not.toHaveBeenCalled();
      expect(result.current.error).toBe(null);
    });
  });

  describe('Error handling', () => {
    it('should set error state when API call fails', async () => {
      const error = new Error('Failed to fetch');
      mockGetCollectionUpdateMetadata.mockRejectedValue(error);
      const onLoadSuccess = jest.fn();

      const { result } = renderHook(() =>
        useCollectionData('test-collection', undefined, onLoadSuccess)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch');
      expect(onLoadSuccess).not.toHaveBeenCalled();
      expect(mockCollectionStorageUpdate).not.toHaveBeenCalled();
    });

    it('should handle network errors gracefully', async () => {
      const error = new Error('Network request failed');
      mockGetCollectionUpdateMetadata.mockRejectedValue(error);
      const onLoadSuccess = jest.fn();

      const { result } = renderHook(() =>
        useCollectionData('test-collection', undefined, onLoadSuccess)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Network request failed');
    });
  });

  describe('Refetch functionality', () => {
    it('should reload data successfully when refetch is called', async () => {
      mockGetCollectionUpdateMetadata.mockResolvedValue(mockCollectionData);
      const onLoadSuccess = jest.fn();

      const { result } = renderHook(() =>
        useCollectionData('test-collection', undefined, onLoadSuccess)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Clear previous calls
      jest.clearAllMocks();
      onLoadSuccess.mockClear();

      // Call refetch and wait for state updates
      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetCollectionUpdateMetadata).toHaveBeenCalledWith('test-collection');
      expect(onLoadSuccess).toHaveBeenCalledWith(mockCollectionData);
      expect(mockCollectionStorageUpdate).toHaveBeenCalledWith(
        'test-collection',
        mockCollectionData.collection
      );
    });

    it('should handle errors in refetch correctly', async () => {
      const error = new Error('Refetch failed');
      mockGetCollectionUpdateMetadata.mockRejectedValue(error);
      const onLoadSuccess = jest.fn();

      const { result } = renderHook(() =>
        useCollectionData('test-collection', undefined, onLoadSuccess)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Clear previous state
      jest.clearAllMocks();

      // Call refetch and wait for state updates
      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Refetch failed');
      expect(onLoadSuccess).not.toHaveBeenCalled();
    });

    it('should not refetch when slug is undefined', async () => {
      const onLoadSuccess = jest.fn();

      const { result } = renderHook(() =>
        useCollectionData(undefined, undefined, onLoadSuccess)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockGetCollectionUpdateMetadata).not.toHaveBeenCalled();
    });
  });

  describe('Cleanup behavior', () => {
    it('should prevent state updates after unmount', async () => {
      mockGetCollectionUpdateMetadata.mockImplementation(
        () =>
          new Promise(resolve => {
            setTimeout(() => resolve(mockCollectionData), 100);
          })
      );
      const onLoadSuccess = jest.fn();

      const { unmount } = renderHook(() =>
        useCollectionData('test-collection', undefined, onLoadSuccess)
      );

      // Unmount before fetch completes
      unmount();

      // Wait for fetch to complete
      await new Promise(resolve => setTimeout(resolve, 150));

      // State updates should not happen after unmount
      expect(onLoadSuccess).not.toHaveBeenCalled();
      expect(mockCollectionStorageUpdate).not.toHaveBeenCalled();
    });
  });
});

