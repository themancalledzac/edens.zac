/**
 * Content Rating Utilities
 *
 * Unified utilities for rating-based content classification.
 * Used by both contentLayout.ts (mobile/fallback) and rowStructureAlgorithm.ts (desktop).
 */

import { BASE_WEIGHT, REFERENCE_AR } from '@/app/constants';
import type { AnyContentModel } from '@/app/types/Content';
import { getAspectRatio, isContentImage } from '@/app/utils/contentTypeGuards';

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
  if (isCollectionCard(item)) {
    return 4;
  }

  if (!isContentImage(item)) {
    return asStarValue ? 1 : 0;
  }
  const rating = item.rating || 0;
  if (asStarValue) {
    return rating === 0 || rating === 1 ? 1 : rating;
  }
  return rating;
}

/**
 * Get the effective rating of an item based on its orientation.
 *
 * The effective rating accounts for:
 * 1. **Vertical penalty**: Vertical images are treated as one rating lower than horizontal
 *    (V5★ → H4★ equivalent, V4★ → H3★ equivalent, etc.)
 *
 * Examples:
 * - H5★ → effectiveRating 5
 * - V5★ → effectiveRating 4 (vertical penalty)
 * - H3★ → effectiveRating 3
 * - V5★ → 4, V4★ → 3, V3★ → 2, V2★ → 1, V1★ → 1, V0★ → 0
 *
 * Note: Slot-width-dependent scaling is handled downstream in getComponentValue().
 *
 * @param item - The content item to evaluate
 * @returns The effective rating (0-5) after applying orientation penalty
 */
export function getEffectiveRating(item: AnyContentModel): number {
  if (isCollectionCard(item)) {
    return 4;
  }

  if (!isContentImage(item)) {
    return 1;
  }

  const baseRating = item.rating || 0;
  const ratio = getAspectRatio(item);
  const isVertical = ratio <= 1.0;

  const effectiveRating = isVertical ? Math.max(baseRating - 1, 0) : baseRating;

  return Math.min(Math.max(effectiveRating, 0), 5);
}

/**
 * Calculate component value (cv) for an image using the fixed-weight formula.
 *
 * cv = BASE_WEIGHT[effectiveRating] × arFactor
 *
 * cv is a FIXED WEIGHT — it does NOT scale with rowWidth.
 * The caller divides cv / rowWidth to get the fill fraction.
 *
 * @param effectiveRating - The effective rating (0-5) from getEffectiveRating()
 * @param imageAR - The actual aspect ratio of the image (width/height)
 * @returns The component value (fixed weight, independent of rowWidth)
 */
export function getComponentValue(effectiveRating: number, imageAR: number): number {
  const clampedRating = Math.min(Math.max(effectiveRating, 0), 5);
  const baseWeight = BASE_WEIGHT[clampedRating] ?? 1.0;
  const arFactor = Math.sqrt(Math.min(imageAR, REFERENCE_AR) / REFERENCE_AR);
  return baseWeight * arFactor;
}

/**
 * Convenience function: Get component value directly from an item.
 * Combines getEffectiveRating() and getComponentValue() in one call.
 *
 * @param item - The content item to evaluate
 * @returns The component value for this item (fixed weight, rowWidth-independent)
 */
export function getItemComponentValue(item: AnyContentModel): number {
  const effectiveRating = getEffectiveRating(item);
  const imageAR = getAspectRatio(item);
  return getComponentValue(effectiveRating, imageAR);
}
