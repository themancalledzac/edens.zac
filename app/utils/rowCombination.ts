/**
 * Row Combination — row layout engine (two stages).
 *
 * Stage 1 (`buildRows`): greedy sequential fill decides which items go in each
 * row, using a per-row cv budget (rowWidth) and an AR-floor check.
 * Stage 2 (`buildAtomic`): for each row, a point-balance split builds a binary tree,
 * then every hPair/vStack direction assignment is enumerated and scored — a hard
 * AR floor at 1.0 ("never taller than wide") plus closeness to the target row AR,
 * with an equity tiebreak so equal-rated images render at similar size.
 *
 * Key concepts:
 * - A "component" is anything that occupies row space: a single image, gif, text, or combined block.
 * - Component value (cv) = proportion of row width an item occupies (effectiveRating / rowWidth).
 * - A row is "complete" when total component values >= 0.9 (90% threshold).
 */

import type { AnyContentModel } from '@/app/types/Content';
import {
  getEffectiveRating,
  getHeightDemand,
  getItemComponentValue,
  getProminence,
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
 * Calculate the total component value of a set of items.
 */
function getTotalCV(components: AnyContentModel[], _rowWidth: number): number {
  return components.reduce((sum, item) => sum + getItemComponentValue(item), 0);
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

  const totalValue = components.reduce((sum, item) => sum + getItemComponentValue(item), 0);

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
  componentValue: number;
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
export function toImageType(item: AnyContentModel, _rowWidth: number): ImageType {
  const numericAR = getAspectRatio(item);
  const ar: OrientationShort = numericAR > 1.0 ? 'H' : 'V';
  const effectiveRating = getEffectiveRating(item);
  const componentValue = getItemComponentValue(item);
  const prominence = getProminence(item);
  const heightDemand = getHeightDemand(item);
  const title = 'title' in item ? String(item.title) : `item-${item.id}`;

  return {
    source: item,
    title,
    ar,
    numericAR,
    effectiveRating,
    componentValue,
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
 * Full-width hero promotion thresholds. A wide, top-rated horizontal panorama
 * can't be sized to its prominence inside a shared row, so it gets its own
 * full-width row. Gated by AR, rating, and density (at high density even a wide
 * panorama shares the row).
 */
export const HERO_FULLWIDTH_MIN_AR = 2.0;
export const HERO_FULLWIDTH_MIN_RATING = 5;
export const HERO_FULLWIDTH_MAX_ROWWIDTH = 15;

/**
 * Whether an item should claim its own full-width row: a horizontal image at
 * least {@link HERO_FULLWIDTH_MIN_AR} wide, rated at least
 * {@link HERO_FULLWIDTH_MIN_RATING}, while the row-width budget is at or below
 * {@link HERO_FULLWIDTH_MAX_ROWWIDTH} (low/medium density).
 */
export function isFullWidthHero(item: AnyContentModel, rowWidth: number): boolean {
  if (rowWidth > HERO_FULLWIDTH_MAX_ROWWIDTH) return false;
  if (getAspectRatio(item) < HERO_FULLWIDTH_MIN_AR) return false;
  return getEffectiveRating(item) >= HERO_FULLWIDTH_MIN_RATING;
}

/**
 * Estimate a row's combined aspect ratio. Routes through the canonical composer
 * so the Stage-1 estimate matches the composition that actually renders.
 */
export function estimateRowAR(images: ImageType[], targetAR: number, rowWidth: number): number {
  const composition = buildAtomic(images, targetAR, rowWidth);
  return calculateBoxTreeAspectRatio(acToBoxTree(composition), rowWidth);
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
 * Row-first layout algorithm. Builds rows over a lookahead window: promotes a
 * full-width hero ({@link isFullWidthHero}) to its own row (whether leading or
 * mid-window), standalone-skips a hero past low-rated items, greedy sequential
 * fill, best-fit fallback, then builds each row's atomic tree. AR-floor check
 * is disabled on mobile (rowWidth <= 2).
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

    if (isFullWidthHero(window[0]!, rowWidth)) {
      const heroItem = window[0]!;
      rows.push({
        components: [heroItem],
        boxTree: acToBoxTree(single(toImageType(heroItem, rowWidth))),
      });
      remaining.splice(0, 1);
      continue;
    }

    const item0Rating = getEffectiveRating(window[0]!);

    if (item0Rating <= LOW_RATED_THRESHOLD) {
      const maxSearch = Math.min(3, window.length);
      let heroIdx = -1;

      for (let i = 1; i < maxSearch; i++) {
        const candidate = window[i]!;
        const cv = getItemComponentValue(candidate);
        if (cv / rowWidth >= 0.95) {
          heroIdx = i;
          break;
        }
      }

      if (heroIdx >= 0) {
        const heroItem = window[heroIdx]!;
        const heroImg = toImageType(heroItem, rowWidth);
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
      if (seqCount > 0 && isFullWidthHero(expandedWindow[i]!, rowWidth)) {
        skippedStandalones.push(i);
        continue;
      }

      const cv = getItemComponentValue(expandedWindow[i]!);
      const newFill = (seqTotal + cv) / rowWidth;

      if (newFill > MAX_FILL_RATIO && !slotCountComplete) {
        if (seqCount > 0 && cv / rowWidth >= 0.95) {
          skippedStandalones.push(i);
          continue;
        }
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
        const expandedImgs = expandedItems.map(item => toImageType(item, rowWidth));
        const expandedAR = estimateRowAR(expandedImgs, targetARBaseline, rowWidth);
        if (expandedAR >= arFloor) break;
        continue;
      }

      seqTotal += cv;
      seqCount += 1;

      if (newFill >= effectiveMinFill) {
        const rowItems = collectRowItems(expandedWindow, seqCount, skippedStandalones);
        const rowImgs = rowItems.map(item => toImageType(item, rowWidth));
        const rowAR = estimateRowAR(rowImgs, targetARBaseline, rowWidth);

        if (rowAR >= arFloor) {
          break;
        }
        slotCountComplete = true;
      }
    }

    if (seqCount > 0) {
      const rowItems = collectRowItems(expandedWindow, seqCount, skippedStandalones);
      const rowImgs = rowItems.map(item => toImageType(item, rowWidth));
      const composition = buildAtomic(rowImgs, rowTargetAR(rowImgs, targetARBaseline), rowWidth);
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

        const currentTotal = getTotalCV(bfComponents, rowWidth);
        const candidateCV = getItemComponentValue(window[idx]!);
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

    const bfImgs = bfComponents.map(item => toImageType(item, rowWidth));
    const composition = buildAtomic(bfImgs, rowTargetAR(bfImgs, targetARBaseline), rowWidth);
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

  return rows;
}

// =============================================================================
// ROW COMPOSITION
// =============================================================================
// buildAtomic — two-phase composer: point-balance split (Phase 1), then
// direction enumeration with a hard AR-1.0 floor + equity tiebreak (Phase 2).
// Algorithm & rationale: ./rowCombination.md

// =============================================================================
// Phase 1 — point-balance hierarchical split
// =============================================================================

type AbstractNode =
  | { kind: 'leaf'; img: ImageType }
  | { kind: 'merge'; left: AbstractNode; right: AbstractNode };

/**
 * Build the unlabeled binary tree by recursively splitting at the adjacent
 * boundary whose two halves have the closest effectiveRating sums. Order
 * preserved — no swaps, only splits.
 *
 * effectiveRating (not cv): cv would double-penalise verticals. See ./rowCombination.md.
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

/**
 * Width of the AR band used for the equity tiebreak: among root candidates
 * whose row AR is within this distance of the best achievable, the most
 * equitable one is chosen. Small enough that row AR stays visually close to
 * target (preserving the screen-fit behaviour), wide enough to admit a balanced
 * alternative when the AR-optimal tree happens to be lopsided.
 */
const AR_EQUITY_BAND = 0.3;

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
 * Pick the best direction assignment for a row.
 *
 * Root is forced to hPair (rows are horizontal by definition). Children's
 * direction assignments are enumerated independently, then combined at root
 * with hPair. The combination with the lowest `rowAR_Cost` wins.
 */
function pickRootAssignment(tree: AbstractNode, targetAR: number): AtomicComponent {
  // Leaf-only trees should never reach Phase 2 (handled by buildAtomic entry).
  if (tree.kind === 'leaf') return single(tree.img);

  const leftOptions = enumerateAssignments(tree.left);
  const rightOptions = enumerateAssignments(tree.right);

  // Every root candidate (root is forced hPair), with its AR cost and how
  // equitably it sizes images. Building all of them is cheap: <= 2^(n-1)
  // candidates for an n-leaf row, n bounded by MAX_ROW_IMAGES.
  const candidates: Array<{ component: AtomicComponent; arCost: number; equity: number }> = [];
  let minArCost = Infinity;
  for (const l of leftOptions) {
    for (const r of rightOptions) {
      const component = hPair(l.component, r.component);
      const arCost = rowAR_Cost(l.ar + r.ar, targetAR);
      if (arCost < minArCost) minArCost = arCost;
      candidates.push({ component, arCost, equity: equitySpread(component) });
    }
  }

  // Tier 1: keep candidates whose row AR is within AR_EQUITY_BAND of the best.
  // This also preserves the floor — sub-1.0 candidates carry a huge arCost and
  // fall outside the band. Tier 2: among those, the most equitable wins, with
  // closer-to-target AR breaking ties.
  const threshold = minArCost + AR_EQUITY_BAND;
  let best: { component: AtomicComponent; arCost: number; equity: number } | null = null;
  for (const c of candidates) {
    if (c.arCost > threshold) continue;
    if (
      best === null ||
      c.equity < best.equity ||
      (c.equity === best.equity && c.arCost < best.arCost)
    ) {
      best = c;
    }
  }
  // At least the AR-best candidate is always within the band, so `best` is set.
  return best!.component;
}

// =============================================================================
// Public entry point
// =============================================================================

/**
 * Build a row's atomic component tree via the two-phase algorithm. Leaves stay
 * in input order. targetAR below ROW_AR_FLOOR (1.0) is lifted to it. rowWidth is
 * unused (AR is intrinsic to the tree); kept for call-site symmetry.
 */
export function buildAtomic(
  items: ImageType[],
  targetAR: number,
  rowWidth: number
): AtomicComponent {
  if (items.length === 0) throw new Error('buildAtomic requires at least 1 image');
  if (items.length === 1) return single(items[0]!);

  // rowWidth is unused; touch it so lint doesn't flag it.
  void rowWidth;
  const tree = splitByPointBalance(items);
  return pickRootAssignment(tree, targetAR);
}
