/**
 * Row Combination V2 — bottom-up adjacent merge composition
 *
 * Replaces the top-down `compose`/`buildAtomic` pipeline with a Huffman-style
 * iterative merger. At each step, the two adjacent atoms with the lowest
 * combined cost merge. A small ±1 swap budget per leaf lets the algorithm
 * fix obviously-bad neighbours without scrambling input order.
 *
 * See `docs/superpowers/specs/2026-05-26-row-composition-redesign.md` for the
 * full design (§3 algorithm, §4 scoring, §5 tiebreakers, §6 walked example).
 *
 * This module deliberately re-exports nothing; it is consumed by the V2
 * dispatcher in `rowCombination.ts` via the `useV2` flag. Tree-construction
 * primitives (`single`, `hPair`, `vStack`, `acToBoxTree`, `ImageType`,
 * `AtomicComponent`) are imported from `rowCombination.ts` rather than
 * duplicated.
 */

import { AR_WEIGHT, ORIENTATION_PENALTY, SWAP_PENALTY } from '@/app/constants';
import {
  acToBoxTree,
  type AtomicComponent,
  hPair,
  type ImageType,
  type OrientationShort,
  single,
  vStack,
} from '@/app/utils/rowCombination';
import { calculateBoxTreeAspectRatio } from '@/app/utils/rowStructureAlgorithm';

/** Orientation token used during merging — 'M' means "mixed cluster" (never penalised). */
type AtomOrient = OrientationShort | 'M';

/** Scratch entry on the merge worklist. Lives only inside composeV2. */
interface MergeAtom {
  ac: AtomicComponent;
  cv: number;
  orient: AtomOrient;
  ar: number;
  /** Original leaf indices (positions in the input array) that contributed to this atom. */
  ids: number[];
  /** Max vertical tiers in this subtree. Leaf=1; hPair=max(children); vStack=sum(children). */
  vTier: number;
  /** Max effective rating among leaves — drives the no-vStack-of-prominents rule. */
  maxEffRating: number;
}

/** A swap option considered when scoring a merge at index `i`. */
type SwapOption = 'none' | 'swap-with-prev' | 'swap-with-next';

/** A scored merge candidate evaluated during one pass of the loop. */
interface MergeCandidate {
  /** Loop iteration index (pre-swap position of the merge pair). */
  i: number;
  swap: SwapOption;
  direction: OrientationShort;
  score: number;
  merged: MergeAtom;
  /** Leaf ids whose swap budget was consumed by this candidate. */
  movedIds: number[];
}

/** Build an h-chain of arbitrary AtomicComponents (left-heavy). Used for AR simulation. */
function hChainOfAcs(acs: AtomicComponent[]): AtomicComponent {
  if (acs.length === 0) {
    throw new Error('hChainOfAcs requires at least 1 atomic component');
  }
  if (acs.length === 1) {
    return acs[0]!;
  }
  let tree: AtomicComponent = hPair(acs[0]!, acs[1]!);
  for (let i = 2; i < acs.length; i++) {
    tree = hPair(tree, acs[i]!);
  }
  return tree;
}

/** Combine two atoms in the chosen direction and return the merged AtomicComponent. */
function combine(left: MergeAtom, right: MergeAtom, direction: OrientationShort): AtomicComponent {
  return direction === 'H' ? hPair(left.ac, right.ac) : vStack(left.ac, right.ac);
}

/**
 * Build a fresh MergeAtom from a leaf ImageType.
 * The leaf's input-array index is the canonical identifier for swap-budget bookkeeping.
 */
function leafAtom(img: ImageType, leafIndex: number): MergeAtom {
  return {
    ac: single(img),
    cv: img.componentValue,
    orient: img.ar,
    ar: img.numericAR,
    ids: [leafIndex],
    vTier: 1,
    maxEffRating: img.effectiveRating,
  };
}

/**
 * Construct the merged atom for a chosen (left, right, direction) without yet
 * touching the atoms array.
 *
 * Orientation propagation: when both children share the same non-mixed
 * orientation, the merged cluster carries that orientation. Otherwise it is
 * 'M' (mixed). This is what makes the vStack same-orient penalty in
 * `scoreMerge` apply to cluster pairs and not just leaf pairs — without
 * it, an all-H row of 3+ items collapses into `vStack(hPair(H,H), single(H))`
 * because the orientation cost was bypassed once the first merge produced
 * an 'M' cluster (regression diagnosed 2026-05-27 from /2020-protests A/B).
 */
function buildMerged(
  left: MergeAtom,
  right: MergeAtom,
  direction: OrientationShort,
  rowWidth: number
): MergeAtom {
  const ac = combine(left, right, direction);
  const ar = calculateBoxTreeAspectRatio(acToBoxTree(ac), rowWidth);
  const orient: AtomOrient =
    left.orient === right.orient && left.orient !== 'M' ? left.orient : 'M';
  const vTier = direction === 'V' ? left.vTier + right.vTier : Math.max(left.vTier, right.vTier);
  return {
    ac,
    cv: left.cv + right.cv,
    orient,
    ar,
    ids: [...left.ids, ...right.ids],
    vTier,
    maxEffRating: Math.max(left.maxEffRating, right.maxEffRating),
  };
}

/**
 * Score the merge of two atoms in the given direction, given the surrounding row.
 * Lower is better.
 */
function scoreMerge(
  left: MergeAtom,
  right: MergeAtom,
  direction: OrientationShort,
  merged: MergeAtom,
  surrounding: { leftAtoms: MergeAtom[]; rightAtoms: MergeAtom[] },
  targetAR: number,
  rowWidth: number,
  swapUsed: boolean
): number {
  const sumCvCost = left.cv + right.cv;

  // Asymmetric orientation cost: penalize V+V vStacks only (excessively-tall
  // columns). H+H vStacks are NOT penalized — they're the structural backbone
  // of dom-stacked emergence: V1 produces `h(v(low_H, low_H), dominant_H)` by
  // picking vStack for the inner H+H pair on AR-fit, then hPair-ing with the
  // dominant. Penalizing H+H equally killed that variety, giving uniform
  // hChain on all-H rows (regression vs V1 on /2020-protests, 2026-05-27).
  // Spec §6's walked example still works because the V+V penalty is what
  // makes (4v, 3v) lose to (1h, 4v) despite lower sum-cv.
  let orientationCost = 0;
  if (direction === 'V' && left.orient === 'V' && right.orient === 'V') {
    orientationCost = ORIENTATION_PENALTY;
  }

  const swapCost = swapUsed ? SWAP_PENALTY : 0;

  // Simulate the row's AR if this merge were applied. Rows are horizontal,
  // so the simulated row is an h-chain of the surrounding atoms + the merged
  // atom inserted in place of the original pair.
  const simulatedAcs: AtomicComponent[] = [
    ...surrounding.leftAtoms.map(a => a.ac),
    merged.ac,
    ...surrounding.rightAtoms.map(a => a.ac),
  ];
  const simulatedAR =
    simulatedAcs.length === 1
      ? merged.ar
      : calculateBoxTreeAspectRatio(acToBoxTree(hChainOfAcs(simulatedAcs)), rowWidth);

  const arCost = AR_WEIGHT * Math.abs(simulatedAR - targetAR);

  return sumCvCost + orientationCost + swapCost + arCost;
}

/**
 * Resolve a tie between two equal-score candidates per spec §5.
 * Returns `true` iff `next` should replace `current`.
 */
function tiebreakerPrefers(current: MergeCandidate, next: MergeCandidate): boolean {
  // 1. Leftmost merge wins.
  if (next.i !== current.i) return next.i < current.i;
  // 2. hPair wins over vStack.
  if (next.direction !== current.direction) return next.direction === 'H';
  // 3. No-swap wins over swap.
  const nextHasSwap = next.swap !== 'none';
  const currentHasSwap = current.swap !== 'none';
  if (nextHasSwap !== currentHasSwap) return !nextHasSwap;
  return false;
}

/**
 * Check whether every id in `ids` has at least 1 remaining swap budget.
 */
function hasBudget(ids: number[], swapBudget: Map<number, number>): boolean {
  for (const id of ids) {
    if ((swapBudget.get(id) ?? 0) < 1) return false;
  }
  return true;
}

/** Tiny floating-point tolerance for tie detection. */
const SCORE_EPSILON = 1e-9;

/**
 * Bottom-up adjacent merge composition.
 *
 * @param items - ImageType[] assigned to this row, in input order
 * @param targetAR - Target aspect ratio for the row (typically ~1.5 desktop)
 * @param rowWidth - Slot width budget for the row (used for AR calculation)
 * @returns AtomicComponent tree describing how the row should be rendered
 */
export function composeV2(items: ImageType[], targetAR: number, rowWidth: number): AtomicComponent {
  if (items.length === 0) {
    throw new Error('composeV2 requires at least 1 image');
  }

  // Seed atoms in input order. Each leaf's input-array index is its canonical id.
  const atoms: MergeAtom[] = items.map((img, idx) => leafAtom(img, idx));

  // Trivial case — single leaf, no merging.
  if (atoms.length === 1) {
    return atoms[0]!.ac;
  }

  // One swap budget per leaf, keyed by input-array index.
  const swapBudget = new Map<number, number>();
  for (let idx = 0; idx < items.length; idx++) {
    swapBudget.set(idx, 1);
  }

  while (atoms.length > 1) {
    let best: MergeCandidate | null = null;

    for (let i = 0; i < atoms.length - 1; i++) {
      const swapOptions: SwapOption[] = ['none'];
      if (i >= 1) swapOptions.push('swap-with-prev');
      if (i + 2 < atoms.length) swapOptions.push('swap-with-next');

      for (const swap of swapOptions) {
        let leftAtom: MergeAtom;
        let rightAtom: MergeAtom;
        let movedIds: number[] = [];

        if (swap === 'none') {
          leftAtom = atoms[i]!;
          rightAtom = atoms[i + 1]!;
        } else if (swap === 'swap-with-prev') {
          // swap atoms[i-1] with atoms[i], then pair (new atoms[i], atoms[i+1])
          const prev = atoms[i - 1]!;
          const here = atoms[i]!;
          // P6: ±1 leaf displacement. A cluster swap moves the other side's
          // leaves by `len(cluster)` positions in one operation — singleton-
          // only keeps every leaf's net displacement at ±1.
          if (prev.ids.length !== 1 || here.ids.length !== 1) continue;
          movedIds = [...prev.ids, ...here.ids];
          if (!hasBudget(movedIds, swapBudget)) continue;
          leftAtom = prev;
          rightAtom = atoms[i + 1]!;
        } else {
          // 'swap-with-next': swap atoms[i+1] with atoms[i+2], then pair (atoms[i], atoms[i+2])
          const here = atoms[i + 1]!;
          const next = atoms[i + 2]!;
          if (here.ids.length !== 1 || next.ids.length !== 1) continue;
          movedIds = [...here.ids, ...next.ids];
          if (!hasBudget(movedIds, swapBudget)) continue;
          leftAtom = atoms[i]!;
          rightAtom = next;
        }

        // The atoms surrounding the merged pair when simulating the row's AR.
        // For 'none': left = atoms[0..i-1], right = atoms[i+2..end]
        // For 'swap-with-prev': left = atoms[0..i-2] + [atoms[i] (the displaced one)],
        //                       right = atoms[i+2..end]
        // For 'swap-with-next': left = atoms[0..i-1],
        //                       right = [atoms[i+1] (the displaced one)] + atoms[i+3..end]
        let leftSurrounding: MergeAtom[];
        let rightSurrounding: MergeAtom[];

        if (swap === 'none') {
          leftSurrounding = atoms.slice(0, i);
          rightSurrounding = atoms.slice(i + 2);
        } else if (swap === 'swap-with-prev') {
          leftSurrounding = [...atoms.slice(0, i - 1), atoms[i]!];
          rightSurrounding = atoms.slice(i + 2);
        } else {
          leftSurrounding = atoms.slice(0, i);
          rightSurrounding = [atoms[i + 1]!, ...atoms.slice(i + 3)];
        }

        for (const direction of ['H', 'V'] as const) {
          // Top-level rule: rows are horizontal — force hPair at the root.
          if (direction === 'V' && atoms.length === 2) {
            continue;
          }
          // Cap vertical depth at 2 tiers so high-density rows form balanced
          // 2×N grids instead of 3+ tier vertical strips.
          if (direction === 'V' && leftAtom.vTier + rightAtom.vTier > 2) {
            continue;
          }
          // Prominence rule: never vStack a subtree containing a 4★+ leaf.
          // Stacking shrinks images to narrow-column width; dominant items
          // deserve to stand alone (or hPair with peers), not cluster.
          if (direction === 'V' && (leftAtom.maxEffRating >= 4 || rightAtom.maxEffRating >= 4)) {
            continue;
          }
          const merged = buildMerged(leftAtom, rightAtom, direction, rowWidth);
          const score = scoreMerge(
            leftAtom,
            rightAtom,
            direction,
            merged,
            { leftAtoms: leftSurrounding, rightAtoms: rightSurrounding },
            targetAR,
            rowWidth,
            swap !== 'none'
          );

          const candidate: MergeCandidate = {
            i,
            swap,
            direction,
            score,
            merged,
            movedIds,
          };

          if (best === null) {
            best = candidate;
            continue;
          }

          const diff = candidate.score - best.score;
          if (diff < -SCORE_EPSILON) {
            best = candidate;
          } else if (Math.abs(diff) <= SCORE_EPSILON && tiebreakerPrefers(best, candidate)) {
            best = candidate;
          }
        }
      }
    }

    // The loop guarantees at least one candidate when atoms.length > 1
    // (the 'none' option always exists at i=0).
    if (best === null) {
      throw new Error('composeV2: no merge candidate produced (unreachable)');
    }

    // Apply swap budgets first.
    for (const id of best.movedIds) {
      swapBudget.set(id, (swapBudget.get(id) ?? 0) - 1);
    }

    // Mutate the atoms array to reflect the swap.
    if (best.swap === 'swap-with-prev') {
      const tmp = atoms[best.i - 1]!;
      atoms[best.i - 1] = atoms[best.i]!;
      atoms[best.i] = tmp;
    } else if (best.swap === 'swap-with-next') {
      const tmp = atoms[best.i + 1]!;
      atoms[best.i + 1] = atoms[best.i + 2]!;
      atoms[best.i + 2] = tmp;
    }

    // Replace the pair at [i, i+1] (post-swap positions) with the merged atom.
    atoms.splice(best.i, 2, best.merged);
  }

  return atoms[0]!.ac;
}
