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
  getContentDimensions,
  getSlotWidth,
} from '@/app/utils/contentTypeGuards';
import { type BoxTree } from '@/app/utils/rowCombination';

/**
 * Calculate the combined aspect ratio of a BoxTree with slot width scaling
 * - For leaf: return item's aspect ratio scaled by slot width (rating-based)
 * - For horizontal: sum of aspect ratios (children side-by-side)
 * - For vertical: reciprocal of sum of reciprocals (children stacked)
 *
 * @param tree - BoxTree to calculate aspect ratio for
 * @param chunkSize - Number of normal-width items per row (for slot width calculation)
 */
function calculateBoxTreeAspectRatio(tree: BoxTree, chunkSize: number): number {
  if (tree.type === 'leaf') {
    // Apply slot width scaling like old algorithm
    const { width, height } = getContentDimensions(tree.content);
    // Use simplified slot width (no prev/next context in BoxTree)
    const slotWidth = getSlotWidth(tree.content, chunkSize);
    const effectiveWidth = width * slotWidth;
    const effectiveHeight = height * slotWidth;
    return effectiveWidth / effectiveHeight;
  }

  const leftAR = calculateBoxTreeAspectRatio(tree.children[0], chunkSize);
  const rightAR = calculateBoxTreeAspectRatio(tree.children[1], chunkSize);

  return tree.direction === 'horizontal'
    ? leftAR + rightAR
    : 1 / (1 / leftAR + 1 / rightAR);
}

/**
 * Calculate sizes from BoxTree structure
 * Generic recursive algorithm that follows the tree structure
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
  // Base case: leaf node
  if (tree.type === 'leaf') {
    const ar = calculateBoxTreeAspectRatio(tree, chunkSize);
    const height = targetWidth / ar;
    return [{ content: tree.content, width: targetWidth, height }];
  }

  // Recursive case: combined node
  const leftAR = calculateBoxTreeAspectRatio(tree.children[0], chunkSize);
  const rightAR = calculateBoxTreeAspectRatio(tree.children[1], chunkSize);

  if (tree.direction === 'horizontal') {
    // Binary tree always has 2 children = 1 gap
    const totalGapSpace = gap;
    const availableWidth = targetWidth - totalGapSpace;

    const totalAR = leftAR + rightAR;
    const leftWidth = availableWidth * (leftAR / totalAR);
    const rightWidth = availableWidth * (rightAR / totalAR);

    const leftSizes = calculateSizesFromBoxTree(tree.children[0], leftWidth, gap, chunkSize);
    const rightSizes = calculateSizesFromBoxTree(tree.children[1], rightWidth, gap, chunkSize);

    return [...leftSizes, ...rightSizes];
  } else {
    // Vertical: binary tree always has 2 direct children, so only 1 gap between them
    const totalGapSpace = gap; // Always 1 gap for binary tree (2 children)

    // Recursively calculate sizes for both children with full width
    const leftSizes = calculateSizesFromBoxTree(tree.children[0], targetWidth, gap, chunkSize);
    const rightSizes = calculateSizesFromBoxTree(tree.children[1], targetWidth, gap, chunkSize);

    // Calculate total raw height
    const leftHeight = leftSizes.reduce((sum, s) => sum + s.height, 0);
    const rightHeight = rightSizes.reduce((sum, s) => sum + s.height, 0);
    const rawTotalHeight = leftHeight + rightHeight;

    // Scale down so that: scaledHeight + gap = rawHeight
    const targetHeightsSum = rawTotalHeight - totalGapSpace;
    const scaleFactor = rawTotalHeight > 0 ? targetHeightsSum / rawTotalHeight : 1;

    // Scale heights only - widths should fill the allocated space
    // Scaling widths would make the vertical stack narrower than allocated,
    // causing width calculation errors in parent horizontal combinations
    const scaledLeftSizes = leftSizes.map(s => ({
      ...s,
      width: s.width, // Keep original width
      height: s.height * scaleFactor,
    }));

    const scaledRightSizes = rightSizes.map(s => ({
      ...s,
      width: s.width, // Keep original width
      height: s.height * scaleFactor,
    }));

    return [...scaledLeftSizes, ...scaledRightSizes];
  }
}
