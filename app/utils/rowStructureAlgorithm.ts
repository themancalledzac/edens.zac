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

  return tree.direction === 'horizontal'
    ? leftAR + rightAR
    : 1 / (1 / leftAR + 1 / rightAR);
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

  const leftAR = calculateBoxTreeAspectRatio(tree.children[0], chunkSize);
  const rightAR = calculateBoxTreeAspectRatio(tree.children[1], chunkSize);

  if (tree.direction === 'horizontal') {
    const totalGapSpace = gap;
    const availableWidth = targetWidth - totalGapSpace;

    const totalAR = leftAR + rightAR;
    const leftWidth = availableWidth * (leftAR / totalAR);
    const rightWidth = availableWidth * (rightAR / totalAR);

    const leftSizes = calculateSizesFromBoxTree(tree.children[0], leftWidth, gap, chunkSize);
    const rightSizes = calculateSizesFromBoxTree(tree.children[1], rightWidth, gap, chunkSize);

    return [...leftSizes, ...rightSizes];
  } else {
    const totalGapSpace = gap;

    const leftSizes = calculateSizesFromBoxTree(tree.children[0], targetWidth, gap, chunkSize);
    const rightSizes = calculateSizesFromBoxTree(tree.children[1], targetWidth, gap, chunkSize);

    const leftHeight = leftSizes.reduce((sum, s) => sum + s.height, 0);
    const rightHeight = rightSizes.reduce((sum, s) => sum + s.height, 0);
    const rawTotalHeight = leftHeight + rightHeight;

    const targetHeightsSum = rawTotalHeight - totalGapSpace;
    const scaleFactor = rawTotalHeight > 0 ? targetHeightsSum / rawTotalHeight : 1;

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
