/**
 * Collection Storage Utility
 *
 * Provides sessionStorage-based caching for collection data to optimize
 * the flow from viewing a collection to editing it in the manage page.
 *
 * Key Features:
 * - Slug-based keys allow caching multiple collections
 * - 30-minute TTL prevents stale data
 * - Automatic cache invalidation on save/update
 * - Graceful degradation if storage unavailable or quota exceeded
 */

import { type CollectionModel, type CollectionUpdateResponseDTO } from '@/app/types/Collection';
import { type ContentImageModel } from '@/app/types/Content';
import { isLocalEnvironment } from '@/app/utils/environment';

const STORAGE_KEY_PREFIX = 'collection_cache_';
const STORAGE_KEY_PREFIX_FULL = 'collection_full_cache_';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

interface CachedCollection {
  data: CollectionModel;
  timestamp: number;
  slug: string;
}

interface CachedFullCollection {
  data: CollectionUpdateResponseDTO;
  timestamp: number;
  slug: string;
}

/**
 * Build storage key for a specific collection slug
 */
function getStorageKey(slug: string): string {
  return `${STORAGE_KEY_PREFIX}${slug}`;
}

/**
 * Build storage key for full collection response (with metadata)
 */
function getFullStorageKey(slug: string): string {
  return `${STORAGE_KEY_PREFIX_FULL}${slug}`;
}

export const collectionStorage = {
  /**
   * Store collection data for editing
   * @param slug - Collection slug (used as key)
   * @param data - Collection data to cache
   */
  set(slug: string, data: CollectionModel): void {
    if (typeof window === 'undefined') return;

    try {
      const cached: CachedCollection = {
        data,
        timestamp: Date.now(),
        slug,
      };
      const key = getStorageKey(slug);
      sessionStorage.setItem(key, JSON.stringify(cached));
    } catch (error) {
      console.warn('[collectionStorage] set: failed to write cache for slug:', slug, error);
    }
  },

  /**
   * Get cached collection if valid and matches slug
   * @param slug - Collection slug to retrieve
   * @returns Cached collection data or null if not found/expired
   */
  get(slug: string): CollectionModel | null {
    if (typeof window === 'undefined') return null;

    try {
      const key = getStorageKey(slug);
      const item = sessionStorage.getItem(key);
      if (!item) return null;

      const cached: CachedCollection = JSON.parse(item);

      // Verify this is the correct slug
      if (cached.slug !== slug) {
        sessionStorage.removeItem(key);
        return null;
      }

      // Check if cache is still valid (within 30 minutes)
      const age = Date.now() - cached.timestamp;
      const isValid = age < CACHE_DURATION;

      if (!isValid) {
        sessionStorage.removeItem(key);
        return null;
      }

      return cached.data;
    } catch (error) {
      console.warn('[collectionStorage] get: failed to read cache for slug:', slug, error);
      return null;
    }
  },

  /**
   * Clear cached collection for a specific slug
   * Called after successful save/update to force fresh fetch on next load
   * @param slug - Collection slug to clear
   */
  clear(slug: string): void {
    if (typeof window === 'undefined') return;

    try {
      const key = getStorageKey(slug);
      sessionStorage.removeItem(key);
    } catch (error) {
      console.warn('[collectionStorage] clear: failed to remove cache for slug:', slug, error);
    }
  },

  /**
   * Clear all cached collections
   * Useful for debugging or logout scenarios
   */
  clearAll(): void {
    if (typeof window === 'undefined') return;

    try {
      // Find all keys with both prefixes (regular and full)
      const keys = Object.keys(sessionStorage).filter(
        key => key.startsWith(STORAGE_KEY_PREFIX) || key.startsWith(STORAGE_KEY_PREFIX_FULL)
      );

      for (const key of keys) {
        sessionStorage.removeItem(key);
      }
    } catch (error) {
      console.warn('[collectionStorage] clearAll: failed to clear cache', error);
    }
  },

  /**
   * Update cached collection with new data
   * Useful after successful save to keep cache fresh without refetching
   * @param slug - Collection slug
   * @param data - Updated collection data
   */
  update(slug: string, data: CollectionModel): void {
    // Same as set - overwrites existing cache with new timestamp
    this.set(slug, data);
  },

  /**
   * Update cached collection's content when images are updated
   * Replaces updated images in the cached collection's content array
   * This ensures the cache stays in sync when image metadata (like visibility) is changed
   *
   * @param slug - Collection slug
   * @param updatedImages - Array of updated image content models from the API response
   */
  updateImagesInCache(slug: string, updatedImages: ContentImageModel[]): void {
    if (typeof window === 'undefined') return;

    try {
      const cached = this.get(slug);
      if (!cached) {
        if (isLocalEnvironment()) {
          console.warn(`[collectionStorage] No cache found for slug: ${slug}`);
        }
        return; // No cache to update
      }

      // Create a map of updated images by ID for quick lookup
      const updatedImagesMap = new Map(updatedImages.map(img => [img.id, img]));

      // Update content array: replace images that were updated, keep others as-is
      // Only updates IMAGE content types that match the updated images by ID
      const updatedContent = cached.content?.map(block => {
        // Match by ID and verify it's an IMAGE type (safety check)
        if (block.contentType === 'IMAGE' && updatedImagesMap.has(block.id)) {
          const updatedImage = updatedImagesMap.get(block.id)!;
          return updatedImage;
        }
        return block;
      });

      // Update the cached collection with new content
      const updatedCollection: CollectionModel = {
        ...cached,
        content: updatedContent || cached.content,
      };

      // Save updated collection back to cache with new timestamp
      this.set(slug, updatedCollection);
    } catch (error) {
      if (isLocalEnvironment()) {
        console.error('[collectionStorage] Error updating cache:', error);
      }
      // Ignore errors when updating cache - fail silently to not break the UI
    }
  },

  /**
   * Store full collection response (with metadata arrays) for manage page
   * @param slug - Collection slug (used as key)
   * @param data - Full CollectionUpdateResponseDTO to cache
   */
  setFull(slug: string, data: CollectionUpdateResponseDTO): void {
    if (typeof window === 'undefined') return;

    try {
      const cached: CachedFullCollection = {
        data,
        timestamp: Date.now(),
        slug,
      };
      const key = getFullStorageKey(slug);
      sessionStorage.setItem(key, JSON.stringify(cached));
    } catch (error) {
      console.warn('[collectionStorage] setFull: failed to write full cache for slug:', slug, error);
    }
  },

  /**
   * Get cached full collection response if valid
   * @param slug - Collection slug to retrieve
   * @returns Cached CollectionUpdateResponseDTO or null if not found/expired
   */
  getFull(slug: string): CollectionUpdateResponseDTO | null {
    if (typeof window === 'undefined') return null;

    try {
      const key = getFullStorageKey(slug);
      const item = sessionStorage.getItem(key);
      if (!item) return null;

      const cached: CachedFullCollection = JSON.parse(item);

      // Verify this is the correct slug
      if (cached.slug !== slug) {
        sessionStorage.removeItem(key);
        return null;
      }

      // Check if cache is still valid (within 30 minutes)
      const age = Date.now() - cached.timestamp;
      const isValid = age < CACHE_DURATION;

      if (!isValid) {
        sessionStorage.removeItem(key);
        return null;
      }

      return cached.data;
    } catch (error) {
      console.warn('[collectionStorage] getFull: failed to read full cache for slug:', slug, error);
      return null;
    }
  },

  /**
   * Update full collection cache (with metadata)
   * @param slug - Collection slug
   * @param data - Updated CollectionUpdateResponseDTO
   */
  updateFull(slug: string, data: CollectionUpdateResponseDTO): void {
    // Same as setFull - overwrites existing cache with new timestamp
    this.setFull(slug, data);
  },

  /**
   * Clear full collection cache for a specific slug
   * @param slug - Collection slug to clear
   */
  clearFull(slug: string): void {
    if (typeof window === 'undefined') return;

    try {
      const key = getFullStorageKey(slug);
      sessionStorage.removeItem(key);
    } catch (error) {
      console.warn('[collectionStorage] clearFull: failed to remove full cache for slug:', slug, error);
    }
  },
};
