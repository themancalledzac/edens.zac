/**
 * Row Structure Algorithm — BoxTree Size Calculator
 *
 * Calculates pixel dimensions from a BoxTree structure.
 * The BoxTree is a recursive binary tree where leaves are content items
 * and combined nodes specify horizontal or vertical arrangement.
 */

import { LAYOUT } from '@/app/constants';
import {
  type AffineHeight,
  combineDeclaredARHorizontal,
  combineDeclaredARVertical,
  combineHorizontal,
  combineMinWidthHorizontal,
  combineMinWidthVertical,
  combineVertical,
  flexibleLeaf,
  heightAt,
  pinnedLeaf,
  solveEqualHeightSplit,
} from '@/app/utils/affineHeight';
import type { CalculatedContentSize } from '@/app/utils/contentLayout';
import {
  getHeightClamp,
  getMaxWidth,
  getMinWidth,
  getPinnedHeight,
} from '@/app/utils/contentRatingUtils';
import { getContentDimensions } from '@/app/utils/contentTypeGuards';
import { type BoxTree } from '@/app/utils/rowCombination';

/**
 * Whether any leaf under this tree declares a shape bound (`maxWidth` or a height
 * clamp). The shaped-block path in {@link calculateSizesFromBoxTree} is gated on this,
 * mirroring the packer's `getMinWidth` precheck: a photo collection declares nothing,
 * the walk returns false, and every calculation below runs the exact pre-shape code.
 */
function treeHasShapeBounds(tree: BoxTree): boolean {
  if (tree.type === 'leaf') {
    return getMaxWidth(tree.content) !== undefined || getHeightClamp(tree.content) !== undefined;
  }
  return treeHasShapeBounds(tree.children[0]) || treeHasShapeBounds(tree.children[1]);
}

/**
 * The widest `minWidth` this subtree must honour: horizontal siblings each need their own,
 * stacked siblings share one column. Used only to keep the pinned-height width solve inside a
 * band where both sides survive — see {@link calculateSizesFromBoxTree}.
 */
function subtreeMinWidth(tree: BoxTree): number {
  if (tree.type === 'leaf') return getMinWidth(tree.content) ?? 0;
  const left = subtreeMinWidth(tree.children[0]);
  const right = subtreeMinWidth(tree.children[1]);
  return tree.direction === 'horizontal'
    ? combineMinWidthHorizontal(left, right)
    : combineMinWidthVertical(left, right);
}

/**
 * The widest this subtree may RENDER: side-by-side siblings can jointly use both caps plus
 * their gap; stacked siblings share one width, so the column is only as wide as its
 * most-constrained member allows. The dual of {@link subtreeMinWidth}, and the mechanism
 * behind the atomic-design default that vertically-joined blocks render at one shared width
 * (Zac's 0246 round-3 review: a collapsed bar must not span 848px above a 700px-capped
 * panel) — the whole column narrows to what every member can honour.
 *
 * "Plus their gap" is load-bearing and used to be missing here. `consumedWidth` in
 * `rowCombination.ts` — the composer's model of the same quantity — has always charged an hbox
 * `left + gap + right`, so omitting the gap made the two halves of the engine disagree by 12.8px
 * per horizontal node: the composer scored an arrangement as spanning the body, then the sizer
 * handed that subtree a gap less width than the composer had promised it and the row came up
 * short at the right edge. The models are the same statement and must return the same number.
 */
function subtreeMaxWidth(tree: BoxTree, gap: number): number {
  if (tree.type === 'leaf') return getMaxWidth(tree.content) ?? Infinity;
  const left = subtreeMaxWidth(tree.children[0], gap);
  const right = subtreeMaxWidth(tree.children[1], gap);
  if (tree.direction === 'horizontal') {
    return left === Infinity || right === Infinity ? Infinity : left + gap + right;
  }
  return Math.min(left, right);
}

/**
 * How far apart two hbox siblings' rendered heights may sit and still count as EQUAL, as a
 * fraction of the taller one.
 *
 * {@link solveHboxSplit} equalises them by construction, but computes each side through a
 * different chain of arithmetic, so the two never come out bit-identical: measured residuals are
 * one to two ULP (5.7e-14 and 1.1e-13 at heights near 350px). A GENUINE difference is a different
 * animal — the min-width band binding under a pin, which leaves the hub's 900px row with columns
 * of 1418.6 and 1413.6px. Nine orders of magnitude of empty space separate the two populations,
 * which is what lets one threshold tell them apart.
 *
 * The distinction is load-bearing because a tie must be broken by flexible height, not by
 * argument order (see {@link absorbableHeight}). Sweeping 13,968 pin-bearing trees while breaking
 * the tie on `>=`: 7,374 of them — 53%, i.e. a coin flip on the sign of a rounding error — took
 * the wrong side and left up to 39.8px of the gap unabsorbed.
 */
const HBOX_HEIGHT_TIE = 1e-9;

/** Whether any leaf under this tree declares a pinned (width-independent) height. */
function treeHasPin(tree: BoxTree): boolean {
  if (tree.type === 'leaf') return getPinnedHeight(tree.content) !== undefined;
  return treeHasPin(tree.children[0]) || treeHasPin(tree.children[1]);
}

/**
 * How much of an already-sized subtree's height a vbox's scale factor can actually move.
 *
 * The scale exists to make a stack swallow the CSS gap between its members, and it is chosen so
 * that `scale × basis = basis − gap`. That only absorbs a whole gap if the basis is the part of
 * the subtree that MOVES. Two things do not move: a pinned leaf, which {@link sizeSubtree}'s
 * `applyScale` re-asserts at its declared height, and the CSS gaps inside the subtree, which are
 * fixed pixels the sizer never touches. So the basis is the sum of the FLEXIBLE leaves' current
 * heights — for an hbox, the BINDING side's, which is not simply the taller one (see
 * {@link HBOX_HEIGHT_TIE}).
 *
 * Scaling against the whole visual height instead is what the admin hub's pockets were made of: a
 * pin two levels down inside a flexible stack left `gap × pinShare` of the gap unabsorbed (4–7px
 * per nesting level, worst measured 20.6px), so the column rendered taller than the `a·W + b`
 * model — and `computeHeightCoeffs` hands that same model to the composer, which then scored the
 * row as filling its box exactly.
 *
 * A subtree with NO pin short-circuits to its visual height, which is the pre-pin code verbatim:
 * no photograph declares a pin, so every photo collection sizes through the identical arithmetic
 * it always has — and the caller skips this walk entirely on the unshaped path, so a photo page
 * does not even pay for the question. That basis over-counts the gaps a nested stack already
 * absorbed, leaving a `gap²/height` residual per nesting level (< 0.2px at real column heights) —
 * small enough that closing it is not worth re-rendering every photo page.
 */
function absorbableHeight(
  tree: BoxTree,
  sizes: CalculatedContentSize[],
  visualHeight: number,
  gap: number
): number {
  if (!treeHasPin(tree)) return visualHeight;

  let cursor = 0;
  const walk = (node: BoxTree): { height: number; flexible: number } => {
    if (node.type === 'leaf') {
      const height = sizes[cursor++]?.height ?? 0;
      return { height, flexible: getPinnedHeight(node.content) === undefined ? height : 0 };
    }
    const left = walk(node.children[0]);
    const right = walk(node.children[1]);
    if (node.direction === 'vertical') {
      return { height: left.height + gap + right.height, flexible: left.flexible + right.flexible };
    }
    // A row of siblings renders as tall as its tallest member — but the two sides do NOT shrink
    // at the same rate under one scale factor, so "tallest now" does not identify which side
    // limits the shrink. When the solve has equalised them, which is the normal case, the side
    // with LESS flexible height is the tallest the moment any scale is applied, and it is what
    // the node can give up. Breaking that tie on `>=` instead read the basis off whichever child
    // came first, so the same tree absorbed a whole gap or a fraction of one depending only on
    // which side held the pin.
    const height = Math.max(left.height, right.height);
    const flexible =
      Math.abs(left.height - right.height) <= HBOX_HEIGHT_TIE * height
        ? Math.min(left.flexible, right.flexible)
        : (left.height > right.height ? left : right).flexible;
    return { height, flexible };
  };

  return walk(tree).flexible;
}

/**
 * A leaf's rendered height at a given rendered width: the AR-derived height clamped to
 * the leaf's declared bounds — `clamp(width / AR, minHeight, maxHeight)`, `minHeight`
 * winning a conflict. This is the ONLY place height leaves the pure-AR model: width
 * allocation, row membership, and prominence all still run on the declared dimensions,
 * so a clamp changes what a block renders at, never what its row-mates are given.
 *
 * That last sentence holds for a CAP. It does not hold for a PIN (`minHeight === maxHeight`),
 * which necessarily reaches width allocation: a pinned block's height is a constant, so the
 * equal-height solve has to be told `a = 0` or it hands the block the width some declared
 * aspect ratio wanted and then renders it a completely different height. See
 * {@link computeHeightCoeffs}.
 */
function clampedLeafHeight(tree: Extract<BoxTree, { type: 'leaf' }>, width: number): number {
  const { width: w, height: h } = getContentDimensions(tree.content);
  const ar = h === 0 ? 1 : w / h;
  const raw = width / ar;
  const clamp = getHeightClamp(tree.content);
  if (!clamp) return raw;
  const capped = clamp.maxHeight === undefined ? raw : Math.min(raw, clamp.maxHeight);
  return clamp.minHeight === undefined ? capped : Math.max(capped, clamp.minHeight);
}

/**
 * Visual height a subtree renders at a given width, clamp-aware. For trees with no
 * shape bounds this equals the coefficient prediction `a·W + b` exactly — an hbox's
 * children solve to equal heights so their max IS that height, and a vbox renders the
 * raw child sum (its gap cancels against the scale-down in the sizer) — which is why
 * the sizer only calls this on the shaped path.
 */
function predictRenderedHeight(tree: BoxTree, width: number, gap: number): number {
  if (tree.type === 'leaf') {
    const maxWidth = getMaxWidth(tree.content);
    const renderedWidth = maxWidth === undefined ? width : Math.min(width, maxWidth);
    return clampedLeafHeight(tree, renderedWidth);
  }

  if (tree.direction === 'horizontal') {
    const availableWidth = width - gap;
    const leftWidth = solveHboxSplit(tree, availableWidth, gap);
    return Math.max(
      predictRenderedHeight(tree.children[0], leftWidth, gap),
      predictRenderedHeight(tree.children[1], availableWidth - leftWidth, gap)
    );
  }

  return (
    predictRenderedHeight(tree.children[0], width, gap) +
    predictRenderedHeight(tree.children[1], width, gap)
  );
}

/**
 * Width given to an hbox's LEFT child so both children render the same height — the shared
 * {@link solveEqualHeightSplit}, fed this tree's models, declared ARs (which the all-pinned
 * branch splits proportionally — a bar declaring twice the AR of its sibling gets twice the
 * width) and min-width floors (the band that keeps a one-pinned solve from running off the
 * row and deleting a panel; a tall Users panel beside a short photo hits this exactly).
 *
 * MUST stay behaviour-identical to `splitLeftWidth` in `rowCombination.ts`, which scores
 * compositions through the same solve; both now delegate to the one implementation, and
 * `tests/utils/affineHeight.mirror.test.ts` pins the agreement of what each adapter feeds it.
 * Exported for that mirror test; production callers are all in this file.
 */
export function solveHboxSplit(
  tree: Extract<BoxTree, { type: 'combined' }>,
  availableWidth: number,
  gap: number
): number {
  return solveEqualHeightSplit({
    left: computeHeightCoeffs(tree.children[0], gap),
    right: computeHeightCoeffs(tree.children[1], gap),
    availableWidth,
    leftDeclaredAR: calculateBoxTreeAspectRatio(tree.children[0]),
    rightDeclaredAR: calculateBoxTreeAspectRatio(tree.children[1]),
    leftMinWidth: subtreeMinWidth(tree.children[0]),
    rightMinWidth: subtreeMinWidth(tree.children[1]),
  });
}

/**
 * Linear height coefficients for a BoxTree subtree: the shared {@link AffineHeight} model,
 * under the name this file has always exported it as. Rendered height at width W is
 * `H(W) = a·W + b`; for leaves, b = 0 (no internal gaps) unless pinned; for nested trees,
 * b captures the cumulative height contribution of internal CSS gaps.
 */
export type HeightCoeffs = AffineHeight;

/**
 * Compute height coefficients {a, b} for a BoxTree subtree where H(W) = a*W + b.
 *
 * These coefficients enable gap-aware width distribution: when distributing width between
 * horizontal siblings, using these coefficients (instead of raw ARs) ensures both sides
 * render at the same height, even with asymmetric nesting.
 *
 * The sizer's adapter onto the shared affine core (`affineHeight.ts`): this walk owns the
 * BoxTree traversal and the leaf accessors (`getPinnedHeight`, `getContentDimensions` — the
 * render-time dimension chain), the core owns every formula. `heightModel` in
 * `rowCombination.ts` is the composer's adapter onto the same core, so the two can no
 * longer drift rule by rule; what CAN still drift is what the adapters feed in, which the
 * mirror test pins.
 */
export function computeHeightCoeffs(tree: BoxTree, gap: number): HeightCoeffs {
  if (tree.type === 'leaf') {
    const pinned = getPinnedHeight(tree.content);
    if (pinned !== undefined) return pinnedLeaf(pinned);

    const { width, height } = getContentDimensions(tree.content);
    return flexibleLeaf(height === 0 ? 1 : width / height);
  }

  const left = computeHeightCoeffs(tree.children[0], gap);
  const right = computeHeightCoeffs(tree.children[1], gap);
  return tree.direction === 'horizontal'
    ? combineHorizontal(left, right, gap)
    : combineVertical(left, right, gap);
}

/**
 * Calculate the combined aspect ratio of a BoxTree.
 * - For leaf: return item's intrinsic aspect ratio (width / height)
 * - For horizontal: sum of aspect ratios (children side-by-side)
 * - For vertical: reciprocal of sum of reciprocals (children stacked)
 *
 * AR is intrinsic to the tree shape — it does not depend on the row's pixel
 * width — so no width/chunk argument is needed.
 *
 * Read that as a statement about this function only, not about layout as a whole. WHICH
 * tree the composer hands you can now depend on pixel width: an item declaring
 * `Content.minWidth` makes `buildRows`/`pickBestComposition` width-dependent for its row
 * (see the MIN-WIDTH CONSTRAINT section in rowCombination.ts). Once a tree exists, its AR
 * is still a pure function of its shape.
 *
 * @param tree - BoxTree to calculate aspect ratio for
 */
export function calculateBoxTreeAspectRatio(tree: BoxTree): number {
  if (tree.type === 'leaf') {
    const { width, height } = getContentDimensions(tree.content);
    return height === 0 ? 1 : width / height;
  }

  const leftAR = calculateBoxTreeAspectRatio(tree.children[0]);
  const rightAR = calculateBoxTreeAspectRatio(tree.children[1]);

  return tree.direction === 'horizontal'
    ? combineDeclaredARHorizontal(leftAR, rightAR)
    : combineDeclaredARVertical(leftAR, rightAR);
}

/**
 * Size one leaf at an already-decided rendered width. Whether `maxWidth` narrowed that
 * width is the caller's decision — see {@link calculateSizesFromBoxTree}.
 */
function sizeLeaf(tree: Extract<BoxTree, { type: 'leaf' }>, width: number): CalculatedContentSize {
  const height =
    getHeightClamp(tree.content) === undefined
      ? width / calculateBoxTreeAspectRatio(tree)
      : clampedLeafHeight(tree, width);
  return { content: tree.content, width, height };
}

/**
 * Calculate sizes for a whole ROW from its BoxTree.
 *
 * Generic recursive algorithm that follows the tree structure left-to-right,
 * top-to-bottom. For horizontal nodes, gap space is always 1 × gap (binary tree
 * has exactly 2 direct children). For vertical nodes, sizes are scaled so the
 * total height including the gap equals the raw combined height — widths are kept
 * at the allocated size to prevent width errors in parent horizontal combinations.
 *
 * A LONE block is the one place `maxWidth` does not bind, and the asymmetry is the point.
 * A cap is a statement about sharing: "leave the rest to my row-mates, I read badly wider
 * than this". With a row-mate the freed width goes somewhere; alone in a row it goes
 * nowhere, and the block renders short of the body with a dead strip beside it (Zac's
 * standing rule: the layout fits the width of the body, always). So a cap degrades when
 * the block is the whole row — the exact dual of the `minWidth` degradation `buildAtomic`
 * already performs for a lone item, and for the same reason: a bound that costs a
 * neighbour nothing is not worth honouring against the page.
 *
 * Only the ROOT is exempt. Every leaf inside a composed row has a sibling that can take
 * what its cap gives up, so {@link sizeSubtree} applies the cap normally.
 *
 * @param tree - BoxTree encoding how the row's items are combined
 * @param targetWidth - The row's available width
 * @param gap - Gap between adjacent items (default: LAYOUT.gridGap = 12.8px)
 * @returns Array of sizes in tree traversal order (left-to-right, top-to-bottom)
 */
export function calculateSizesFromBoxTree(
  tree: BoxTree,
  targetWidth: number,
  gap: number = LAYOUT.gridGap
): CalculatedContentSize[] {
  if (tree.type === 'leaf') return [sizeLeaf(tree, targetWidth)];
  return sizeSubtree(tree, targetWidth, gap);
}

/** {@link calculateSizesFromBoxTree}'s recursion, below the row root, where caps bind. */
function sizeSubtree(tree: BoxTree, targetWidth: number, gap: number): CalculatedContentSize[] {
  if (tree.type === 'leaf') {
    const maxWidth = getMaxWidth(tree.content);
    return [sizeLeaf(tree, maxWidth === undefined ? targetWidth : Math.min(targetWidth, maxWidth))];
  }

  if (tree.direction === 'horizontal') {
    const availableWidth = targetWidth - gap;
    const leftWidth = solveHboxSplit(tree, availableWidth, gap);
    const rightWidth = availableWidth - leftWidth;

    // Hand each side no more than it may render, so a cap deep in a column narrows the whole
    // column (uniform stacked widths) instead of one member clamping alone mid-stack.
    const leftSizes = sizeSubtree(
      tree.children[0],
      Math.min(leftWidth, subtreeMaxWidth(tree.children[0], gap)),
      gap
    );
    const rightSizes = sizeSubtree(
      tree.children[1],
      Math.min(rightWidth, subtreeMaxWidth(tree.children[1], gap)),
      gap
    );

    return [...leftSizes, ...rightSizes];
  } else {
    // Vertical: both children get the SAME width — stacked members share one column, and the
    // column is capped by its most-constrained member (min over caps, via subtreeMaxWidth), so
    // no member ever clamps alone mid-stack. Heights scaled to account for CSS gap.
    // Use coefficient-predicted visual heights (not sum of returned sizes) because
    // summing returned sizes overcounts hbox children (side-by-side, not stacked).
    const columnWidth = Math.min(targetWidth, subtreeMaxWidth(tree, gap));
    const leftCoeffs = computeHeightCoeffs(tree.children[0], gap);
    const rightCoeffs = computeHeightCoeffs(tree.children[1], gap);

    const leftSizes = sizeSubtree(tree.children[0], columnWidth, gap);
    const rightSizes = sizeSubtree(tree.children[1], columnWidth, gap);

    // Visual height each child would render at. Coefficients are exact for pure-AR
    // subtrees; a subtree carrying shape bounds needs the clamp-aware prediction, or a
    // capped child would be scaled as if it still rendered its full AR height.
    const shaped = treeHasShapeBounds(tree);
    const leftVisualH = shaped
      ? predictRenderedHeight(tree.children[0], columnWidth, gap)
      : heightAt(leftCoeffs, columnWidth);
    const rightVisualH = shaped
      ? predictRenderedHeight(tree.children[1], columnWidth, gap)
      : heightAt(rightCoeffs, columnWidth);
    // CSS adds a gap between the two children, so heights scale down to compensate. WHICH child
    // pays for it is the pinned-height question: a pinned block has one correct height and
    // shrinking it by a share of the gap is simply rendering it wrong. So the flexible member
    // absorbs the whole gap, and when both are pinned nobody does — the stack is genuinely
    // `sum + gap` tall, which `computeHeightCoeffs` declares so the parent solve agrees.
    //
    // The scale is sized against what can MOVE, not against the whole height — see
    // {@link absorbableHeight}. A remainder no larger than the gap absorbs nothing rather than
    // inverting the stack.
    const leftPinned = leftCoeffs.a === 0;
    const rightPinned = rightCoeffs.a === 0;
    const absorb = (basis: number) => (basis > gap ? (basis - gap) / basis : 1);
    const absorbable = (child: BoxTree, sizes: CalculatedContentSize[], visualH: number) =>
      shaped ? absorbableHeight(child, sizes, visualH, gap) : visualH;
    const leftAbsorbable = absorbable(tree.children[0], leftSizes, leftVisualH);
    const rightAbsorbable = absorbable(tree.children[1], rightSizes, rightVisualH);

    let leftScale = 1;
    let rightScale = 1;
    if (leftPinned && !rightPinned) {
      rightScale = absorb(rightAbsorbable);
    } else if (rightPinned && !leftPinned) {
      leftScale = absorb(leftAbsorbable);
    } else if (!leftPinned && !rightPinned) {
      leftScale = absorb(leftAbsorbable + rightAbsorbable);
      rightScale = leftScale;
    }

    // Re-assert the pin per leaf rather than trusting the arithmetic above. A pinned leaf can sit
    // arbitrarily deep inside a subtree that is itself flexible, and no scale factor chosen at
    // this level would know to skip it.
    const applyScale = (sizes: CalculatedContentSize[], scale: number): CalculatedContentSize[] =>
      sizes.map(size => {
        const pin = getPinnedHeight(size.content);
        return pin === undefined
          ? { ...size, height: size.height * scale }
          : { ...size, height: pin };
      });

    return [...applyScale(leftSizes, leftScale), ...applyScale(rightSizes, rightScale)];
  }
}
