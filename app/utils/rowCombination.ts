/**
 * Row Combination - Template Map Row Building
 *
 * Uses a (hCount, vCount) template map to determine layout structure for each row.
 * Greedy sequential fill determines which items go in each row; the template map
 * determines how those items are arranged (flat chain, DVP, nested quad, etc.).
 *
 * Key concepts:
 * - A "component" is anything that occupies row space: a single image, gif, text, or combined block.
 * - Component value = proportion of row width an item occupies (effectiveRating / rowWidth).
 * - A row is "complete" when total component values >= 0.9 (90% threshold).
 * - Templates are keyed by orientation counts and produce AtomicComponent trees.
 */

import type { AnyContentModel } from '@/app/types/Content';
import { getEffectiveRating, getItemComponentValue } from '@/app/utils/contentRatingUtils';
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
// TEMPLATE KEY — structural identity for row compositions
// =============================================================================

/** Structural key for template map lookup: counts of H and V images in a row */
export interface TemplateKey {
  h: number;
  v: number;
}

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
  direction: 'horizontal' | 'vertical' | null;
  templateKey: TemplateKey;
  label: string;
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
  const title = 'title' in item ? String(item.title) : `item-${item.id}`;

  return { source: item, title, ar, numericAR, effectiveRating, componentValue };
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

/**
 * Maximum images per row. Caps greedy fill AND bounds compose's Phase 2
 * enumeration (~2^(n-1) candidates for an n-leaf row), so keep this modest.
 */
export const MAX_ROW_IMAGES = 12;

/**
 * Estimate the combined aspect ratio of a set of images when composed together.
 * Uses the canonical composer (compose) to build the tree, then calculates AR
 * from the BoxTree. Routing through the composer keeps the Stage-1 AR estimate
 * consistent with the composition that actually renders (lookupComposition also
 * uses compose).
 */
export function estimateRowAR(images: ImageType[], targetAR: number, rowWidth: number): number {
  const composition = compose(images, targetAR, rowWidth);
  return calculateBoxTreeAspectRatio(acToBoxTree(composition), rowWidth);
}

// =============================================================================
// COMPOSITION LOOKUP
// =============================================================================

/** Result of a template map lookup */
export interface CompositionResult {
  composition: AtomicComponent;
  templateKey: TemplateKey;
  label: string;
}

/**
 * Look up and build a composition for a set of images using the template map.
 *
 * @param images - ImageType[] assigned to this row (already determined by greedy fill)
 * @param targetAR - Target aspect ratio for AR-aware templates (default 1.5)
 * @param rowWidth - Row width budget for AR calculation
 * @returns CompositionResult with AtomicComponent tree, structural key, and template label
 */
export function lookupComposition(
  images: ImageType[],
  targetAR: number = 1.5,
  rowWidth: number = 5
): CompositionResult {
  return {
    composition: compose(images, targetAR, rowWidth),
    templateKey: parseTemplateKey(images),
    label: 'standard',
  };
}

/** Build a TemplateKey from a set of images by counting h/v directly */
function parseTemplateKey(images: ImageType[]): TemplateKey {
  let h = 0;
  let v = 0;
  for (const img of images) {
    if (img.ar === 'H') h++;
    else v++;
  }
  return { h, v };
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

/** Derive direction from AtomicComponent root for RowResult */
export function deriveDirection(ac: AtomicComponent): 'horizontal' | 'vertical' | null {
  if (ac.type === 'single') return null;
  return ac.direction === 'H' ? 'horizontal' : 'vertical';
}

/**
 * Row-first layout algorithm.
 *
 * Builds rows one at a time using a working window (lookahead of 5 items).
 * For each row:
 * 1. Check for STANDALONE skip (hero image past low-rated items)
 * 2. Greedy sequential fill until row is complete or overshoots
 * 3. Best-fit fallback when sequential fill fails
 * 4. Template map lookup for layout structure
 *
 * Standalone promotion: if the next item would overfill AND it fills a row on its
 * own (cv >= rowWidth * MIN_FILL_RATIO), skip it so it gets its own row on a
 * subsequent iteration. This replaces the old reorderLonelyVerticals pre-pass.
 *
 * On mobile (rowWidth <= 2), the AR-floor check is disabled entirely. Mobile renders
 * items full-width or stacked, so single vertical images naturally have low AR.
 * Without this, the AR override pulls 3-4+ items into a single row, creating
 * excessively cramped images.
 *
 * @param items - All content items to layout
 * @param rowWidth - Row width budget (5 for desktop, 4 for tablet, etc.)
 * @param targetAR - Target aspect ratio for AR-aware fill (default 1.5)
 * @returns Array of rows, each with components and their combination direction
 */
export function buildRows(
  items: AnyContentModel[],
  rowWidth: number,
  targetAR: number = 1.5
): RowResult[] {
  const rows: RowResult[] = [];
  const remaining = [...items];

  // Constant fill bar. Row Density now drives packing through rowWidth itself
  // (chunkSize ×2.5), so density ≈ items/row directly. The old rowWidth-scaled
  // bar over-inflated past MAX_FILL_RATIO at large rowWidths (≈1.24 at rowWidth
  // 25), forcing every dense row through the overfill path into the cap.
  const effectiveMinFill = MIN_FILL_RATIO;

  while (remaining.length > 0) {
    const window = remaining.slice(0, 5);

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

        const heroKey = parseTemplateKey([heroImg]);
        rows.push({
          components: [heroItem],
          direction: null,
          templateKey: heroKey,
          label: 'hero',
          boxTree,
        });

        remaining.splice(heroIdx, 1);
        continue;
      }
    }

    const arFloor = rowWidth <= 2 ? 0 : targetAR * AR_FLOOR_MULTIPLIER;
    const expandedWindow = remaining.slice(0, MAX_ROW_IMAGES);
    let seqTotal = 0;
    let seqCount = 0;
    const skippedStandalones: number[] = [];
    let slotCountComplete = false;

    for (let i = 0; i < expandedWindow.length; i++) {
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
        const expandedAR = estimateRowAR(expandedImgs, targetAR, rowWidth);
        if (expandedAR >= arFloor) break;
        continue;
      }

      seqTotal += cv;
      seqCount += 1;

      if (newFill >= effectiveMinFill) {
        const rowItems = collectRowItems(expandedWindow, seqCount, skippedStandalones);
        const rowImgs = rowItems.map(item => toImageType(item, rowWidth));
        const rowAR = estimateRowAR(rowImgs, targetAR, rowWidth);

        if (rowAR >= arFloor) {
          break;
        }
        slotCountComplete = true;
      }
    }

    if (seqCount > 0) {
      const rowItems = collectRowItems(expandedWindow, seqCount, skippedStandalones);
      const rowImgs = rowItems.map(item => toImageType(item, rowWidth));
      const { composition, templateKey, label } = lookupComposition(rowImgs, targetAR, rowWidth);
      const boxTree = acToBoxTree(composition);

      rows.push({
        components: rowItems,
        direction: deriveDirection(composition),
        templateKey,
        label,
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
    const {
      composition,
      templateKey: bfKey,
      label: bfLabel,
    } = lookupComposition(bfImgs, targetAR, rowWidth);
    const boxTree = acToBoxTree(composition);

    rows.push({
      components: bfComponents,
      direction: deriveDirection(composition),
      templateKey: bfKey,
      label: bfLabel,
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

/**
 * Row composition — two-phase composition with point-balance splitting.
 *
 * The canonical row composer. Builds each row's AtomicComponent tree in two
 * passes:
 *
 *   Phase 1: split the row hierarchically at the adjacent boundary where the
 *            left and right halves have the closest effectiveRating sums.
 *            This treats prominence (rating) as the splitting signal so that
 *            same-rated content yields balanced trees while genuinely
 *            higher-rated outliers naturally end up on their own side.
 *            Order preserved — no swaps, only adjacent splits.
 *
 *   Phase 2: enumerate every direction assignment for the tree. For each
 *            internal node, both hPair and vStack are tried. The root is
 *            forced to hPair (rows are horizontal by definition). Scoring has a
 *            hard floor at AR 1.0 (a row must never be taller than it is wide).
 *            Among candidates within a small AR band of the best, the most
 *            EQUITABLE one wins — the tree whose leaf areas best track each
 *            image's cv, so equal-rated images render at similar size rather
 *            than one ballooning while its siblings are crushed.
 *
 * Why point-balance over sum-cv merge or AR-gap split: sum-cv merge produces
 * dominant emergence — heaviest item ends up alone at root, same visual as
 * an explicit `findDominant`. AR-gap split makes structural choices off a
 * numerical signal (orientation boundary) that isn't always meaningful — for
 * rows with multiple AR boundaries, an arbitrary tie-break decides which side
 * gets the lone item. Point-balance ties the split criterion to the user's
 * perceived prominence: items group together when their combined weight matches
 * the other side's combined weight. Same-rated rows yield balanced trees.
 *
 * Why a hard floor at 1.0: a row must never be taller than it is wide. The
 * trade-off is explicit and intended — on a 2H+2V row the near-square nested-
 * quad at AR ~0.9 is rejected in favour of a wider (>= 1.0) arrangement, even
 * though 0.9 is closer to square. "Never taller than wide" takes priority over
 * "closest to square" when the two conflict (user decision, 2026-05-28).
 *
 * Why enumeration in Phase 2: the row's aspect-ratio constraint is global
 * ("the visible row should never be taller than wide"). Local greedy
 * direction picks don't see the cumulative effect — children that look good
 * in isolation can compose into a too-wide or too-tall row. With small trees
 * (≤8 leaves → ≤7 internal nodes → ≤128 candidates), exhaustive enumeration
 * finds the genuine optimum cheaply.
 *
 * Why this needs no skip-rule stack:
 *   - Top-level no-vStack is a hard constraint (forced hPair at root in Phase 2).
 *   - vTier caps are not needed; deep vStacks ARE produced when they make the
 *     row closer to square at high density, and naturally avoided when they
 *     would make a row taller than wide (rejected by floor).
 *   - 4★+ "prominence blocks vStack" is not needed; if a 4★ leaf in a deep
 *     vStack would tank the row AR, the floor rejects that candidate.
 *   - Same-orientation vStack avoidance (V+V) is not needed; vStacks of
 *     narrow-AR items push the row AR below 1.0 and get rejected.
 *
 * Selection is two-tiered, not a skip-rule stack: (1) the AR floor at 1.0
 * ("never taller than wide") plus closeness to the target row AR pick the
 * acceptable band; (2) within that band, the lowest area-vs-cv spread wins, so
 * sizing tracks cv (the intended signal) instead of being an artifact of which
 * subtree a leaf landed in.
 *
 * Note: the splitting principle is tree-depth balance — equitable leaf depths
 * so same-rated items render at similar size — rather than pairing the lowest
 * sum-cv adjacent atoms first (which produces dominant emergence, the same
 * visual pattern as an explicit `findDominant` and incorrect for rows of
 * uniformly-rated content). cv-driven sizing is handled downstream by buildRows
 * and the pixel calculator.
 */

// =============================================================================
// Phase 1 — point-balance hierarchical split
// =============================================================================

type AbstractNode =
  | { kind: 'leaf'; img: ImageType }
  | { kind: 'merge'; left: AbstractNode; right: AbstractNode };

/**
 * Build the unlabeled binary tree by recursively splitting the row at the
 * adjacent boundary where the left and right halves have the closest
 * effectiveRating sums.
 *
 * - **Primary criterion**: minimise `|leftSum − half| + |rightSum − half|`,
 *   where `half = total effectiveRating / 2`. Equivalent to finding the
 *   adjacent split closest to dividing the row's "points" in half.
 * - **Tiebreaker**: for ties in score (notably uniform-rating rows where
 *   any structurally-balanced split scores the same), pick the gap closest
 *   to the row's middle gap index. This produces structurally-balanced
 *   trees — all leaves at the same or adjacent depth, so they render at
 *   similar visual size given the same direction choices in Phase 2.
 *
 * Order is preserved: leaves stay in input order; no swaps, only splits.
 *
 * Why effectiveRating: it encodes the user's perceived prominence (rating
 * with the orientation-derived vertical penalty already applied for sizing
 * purposes), so equally-weighted halves correspond to visually-equitable
 * halves. Using cv directly would double-penalise verticals because cv
 * applies the AR factor on top of the rating; point-balance is about
 * perceived prominence, not pixel area.
 */
function splitByPointBalance(items: ImageType[]): AbstractNode {
  if (items.length === 0) throw new Error('compose requires at least 1 image');
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
 * Relative area each leaf occupies (and its cv) for a fully direction-assigned
 * subtree. Area splits geometrically at each node: an hPair divides area in
 * proportion to child AR (siblings share height, so width — hence area — ∝ AR);
 * a vStack divides ∝ 1/AR (siblings share width, so height ∝ 1/AR). Returned
 * leaf shares sum to 1 within the subtree.
 */
function leafShares(ac: AtomicComponent): {
  ar: number;
  leaves: Array<{ cv: number; share: number }>;
} {
  if (ac.type === 'single') {
    return { ar: ac.img.numericAR, leaves: [{ cv: ac.img.componentValue, share: 1 }] };
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
      ...left.leaves.map(l => ({ cv: l.cv, share: l.share * leftFactor })),
      ...right.leaves.map(l => ({ cv: l.cv, share: l.share * rightFactor })),
    ],
  };
}

/**
 * How unevenly a candidate sizes its images relative to their cv. Returns
 * max(area/cv) / min(area/cv) across leaves: 1.0 means every image's area is
 * exactly proportional to its cv (equal-rated → equal-size); larger means some
 * image is over- or under-sized for its rating. Lower is more equitable.
 */
function equitySpread(ac: AtomicComponent): number {
  const { leaves } = leafShares(ac);
  let min = Infinity;
  let max = 0;
  for (const { cv, share } of leaves) {
    if (cv <= 0) continue;
    const ratio = share / cv;
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
  // Leaf-only trees should never reach Phase 2 (handled by compose entry).
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
 * Compose a row of images via the two-phase algorithm.
 *
 * @param items - Images in input order; never reordered.
 * @param targetAR - Desired row aspect ratio (e.g., 1.0 for square). Lifted to
 *                   ROW_AR_FLOOR (1.0) internally if lower; rows are never
 *                   taller than wide regardless of the caller's request.
 * @param rowWidth - Unused (AR is intrinsic to the tree); kept for call-site
 *                   symmetry with the other row helpers.
 * @returns AtomicComponent tree for this row, with hPair/vStack assigned at
 *          each internal node and leaves in input order.
 */
export function compose(items: ImageType[], targetAR: number, rowWidth: number): AtomicComponent {
  if (items.length === 0) throw new Error('compose requires at least 1 image');
  if (items.length === 1) return single(items[0]!);

  // `rowWidth` is unused (AR is intrinsic to the tree); kept for call-site
  // symmetry with the other row helpers. Touch it so lint doesn't flag it.
  void rowWidth;
  const tree = splitByPointBalance(items);
  return pickRootAssignment(tree, targetAR);
}
