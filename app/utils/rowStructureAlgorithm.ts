/**
 * Row Structure Algorithm — BoxTree Size Calculator
 *
 * Calculates pixel dimensions from a BoxTree structure.
 * The BoxTree is a recursive binary tree where leaves are content items
 * and combined nodes specify horizontal or vertical arrangement.
 */

import { LAYOUT } from '@/app/constants';
import type { CalculatedContentSize } from '@/app/utils/contentLayout';
import { getContentDimensions } from '@/app/utils/contentTypeGuards';
import { type BoxTree } from '@/app/utils/rowCombination';

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
    const { width, height } = getContentDimensions(tree.content);
    const ar = height === 0 ? 1 : width / height;
    return { a: 1 / ar, b: 0 };
  }

  const left = computeHeightCoeffs(tree.children[0], gap);
  const right = computeHeightCoeffs(tree.children[1], gap);
  const sumA = left.a + right.a;

  if (tree.direction === 'horizontal') {
    return {
      a: (left.a * right.a) / sumA,
      b: (-left.a * right.a * gap + left.a * right.b + right.a * left.b) / sumA,
    };
  }

  // vertical: CSS visual height = sum of raw child heights (vbox scaling + CSS gap cancel out)
  return {
    a: sumA,
    b: left.b + right.b,
  };
}

/**
 * Calculate the combined aspect ratio of a BoxTree.
 * - For leaf: return item's intrinsic aspect ratio (width / height)
 * - For horizontal: sum of aspect ratios (children side-by-side)
 * - For vertical: reciprocal of sum of reciprocals (children stacked)
 *
 * @param tree - BoxTree to calculate aspect ratio for
 * @param chunkSize - Number of normal-width items per row (unused at leaf level, kept for API consistency)
 */
export function calculateBoxTreeAspectRatio(tree: BoxTree, chunkSize: number): number {
  if (tree.type === 'leaf') {
    const { width, height } = getContentDimensions(tree.content);
    return height === 0 ? 1 : width / height;
  }

  const leftAR = calculateBoxTreeAspectRatio(tree.children[0], chunkSize);
  const rightAR = calculateBoxTreeAspectRatio(tree.children[1], chunkSize);

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
    const ar = calculateBoxTreeAspectRatio(tree, chunkSize);
    const height = targetWidth / ar;
    return [{ content: tree.content, width: targetWidth, height }];
  }

  if (tree.direction === 'horizontal') {
    const { a: aL, b: bL } = computeHeightCoeffs(tree.children[0], gap);
    const { a: aR, b: bR } = computeHeightCoeffs(tree.children[1], gap);
    const availableWidth = targetWidth - gap;

    // Solve for equal heights: aL * leftWidth + bL = aR * rightWidth + bR
    const rawLeft = (aR * availableWidth + bR - bL) / (aL + aR);
    const leftWidth = Math.max(0, Math.min(availableWidth, rawLeft));
    const rightWidth = availableWidth - leftWidth;

    const leftSizes = calculateSizesFromBoxTree(tree.children[0], leftWidth, gap, chunkSize);
    const rightSizes = calculateSizesFromBoxTree(tree.children[1], rightWidth, gap, chunkSize);

    return [...leftSizes, ...rightSizes];
  } else {
    // Vertical: both children get full targetWidth, heights scaled to account for CSS gap.
    // Use coefficient-predicted visual heights (not sum of returned sizes) because
    // summing returned sizes overcounts hbox children (side-by-side, not stacked).
    const { a: aL, b: bL } = computeHeightCoeffs(tree.children[0], gap);
    const { a: aR, b: bR } = computeHeightCoeffs(tree.children[1], gap);

    const leftSizes = calculateSizesFromBoxTree(tree.children[0], targetWidth, gap, chunkSize);
    const rightSizes = calculateSizesFromBoxTree(tree.children[1], targetWidth, gap, chunkSize);

    // Visual height each child would render at (from coefficients)
    const leftVisualH = aL * targetWidth + bL;
    const rightVisualH = aR * targetWidth + bR;
    const rawVisualTotal = leftVisualH + rightVisualH;

    // CSS adds gap between the two children, so scale heights down to compensate
    const scaleFactor = rawVisualTotal > 0 ? (rawVisualTotal - gap) / rawVisualTotal : 1;

    const scaledLeftSizes = leftSizes.map(s => ({
      ...s,
      width: s.width,
      height: s.height * scaleFactor,
    }));

    const scaledRightSizes = rightSizes.map(s => ({
      ...s,
      width: s.width,
      height: s.height * scaleFactor,
    }));

    return [...scaledLeftSizes, ...scaledRightSizes];
  }
}
