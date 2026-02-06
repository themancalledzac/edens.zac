/**
 * Content Rating Utilities
 *
 * Unified utilities for rating-based content classification.
 * Used by both contentLayout.ts (mobile/fallback) and rowStructureAlgorithm.ts (desktop).
 */

import { LAYOUT } from '@/app/constants';
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

// =============================================================================
// EFFECTIVE RATING SYSTEM
// =============================================================================

/**
 * Get the effective rating of an item based on its orientation and slot width.
 *
 * The effective rating accounts for:
 * 1. **Vertical penalty**: Vertical images are treated as one rating lower than horizontal
 *    (V5★ → H4★ equivalent, V4★ → H3★ equivalent, etc.)
 * 2. **Dynamic scaling**: On narrower viewports (fewer slots), ratings "collapse upward"
 *    because there's less resolution to distinguish them.
 *
 * Examples:
 * - H5★ on desktop (5 slots) → effectiveRating 5
 * - V5★ on desktop (5 slots) → effectiveRating 4 (vertical penalty)
 * - H3★ on mobile (2 slots) → effectiveRating 3 (unchanged, but slot cost will be full width)
 *
 * @param item - The content item to evaluate
 * @param slotWidth - Number of slots in the layout (desktop: 5, mobile: 2)
 * @returns The effective rating (0-5) after applying orientation penalty
 */
export function getEffectiveRating(item: AnyContentModel, _slotWidth: number = LAYOUT.desktopSlotWidth): number {
  // Collection cards get fixed effective rating of 4
  if (isCollectionCard(item)) {
    return 4;
  }

  // Non-images get minimum rating
  if (!isContentImage(item)) {
    return 1;
  }

  const baseRating = item.rating || 0;
  const ratio = getAspectRatio(item);
  const isVertical = ratio <= 1.0;

  // Apply vertical penalty: verticals are treated as one rating lower
  // V5★ → 4, V4★ → 3, V3★ → 2, V2★ → 1, V1★ → 1, V0★ → 0
  const effectiveRating = isVertical ? Math.max(baseRating - 1, 0) : baseRating;

  // Note: Dynamic scaling for mobile is handled in getComponentValue()
  // The effective rating remains the same; the slot cost interpretation changes.
  // This keeps the rating semantic while allowing flexible slot allocation.

  // Ensure rating stays in bounds (0-5)
  return Math.min(Math.max(effectiveRating, 0), 5);
}

/**
 * Derive an effective rating from an aspect ratio.
 *
 * Used for combined components where the rating is determined by the
 * resulting geometry rather than the original image ratings.
 *
 * Thresholds:
 * - AR >= 2.0  → 5 (wide panoramic)
 * - AR >= 1.5  → 4 (standard horizontal)
 * - AR >= 1.0  → 3 (square-ish)
 * - AR >= 0.75 → 2 (slightly vertical)
 * - AR < 0.75  → 1 (tall vertical)
 *
 * @param ar - The aspect ratio (width / height)
 * @returns The effective rating (1-5)
 */
export function getEffectiveRatingFromAspectRatio(ar: number): number {
  if (ar >= 2.0) return 5;
  if (ar >= 1.5) return 4;
  if (ar >= 1.0) return 3;
  if (ar >= 0.75) return 2;
  return 1;
}

/**
 * Convert an effective rating to a component value based on the row width.
 *
 * Component value represents the proportion of a row an item should occupy.
 * The calculation varies based on row width (desktop vs mobile):
 *
 * **Desktop (5 slots):**
 * - 5★ = 5 slots (full width, 1 per row)
 * - 4★ = 2.5 slots (2 per row)
 * - 3★ = 1.67 slots (3 per row)
 * - 2★ = 1.25 slots (4 per row)
 * - 0-1★ = 1 slot (5 per row)
 *
 * **Mobile (2 slots):**
 * - 3-5★ = 2 slots (full width, ratings "collapse" upward)
 * - 0-2★ = 1 slot (2 per row)
 *
 * @param effectiveRating - The effective rating (0-5) from getEffectiveRating()
 * @param slotWidth - Number of slots in the layout (desktop: 5, mobile: 2)
 * @returns The component value (how much of the row this item occupies)
 */
export function getComponentValue(effectiveRating: number, slotWidth: number = LAYOUT.desktopSlotWidth): number {
  // Mobile layout (2 slots): binary decision
  // 3+ star → full width (2 slots), 0-2 star → half width (1 slot)
  if (slotWidth <= LAYOUT.mobileSlotWidth) {
    return effectiveRating >= 3 ? slotWidth : 1;
  }

  // Desktop layout (5 slots): proportional scaling
  // Formula: slotCost = slotWidth / itemsPerRow
  // itemsPerRow = 6 - effectiveRating (clamped to [1, slotWidth])
  // - 5★: 6-5=1 item per row → 5/1 = 5 slots
  // - 4★: 6-4=2 items per row → 5/2 = 2.5 slots
  // - 3★: 6-3=3 items per row → 5/3 ≈ 1.67 slots
  // - 2★: 6-2=4 items per row → 5/4 = 1.25 slots
  // - 1★: 6-1=5 items per row → 5/5 = 1 slot
  // - 0★: 6-0=6, clamped to 5 → 5/5 = 1 slot
  const itemsPerRow = Math.min(Math.max(6 - effectiveRating, 1), slotWidth);
  return slotWidth / itemsPerRow;
}

/**
 * Convenience function: Get component value directly from an item.
 * Combines getEffectiveRating() and getComponentValue() in one call.
 *
 * @param item - The content item to evaluate
 * @param slotWidth - Number of slots in the layout (desktop: 5, mobile: 2)
 * @returns The component value for this item
 */
export function getItemComponentValue(item: AnyContentModel, slotWidth: number = LAYOUT.desktopSlotWidth): number {
  const effectiveRating = getEffectiveRating(item, slotWidth);
  return getComponentValue(effectiveRating, slotWidth);
}
