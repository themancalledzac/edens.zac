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
 *
 * Two caches live here. They differ only in key prefix and payload type: the plain cache holds a
 * `CollectionModel` for the public page, the full cache holds the `CollectionUpdateResponseDTO`
 * the manage page needs. {@link createSlugCache} builds both, so the SSR guard, the slug-match
 * guard, the TTL rule and the error handling are written once instead of twice.
 */

import { type CollectionModel, type CollectionUpdateResponseDTO } from '@/app/types/Collection';
import { type ContentImageModel } from '@/app/types/Content';
import { isLocalEnvironment } from '@/app/utils/environment';
import { logger } from '@/app/utils/logger';

const STORAGE_KEY_PREFIX = 'collection_cache_';
const STORAGE_KEY_PREFIX_FULL = 'collection_full_cache_';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

/**
 * What actually lands in sessionStorage. `slug` is stored beside the payload so a read can confirm
 * the entry belongs to the slug it was filed under — see the guard in {@link createSlugCache}'s
 * `get`.
 */
interface CachedEntry<T> {
  data: T;
  timestamp: number;
  slug: string;
}

/**
 * Build the get/set/clear trio for one sessionStorage-backed, slug-keyed cache.
 *
 * `suffix` is the public method-name suffix this trio is exposed under — `''` for
 * `set`/`get`/`clear`, `'Full'` for `setFull`/`getFull`/`clearFull`. It is passed in rather than
 * derived from the prefix because it also appears in the log messages, which name the method the
 * caller actually invoked; `getFull` failing must not report itself as `get`.
 *
 * The `cached.slug !== slug` check in `get` is deliberate and is NOT dead code. It is unreachable
 * through this module's own API — the key is a fixed prefix concatenated with the slug, which is
 * injective over string slugs, and `set` always files the slug it was given. It is reachable from
 * outside: a foreign write to the same key (devtools, a stale entry from an older key scheme), or
 * a plain-JS caller passing a non-string slug, where `JSON.parse` restores `42` and `42 !== '42'`.
 * Dropping it makes `get` return `cached.data`, which for a foreign payload can be `undefined` —
 * violating the declared `T | null` return without TypeScript noticing, because the value arrived
 * through `JSON.parse`. `tests/lib/storage/collectionStorage.test.ts` pins the eviction.
 */
function createSlugCache<T>(keyPrefix: string, suffix: '' | 'Full') {
  const noun = suffix ? 'full cache' : 'cache';
  const keyFor = (slug: string) => `${keyPrefix}${slug}`;

  function set(slug: string, data: T): void {
    if (typeof window === 'undefined') return;

    try {
      const cached: CachedEntry<T> = {
        data,
        timestamp: Date.now(),
        slug,
      };
      sessionStorage.setItem(keyFor(slug), JSON.stringify(cached));
    } catch (error) {
      logger.warn('collectionStorage', `set${suffix}: failed to write ${noun} for slug: ${slug}`, {
        error,
      });
    }
  }

  function get(slug: string): T | null {
    if (typeof window === 'undefined') return null;

    try {
      const key = keyFor(slug);
      const item = sessionStorage.getItem(key);
      if (!item) return null;

      const cached: CachedEntry<T> = JSON.parse(item);

      if (cached.slug !== slug) {
        sessionStorage.removeItem(key);
        return null;
      }

      const age = Date.now() - cached.timestamp;
      const isValid = age < CACHE_DURATION;

      if (!isValid) {
        sessionStorage.removeItem(key);
        return null;
      }

      return cached.data;
    } catch (error) {
      logger.warn('collectionStorage', `get${suffix}: failed to read ${noun} for slug: ${slug}`, {
        error,
      });
      return null;
    }
  }

  function clear(slug: string): void {
    if (typeof window === 'undefined') return;

    try {
      sessionStorage.removeItem(keyFor(slug));
    } catch (error) {
      logger.warn(
        'collectionStorage',
        `clear${suffix}: failed to remove ${noun} for slug: ${slug}`,
        { error }
      );
    }
  }

  return { set, get, clear };
}

const plainCache = createSlugCache<CollectionModel>(STORAGE_KEY_PREFIX, '');
const fullCache = createSlugCache<CollectionUpdateResponseDTO>(STORAGE_KEY_PREFIX_FULL, 'Full');

export const collectionStorage = {
  /**
   * Store collection data for editing
   * @param slug - Collection slug (used as key)
   * @param data - Collection data to cache
   */
  set: plainCache.set,

  /**
   * Get cached collection if valid and matches slug
   * @param slug - Collection slug to retrieve
   * @returns Cached collection data or null if not found/expired
   */
  get: plainCache.get,

  /**
   * Clear cached collection for a specific slug
   * Called after successful save/update to force fresh fetch on next load
   * @param slug - Collection slug to clear
   */
  clear: plainCache.clear,

  /**
   * Store full collection response (with metadata arrays) for manage page
   * @param slug - Collection slug (used as key)
   * @param data - Full CollectionUpdateResponseDTO to cache
   */
  setFull: fullCache.set,

  /**
   * Get cached full collection response if valid
   * @param slug - Collection slug to retrieve
   * @returns Cached CollectionUpdateResponseDTO or null if not found/expired
   */
  getFull: fullCache.get,

  /**
   * Clear full collection cache for a specific slug
   * @param slug - Collection slug to clear
   */
  clearFull: fullCache.clear,

  /**
   * Update cached collection with new data
   * Useful after successful save to keep cache fresh without refetching
   *
   * Overwrites with a new timestamp, so this is `set` by another name. It stays its own function
   * rather than becoming a reference to `set` to keep the two distinguishable under test. Seven
   * suites automock this module with a bare `jest.mock(...)`, and jest's automocker hands two
   * properties holding the SAME function reference the SAME mock — verified: written as
   * `update: plainCache.set`, `collectionStorage.update === collectionStorage.set` in the automock
   * and a `set` call lands in `update`'s call list. Today's suites pass either way, so this is a
   * latent trap rather than a live failure; `useCollectionEdit.handlers.test.tsx` asserts on
   * `update`/`updateFull` call order and would start counting `set` calls as `update` calls the
   * first time one of those paths also calls `set`.
   *
   * @param slug - Collection slug
   * @param data - Updated collection data
   */
  update(slug: string, data: CollectionModel): void {
    plainCache.set(slug, data);
  },

  /**
   * Update full collection cache (with metadata)
   *
   * Separate from `setFull` for the automock reason given on {@link collectionStorage.update}.
   *
   * @param slug - Collection slug
   * @param data - Updated CollectionUpdateResponseDTO
   */
  updateFull(slug: string, data: CollectionUpdateResponseDTO): void {
    fullCache.set(slug, data);
  },

  /**
   * Clear all cached collections
   * Useful for debugging or logout scenarios
   *
   * Both prefixes must be tested. `collection_full_cache_` does not start with `collection_cache_`,
   * so filtering on the plain prefix alone would silently leave every full-cache entry behind.
   */
  clearAll(): void {
    if (typeof window === 'undefined') return;

    try {
      const keys = Object.keys(sessionStorage).filter(
        key => key.startsWith(STORAGE_KEY_PREFIX) || key.startsWith(STORAGE_KEY_PREFIX_FULL)
      );

      for (const key of keys) {
        sessionStorage.removeItem(key);
      }
    } catch (error) {
      logger.warn('collectionStorage', 'clearAll: failed to clear cache', { error });
    }
  },

  /**
   * Update cached collection's content when images are updated
   * Replaces updated images in the cached collection's content array
   * This ensures the cache stays in sync when image metadata (like visibility) is changed
   *
   * Replaces a matching IMAGE block wholesale rather than merging into it, so a field omitted from
   * the updated image is dropped. Reads through the plain cache's `get`, so an expired entry means
   * no update and the entry is evicted; writes through its `set`, so a successful update refreshes
   * the TTL as a side effect. Errors are swallowed so a cache problem cannot break the UI.
   *
   * @param slug - Collection slug
   * @param updatedImages - Array of updated image content models from the API response
   */
  updateImagesInCache(slug: string, updatedImages: ContentImageModel[]): void {
    if (typeof window === 'undefined') return;

    try {
      const cached = plainCache.get(slug);
      if (!cached) {
        if (isLocalEnvironment()) {
          logger.warn('collectionStorage', `No cache found for slug: ${slug}`);
        }
        return;
      }

      const updatedImagesMap = new Map(updatedImages.map(img => [img.id, img]));

      const updatedContent = cached.content?.map(block => {
        if (block.contentType === 'IMAGE' && updatedImagesMap.has(block.id)) {
          const updatedImage = updatedImagesMap.get(block.id)!;
          return updatedImage;
        }
        return block;
      });

      const updatedCollection: CollectionModel = {
        ...cached,
        content: updatedContent || cached.content,
      };

      plainCache.set(slug, updatedCollection);
    } catch (error) {
      if (isLocalEnvironment()) {
        logger.error('collectionStorage', 'Error updating cache', error);
      }
    }
  },
};
