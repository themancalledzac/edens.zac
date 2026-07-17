/**
 * Row Combination — row layout engine (two stages).
 *
 * Stage 1 (`buildRows`): greedy sequential fill decides which items go in each
 * row, using a per-row width-cost budget (rowWidth) and an AR-floor check. Row AR
 * during fill is estimated cheaply from a single point-balance tree (`estimateRowAR`).
 * Stage 2 (`buildAtomic`): for each finalized row, a bounded set of order-preserving
 * tree SHAPES is enumerated (`enumerateStructures`), and across every shape × every
 * hPair/vStack direction assignment the composition is selected by an equity-primary
 * objective — `equitySpread + λ·arPenalty` — so each image's rendered AREA tracks its
 * prominence P (area-to-value), hard-bounded by an AR floor at 1.0 ("never taller than
 * wide") and a soft ceiling at CEILING_MULT × target ("never a thin strip").
 *
 * Key concepts:
 * - A "component" is anything that occupies row space: a single image, gif, text, or combined block.
 * - Width-cost Hv = √(P·AR) is each item's packing cost (orientation-agnostic): a wide
 *   panorama costs more horizontal space, a tall portrait less. fill = ΣHv / rowWidth.
 * - A row is "complete" when total width-cost >= 0.9 of rowWidth (90% threshold).
 */

import { EXTREMENESS_RAMP_START } from '@/app/constants';
import type { AnyContentModel, ContentBlankModel } from '@/app/types/Content';
import {
  getArExtremeness,
  getEffectiveRating,
  getHeightDemand,
  getProminence,
  getWidthCost,
} from '@/app/utils/contentRatingUtils';
import { getAspectRatio } from '@/app/utils/contentTypeGuards';
import { calculateBoxTreeAspectRatio } from '@/app/utils/rowStructureAlgorithm';

// =============================================================================
// TYPES
// =============================================================================

/** Recursive tree structure for rendering combinations */
export type BoxTree =
  | { type: 'leaf'; content: AnyContentModel }
  | {
      type: 'combined';
      direction: 'horizontal' | 'vertical';
      children: [BoxTree, BoxTree];
    };

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Total Stage-1 packing cost of a set of items, summing the width-cost
 * Hv = √(P·AR) (orientation-agnostic) rather than the vertical-biased cv.
 */
function getTotalCV(components: AnyContentModel[]): number {
  return components.reduce((sum, item) => sum + getWidthCost(item), 0);
}

// =============================================================================
// isRowComplete
// =============================================================================

/** Minimum fill ratio for a row to be considered complete */
export const MIN_FILL_RATIO = 0.9;
/** Maximum fill ratio — rows exceeding this are rejected to prevent item squeezing */
export const MAX_FILL_RATIO = 1.15;
/** Effective rating at or below which an item is considered low-rated for standalone skip */
export const LOW_RATED_THRESHOLD = 2;

/**
 * Check if a set of components fills a row within acceptable bounds.
 *
 * A row is "complete" when fill is between 90% and 115% of row width.
 *
 * @param components - Items to check
 * @param rowWidth - Row width budget (e.g., 5 for desktop)
 * @returns true if total component value is within 90-115% of row width
 */
export function isRowComplete(components: AnyContentModel[], rowWidth: number): boolean {
  if (components.length === 0) return false;

  const totalValue = components.reduce((sum, item) => sum + getWidthCost(item), 0);

  const fill = totalValue / rowWidth;
  return fill >= MIN_FILL_RATIO && fill <= MAX_FILL_RATIO;
}

// =============================================================================
// ROW RESULT
// =============================================================================

/** A row result from the row-building algorithm */
export interface RowResult {
  components: AnyContentModel[];
  boxTree: BoxTree;
}

// =============================================================================
// ARCHITECTURE TYPES
// =============================================================================

/** Orientation shorthand for composition decisions */
export type OrientationShort = 'H' | 'V';

/** Thin view over AnyContentModel — pre-computed fields for composition */
export interface ImageType {
  source: AnyContentModel;
  title: string;
  ar: OrientationShort;
  numericAR: number;
  effectiveRating: number;
  /** Orientation-agnostic prominence P — used as the equity-target for area allocation. */
  prominence: number;
  /** Height demand Vv = √(P/AR) — drives the per-row target AR (taller rows for tall heroes). */
  heightDemand: number;
}

/** Recursive composition structure */
export type AtomicComponent =
  | { type: 'single'; img: ImageType }
  | {
      type: 'pair';
      direction: OrientationShort;
      children: [AtomicComponent, AtomicComponent];
    };

// =============================================================================
// ARCHITECTURE HELPERS
// =============================================================================

/** Convert AnyContentModel to ImageType for composition decisions */
export function toImageType(item: AnyContentModel): ImageType {
  const numericAR = getAspectRatio(item);
  const ar: OrientationShort = numericAR > 1.0 ? 'H' : 'V';
  const effectiveRating = getEffectiveRating(item);
  const prominence = getProminence(item);
  const heightDemand = getHeightDemand(item);
  const title = 'title' in item ? String(item.title) : `item-${item.id}`;

  return {
    source: item,
    title,
    ar,
    numericAR,
    effectiveRating,
    prominence,
    heightDemand,
  };
}

/** Create a single-image AtomicComponent */
export function single(img: ImageType): AtomicComponent {
  return { type: 'single', img };
}

/** Create a horizontal pair */
export function hPair(left: AtomicComponent, right: AtomicComponent): AtomicComponent {
  return { type: 'pair', direction: 'H', children: [left, right] };
}

/** Create a vertical stack */
export function vStack(top: AtomicComponent, bottom: AtomicComponent): AtomicComponent {
  return { type: 'pair', direction: 'V', children: [top, bottom] };
}

/** Create a left-heavy horizontal chain from 2+ images */
export function hChain(images: ImageType[]): AtomicComponent {
  if (images.length === 0) {
    throw new Error('hChain requires at least 1 image');
  }
  if (images.length === 1) {
    return single(images[0]!);
  }

  let tree: AtomicComponent = hPair(single(images[0]!), single(images[1]!));
  for (let i = 2; i < images.length; i++) {
    tree = hPair(tree, single(images[i]!));
  }
  return tree;
}

/** Convert AtomicComponent tree to BoxTree for rendering */
export function acToBoxTree(ac: AtomicComponent): BoxTree {
  if (ac.type === 'single') {
    return { type: 'leaf', content: ac.img.source };
  }
  return {
    type: 'combined',
    direction: ac.direction === 'H' ? 'horizontal' : 'vertical',
    children: [acToBoxTree(ac.children[0]), acToBoxTree(ac.children[1])],
  };
}

// =============================================================================
// estimateRowAR — quick AR estimate for a set of images
// =============================================================================

/** AR floor multiplier: row AR must be at least targetAR * this value */
export const AR_FLOOR_MULTIPLIER = 0.7;

// Per-row target AR band (Phase 2 — directional prominence). rowTargetAR pulls the
// viewport baseline toward a floor in proportion to the row's peak height-demand
// (Vv) ABOVE the Vv ceiling of wide/normal images, so a row holding a tall hero
// targets a taller (lower-AR) shape and sizes the hero bigger, while rows of
// landscapes/panos keep the baseline. Two anchors: peak Vv at/below
// ROW_TARGET_AR_VV_LOW pulls nothing; at/above ROW_TARGET_AR_VV_HIGH the pull is
// full. Clamped so a row never drops below ROW_TARGET_AR_MIN_FRACTION of the
// baseline, preserving the density→size monotonicity shipped 2026-05-29.
export const ROW_TARGET_AR_MIN_FRACTION = 0.6; // never below 60% of the baseline
export const ROW_TARGET_AR_VV_LOW = 1.85; // ≈ just above a 5★ pano's Vv (1.826)
export const ROW_TARGET_AR_VV_HIGH = 5.0; // ≈ a 1:3 portrait hero → full pull-down

/**
 * Per-row target AR: the viewport baseline pulled toward a floor by the row's peak
 * height-demand (Vv). A bland horizontal row (peak Vv below the wide-image ceiling
 * ROW_TARGET_AR_VV_LOW) keeps the baseline; a row with a tall vertical hero targets
 * a taller (lower-AR) shape so the hero renders bigger. The pull is content-driven
 * (peak Vv), not count-driven, so it does not affect density→size monotonicity.
 */
export function rowTargetAR(items: ImageType[], baseline: number): number {
  const peakVv = items.reduce((max, it) => Math.max(max, it.heightDemand), 0);
  const span = ROW_TARGET_AR_VV_HIGH - ROW_TARGET_AR_VV_LOW;
  const pull = Math.min(1, Math.max(0, (peakVv - ROW_TARGET_AR_VV_LOW) / span));
  const floor = baseline * ROW_TARGET_AR_MIN_FRACTION;
  return baseline - pull * (baseline - floor);
}

/**
 * Maximum images per row. Caps greedy fill AND bounds buildAtomic's Phase 2
 * enumeration (~2^(n-1) candidates for an n-leaf row), so keep this modest.
 */
export const MAX_ROW_IMAGES = 12;

/**
 * Width-cost fraction at or above which an extreme-AR item claims its OWN
 * full-width row. Paired with an extremeness gate (see {@link isSoloHero}); the
 * fraction alone is not enough because a normal landscape at a small rowWidth can
 * exceed it (a 3★ landscape Hv ≈ 2.11 is 0.53 of a rowWidth-4 budget) — that
 * would collapse low-density rows into full-width singles.
 */
export const HERO_SOLO_WIDTH_FRACTION = 0.5;

/**
 * Whether an item should claim its own full-width row — the emergent successor to
 * the retired isFullWidthHero rule. Two gates, both required:
 *
 * 1. **Extremeness gate** ({@link getArExtremeness} ≥ {@link EXTREMENESS_RAMP_START}):
 *    only images far from square in EITHER direction are solo-eligible. This ties
 *    eligibility to the prominence model's own extremeness concept (no new magic
 *    number) and subsumes the old AR≥2 gate. A normal landscape (ext 1.78 < 2) is
 *    never eligible at any rowWidth; the rating gate is correctly dropped per the
 *    prominence philosophy.
 * 2. **Width-cost gate** (Hv / rowWidth ≥ {@link HERO_SOLO_WIDTH_FRACTION}):
 *    the item's width-cost must dominate the row budget. This subsumes the old
 *    density ceiling — a wide 5★ pano (Hv ≈ 5.48) clears 0.5 of a rowWidth-10
 *    budget (low/medium density → solos) but only 0.27 of a rowWidth-20 budget
 *    (high density → shares).
 *
 * A tall portrait passes the extremeness gate but its small Hv keeps its
 * width-fraction below the bar, so it never solos — its prominence is expressed
 * as row height via {@link rowTargetAR}, not a solo row. Disabled on mobile
 * (rowWidth ≤ 2) to keep the narrow-slot path unchanged.
 */
export function isSoloHero(item: AnyContentModel, rowWidth: number): boolean {
  if (rowWidth <= 2) return false;
  if (getArExtremeness(getAspectRatio(item)) < EXTREMENESS_RAMP_START) return false;
  return getWidthCost(item) / rowWidth >= HERO_SOLO_WIDTH_FRACTION;
}

// =============================================================================
// BLANK PADDING
// =============================================================================

/**
 * Id space for synthetic blank spacers. Blank ids count DOWN from this base
 * (`BLANK_ID_BASE - rowIndex`), far below any real content id, so they never
 * collide with backend content in a sizesMap or a React key.
 */
export const BLANK_ID_BASE = -1_000_000;

/**
 * Build a blank spacer leaf with the given aspect ratio.
 *
 * The AR is encoded as `width = ar, height = 1` — `getContentDimensions`'
 * generic width/height fallback reads it straight back, so the blank sizes
 * through the same path as a real leaf with no special-casing.
 */
function createBlankLeaf(ar: number, id: number): BoxTree {
  const blank: ContentBlankModel = {
    id,
    contentType: 'BLANK',
    orderIndex: 0,
    // Must be true: isContentVisibleInCollection treats `visible === false` as
    // hidden, which would falsely trip the "Non-Visible Content" separator.
    visible: true,
    width: ar,
    height: 1,
  };
  return { type: 'leaf', content: blank };
}

/**
 * Pad an under-filled row with a single trailing blank spacer, left-aligning
 * the real content.
 *
 * A row whose real items carry total width-cost `S` inside budget `Wr` is
 * under-filled when `S / Wr < MIN_FILL_RATIO`. Left as-is, the engine scales
 * those items up to the full page width — one lonely image becomes a
 * full-width hero regardless of its rating. Instead we add a blank right
 * sibling of AR `r · gap / S`, making the combined row AR `r · Wr / S`, so the
 * real subtree takes its honest share of the width rather than all of it.
 *
 * That share is exactly `S / Wr` only in the gap-free case. Production renders
 * with a real CSS gap (see `contentLayout`'s `effectiveGap`), and because the
 * wrapper is a horizontal node the renderer inserts one gap between the real
 * subtree and the blank — so at rendered width `W` the real share is
 * `(W − gap) / W × S / Wr`, approaching the identity as `W` grows.
 *
 * The blank is always a HORIZONTAL sibling, so it renders at the real
 * subtree's own height and absorbs leftover width only — it never stacks
 * below an image. The real subtree is nested untouched, so every item keeps
 * its natural aspect ratio and internal composition.
 *
 * Padding is viewport-relative — `rowWidth` is the caller's own budget — so a
 * higher-rated item, carrying more width-cost, naturally fills more of the row.
 *
 * Skipped for a solo hero: an extreme-AR panorama's full-width row is
 * intentional (see {@link isSoloHero}), not an accident of under-fill.
 *
 * @param row - Finalized row (its `components` are real items only)
 * @param rowWidth - Row width budget for this viewport
 * @param rowIndex - Row's index, which seeds the blank's deterministic id
 * @returns The row padded, or unchanged when it is complete or a solo hero
 */
function padRowToWidth(row: RowResult, rowWidth: number, rowIndex: number): RowResult {
  const S = getTotalCV(row.components);
  // Not a reachable input case — Hv = √(P·AR) is strictly positive (BASE_WEIGHT
  // >= 1.0, and getAspectRatio clamps to 1.0) — but guards the `r * gap / S`
  // division below. Written as `!(S > 0)` so NaN is caught too: it would slip
  // through every comparison guard here and yield a NaN blank AR.
  if (!(S > 0)) return row;
  if (S / rowWidth >= MIN_FILL_RATIO) return row;
  // Mirrors the solo-hero promotion buildRows already applied when emitting this
  // row: a hero's full-width row is deliberate, so it must not be padded back
  // down. The two decisions are consistent only by invariant — if you add a gate
  // to the hero-emission path in buildRows, mirror it here.
  if (row.components.length === 1 && isSoloHero(row.components[0]!, rowWidth)) return row;

  const r = calculateBoxTreeAspectRatio(row.boxTree);
  // Reachable, despite S > 0 above: calculateBoxTreeAspectRatio reads
  // getContentDimensions raw, while getWidthCost routes through getAspectRatio's
  // `width <= 0 → 1.0` clamp. Degenerate content (width: 0) therefore yields
  // r = 0 with S > 0. Not dead code — leave it in place.
  if (r <= 0) return row;

  const gap = rowWidth - S;
  const blankAR = (r * gap) / S;

  return {
    ...row,
    boxTree: {
      type: 'combined',
      direction: 'horizontal',
      children: [row.boxTree, createBlankLeaf(blankAR, BLANK_ID_BASE - rowIndex)],
    },
  };
}

/**
 * Estimate a row's combined aspect ratio. Routes through the CHEAP single-structure
 * composer (point-balance tree only) so the Stage-1 fill loop stays fast — the
 * multi-structure equity search is reserved for final per-row composition. This
 * keeps the density→size monotonicity shipped 2026-05-29 unchanged (membership
 * decisions never run the expensive search).
 */
export function estimateRowAR(images: ImageType[], targetAR: number): number {
  if (images.length === 0) throw new Error('estimateRowAR requires at least 1 image');
  if (images.length === 1) {
    return calculateBoxTreeAspectRatio(acToBoxTree(single(images[0]!)));
  }
  const tree = splitByPointBalance(images);
  const composition = pickRootAssignment(tree, targetAR);
  return calculateBoxTreeAspectRatio(acToBoxTree(composition));
}

// =============================================================================
// buildRows
// =============================================================================

/** Collect non-skipped items from a window for row building */
function collectRowItems(
  window: AnyContentModel[],
  count: number,
  skippedStandalones: number[]
): AnyContentModel[] {
  const items: AnyContentModel[] = [];
  let taken = 0;
  for (let i = 0; i < window.length && taken < count; i++) {
    if (!skippedStandalones.includes(i)) {
      items.push(window[i]!);
      taken++;
    }
  }
  return items;
}

/**
 * Row-first layout algorithm. Builds rows over a lookahead window:
 * standalone-skips a hero past low-rated items, greedy sequential fill (by the
 * width-cost Hv = √(P·AR)), best-fit fallback, then builds each row's atomic
 * tree. A wide top-rated panorama claiming its own row at low/medium density is
 * an EMERGENT consequence of its large Hv exceeding the row budget — no longer a
 * hard-coded special case. AR-floor check is disabled on mobile (rowWidth <= 2).
 *
 * @param rowWidth - Row width budget (5 for desktop, 4 for tablet, etc.)
 * @param targetARBaseline - Baseline (viewport) target AR. Fill/estimate use it directly;
 *   each row's final composition derives a per-row target from it via {@link rowTargetAR}.
 */
export function buildRows(
  items: AnyContentModel[],
  rowWidth: number,
  targetARBaseline: number = 1.5
): RowResult[] {
  const rows: RowResult[] = [];
  const remaining = [...items];

  // Constant fill bar: density drives packing through rowWidth (chunkSize ×2.5),
  // so a rowWidth-scaled bar would over-inflate past MAX_FILL_RATIO at high density.
  const effectiveMinFill = MIN_FILL_RATIO;

  while (remaining.length > 0) {
    const window = remaining.slice(0, 5);

    // Emergent full-width hero: a leading extreme-AR item whose width-cost
    // dominates the row budget claims its own row (see {@link isSoloHero}).
    // Replaces the retired isFullWidthHero AR+rating rule — a wide top-rated
    // panorama qualifies at low/medium density and shares at high density.
    if (isSoloHero(window[0]!, rowWidth)) {
      const heroItem = window[0]!;
      rows.push({
        components: [heroItem],
        boxTree: acToBoxTree(single(toImageType(heroItem))),
      });
      remaining.splice(0, 1);
      continue;
    }

    const item0Rating = getEffectiveRating(window[0]!);

    if (item0Rating <= LOW_RATED_THRESHOLD) {
      const maxSearch = Math.min(3, window.length);
      let heroIdx = -1;

      for (let i = 1; i < maxSearch; i++) {
        if (isSoloHero(window[i]!, rowWidth)) {
          heroIdx = i;
          break;
        }
      }

      if (heroIdx >= 0) {
        const heroItem = window[heroIdx]!;
        const heroImg = toImageType(heroItem);
        const composition = single(heroImg);
        const boxTree = acToBoxTree(composition);

        rows.push({
          components: [heroItem],
          boxTree,
        });

        remaining.splice(heroIdx, 1);
        continue;
      }
    }

    const arFloor = rowWidth <= 2 ? 0 : targetARBaseline * AR_FLOOR_MULTIPLIER;
    const expandedWindow = remaining.slice(0, MAX_ROW_IMAGES);
    let seqTotal = 0;
    let seqCount = 0;
    const skippedStandalones: number[] = [];
    let slotCountComplete = false;

    for (let i = 0; i < expandedWindow.length; i++) {
      const cv = getWidthCost(expandedWindow[i]!);

      // Emergent full-width hero (mid-window): once the row has started, a later
      // solo-eligible item (see {@link isSoloHero}) is skipped here so it surfaces
      // as a leading solo hero on the next iteration. Mirrors the leading-item
      // check above; replaces the retired isFullWidthHero skip.
      if (seqCount > 0 && isSoloHero(expandedWindow[i]!, rowWidth)) {
        skippedStandalones.push(i);
        continue;
      }

      const newFill = (seqTotal + cv) / rowWidth;

      if (newFill > MAX_FILL_RATIO && !slotCountComplete) {
        // Accept moderate overfill when the row is still under the density-
        // scaled MIN_FILL bar — solo underfilled row is worse than slight overfill.
        const currentFill = seqTotal / rowWidth;
        if (currentFill < effectiveMinFill && newFill <= 1.35) {
          seqTotal += cv;
          seqCount += 1;
        }
        break;
      }

      if (slotCountComplete) {
        // Don't swallow high-rated images into someone else's row
        const candidateRating = getEffectiveRating(expandedWindow[i]!);
        if (candidateRating >= 4) {
          break;
        }

        seqTotal += cv;
        seqCount += 1;

        // Re-check AR with the expanded set
        const expandedItems = collectRowItems(expandedWindow, seqCount, skippedStandalones);
        const expandedImgs = expandedItems.map(item => toImageType(item));
        const expandedAR = estimateRowAR(expandedImgs, targetARBaseline);
        if (expandedAR >= arFloor) break;
        continue;
      }

      seqTotal += cv;
      seqCount += 1;

      if (newFill >= effectiveMinFill) {
        const rowItems = collectRowItems(expandedWindow, seqCount, skippedStandalones);
        const rowImgs = rowItems.map(item => toImageType(item));
        const rowAR = estimateRowAR(rowImgs, targetARBaseline);

        if (rowAR >= arFloor) {
          break;
        }
        slotCountComplete = true;
      }
    }

    if (seqCount > 0) {
      const rowItems = collectRowItems(expandedWindow, seqCount, skippedStandalones);
      const rowImgs = rowItems.map(item => toImageType(item));
      const composition = buildAtomic(rowImgs, rowTargetAR(rowImgs, targetARBaseline));
      const boxTree = acToBoxTree(composition);

      rows.push({
        components: rowItems,
        boxTree,
      });

      const usedIndices = new Set<number>();
      let t = 0;
      for (let i = 0; i < expandedWindow.length && t < seqCount; i++) {
        if (!skippedStandalones.includes(i)) {
          usedIndices.add(i);
          t++;
        }
      }
      const sortedUsed = [...usedIndices].sort((a, b) => b - a);
      for (const idx of sortedUsed) {
        remaining.splice(idx, 1);
      }
      continue;
    }

    const bfComponents: AnyContentModel[] = [];
    const bfUsedIndices: number[] = [];
    const available = new Set(window.map((_, i) => i));

    bfComponents.push(window[0]!);
    bfUsedIndices.push(0);
    available.delete(0);

    if (!isRowComplete(bfComponents, rowWidth)) {
      // Take items in sequential order to preserve original ordering.
      // Previous approach picked by cv-distance-to-gap which scrambled order.
      for (let idx = 1; idx < window.length; idx++) {
        if (!available.has(idx)) continue;

        const currentTotal = getTotalCV(bfComponents);
        const candidateCV = getWidthCost(window[idx]!);
        const newTotal = currentTotal + candidateCV;
        const newFill = newTotal / rowWidth;

        if (newFill > MAX_FILL_RATIO) {
          const currentFill = currentTotal / rowWidth;
          const underfillDistance = Math.abs(1.0 - currentFill);
          const overfillDistance = Math.abs(1.0 - newFill);

          if (currentFill >= MIN_FILL_RATIO) {
            break; // Row already well-filled, stop here
          }
          if (underfillDistance <= overfillDistance) {
            continue; // Skip this item, try next (it's too big but row needs more)
          }
          bfComponents.push(window[idx]!);
          bfUsedIndices.push(idx);
          break;
        }

        bfComponents.push(window[idx]!);
        bfUsedIndices.push(idx);
        available.delete(idx);

        if (isRowComplete(bfComponents, rowWidth)) {
          break;
        }
      }
    }

    const bfImgs = bfComponents.map(item => toImageType(item));
    const composition = buildAtomic(bfImgs, rowTargetAR(bfImgs, targetARBaseline));
    const boxTree = acToBoxTree(composition);

    rows.push({
      components: bfComponents,
      boxTree,
    });

    const sortedIndices = [...bfUsedIndices].sort((a, b) => b - a);
    for (const idx of sortedIndices) {
      remaining.splice(idx, 1);
    }
  }

  return rows.map((row, rowIndex) => padRowToWidth(row, rowWidth, rowIndex));
}

// =============================================================================
// ROW COMPOSITION
// =============================================================================
// buildAtomic — final-row composer. Enumerates candidate tree SHAPES (Phase 1b,
// multi-structure) × direction assignments (Phase 2), then selects equity-primary
// (area tracks prominence P) under a hard AR-1.0 floor + soft CEILING_MULT ceiling.
// The cheap single point-balance split (Phase 1, pickRootAssignment) is reserved
// for the Stage-1 fill estimator. Algorithm & rationale: ./rowCombination.md
//
// Phase 1 (splitByPointBalance) — single point-balance hierarchical split, the
// Stage-1 AR estimator only.
// =============================================================================

type AbstractNode =
  | { kind: 'leaf'; img: ImageType }
  | { kind: 'merge'; left: AbstractNode; right: AbstractNode };

/**
 * Build the unlabeled binary tree by recursively splitting at the adjacent
 * boundary whose two halves have the closest effectiveRating sums. Order
 * preserved — no swaps, only splits.
 *
 * Balances on effectiveRating (now penalty-free — equal to the raw rating for
 * both orientations) rather than the width-cost cv, so the split point reflects
 * prominence, not packing width. See ./rowCombination.md.
 */
function splitByPointBalance(items: ImageType[]): AbstractNode {
  if (items.length === 0) throw new Error('buildAtomic requires at least 1 image');
  if (items.length === 1) return { kind: 'leaf', img: items[0]! };

  // For 2 items there's only one valid split.
  if (items.length === 2) {
    return {
      kind: 'merge',
      left: { kind: 'leaf', img: items[0]! },
      right: { kind: 'leaf', img: items[1]! },
    };
  }

  // Total effectiveRating "points" across all items.
  let total = 0;
  for (const it of items) total += it.effectiveRating;
  const half = total / 2;

  // Walk adjacent splits left-to-right tracking running leftSum.
  // Score = |leftSum − half| + |rightSum − half| (lower is more balanced).
  // Tiebreaker: distance from the middle gap index.
  const middleGapIdx = (items.length - 2) / 2;
  let leftSum = 0;
  let bestGapIdx = 0;
  let bestScore = Infinity;
  let bestMidDist = Infinity;
  for (let i = 0; i < items.length - 1; i++) {
    leftSum += items[i]!.effectiveRating;
    const rightSum = total - leftSum;
    const score = Math.abs(leftSum - half) + Math.abs(rightSum - half);
    const midDist = Math.abs(i - middleGapIdx);
    if (score < bestScore || (score === bestScore && midDist < bestMidDist)) {
      bestGapIdx = i;
      bestScore = score;
      bestMidDist = midDist;
    }
  }

  // Split AFTER bestGapIdx — items [0..bestGapIdx] go left, the rest right.
  const splitPoint = bestGapIdx + 1;
  return {
    kind: 'merge',
    left: splitByPointBalance(items.slice(0, splitPoint)),
    right: splitByPointBalance(items.slice(splitPoint)),
  };
}

// =============================================================================
// Phase 1b — candidate STRUCTURE generator (area-to-value)
// =============================================================================
//
// Replaces the single point-balance shape with a BOUNDED SET of order-preserving
// binary tree SHAPES (no direction yet). Order is always preserved — only adjacent
// splits. The point-balance tree is ALWAYS included so results are never worse than
// today. Each shape is then fed to enumerateAssignments for H/V directions and
// scored equity-primary in pickBestComposition.

/**
 * Full enumeration cutoff. For n ≤ N_FULL we emit ALL order-preserving binary
 * trees (the Catalan set: C(n-1) shapes — 42 for n=6). For n > N_FULL we fall
 * back to the bounded generator.
 */
const N_FULL = 6;

/**
 * Hard cap on the number of SHAPES generated for n > N_FULL. Bounds the
 * structure × direction search so an n=12 row composes within budget
 * (~11k candidates, a few ms — validated by the perf guard test).
 */
const STRUCTURE_CAP = 64;

/**
 * All order-preserving binary tree shapes over `items` (the Catalan set).
 * Memoized on (lo, hi) ranges so repeated subranges are not rebuilt. Cost is
 * C(n-1) shapes — 42 for n=6, 132 for n=7 — so guarded by N_FULL upstream.
 */
function enumerateFullShapes(items: ImageType[]): AbstractNode[] {
  const memo = new Map<string, AbstractNode[]>();
  const build = (lo: number, hi: number): AbstractNode[] => {
    if (lo === hi) return [{ kind: 'leaf', img: items[lo]! }];
    const key = `${lo},${hi}`;
    const cached = memo.get(key);
    if (cached) return cached;
    const out: AbstractNode[] = [];
    for (let split = lo; split < hi; split++) {
      const lefts = build(lo, split);
      const rights = build(split + 1, hi);
      for (const l of lefts) {
        for (const r of rights) {
          out.push({ kind: 'merge', left: l, right: r });
        }
      }
    }
    memo.set(key, out);
    return out;
  };
  return build(0, items.length - 1);
}

/**
 * Bounded shape generator for n > N_FULL. Recursively splits at the top-K most
 * point-balanced adjacent boundaries (instead of only the single best), capping
 * the total shape count at STRUCTURE_CAP. Always seeds the legacy point-balance
 * tree first so the result is never worse than today.
 */
function enumerateBoundedShapes(items: ImageType[]): AbstractNode[] {
  const seen = new Set<string>();
  const shapes: AbstractNode[] = [];

  const keyOf = (n: AbstractNode): string =>
    n.kind === 'leaf' ? `L${n.img.source.id}` : `(${keyOf(n.left)}|${keyOf(n.right)})`;

  const push = (n: AbstractNode): boolean => {
    const k = keyOf(n);
    if (seen.has(k)) return true;
    seen.add(k);
    shapes.push(n);
    return shapes.length < STRUCTURE_CAP;
  };

  // Ranked adjacent split boundaries for a slice, best-balanced first.
  const rankedSplits = (slice: ImageType[]): number[] => {
    let total = 0;
    for (const it of slice) total += it.effectiveRating;
    const half = total / 2;
    const scored: Array<{ idx: number; score: number }> = [];
    let leftSum = 0;
    for (let i = 0; i < slice.length - 1; i++) {
      leftSum += slice[i]!.effectiveRating;
      const rightSum = total - leftSum;
      scored.push({ idx: i, score: Math.abs(leftSum - half) + Math.abs(rightSum - half) });
    }
    scored.sort((a, b) => a.score - b.score);
    return scored.map(s => s.idx);
  };

  // 1) Legacy point-balance tree first (guarantees never-worse-than-today).
  if (!push(splitByPointBalance(items))) return shapes;

  // 2) Alternative top-level split points, each recursively point-balanced.
  const topSplits = rankedSplits(items);
  for (let r = 0; r < topSplits.length; r++) {
    const split = topSplits[r]! + 1;
    const alt: AbstractNode = {
      kind: 'merge',
      left: splitByPointBalance(items.slice(0, split)),
      right: splitByPointBalance(items.slice(split)),
    };
    if (!push(alt)) return shapes;
  }

  // 3) A few extra shapes that pull a single leaf to the root on each side —
  //    the structural lever that hands a hero its own full-height column.
  for (let lead = 1; lead <= Math.min(2, items.length - 1); lead++) {
    const leftLead: AbstractNode = {
      kind: 'merge',
      left: splitByPointBalance(items.slice(0, lead)),
      right: splitByPointBalance(items.slice(lead)),
    };
    if (!push(leftLead)) return shapes;
    const trail = items.length - lead;
    const rightLead: AbstractNode = {
      kind: 'merge',
      left: splitByPointBalance(items.slice(0, trail)),
      right: splitByPointBalance(items.slice(trail)),
    };
    if (!push(rightLead)) return shapes;
  }

  return shapes;
}

/**
 * Candidate structure generator. Returns order-preserving binary tree SHAPES
 * (direction-free AbstractNodes). For n ≤ N_FULL: the full Catalan set. For
 * n > N_FULL: a bounded set capped at STRUCTURE_CAP, always including the legacy
 * point-balance tree.
 */
function enumerateStructures(items: ImageType[]): AbstractNode[] {
  if (items.length <= 1) return [{ kind: 'leaf', img: items[0]! }];
  if (items.length === 2) {
    return [
      {
        kind: 'merge',
        left: { kind: 'leaf', img: items[0]! },
        right: { kind: 'leaf', img: items[1]! },
      },
    ];
  }
  return items.length <= N_FULL ? enumerateFullShapes(items) : enumerateBoundedShapes(items);
}

// =============================================================================
// Phase 2 — enumerate direction assignments, score by root-row constraint
// =============================================================================

/** One candidate direction assignment for a subtree. */
interface Candidate {
  component: AtomicComponent;
  /** Resulting aspect ratio if this assignment is used. */
  ar: number;
}

/**
 * A row must never be taller than it is wide, so AR has a hard floor at 1.0.
 * Sub-floor candidates get a large penalty (the least-tall one is preferred
 * only as a last resort when nothing reaches the floor). At or above the floor,
 * the candidate closest to the square target wins.
 */
const ROW_AR_FLOOR = 1.0;

function rowAR_Cost(rowAR: number, target: number): number {
  if (rowAR < ROW_AR_FLOOR) return 1000 + (ROW_AR_FLOOR - rowAR);
  return Math.abs(rowAR - Math.max(target, ROW_AR_FLOOR));
}

// =============================================================================
// area-to-value: equity-primary selection across (shape × direction)
// =============================================================================

/**
 * Weight of the AR-target deviation term in the equity-primary score. Small so
 * equitySpread (area tracks prominence P) dominates and the AR-target only pulls
 * AMONG near-equity options. Replaces the retired AR_EQUITY_BAND tiebreak gate.
 */
const LAMBDA = 0.15;

/**
 * Soft upper bound on row AR, expressed as a multiple of the row's target. A row
 * wider than CEILING_MULT × target is hard-rejected (mirror of the hard lower
 * floor). Prevents equity from collapsing a horizontal row into a thin strip
 * without raising λ globally (which would over-square vertical-hero rows).
 */
const CEILING_MULT = 2.0;

/**
 * Scale-symmetric AR distance term: |ln(rowAR / target)|. Symmetric in log space
 * so being 2× too wide and 2× too tall cost the same; the hard floor (1.0) and
 * the CEILING_MULT ceiling carry the asymmetric "never taller than wide / never a
 * thin strip" constraints, leaving this term as a pure closeness-to-target pull.
 */
function arPenalty(rowAR: number, target: number): number {
  const t = Math.max(target, ROW_AR_FLOOR);
  return Math.abs(Math.log(rowAR / t));
}

/**
 * Relative area each leaf occupies (and its prominence P) for a fully
 * direction-assigned subtree. Area splits geometrically: hPair ∝ AR, vStack ∝ 1/AR.
 * Leaf shares sum to 1 within the subtree. `value` is prominence P (orientation-agnostic),
 * so {@link equitySpread} rewards high-rated verticals with more area rather than
 * penalising them via the packing cv.
 */
function leafShares(ac: AtomicComponent): {
  ar: number;
  leaves: Array<{ value: number; share: number }>;
} {
  if (ac.type === 'single') {
    return { ar: ac.img.numericAR, leaves: [{ value: ac.img.prominence, share: 1 }] };
  }
  const left = leafShares(ac.children[0]);
  const right = leafShares(ac.children[1]);
  const aL = left.ar;
  const aR = right.ar;
  const sum = aL + aR;
  const isH = ac.direction === 'H';
  const ar = isH ? sum : (aL * aR) / sum;
  // hPair: area ∝ AR. vStack: area ∝ 1/AR → left gets aR/sum, right gets aL/sum.
  const leftFactor = isH ? aL / sum : aR / sum;
  const rightFactor = isH ? aR / sum : aL / sum;
  return {
    ar,
    leaves: [
      ...left.leaves.map(l => ({ value: l.value, share: l.share * leftFactor })),
      ...right.leaves.map(l => ({ value: l.value, share: l.share * rightFactor })),
    ],
  };
}

/**
 * How unevenly a candidate sizes its images relative to their prominence.
 * Returns max(area/value) / min(area/value) across leaves: 1.0 = perfectly
 * proportional; larger = some image is over- or under-sized. Lower is better.
 * Uses prominence P (orientation-agnostic) so high-rated verticals are not
 * penalised by the vertical-penalty baked into packing cv.
 */
function equitySpread(ac: AtomicComponent): number {
  const { leaves } = leafShares(ac);
  let min = Infinity;
  let max = 0;
  for (const { value, share } of leaves) {
    if (value <= 0) continue;
    const ratio = share / value;
    if (ratio < min) min = ratio;
    if (ratio > max) max = ratio;
  }
  return min > 0 && min !== Infinity ? max / min : 1;
}

/**
 * Enumerate every possible (direction-assigned) AtomicComponent for a subtree.
 * Returns one candidate per leaf, two candidates (hPair + vStack) at every
 * internal node, multiplied across nesting. Cost is 2^N where N is the number
 * of internal nodes in the subtree — bounded by row size (≤8 items → ≤128).
 */
function enumerateAssignments(node: AbstractNode): Candidate[] {
  if (node.kind === 'leaf') {
    return [{ component: single(node.img), ar: node.img.numericAR }];
  }
  const leftOptions = enumerateAssignments(node.left);
  const rightOptions = enumerateAssignments(node.right);
  const out: Candidate[] = [];
  for (const l of leftOptions) {
    for (const r of rightOptions) {
      out.push(
        // hPair: total = leftAR + rightAR
        {
          component: hPair(l.component, r.component),
          ar: l.ar + r.ar,
        },
        // vStack: 1/total = 1/leftAR + 1/rightAR
        {
          component: vStack(l.component, r.component),
          ar: (l.ar * r.ar) / (l.ar + r.ar),
        }
      );
    }
  }
  return out;
}

/**
 * Pick the AR-closest direction assignment for a single point-balance tree.
 *
 * Stage-1 ONLY — the cheap estimator behind {@link estimateRowAR}. Root is forced
 * hPair (rows are horizontal by definition); among the children's direction
 * assignments the one with the lowest {@link rowAR_Cost} wins (closest to target,
 * sub-floor candidates carry a huge cost so the floor is preserved). No equity
 * search here: the multi-structure equity-primary selection runs ONLY at final
 * composition ({@link pickBestComposition}), keeping the Stage-1 fill loop fast.
 */
function pickRootAssignment(tree: AbstractNode, targetAR: number): AtomicComponent {
  // Leaf-only trees should never reach Phase 2 (handled by buildAtomic entry).
  if (tree.kind === 'leaf') return single(tree.img);

  const leftOptions = enumerateAssignments(tree.left);
  const rightOptions = enumerateAssignments(tree.right);

  // Root forced hPair; pick the lowest-arCost combination. Cheap: <= 2^(n-1)
  // candidates for an n-leaf row, n bounded by MAX_ROW_IMAGES.
  let best: AtomicComponent | null = null;
  let bestArCost = Infinity;
  for (const l of leftOptions) {
    for (const r of rightOptions) {
      const arCost = rowAR_Cost(l.ar + r.ar, targetAR);
      if (arCost < bestArCost) {
        bestArCost = arCost;
        best = hPair(l.component, r.component);
      }
    }
  }
  // At least one candidate always exists for a non-leaf tree, so `best` is set.
  return best!;
}

/**
 * Equity-primary composition across every candidate STRUCTURE shape and every
 * (root-forced-hPair) direction assignment — the area-to-value selector. Hard-
 * rejects rows below the AR floor (1.0) or above the soft ceiling
 * (CEILING_MULT × target). Among survivors, minimizes
 *   score = equitySpread + LAMBDA · arPenalty(rowAR, target)
 * (equitySpread primary — area tracks prominence P; AR-target soft secondary).
 * Tiebreak: closer rowAR to target. No AR_EQUITY_BAND gate — equity is the
 * primary objective.
 *
 * Counts candidates/shapes evaluated (for the perf-guard test) via the optional
 * sink.
 */
function pickBestComposition(
  items: ImageType[],
  targetAR: number,
  counters?: { shapes: number; candidates: number }
): AtomicComponent {
  const shapes = enumerateStructures(items);
  if (counters) counters.shapes += shapes.length;
  const target = Math.max(targetAR, ROW_AR_FLOOR);
  const ceiling = CEILING_MULT * target;

  // In-band winner: lowest equity-primary score among candidates within
  // [floor, ceiling]. arClosest is the AR-closest candidate overall (by
  // rowAR_Cost, which hard-penalises sub-floor) and is used ONLY when nothing
  // lands in band — so a too-wide row beats a taller-than-wide one, and we never
  // fall through to the flat (widest-possible) hChain.
  let best: AtomicComponent | null = null;
  let bestScore = Infinity;
  let bestArDist = Infinity;
  let arClosest: AtomicComponent | null = null;
  let arClosestCost = Infinity;

  // Root forced hPair: rows are horizontal by definition, so a candidate's row AR
  // is the sum of its two children's ARs.
  const consider = (component: AtomicComponent, rowAR: number): void => {
    if (counters) counters.candidates += 1;
    const cost = rowAR_Cost(rowAR, target);
    if (cost < arClosestCost) {
      arClosestCost = cost;
      arClosest = component;
    }
    if (rowAR < ROW_AR_FLOOR || rowAR > ceiling) return; // out of band — fallback only
    const score = equitySpread(component) + LAMBDA * arPenalty(rowAR, target);
    const arDist = Math.abs(rowAR - target);
    if (score < bestScore || (score === bestScore && arDist < bestArDist)) {
      bestScore = score;
      bestArDist = arDist;
      best = component;
    }
  };

  for (const shape of shapes) {
    if (shape.kind === 'leaf') {
      consider(single(shape.img), shape.img.numericAR);
      continue;
    }
    const leftOptions = enumerateAssignments(shape.left);
    const rightOptions = enumerateAssignments(shape.right);
    for (const l of leftOptions) {
      for (const r of rightOptions) {
        consider(hPair(l.component, r.component), l.ar + r.ar);
      }
    }
  }

  return best ?? arClosest ?? hChain(items);
}

// =============================================================================
// Public entry point
// =============================================================================

/**
 * Build a row's atomic component tree. Leaves stay in input order. targetAR below
 * ROW_AR_FLOOR (1.0) is lifted to it.
 *
 * Final per-row composition runs the multi-structure equity-primary search
 * (enumerateStructures × enumerateAssignments). The cheap single-structure path
 * (splitByPointBalance + pickRootAssignment) is reserved for estimateRowAR in the
 * Stage-1 fill loop. targetAR is the per-row target; AR is intrinsic to the tree.
 */
export function buildAtomic(items: ImageType[], targetAR: number): AtomicComponent {
  if (items.length === 0) throw new Error('buildAtomic requires at least 1 image');
  if (items.length === 1) return single(items[0]!);

  return pickBestComposition(items, targetAR);
}

/**
 * Compose a row AND report the number of candidate shapes / direction assignments
 * evaluated. Backs the perf-guard test (asserts the search stays bounded — e.g.
 * an n=12 row stays well under STRUCTURE_CAP shapes). Not used by production code.
 */
export function composeRowWithCandidateCount(
  items: ImageType[],
  targetAR: number
): { component: AtomicComponent; shapes: number; candidates: number } {
  if (items.length <= 1) {
    return { component: single(items[0]!), shapes: 1, candidates: 1 };
  }
  const counters = { shapes: 0, candidates: 0 };
  const component = pickBestComposition(items, targetAR, counters);
  return { component, shapes: counters.shapes, candidates: counters.candidates };
}
