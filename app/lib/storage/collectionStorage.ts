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

import { type CollectionModel } from '@/app/types/Collection';
import { type ImageContentModel } from '@/app/types/Content';
import { isLocalEnvironment } from '@/app/utils/environment';

const STORAGE_KEY_PREFIX = 'collection_cache_';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

interface CachedCollection {
  data: CollectionModel;
  timestamp: number;
  slug: string;
}

/**
 * Build storage key for a specific collection slug
 */
function getStorageKey(slug: string): string {
  return `${STORAGE_KEY_PREFIX}${slug}`;
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
    } catch {
      // Quota exceeded or storage unavailable - not critical, fail silently
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
    } catch {
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
    } catch {
      // Ignore errors when clearing cache
    }
  },

  /**
   * Clear all cached collections
   * Useful for debugging or logout scenarios
   */
  clearAll(): void {
    if (typeof window === 'undefined') return;

    try {
      // Find all keys with our prefix
      const keys = Object.keys(sessionStorage).filter(key =>
        key.startsWith(STORAGE_KEY_PREFIX)
      );

      for (const key of keys) {
        sessionStorage.removeItem(key);
      }
    } catch {
      // Ignore errors when clearing cache
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
  updateImagesInCache(slug: string, updatedImages: ImageContentModel[]): void {
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
      const updatedImagesMap = new Map(
        updatedImages.map(img => [img.id, img])
      );

      // Update content array: replace images that were updated, keep others as-is
      // Only updates IMAGE content types that match the updated images by ID
      const updatedContent = cached.content?.map(block => {
        // Match by ID and verify it's an IMAGE type (safety check)
        if (block.contentType === 'IMAGE' && updatedImagesMap.has(block.id)) {
          const updatedImage = updatedImagesMap.get(block.id)!;
          if (isLocalEnvironment()) {
            console.log(`[collectionStorage] Updating image ${block.id} in cache:`, {
              oldVisibility: (block as ImageContentModel).collections?.[0]?.visible,
              newVisibility: updatedImage.collections?.[0]?.visible,
              collections: updatedImage.collections,
            });
          }
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
      if (isLocalEnvironment()) {
        console.log(`[collectionStorage] Cache updated for slug: ${slug}`, {
          updatedImageIds: updatedImages.map(img => img.id),
          totalContentBlocks: updatedCollection.content?.length,
        });
      }
    } catch (error) {
      if (isLocalEnvironment()) {
        console.error('[collectionStorage] Error updating cache:', error);
      }
      // Ignore errors when updating cache - fail silently to not break the UI
    }
  },
};