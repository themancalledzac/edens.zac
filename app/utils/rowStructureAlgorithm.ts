/**
 * Row Structure Algorithm — BoxTree Size Calculator
 *
 * Calculates pixel dimensions from a BoxTree structure.
 * The BoxTree is a recursive binary tree where leaves are content items
 * and combined nodes specify horizontal or vertical arrangement.
 */

import { LAYOUT } from '@/app/constants';
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
  return tree.direction === 'horizontal' ? left + right : Math.max(left, right);
}

/**
 * The widest this subtree may RENDER: side-by-side siblings can jointly use both caps plus
 * their gap; stacked siblings share one width, so the column is only as wide as its
 * most-constrained member allows. The dual of {@link subtreeMinWidth}, and the mechanism
 * behind the atomic-design default that vertically-joined blocks render at one shared width
 * (Zac's 0246 round-3 review: a collapsed bar must not span 848px above a 700px-capped
 * panel) — the whole column narrows to what every member can honour.
 */
function subtreeMaxWidth(tree: BoxTree): number {
  if (tree.type === 'leaf') return getMaxWidth(tree.content) ?? Infinity;
  const left = subtreeMaxWidth(tree.children[0]);
  const right = subtreeMaxWidth(tree.children[1]);
  if (tree.direction === 'horizontal') {
    return left === Infinity || right === Infinity ? Infinity : left + right;
  }
  return Math.min(left, right);
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
 * Width given to an hbox's LEFT child so both children render the same height.
 *
 * The unconstrained answer solves `aL·W + bL = aR·(available − W) + bR`. Two cases break it, and
 * both arrive with pinned heights:
 *
 * - **Both children pinned** (`aL + aR === 0`): the equation degenerates to `bL = bR` — true or
 *   false, but never a statement about W, and the division is 0/0. There is no width that
 *   equalises them, so width is split evenly.
 * - **One child pinned, and the other cannot reach that height at any width it could be given**:
 *   the solve runs off the end of the row and the old `Math.max(0, …)` clamp handed the pinned
 *   child ZERO width, deleting a panel from the page. A tall Users panel beside a short photo hits
 *   this exactly. Keeping the split inside the `minWidth` band leaves both children renderable and
 *   lets the row simply be as tall as its pinned member.
 *
 * The band is applied ONLY when a pin is present. Without one, this returns the original
 * expression unchanged, so `minWidth` keeps its existing meaning everywhere else — a preference
 * over row MEMBERSHIP in the packer, not a reservation of page width in the sizer.
 */
function solveHboxSplit(
  tree: Extract<BoxTree, { type: 'combined' }>,
  availableWidth: number,
  gap: number
): number {
  const { a: aL, b: bL } = computeHeightCoeffs(tree.children[0], gap);
  const { a: aR, b: bR } = computeHeightCoeffs(tree.children[1], gap);

  // All-pinned: heights yield no equation, so the DECLARED shapes share the width — a bar
  // declaring twice the AR of its sibling gets twice the width. An even split (the old rule)
  // gave a nested pair half of what a lone sibling got, which starved declared minimums the
  // renderer's own band would then have to undo. Mirrored in rowCombination's splitLeftWidth.
  const arL = calculateBoxTreeAspectRatio(tree.children[0]);
  const arR = calculateBoxTreeAspectRatio(tree.children[1]);
  const raw =
    aL + aR === 0
      ? availableWidth * (arL + arR > 0 ? arL / (arL + arR) : 0.5)
      : (aR * availableWidth + bR - bL) / (aL + aR);

  if (aL !== 0 && aR !== 0) return Math.max(0, Math.min(availableWidth, raw));

  const floor = Math.min(subtreeMinWidth(tree.children[0]), availableWidth);
  const ceiling = Math.max(floor, availableWidth - subtreeMinWidth(tree.children[1]));
  return Math.max(0, Math.min(availableWidth, Math.min(ceiling, Math.max(floor, raw))));
}

/**
 * Linear height coefficients for a BoxTree subtree.
 * The rendered height at width W is: H(W) = a * W + b
 *
 * For leaves, b = 0 (no internal gaps). For nested trees, b captures
 * the cumulative height reduction from internal CSS gaps.
 */
export interface HeightCoeffs {
  a: number;
  b: number;
}

/**
 * Compute height coefficients {a, b} for a BoxTree subtree where H(W) = a*W + b.
 *
 * These coefficients enable gap-aware width distribution: when distributing
 * width between horizontal siblings, using these coefficients (instead of raw ARs)
 * ensures both sides render at the same height, even with asymmetric nesting.
 */
export function computeHeightCoeffs(tree: BoxTree, gap: number): HeightCoeffs {
  if (tree.type === 'leaf') {
    const pinned = getPinnedHeight(tree.content);
    // `a = 0` is not a special case bolted onto the model — it IS the model's expression of
    // "height does not vary with width". Every formula below already handles it.
    if (pinned !== undefined) return { a: 0, b: pinned };

    const { width, height } = getContentDimensions(tree.content);
    const ar = height === 0 ? 1 : width / height;
    return { a: 1 / ar, b: 0 };
  }

  const left = computeHeightCoeffs(tree.children[0], gap);
  const right = computeHeightCoeffs(tree.children[1], gap);
  const sumA = left.a + right.a;

  if (tree.direction === 'horizontal') {
    // Two pinned children cannot be equalised by trading width, and `sumA` is the divisor of
    // that trade — so the general formula is a 0/0 here. Side by side, the pair is as tall as
    // its taller member.
    if (sumA === 0) return { a: 0, b: Math.max(left.b, right.b) };

    return {
      a: (left.a * right.a) / sumA,
      b: (-left.a * right.a * gap + left.a * right.b + right.a * left.b) / sumA,
    };
  }

  // vertical: CSS visual height = sum of raw child heights (vbox scaling + CSS gap cancel out).
  // That cancellation assumes something in the stack can be scaled down to swallow the gap. When
  // BOTH children are pinned nothing can, so the gap is real added height and has to be declared
  // — otherwise the parent solve sizes this stack one gap shorter than it renders.
  return {
    a: sumA,
    b: left.b + right.b + (left.a === 0 && right.a === 0 ? gap : 0),
  };
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

  return tree.direction === 'horizontal' ? leftAR + rightAR : 1 / (1 / leftAR + 1 / rightAR);
}

/**
 * Calculate sizes from BoxTree structure.
 *
 * Generic recursive algorithm that follows the tree structure left-to-right,
 * top-to-bottom. For horizontal nodes, gap space is always 1 × gap (binary tree
 * has exactly 2 direct children). For vertical nodes, sizes are scaled so the
 * total height including the gap equals the raw combined height — widths are kept
 * at the allocated size to prevent width errors in parent horizontal combinations.
 *
 * @param tree - BoxTree encoding how items are combined
 * @param targetWidth - Available width for this subtree
 * @param gap - Gap between adjacent items (default: LAYOUT.gridGap = 12.8px)
 * @param chunkSize - Number of normal-width items per row (for slot width scaling)
 * @returns Array of sizes in tree traversal order (left-to-right, top-to-bottom)
 */
export function calculateSizesFromBoxTree(
  tree: BoxTree,
  targetWidth: number,
  gap: number = LAYOUT.gridGap,
  chunkSize: number = 4
): CalculatedContentSize[] {
  if (tree.type === 'leaf') {
    const ar = calculateBoxTreeAspectRatio(tree);
    const maxWidth = getMaxWidth(tree.content);
    const width = maxWidth === undefined ? targetWidth : Math.min(targetWidth, maxWidth);
    const height =
      getHeightClamp(tree.content) === undefined ? width / ar : clampedLeafHeight(tree, width);
    return [{ content: tree.content, width, height }];
  }

  if (tree.direction === 'horizontal') {
    const availableWidth = targetWidth - gap;
    const leftWidth = solveHboxSplit(tree, availableWidth, gap);
    const rightWidth = availableWidth - leftWidth;

    // Hand each side no more than it may render, so a cap deep in a column narrows the whole
    // column (uniform stacked widths) instead of one member clamping alone mid-stack.
    const leftSizes = calculateSizesFromBoxTree(
      tree.children[0],
      Math.min(leftWidth, subtreeMaxWidth(tree.children[0])),
      gap,
      chunkSize
    );
    const rightSizes = calculateSizesFromBoxTree(
      tree.children[1],
      Math.min(rightWidth, subtreeMaxWidth(tree.children[1])),
      gap,
      chunkSize
    );

    return [...leftSizes, ...rightSizes];
  } else {
    // Vertical: both children get the SAME width — stacked members share one column, and the
    // column is capped by its most-constrained member (min over caps, via subtreeMaxWidth), so
    // no member ever clamps alone mid-stack. Heights scaled to account for CSS gap.
    // Use coefficient-predicted visual heights (not sum of returned sizes) because
    // summing returned sizes overcounts hbox children (side-by-side, not stacked).
    const columnWidth = Math.min(targetWidth, subtreeMaxWidth(tree));
    const { a: aL, b: bL } = computeHeightCoeffs(tree.children[0], gap);
    const { a: aR, b: bR } = computeHeightCoeffs(tree.children[1], gap);

    const leftSizes = calculateSizesFromBoxTree(tree.children[0], columnWidth, gap, chunkSize);
    const rightSizes = calculateSizesFromBoxTree(tree.children[1], columnWidth, gap, chunkSize);

    // Visual height each child would render at. Coefficients are exact for pure-AR
    // subtrees; a subtree carrying shape bounds needs the clamp-aware prediction, or a
    // capped child would be scaled as if it still rendered its full AR height.
    const shaped = treeHasShapeBounds(tree);
    const leftVisualH = shaped
      ? predictRenderedHeight(tree.children[0], columnWidth, gap)
      : aL * columnWidth + bL;
    const rightVisualH = shaped
      ? predictRenderedHeight(tree.children[1], columnWidth, gap)
      : aR * columnWidth + bR;
    // CSS adds a gap between the two children, so heights scale down to compensate. WHICH child
    // pays for it is the pinned-height question: a pinned block has one correct height and
    // shrinking it by a share of the gap is simply rendering it wrong. So the flexible member
    // absorbs the whole gap, and when both are pinned nobody does — the stack is genuinely
    // `sum + gap` tall, which `computeHeightCoeffs` declares so the parent solve agrees.
    const leftPinned = aL === 0;
    const rightPinned = aR === 0;
    const absorb = (visualH: number) => (visualH > gap ? (visualH - gap) / visualH : 1);

    let leftScale = 1;
    let rightScale = 1;
    if (leftPinned && !rightPinned) {
      rightScale = absorb(rightVisualH);
    } else if (rightPinned && !leftPinned) {
      leftScale = absorb(leftVisualH);
    } else if (!leftPinned && !rightPinned) {
      const rawVisualTotal = leftVisualH + rightVisualH;
      leftScale = rawVisualTotal > 0 ? (rawVisualTotal - gap) / rawVisualTotal : 1;
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
