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
      console.log(`[collectionStorage.set] Cached collection "${slug}"`);
    } catch (error) {
      // Quota exceeded or storage unavailable - not critical, just log
      console.warn('[collectionStorage.set] Failed to cache collection:', error);
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
        console.warn('[collectionStorage.get] Slug mismatch, clearing cache');
        sessionStorage.removeItem(key);
        return null;
      }

      // Check if cache is still valid (within 30 minutes)
      const age = Date.now() - cached.timestamp;
      const isValid = age < CACHE_DURATION;

      if (!isValid) {
        console.log(`[collectionStorage.get] Cache expired for "${slug}" (age: ${Math.round(age / 1000)}s)`);
        sessionStorage.removeItem(key);
        return null;
      }

      console.log(`[collectionStorage.get] Cache hit for "${slug}" (age: ${Math.round(age / 1000)}s)`);
      return cached.data;
    } catch (error) {
      console.error('[collectionStorage.get] Error reading cache:', error);
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
      console.log(`[collectionStorage.clear] Cleared cache for "${slug}"`);
    } catch (error) {
      console.error('[collectionStorage.clear] Error:', error);
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
      console.log(`[collectionStorage.clearAll] Cleared ${keys.length} cached collections`);
    } catch (error) {
      console.error('[collectionStorage.clearAll] Error:', error);
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
};