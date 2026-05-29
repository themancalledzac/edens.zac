/**
 * Row Combination V3 — two-phase composition with point-balance splitting.
 *
 * Replaces V2's scoring-with-skip-rules approach (and earlier sum-cv merge
 * and AR-gap split attempts that produced unbalanced trees) with two passes:
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
 * V1's `findDominant`. AR-gap split makes structural choices off a numerical
 * signal (orientation boundary) that isn't always meaningful — for rows with
 * multiple AR boundaries, an arbitrary tie-break decides which side gets the
 * lone item. Point-balance ties the split criterion to the user's perceived
 * prominence: items group together when their combined weight matches the
 * other side's combined weight. Same-rated rows yield balanced trees.
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
 * Why this collapses V2's skip-rule stack:
 *   - Top-level no-vStack is a hard constraint (forced hPair at root in Phase 2).
 *   - vTier > 2 caps are no longer needed; deep vStacks ARE produced when
 *     they make the row closer to square at high density, and naturally
 *     avoided when they would make a row taller than wide (rejected by floor).
 *   - 4★+ "prominence blocks vStack" is no longer needed; if a 4★ leaf in a
 *     deep vStack would tank the row AR, the floor rejects that candidate.
 *   - Same-orientation vStack avoidance (V+V) is no longer needed; vStacks
 *     of narrow-AR items push the row AR below 1.0 and get rejected.
 *
 * Selection is two-tiered, not a skip-rule stack: (1) the AR floor at 1.0
 * ("never taller than wide") plus closeness to the target row AR pick the
 * acceptable band; (2) within that band, the lowest area-vs-cv spread wins, so
 * sizing tracks cv (the intended signal) instead of being an artifact of which
 * subtree a leaf landed in.
 *
 * Note: this implementation deliberately departs from the locked spec's P3
 * ("pair the lowest sum-cv adjacent atoms first"). P3 produces dominant
 * emergence — the same visual pattern as V1's `findDominant` — which is
 * incorrect for rows of uniformly-rated content. The new principle is
 * tree-depth balance: equitable leaf depths so same-rated items render at
 * similar size, with cv-driven sizing handled downstream by buildRows and
 * the pixel calculator.
 */

import {
  type AtomicComponent,
  hPair,
  type ImageType,
  single,
  vStack,
} from '@/app/utils/rowCombination';

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
  if (items.length === 0) throw new Error('composeV3 requires at least 1 image');
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
  // Leaf-only trees should never reach Phase 2 (handled by composeV3 entry).
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
 * @param rowWidth - Unused by V3 (AR is intrinsic to the tree); kept for
 *                   call-site symmetry with composeV2.
 * @returns AtomicComponent tree for this row, with hPair/vStack assigned at
 *          each internal node and leaves in input order.
 */
export function composeV3(items: ImageType[], targetAR: number, rowWidth: number): AtomicComponent {
  if (items.length === 0) throw new Error('composeV3 requires at least 1 image');
  if (items.length === 1) return single(items[0]!);

  // `rowWidth` is unused by V3 (AR is intrinsic to the tree); kept for call-site
  // symmetry with composeV2. Touch it so lint doesn't flag it.
  void rowWidth;
  const tree = splitByPointBalance(items);
  return pickRootAssignment(tree, targetAR);
}
