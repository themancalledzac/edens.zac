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
} from '@/app/constants';
import type { AnyContentModel } from '@/app/types/Content';
import { clamp } from '@/app/utils/clamp';
import {
  getAspectRatio,
  isContentImage,
  isGifContent,
  isPanelContent,
} from '@/app/utils/contentTypeGuards';

/**
 * Check if an item is a collection card (converted from ContentCollectionModel or CollectionModel).
 * Collection cards carry the source collection's slug through conversion, and no other top-level
 * content model has a `slug` field, so slug presence is the discriminant. `contentRendererUtils`
 * calls this for the parallax card badge, so rating and badge can never disagree. Side effect: the
 * synthetic home tiles ("Me", "All Collections") also carry a slug, so they rate as collection
 * cards. See the warning on `ContentParallaxImageModel.slug` before stamping a slug anywhere new.
 */
export function isCollectionCard(item: AnyContentModel): boolean {
  return 'slug' in item && !!item.slug;
}

/**
 * Get the effective (orientation-agnostic prominence) rating of an item.
 *
 * The vertical penalty was RETIRED in the directional-prominence rewrite, so a
 * V5★ and an H5★ both return 5 — directionality is expressed downstream by AR
 * extremeness (width-cost Hv / height-demand Vv), not by demoting the rating.
 * Collection cards → 4, non-image/gif → 1, else the raw 0-5 rating (clamped).
 *
 * This is the single rating accessor for the layout engine: it is both the
 * Stage-1 point-balance "points" and the base of the prominence P in
 * {@link getProminence} (the former getProminenceRating, now consolidated here).
 *
 * @param item - The content item to evaluate
 * @returns The effective rating (0-5), clamped, with no orientation penalty
 */
export function getEffectiveRating(item: AnyContentModel): number {
  if (isCollectionCard(item)) {
    return 4;
  }

  if (isPanelContent(item)) return clamp(item.rating ?? 0, 0, 5);

  // Animated GIF/MP4 blocks share the image rating semantics (0-5). The earlier `return 1`
  // short-circuit here is what made GIFs always pack as low-priority filler in the row algorithm
  // even after we added rating to the backend.
  if (!isContentImage(item) && !isGifContent(item)) {
    return 1;
  }

  const baseRating = (item as { rating?: number | null }).rating ?? 0;
  return clamp(baseRating, 0, 5);
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
 * exceeds EXTREMENESS_RAMP_START. Above the start the factor climbs linearly so
 * very wide OR very tall images get extra weight (symmetric in orientation).
 */
function prominenceFactor(extremeness: number): number {
  return extremeness >= EXTREMENESS_RAMP_START
    ? EXTREMENESS_RAMP_BASE + EXTREMENESS_RAMP_SLOPE * (extremeness - EXTREMENESS_RAMP_START)
    : 1.0;
}

/**
 * Orientation-agnostic prominence P for an item.
 *
 * P = BASE_WEIGHT[effectiveRating] × prominenceFactor(extremeness)
 *
 * Directionality is never expressed by demoting the rating: P treats a 5★
 * portrait and a 5★ panorama as equally rated and only scales by how extreme
 * the aspect ratio is — wide OR tall. The width-cost Hv = √(P·AR) and
 * height-demand Vv = √(P/AR) split that prominence into the two axes. The base
 * rating comes from {@link getEffectiveRating} (penalty-free since the
 * directional-prominence rewrite — formerly the separate getProminenceRating).
 *
 * @param item - The content item to evaluate
 * @returns Prominence value > 0
 */
export function getProminence(item: AnyContentModel): number {
  const baseWeight = BASE_WEIGHT[getEffectiveRating(item)] ?? 1.0;
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
 * Mean width-cost across items — the average horizontal budget one item consumes.
 *
 * Used as a layout BASELINE so that filtering does not silently resize the grid. Because
 * {@link getWidthCost} scales with rating, a filtered view containing only 4-5★ images has a much
 * higher mean cost than the same collection unfiltered, so a fixed row-width budget fits fewer of
 * them and every photo jumps in size. Comparing the filtered mean against the unfiltered one gives
 * the factor that cancels exactly that shift. Returns 0 for an empty set, which callers treat as
 * "no baseline" rather than dividing by it.
 *
 * @param items - Items to average over
 * @returns Mean width cost, or 0 when there is nothing to average
 */
export function getMeanWidthCost(items: AnyContentModel[]): number {
  if (items.length === 0) return 0;
  return items.reduce((sum, item) => sum + getWidthCost(item), 0) / items.length;
}

/**
 * Declared minimum rendered width in CSS px, or `undefined` for content that has none.
 *
 * The single accessor the layout engine keys on, and the reason the min-width feature is
 * free for every collection page: `buildRows` and `pickBestComposition` each run one
 * `items.some(getMinWidth !== undefined)` precheck, and when it is false — nothing in a
 * photo collection declares a minimum — not one line of the constraint path executes.
 *
 * Non-positive and non-finite values read as "not declared" rather than as a floor of 0,
 * so malformed data can never widen an item or poison the deficit arithmetic.
 *
 * @param item - The content item to evaluate
 * @returns The declared minimum width in px, or undefined
 */
export function getMinWidth(item: AnyContentModel): number | undefined {
  const declared = item.minWidth;
  return declared !== undefined && Number.isFinite(declared) && declared > 0 ? declared : undefined;
}

/** Shared "declared px bound or nothing" validation for every shape accessor. */
function declaredBound(value: number | undefined): number | undefined {
  return value !== undefined && Number.isFinite(value) && value > 0 ? value : undefined;
}

/**
 * Declared maximum rendered width in CSS px, or `undefined`. A render-time cap applied
 * by the sizer (see {@link Content.maxWidth}) — it does not enter row membership, so no
 * precheck in the packer keys on it.
 */
export function getMaxWidth(item: AnyContentModel): number | undefined {
  return declaredBound(item.maxWidth);
}

/**
 * Declared height clamp in CSS px, or `undefined` on both ends. Same validation rule as
 * {@link getMinWidth}: non-positive and non-finite values read as "not declared". When
 * both bounds are declared and conflict, the sizer lets `minHeight` win.
 */
export function getHeightClamp(
  item: AnyContentModel
): { minHeight?: number; maxHeight?: number } | undefined {
  const minHeight = declaredBound(item.minHeight);
  const maxHeight = declaredBound(item.maxHeight);
  if (minHeight === undefined && maxHeight === undefined) return undefined;
  return { minHeight, maxHeight };
}

/**
 * A block's height in px when it does not vary with width, or `undefined` when it does.
 *
 * `minHeight === maxHeight` is how a block declares a CONTENT-derived height — the admin hub's
 * panels, sized `chrome + rowCount × rowHeight`. In the layout engine's affine height model
 * `H(W) = a·W + b` that is the point `a = 0`, which both the packer's composition search and the
 * sizer's equal-height solve handle directly.
 *
 * A lone `maxHeight` is deliberately NOT a pin. It is a cap, under which height still tracks width,
 * so it stays on the pure-AR path. Both consumers key on THIS function rather than re-deriving the
 * rule, so a pinned block cannot be pinned for the sizer and flexible for the packer.
 */
export function getPinnedHeight(item: AnyContentModel): number | undefined {
  const clamp = getHeightClamp(item);
  if (!clamp) return undefined;
  const { minHeight, maxHeight } = clamp;
  return minHeight !== undefined && minHeight === maxHeight ? minHeight : undefined;
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
