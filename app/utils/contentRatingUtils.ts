/**
 * Content Rating Utilities
 *
 * Unified utilities for rating-based content classification.
 * Used by both contentLayout.ts (mobile/fallback) and rowStructureAlgorithm.ts (desktop).
 */

import type { AnyContentModel } from '@/app/types/Content';
import { getAspectRatio, hasImage, isContentImage } from '@/app/utils/contentTypeGuards';

/**
 * Check if an item is a collection card (converted from ContentCollectionModel or CollectionModel)
 * Collection cards have collectionType set during conversion
 */
export function isCollectionCard(item: AnyContentModel): boolean {
  return 'collectionType' in item && !!item.collectionType;
}

/**
 * Get rating or star value for an item
 *
 * @param item - Content item to get rating for
 * @param asStarValue - If true, returns star value (0 or 1 → 1, 2+ stays as rating).
 *                      If false (default), returns raw rating (0-5).
 *
 * Special handling for collection cards:
 * - Collection cards are treated as 4-star items to ensure 2-per-row layout
 * - Two 4-star items = 8 stars (within 7-9 range) → natural 2-per-row grouping
 */
export function getRating(item: AnyContentModel, asStarValue: boolean = false): number {
  // Collection cards get effective rating of 4 for 2-per-row layout
  // This ensures collections are displayed in pairs (4+4=8 stars, within 7-9 range)
  if (isCollectionCard(item)) {
    return 4;
  }

  if (!isContentImage(item)) {
    return asStarValue ? 1 : 0; // Non-images: 1 star if asStarValue, 0 rating otherwise
  }
  const rating = item.rating || 0;
  if (asStarValue) {
    // Star value: 0 or 1 becomes 1, 2+ stays as rating
    return rating === 0 || rating === 1 ? 1 : rating;
  }
  // Raw rating: return as-is (0 stays 0)
  return rating;
}

/**
 * Check if an item should be standalone (take full row width)
 *
 * Standalone candidates:
 * - Wide panorama (aspect ratio >= 2.0) → always standalone
 * - 5-star horizontal (rating=5 AND aspect ratio > 1.0) → standalone
 *
 * Note: 5-star verticals (ratio <= 1.0) should NOT be standalone - they pair with other images
 * Note: Square images (ratio = 1.0) are considered vertical
 *
 * @param item - Content item to check
 * @returns true if item should take full row width
 */
export function isStandaloneItem(item: AnyContentModel | undefined): boolean {
  if (!item || !hasImage(item) || !isContentImage(item)) return false;

  const ratio = getAspectRatio(item);
  const rating = item.rating || 0;
  const isHorizontal = ratio > 1.0;
  const isWidePanorama = ratio >= 2.0;

  // Wide panorama → always standalone
  if (isWidePanorama) return true;

  // 5-star horizontal → always standalone
  if (rating === 5 && isHorizontal) return true;

  return false;
}

/**
 * Check if content is a 5-star horizontal image specifically
 * This is a subset of isStandaloneItem - only checks 5-star horizontals, not panoramas.
 *
 * @deprecated Use isStandaloneItem() instead for full standalone detection
 * @param item - Content item to check
 * @returns true if item is a 5-star horizontal image
 */
export function isFiveStarHorizontal(item: AnyContentModel | undefined): boolean {
  if (!item || !hasImage(item) || !isContentImage(item)) return false;
  const ratio = getAspectRatio(item);
  return ratio > 1.0 && item.rating === 5;
}
