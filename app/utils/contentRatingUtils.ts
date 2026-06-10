/**
 * Content Rating Utilities
 *
 * Unified utilities for rating-based content classification.
 * Used by both contentLayout.ts (mobile/fallback) and rowStructureAlgorithm.ts (desktop).
 */

import {
  BASE_WEIGHT,
  EXTREMENESS_RAMP_BASE,
  EXTREMENESS_RAMP_SLOPE,
  EXTREMENESS_RAMP_START,
  PANORAMA_AR,
  PANORAMA_AR_FACTOR,
  PANORAMA_AR_SLOPE,
  REFERENCE_AR,
} from '@/app/constants';
import type { AnyContentModel } from '@/app/types/Content';
import { getAspectRatio, isContentImage, isGifContent } from '@/app/utils/contentTypeGuards';

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

  // Animated GIF/MP4 blocks carry a backend-persisted rating with the same 0-5 semantics as
  // images. Treat them identically here so the row layout doesn't squash them.
  if (!isContentImage(item) && !isGifContent(item)) {
    return asStarValue ? 1 : 0;
  }
  const rating = (item as { rating?: number | null }).rating ?? 0;
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

  // Animated GIF/MP4 blocks share the image rating semantics (0-5 with vertical penalty). The
  // earlier `return 1` short-circuit here is what made GIFs always pack as low-priority filler in
  // the row algorithm even after we added rating to the backend.
  if (!isContentImage(item) && !isGifContent(item)) {
    return 1;
  }

  const baseRating = (item as { rating?: number | null }).rating ?? 0;
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
 * The arFactor has two regimes:
 * - Below the panorama threshold (AR < PANORAMA_AR): the legacy curve
 *   `sqrt(min(AR, REFERENCE_AR) / REFERENCE_AR)`. Verticals (AR < 1.5) are
 *   reduced; normal-to-wide horizontals (1.5 ≤ AR < 2) sit at the 1.0 cap.
 * - At/above the panorama threshold (AR ≥ PANORAMA_AR): a linear ramp
 *   `PANORAMA_AR_FACTOR + PANORAMA_AR_SLOPE × (AR − PANORAMA_AR)`, so a panorama
 *   is worth much more than a normal horizontal of the same rating. For a 5★:
 *   2:1 → 7.0, 3:1 → 10.0, 4:1 → 13.0.
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
  const arFactor =
    imageAR >= PANORAMA_AR
      ? PANORAMA_AR_FACTOR + PANORAMA_AR_SLOPE * (imageAR - PANORAMA_AR)
      : Math.sqrt(Math.min(imageAR, REFERENCE_AR) / REFERENCE_AR);
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

// =============================================================================
// Phase 0 — Orientation-agnostic prominence P
// =============================================================================

/**
 * Aspect-ratio extremeness: how far the image departs from square, direction-
 * agnostic. A 3:1 panorama and a 1:3 portrait both have extremeness 3.0.
 *
 * @param imageAR - Aspect ratio (width / height). Must be > 0.
 * @returns extremeness ≥ 1.0 (1.0 for a perfect square)
 */
export function getArExtremeness(imageAR: number): number {
  if (imageAR <= 0) return 1;
  return imageAR >= 1 ? imageAR : 1 / imageAR;
}

/**
 * Internal multiplier applied to BASE_WEIGHT when an image's extremeness
 * exceeds EXTREMENESS_RAMP_START. Mirrors the PANORAMA_AR ramp in
 * getComponentValue but is symmetric (applies to tall images too).
 */
function prominenceFactor(extremeness: number): number {
  return extremeness >= EXTREMENESS_RAMP_START
    ? EXTREMENESS_RAMP_BASE + EXTREMENESS_RAMP_SLOPE * (extremeness - EXTREMENESS_RAMP_START)
    : 1.0;
}

/**
 * Raw prominence rating for an item — like getRating but without the vertical
 * penalty applied by getEffectiveRating. Both a 5★ portrait and a 5★ landscape
 * return 5; the AR extremeness multiplier handles directionality instead.
 *
 * @param item - The content item to evaluate
 * @returns rating in [0, 5], or 4 for collection cards, or 1 for non-image content
 */
export function getProminenceRating(item: AnyContentModel): number {
  if (isCollectionCard(item)) return 4;
  if (!isContentImage(item) && !isGifContent(item)) return 1;
  const rating = (item as { rating?: number | null }).rating ?? 0;
  return Math.min(Math.max(rating, 0), 5);
}

/**
 * Orientation-agnostic prominence P for an item.
 *
 * P = BASE_WEIGHT[prominenceRating] × prominenceFactor(extremeness)
 *
 * Unlike getItemComponentValue (which applies a vertical penalty via
 * getEffectiveRating), P treats a 5★ portrait and a 5★ panorama as equally
 * rated and only scales by how extreme the aspect ratio is — wide OR tall.
 *
 * @param item - The content item to evaluate
 * @returns Prominence value > 0
 */
export function getProminence(item: AnyContentModel): number {
  const baseWeight = BASE_WEIGHT[getProminenceRating(item)] ?? 1.0;
  return baseWeight * prominenceFactor(getArExtremeness(getAspectRatio(item)));
}

/**
 * Horizontal cost (Hv): the "width" dimension of prominence.
 *
 * Hv = sqrt(P × AR)
 *
 * A wide panorama has a high Hv (demands horizontal space).
 * A tall portrait has a low Hv (costs little horizontal space).
 * Identity: Hv × Vv = P and Hv / Vv = AR.
 *
 * @param item - The content item to evaluate
 * @returns Width cost > 0
 */
export function getWidthCost(item: AnyContentModel): number {
  return Math.sqrt(getProminence(item) * getAspectRatio(item));
}

/**
 * Vertical demand (Vv): the "height" dimension of prominence.
 *
 * Vv = sqrt(P / AR)
 *
 * A tall portrait has a high Vv (demands vertical space).
 * A wide panorama has a low Vv (costs little vertical space).
 * Identity: Hv × Vv = P and Hv / Vv = AR.
 *
 * @param item - The content item to evaluate
 * @returns Height demand > 0
 */
export function getHeightDemand(item: AnyContentModel): number {
  const ar = getAspectRatio(item);
  return ar > 0 ? Math.sqrt(getProminence(item) / ar) : Math.sqrt(getProminence(item));
}
