/**
 * Content Rating Utilities
 *
 * Unified utilities for rating-based content classification.
 * Used by both contentLayout.ts (mobile/fallback) and rowStructureAlgorithm.ts (desktop).
 */

import type { AnyContentModel } from '@/app/types/Content';
import { getAspectRatio, hasImage, isContentImage } from '@/app/utils/contentTypeGuards';

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
