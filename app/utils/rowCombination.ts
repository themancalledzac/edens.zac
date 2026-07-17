/**
 * Row layout engine. Two stages:
 *
 * 1. buildRows — greedy sequential fill decides which items go in each row, using a
 *    per-row width-cost budget and an aspect-ratio floor check. Row AR during fill
 *    is estimated cheaply from a single point-balance tree (estimateRowAR).
 * 2. buildAtomic — for each finalized row, enumerate order-preserving tree shapes and
 *    H/V direction assignments, then pick the composition whose rendered areas best
 *    track each image's prominence, bounded by an AR floor (never taller than wide)
 *    and a soft ceiling (never a thin strip).
 *
 * Width-cost Hv = √(P·AR) is an item's orientation-agnostic packing cost; a row's
 * fill is ΣHv / rowWidth, and a row is complete once fill reaches MIN_FILL_RATIO.
 */

import { EXTREMENESS_RAMP_START } from '@/app/constants';
import type { AnyContentModel } from '@/app/types/Content';
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

/** Recursive tree structure for rendering combinations. */
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

/** Sum of every item's width-cost Hv = √(P·AR). */
function getTotalWidthCost(components: AnyContentModel[]): number {
  return components.reduce((sum, item) => sum + getWidthCost(item), 0);
}

// =============================================================================
// isRowComplete
// =============================================================================

/** Minimum fill ratio for a row to be considered complete. */
export const MIN_FILL_RATIO = 0.9;
/** Maximum fill ratio; rows above this are rejected to avoid squeezing items. */
export const MAX_FILL_RATIO = 1.15;
/** Effective rating at or below which an item can be skipped past for a hero. */
export const LOW_RATED_THRESHOLD = 2;

/**
 * Whether a set of components fills a row within the acceptable band
 * (MIN_FILL_RATIO to MAX_FILL_RATIO of rowWidth).
 *
 * @param components - Items to check.
 * @param rowWidth - Row width budget (e.g. 5 for desktop).
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

/** A row produced by the row-building algorithm. */
export interface RowResult {
  components: AnyContentModel[];
  boxTree: BoxTree;
}

// =============================================================================
// ARCHITECTURE TYPES
// =============================================================================

/** Orientation shorthand for composition decisions. */
export type OrientationShort = 'H' | 'V';

/** Thin view over AnyContentModel with pre-computed fields for composition. */
export interface ImageType {
  source: AnyContentModel;
  title: string;
  ar: OrientationShort;
  numericAR: number;
  effectiveRating: number;
  /** Orientation-agnostic prominence P; the target for area allocation. */
  prominence: number;
  /** Height demand Vv = √(P/AR); drives the per-row target AR. */
  heightDemand: number;
}

/** Recursive composition structure. */
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

/** Convert AnyContentModel to ImageType for composition decisions. */
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

/** Create a single-image AtomicComponent. */
export function single(img: ImageType): AtomicComponent {
  return { type: 'single', img };
}

/** Create a horizontal pair. */
export function hPair(left: AtomicComponent, right: AtomicComponent): AtomicComponent {
  return { type: 'pair', direction: 'H', children: [left, right] };
}

/** Create a vertical stack. */
export function vStack(top: AtomicComponent, bottom: AtomicComponent): AtomicComponent {
  return { type: 'pair', direction: 'V', children: [top, bottom] };
}

/** Create a left-heavy horizontal chain from one or more images. */
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

/** Convert an AtomicComponent tree to a BoxTree for rendering. */
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
// estimateRowAR
// =============================================================================

/** Row AR must be at least targetAR × this value. */
export const AR_FLOOR_MULTIPLIER = 0.7;

/** Never pull a row's target AR below this fraction of the baseline. */
export const ROW_TARGET_AR_MIN_FRACTION = 0.6;
/** Peak height-demand at or below which no pull is applied (≈ a 5★ pano's Vv). */
export const ROW_TARGET_AR_VV_LOW = 1.85;
/** Peak height-demand at or above which the pull is full (≈ a 1:3 portrait hero). */
export const ROW_TARGET_AR_VV_HIGH = 5.0;

/**
 * Per-row target AR: the viewport baseline pulled toward a floor in proportion to
 * the row's peak height-demand (Vv). A row of landscapes keeps the baseline; a row
 * with a tall vertical hero targets a taller (lower-AR) shape so the hero renders
 * bigger. The pull is content-driven, not count-driven, so it does not affect
 * density-to-size behavior.
 */
export function rowTargetAR(items: ImageType[], baseline: number): number {
  const peakVv = items.reduce((max, item) => Math.max(max, item.heightDemand), 0);
  const span = ROW_TARGET_AR_VV_HIGH - ROW_TARGET_AR_VV_LOW;
  const pull = Math.min(1, Math.max(0, (peakVv - ROW_TARGET_AR_VV_LOW) / span));
  const floor = baseline * ROW_TARGET_AR_MIN_FRACTION;
  return baseline - pull * (baseline - floor);
}

/**
 * Maximum images per row. Caps greedy fill and bounds buildAtomic's enumeration
 * (~2^(n-1) candidates for an n-leaf row), so keep it modest.
 */
export const MAX_ROW_IMAGES = 12;

/**
 * Width-cost fraction at or above which an extreme-AR item claims its own full-width
 * row. Paired with an extremeness gate (see isSoloHero): the fraction alone is not
 * enough, since a normal landscape at a small rowWidth can exceed it.
 */
export const HERO_SOLO_WIDTH_FRACTION = 0.5;

/**
 * Whether an item should claim its own full-width row. Both gates are required:
 *
 * 1. Extremeness: getArExtremeness ≥ EXTREMENESS_RAMP_START — only images far from
 *    square (in either direction) are eligible.
 * 2. Width-cost: Hv / rowWidth ≥ HERO_SOLO_WIDTH_FRACTION — the item must dominate the
 *    row budget, so a wide pano solos at low density but shares at high density.
 *
 * A tall portrait passes the extremeness gate but its small Hv keeps it below the
 * width-cost bar, so it never solos; its prominence shows as row height via
 * rowTargetAR instead. Disabled on mobile (rowWidth ≤ 2).
 */
export function isSoloHero(item: AnyContentModel, rowWidth: number): boolean {
  if (rowWidth <= 2) return false;
  if (getArExtremeness(getAspectRatio(item)) < EXTREMENESS_RAMP_START) return false;
  return getWidthCost(item) / rowWidth >= HERO_SOLO_WIDTH_FRACTION;
}

/**
 * Estimate a row's combined aspect ratio via the cheap single-structure composer
 * (point-balance tree only), keeping the Stage-1 fill loop fast. The expensive
 * multi-structure equity search runs only at final per-row composition.
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

/** Collect the first `count` non-skipped items from a window. */
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
 * Row-first layout. Over a lookahead window it optionally skips a leading low-rated
 * run to surface a solo hero, greedily fills by width-cost Hv, falls back to best-fit,
 * then builds each row's atomic tree. A wide top-rated panorama claiming its own row
 * is an emergent result of its large Hv exceeding the budget, not a special case. The
 * AR-floor check is disabled on mobile (rowWidth ≤ 2).
 *
 * @param rowWidth - Row width budget (5 desktop, 4 tablet, etc.).
 * @param targetARBaseline - Baseline (viewport) target AR. Fill and estimate use it
 *   directly; each row derives a per-row target from it via rowTargetAR.
 */
export function buildRows(
  items: AnyContentModel[],
  rowWidth: number,
  targetARBaseline: number = 1.5
): RowResult[] {
  const rows: RowResult[] = [];
  const remaining = [...items];

  const effectiveMinFill = MIN_FILL_RATIO;

  while (remaining.length > 0) {
    const window = remaining.slice(0, 5);

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
      const widthCost = getWidthCost(expandedWindow[i]!);

      if (seqCount > 0 && isSoloHero(expandedWindow[i]!, rowWidth)) {
        skippedStandalones.push(i);
        continue;
      }

      const newFill = (seqTotal + widthCost) / rowWidth;

      if (newFill > MAX_FILL_RATIO && !slotCountComplete) {
        const currentFill = seqTotal / rowWidth;
        if (currentFill < effectiveMinFill && newFill <= 1.35) {
          seqTotal += widthCost;
          seqCount += 1;
        }
        break;
      }

      if (slotCountComplete) {
        const candidateRating = getEffectiveRating(expandedWindow[i]!);
        if (candidateRating >= 4) {
          break;
        }

        seqTotal += widthCost;
        seqCount += 1;

        const expandedItems = collectRowItems(expandedWindow, seqCount, skippedStandalones);
        const expandedImgs = expandedItems.map(item => toImageType(item));
        const expandedAR = estimateRowAR(expandedImgs, targetARBaseline);
        if (expandedAR >= arFloor) break;
        continue;
      }

      seqTotal += widthCost;
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
      let taken = 0;
      for (let i = 0; i < expandedWindow.length && taken < seqCount; i++) {
        if (!skippedStandalones.includes(i)) {
          usedIndices.add(i);
          taken++;
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
      for (let idx = 1; idx < window.length; idx++) {
        if (!available.has(idx)) continue;

        const currentTotal = getTotalWidthCost(bfComponents);
        const candidateWidthCost = getWidthCost(window[idx]!);
        const newTotal = currentTotal + candidateWidthCost;
        const newFill = newTotal / rowWidth;

        if (newFill > MAX_FILL_RATIO) {
          const currentFill = currentTotal / rowWidth;
          const underfillDistance = Math.abs(1.0 - currentFill);
          const overfillDistance = Math.abs(1.0 - newFill);

          if (currentFill >= MIN_FILL_RATIO) {
            break;
          }
          if (underfillDistance <= overfillDistance) {
            continue;
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

  return rows;
}

// =============================================================================
// ROW COMPOSITION
// =============================================================================
// buildAtomic composes each finalized row: it enumerates candidate tree shapes
// (enumerateStructures) and every H/V direction assignment, then selects the one
// whose leaf areas best track prominence P under a hard AR-1.0 floor and a soft
// CEILING_MULT ceiling. The cheap single point-balance split (splitByPointBalance +
// pickRootAssignment) backs only the Stage-1 AR estimator.
// Algorithm & rationale: ./rowCombination.md
// =============================================================================

type AbstractNode =
  | { kind: 'leaf'; img: ImageType }
  | { kind: 'merge'; left: AbstractNode; right: AbstractNode };

/**
 * Build an unlabeled binary tree by recursively splitting at the adjacent boundary
 * whose two halves have the closest effectiveRating sums. Order is preserved (only
 * splits, no swaps), so the split reflects prominence rather than packing width.
 */
function splitByPointBalance(items: ImageType[]): AbstractNode {
  if (items.length === 0) throw new Error('buildAtomic requires at least 1 image');
  if (items.length === 1) return { kind: 'leaf', img: items[0]! };

  if (items.length === 2) {
    return {
      kind: 'merge',
      left: { kind: 'leaf', img: items[0]! },
      right: { kind: 'leaf', img: items[1]! },
    };
  }

  let total = 0;
  for (const item of items) total += item.effectiveRating;
  const half = total / 2;

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

  const splitPoint = bestGapIdx + 1;
  return {
    kind: 'merge',
    left: splitByPointBalance(items.slice(0, splitPoint)),
    right: splitByPointBalance(items.slice(splitPoint)),
  };
}

// =============================================================================
// Candidate structure generator
// =============================================================================

/**
 * Full-enumeration cutoff. For n ≤ N_FULL emit every order-preserving binary tree
 * (the Catalan set: C(n-1) shapes, 42 for n=6); for n > N_FULL use the bounded
 * generator instead.
 */
const N_FULL = 6;

/**
 * Hard cap on shapes generated for n > N_FULL. Bounds the structure × direction
 * search so an n=12 row composes within budget (~11k candidates, a few ms).
 */
const STRUCTURE_CAP = 64;

/**
 * Every order-preserving binary tree shape over `items` (the Catalan set), memoized
 * on (lo, hi) ranges. Cost is C(n-1) shapes, so it is guarded by N_FULL upstream.
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
      for (const left of lefts) {
        for (const right of rights) {
          out.push({ kind: 'merge', left, right });
        }
      }
    }
    memo.set(key, out);
    return out;
  };
  return build(0, items.length - 1);
}

/**
 * Bounded shape generator for n > N_FULL. Seeds the point-balance tree first (so the
 * result is never worse than the single-structure path), then adds alternative
 * top-level splits and a few leaf-to-root shapes (which can hand a hero its own
 * full-height column), all capped at STRUCTURE_CAP.
 */
function enumerateBoundedShapes(items: ImageType[]): AbstractNode[] {
  const seen = new Set<string>();
  const shapes: AbstractNode[] = [];

  const keyOf = (node: AbstractNode): string =>
    node.kind === 'leaf' ? `L${node.img.source.id}` : `(${keyOf(node.left)}|${keyOf(node.right)})`;

  const push = (node: AbstractNode): boolean => {
    const key = keyOf(node);
    if (seen.has(key)) return true;
    seen.add(key);
    shapes.push(node);
    return shapes.length < STRUCTURE_CAP;
  };

  const rankedSplits = (slice: ImageType[]): number[] => {
    let total = 0;
    for (const item of slice) total += item.effectiveRating;
    const half = total / 2;
    const scored: Array<{ idx: number; score: number }> = [];
    let leftSum = 0;
    for (let i = 0; i < slice.length - 1; i++) {
      leftSum += slice[i]!.effectiveRating;
      const rightSum = total - leftSum;
      scored.push({ idx: i, score: Math.abs(leftSum - half) + Math.abs(rightSum - half) });
    }
    scored.sort((a, b) => a.score - b.score);
    return scored.map(entry => entry.idx);
  };

  if (!push(splitByPointBalance(items))) return shapes;

  const topSplits = rankedSplits(items);
  for (let i = 0; i < topSplits.length; i++) {
    const split = topSplits[i]! + 1;
    const alt: AbstractNode = {
      kind: 'merge',
      left: splitByPointBalance(items.slice(0, split)),
      right: splitByPointBalance(items.slice(split)),
    };
    if (!push(alt)) return shapes;
  }

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
 * Candidate structure generator. Returns order-preserving binary tree shapes: the
 * full Catalan set for n ≤ N_FULL, otherwise a bounded set (STRUCTURE_CAP) that
 * always includes the point-balance tree.
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
// Direction assignment and scoring
// =============================================================================

/** One candidate direction assignment for a subtree, with its resulting AR. */
interface Candidate {
  component: AtomicComponent;
  ar: number;
}

/** A row is never taller than wide, so its AR has a hard floor at 1.0. */
const ROW_AR_FLOOR = 1.0;

/**
 * Stage-1 AR cost: sub-floor candidates get a large penalty (preferred only as a last
 * resort); at or above the floor, the candidate closest to the target wins.
 */
function rowAR_Cost(rowAR: number, target: number): number {
  if (rowAR < ROW_AR_FLOOR) return 1000 + (ROW_AR_FLOOR - rowAR);
  return Math.abs(rowAR - Math.max(target, ROW_AR_FLOOR));
}

// =============================================================================
// Area-to-value selection
// =============================================================================

/**
 * Weight of the AR-target term in the equity-primary score. Small, so equitySpread
 * (area tracks prominence) dominates and the AR-target only breaks ties among
 * near-equity options.
 */
const LAMBDA = 0.15;

/**
 * Soft upper bound on row AR, as a multiple of the row's target. A row wider than
 * CEILING_MULT × target is rejected (mirror of the hard lower floor), so equity
 * cannot collapse a horizontal row into a thin strip.
 */
const CEILING_MULT = 2.0;

/**
 * Scale-symmetric AR distance |ln(rowAR / target)|: being 2× too wide and 2× too tall
 * cost the same. The hard floor and CEILING_MULT ceiling carry the asymmetric
 * constraints; this term is a pure closeness-to-target pull.
 */
function arPenalty(rowAR: number, target: number): number {
  const safeTarget = Math.max(target, ROW_AR_FLOOR);
  return Math.abs(Math.log(rowAR / safeTarget));
}

/**
 * Relative area of each leaf (and its prominence) for a fully direction-assigned
 * subtree. Area splits geometrically: hPair ∝ AR, vStack ∝ 1/AR; leaf shares sum to 1
 * within the subtree. `value` is prominence P, so equitySpread rewards high-rated
 * verticals with more area.
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
  const leftAR = left.ar;
  const rightAR = right.ar;
  const sum = leftAR + rightAR;
  const isH = ac.direction === 'H';
  const ar = isH ? sum : (leftAR * rightAR) / sum;
  const leftFactor = isH ? leftAR / sum : rightAR / sum;
  const rightFactor = isH ? rightAR / sum : leftAR / sum;
  return {
    ar,
    leaves: [
      ...left.leaves.map(leaf => ({ value: leaf.value, share: leaf.share * leftFactor })),
      ...right.leaves.map(leaf => ({ value: leaf.value, share: leaf.share * rightFactor })),
    ],
  };
}

/**
 * How unevenly a candidate sizes its images relative to prominence:
 * max(area/value) / min(area/value) across leaves. 1.0 = perfectly proportional;
 * larger is worse. Uses prominence P so high-rated verticals are not penalized.
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
 * Every direction-assigned AtomicComponent for a subtree: one candidate per leaf, an
 * hPair and a vStack at each internal node, multiplied across nesting. Cost is 2^N in
 * the number of internal nodes, bounded by row size.
 */
function enumerateAssignments(node: AbstractNode): Candidate[] {
  if (node.kind === 'leaf') {
    return [{ component: single(node.img), ar: node.img.numericAR }];
  }
  const leftOptions = enumerateAssignments(node.left);
  const rightOptions = enumerateAssignments(node.right);
  const out: Candidate[] = [];
  for (const leftOption of leftOptions) {
    for (const rightOption of rightOptions) {
      out.push(
        {
          component: hPair(leftOption.component, rightOption.component),
          ar: leftOption.ar + rightOption.ar,
        },
        {
          component: vStack(leftOption.component, rightOption.component),
          ar: (leftOption.ar * rightOption.ar) / (leftOption.ar + rightOption.ar),
        }
      );
    }
  }
  return out;
}

/**
 * AR-closest direction assignment for a single point-balance tree — the cheap Stage-1
 * estimator behind estimateRowAR. The root is forced hPair (rows are horizontal);
 * among the children's assignments the lowest rowAR_Cost wins. No equity search here;
 * that runs only at final composition.
 */
function pickRootAssignment(tree: AbstractNode, targetAR: number): AtomicComponent {
  if (tree.kind === 'leaf') return single(tree.img);

  const leftOptions = enumerateAssignments(tree.left);
  const rightOptions = enumerateAssignments(tree.right);

  let best: AtomicComponent | null = null;
  let bestArCost = Infinity;
  for (const leftOption of leftOptions) {
    for (const rightOption of rightOptions) {
      const arCost = rowAR_Cost(leftOption.ar + rightOption.ar, targetAR);
      if (arCost < bestArCost) {
        bestArCost = arCost;
        best = hPair(leftOption.component, rightOption.component);
      }
    }
  }
  return best!;
}

/**
 * Equity-primary composition across every candidate shape and every root-hPair
 * direction assignment. Rejects rows below the AR floor (1.0) or above the ceiling
 * (CEILING_MULT × target); among survivors, minimizes
 * equitySpread + LAMBDA · arPenalty(rowAR, target), tiebroken by closeness to target.
 * Falls back to the AR-closest candidate (then a flat hChain) only if nothing lands in
 * band. `counters`, when passed, records shapes/candidates for the perf-guard test.
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

  let best: AtomicComponent | null = null;
  let bestScore = Infinity;
  let bestArDist = Infinity;
  let arClosest: AtomicComponent | null = null;
  let arClosestCost = Infinity;

  const consider = (component: AtomicComponent, rowAR: number): void => {
    if (counters) counters.candidates += 1;
    const cost = rowAR_Cost(rowAR, target);
    if (cost < arClosestCost) {
      arClosestCost = cost;
      arClosest = component;
    }
    if (rowAR < ROW_AR_FLOOR || rowAR > ceiling) return;
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
    for (const leftOption of leftOptions) {
      for (const rightOption of rightOptions) {
        consider(
          hPair(leftOption.component, rightOption.component),
          leftOption.ar + rightOption.ar
        );
      }
    }
  }

  return best ?? arClosest ?? hChain(items);
}

// =============================================================================
// Public entry point
// =============================================================================

/**
 * Build a row's atomic component tree, leaves in input order. Runs the multi-structure
 * equity-primary search; targetAR below ROW_AR_FLOOR (1.0) is lifted to it. The cheap
 * single-structure path backs estimateRowAR in the Stage-1 fill loop.
 */
export function buildAtomic(items: ImageType[], targetAR: number): AtomicComponent {
  if (items.length === 0) throw new Error('buildAtomic requires at least 1 image');
  if (items.length === 1) return single(items[0]!);

  return pickBestComposition(items, targetAR);
}

/**
 * Compose a row and report how many candidate shapes / direction assignments were
 * evaluated. Backs the perf-guard test (the search stays bounded). Not used in
 * production.
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
