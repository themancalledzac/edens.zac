/**
 * Row Structure Algorithm
 *
 * Two-part layout system:
 * 1. createRowsArray() - Organizes content into rows based on star accumulation
 * 2. calculateRowSizes() - Calculates pixel dimensions for each row
 *
 * Star-based accumulation system:
 * - Processes items sequentially (no skipping)
 * - Accumulates items until star count reaches 7-9 range
 * - Arranges items by combining smallest to largest
 */

import { LAYOUT } from '@/app/constants';
import type { AnyContentModel } from '@/app/types/Content';
import type { CalculatedContentSize } from '@/app/utils/contentLayout';
import { getRating, isStandaloneItem } from '@/app/utils/contentRatingUtils';
import {
  getContentDimensions,
  getSlotWidth,
  isContentImage,
  isVerticalImage,
} from '@/app/utils/contentTypeGuards';
import { type PatternResult, type PatternType } from '@/app/utils/patternRegistry';

// Re-export types for consumers
export type { PatternResult, PatternType };

/**
 * Row with pattern metadata - preserves pattern info through the pipeline
 */
export interface RowWithPattern {
  pattern: PatternResult;
  items: AnyContentModel[];
}

// ===================== Helper Functions =====================

/**
 * Accumulate items sequentially until star limit is reached
 * Returns the accumulated items and the next starting index
 *
 * Standalone rules:
 * - 5-star HORIZONTAL images are standalone (full row)
 * - Wide panoramas are standalone (full row)
 * - 5-star VERTICAL images should pair with other images (NOT standalone)
 */
function accumulateRowByStars(
  content: AnyContentModel[],
  startIndex: number,
  minStars: number = 7,
  maxStars: number = 9
): { items: AnyContentModel[]; nextIndex: number } {
  const items: AnyContentModel[] = [];
  let starCount = 0;
  let i = startIndex;

  while (i < content.length) {
    const item = content[i];
    if (!item) break;

    const itemStars = getRating(item, true);
    const newStarCount = starCount + itemStars;

    // Special case: Don't add standalone candidates (5-star horizontal, panorama) to existing row
    if (isStandaloneItem(item) && items.length > 0) {
      break;
    }

    // If adding this item would exceed max, stop (unless we haven't reached min yet)
    if (newStarCount > maxStars && starCount >= minStars) {
      break;
    }

    items.push(item);
    starCount = newStarCount;
    i++;

    // If we just added a standalone candidate, close the row immediately
    // This ensures 5-star horizontals and panoramas get their own row
    if (isStandaloneItem(item)) {
      break;
    }

    // If we've reached minimum and adding next would exceed max, stop
    if (starCount >= minStars && i < content.length) {
      const nextItem = content[i];
      if (nextItem) {
        const nextItemStars = getRating(nextItem, true);
        if (starCount + nextItemStars > maxStars) {
          break;
        }
      }
    }
  }

  return { items, nextIndex: i };
}

/**
 * Arrange items into a pattern, processing from smallest to largest
 * Combines items according to rules: (0+0||0+1||1+1)==2, (2+2)==3, (3+3)==4
 * For even numbers ≥4 of same rating, splits into two groups
 *
 * Goal: End up with at most one large image per row
 */
function arrangeItemsIntoPattern(items: AnyContentModel[], startIndex: number): PatternResult {
  if (items.length === 0) {
    throw new Error('Cannot arrange empty items array');
  }

  // Single item - check if it should be standalone or standard
  if (items.length === 1) {
    const item = items[0];
    // 5-star verticals should NOT be standalone - they should get half width
    // This treats them similar to 4-star horizontal images adjacent to vertical
    if (item && isContentImage(item) && item.rating === 5 && isVerticalImage(item)) {
      return {
        type: 'standard',
        indices: [startIndex],
      };
    }
    return {
      type: 'standalone',
      indices: [startIndex],
    };
  }

  // Two items - standard (side by side)
  if (items.length === 2) {
    return {
      type: 'standard',
      indices: [startIndex, startIndex + 1],
    };
  }

  // For 3 items: check if we should use main-stacked with highest-rated as main
  if (items.length === 3) {
    // Get ratings for all items
    const itemsWithRatings = items.map((item, idx) => ({
      item,
      index: startIndex + idx,
      rating: getRating(item),
      starValue: getRating(item, true),
    }));

    // Sort by rating descending
    const sorted = [...itemsWithRatings].sort((a, b) => b.rating - a.rating);
    const highestRating = sorted[0]?.rating ?? 0;
    const secondHighestRating = sorted[1]?.rating ?? 0;

    // Use main-stacked if:
    // 1. Highest rating is 3+ (significant enough to be main)
    // 2. There's a clear highest (at least 1 point higher than second)
    if (highestRating >= 3 && highestRating > secondHighestRating) {
      const mainItem = sorted[0]!;
      const sec1Item = sorted[1]!;
      const sec2Item = sorted[2]!;

      // Find original positions in the items array
      const mainOriginalIdx = items.findIndex(i => i.id === mainItem.item.id);
      const sec1OriginalIdx = items.findIndex(i => i.id === sec1Item.item.id);
      const sec2OriginalIdx = items.findIndex(i => i.id === sec2Item.item.id);

      if (mainOriginalIdx !== -1 && sec1OriginalIdx !== -1 && sec2OriginalIdx !== -1) {
        return {
          type: 'main-stacked',
          mainIndex: startIndex + mainOriginalIdx,
          secondaryIndices: [startIndex + sec1OriginalIdx, startIndex + sec2OriginalIdx] as [
            number,
            number,
          ],
          indices: [startIndex, startIndex + 1, startIndex + 2].sort((a, b) => a - b),
          mainPosition: 'left',
        };
      }
    }
  }

  // For 4+ items: implement combination logic
  // Group items by star value and process from smallest to largest
  // TODO: Implement full combination logic for 4+ items
  // Future: Handle even numbers ≥4 of same rating by splitting into two groups
  // For now, use standard pattern

  // Default: standard pattern (all items side by side)
  return {
    type: 'standard',
    indices: items.map((_, idx) => startIndex + idx),
  };
}

// ===================== Pattern Detection (Legacy - Not Used) =====================
// NOTE: Pattern detection is replaced by star-based accumulation
// Keeping this code commented for reference, may be removed later

// ===================== Public API: Row Creation =====================

/**
 * Create array of rows from original content array
 * Organizes content into rows based on pattern detection
 * Returns rows with pattern metadata preserved
 *
 * @param content - Array of content blocks to organize
 * @param chunkSize - Number of normal-width items per row (default: 4)
 * @returns Array of rows with pattern metadata
 */
export function createRowsArray(
  content: AnyContentModel[],
  _chunkSize: number = LAYOUT.defaultChunkSize
): RowWithPattern[] {
  if (!content || content.length === 0) return [];

  const result: RowWithPattern[] = [];
  let pointer = 0;

  while (pointer < content.length) {
    // Accumulate items by star count (7-9 stars per row)
    const { items, nextIndex } = accumulateRowByStars(content, pointer, 7, 9);

    if (items.length === 0) break;

    // Arrange items into a pattern
    const pattern = arrangeItemsIntoPattern(items, pointer);

    // Reorder items array to match pattern order for main-stacked
    // calculateMainStackedSizes expects items[0] to be main, items[1] and items[2] to be secondaries
    let orderedItems = items;
    if (pattern.type === 'main-stacked') {
      const mainItem = items.find((_, idx) => pointer + idx === pattern.mainIndex);
      const sec1Item = items.find((_, idx) => pointer + idx === pattern.secondaryIndices[0]);
      const sec2Item = items.find((_, idx) => pointer + idx === pattern.secondaryIndices[1]);

      if (mainItem && sec1Item && sec2Item) {
        orderedItems = [mainItem, sec1Item, sec2Item];
      }
    }

    result.push({ pattern, items: orderedItems });

    // Advance pointer
    pointer = nextIndex;
  }

  return result;
}

// ===================== Part 2: Calculate Row Sizes =====================


/**
 * Box descriptor with float-based aspect ratios
 * ratio = width / height (e.g., 1.78 for 16:9, 0.56 for 9:16)
 */
interface Box {
  type: 'single' | 'combined';
  direction?: 'horizontal' | 'vertical';
  ratio: number;
  content?: AnyContentModel;
  children?: Box[];
}

/**
 * Solved box with actual pixel dimensions
 */
interface SolvedBox {
  width: number;
  height: number;
  content?: AnyContentModel;
  children?: SolvedBox[];
}


/**
 * Create a box from content with slot width scaling for proportional space allocation
 */
function createBoxFromContent(
  content: AnyContentModel,
  chunkSize: number,
  prevItem?: AnyContentModel,
  nextItem?: AnyContentModel
): Box {
  const { width, height } = getContentDimensions(content);
  const slotWidth = getSlotWidth(content, chunkSize, prevItem, nextItem);

  if (!Number.isFinite(slotWidth) || slotWidth <= 0 || slotWidth >= chunkSize) {
    return {
      type: 'single',
      ratio: width / Math.max(1, height),
      content,
    };
  }

  const effectiveWidth = width * slotWidth;
  const effectiveHeight = height * slotWidth;

  return {
    type: 'single',
    ratio: effectiveWidth / Math.max(1, effectiveHeight),
    content,
  };
}

/**
 * Combine multiple boxes into a single box
 */
function combineBoxes(boxes: Box[], direction: 'horizontal' | 'vertical'): Box {
  if (boxes.length === 0) {
    throw new Error('Cannot combine empty array of boxes');
  }

  if (boxes.length === 1) {
    const firstBox = boxes[0];
    if (!firstBox) {
      throw new Error('Box array contains undefined element');
    }
    return firstBox;
  }

  let combinedRatio: number;

  if (direction === 'horizontal') {
    combinedRatio = boxes.reduce((sum, box) => sum + box.ratio, 0);
  } else {
    const inverseSum = boxes.reduce((sum, box) => sum + 1 / box.ratio, 0);
    combinedRatio = 1 / inverseSum;
  }

  return {
    type: 'combined',
    direction,
    ratio: combinedRatio,
    children: boxes,
  };
}

/**
 * Recursively scale all widths in a SolvedBox tree by a factor
 */
function scaleSolvedBoxWidths(box: SolvedBox, scaleFactor: number): SolvedBox {
  const scaledWidth = box.width * scaleFactor;

  // Validate scaled width
  if (!Number.isFinite(scaledWidth) || scaledWidth <= 0) {
    // Fallback: use original width if scaling produces invalid value
    return {
      ...box,
      width: Number.isFinite(box.width) && box.width > 0 ? box.width : 0,
      children: box.children?.map(child => scaleSolvedBoxWidths(child, scaleFactor)),
    };
  }

  return {
    ...box,
    width: scaledWidth,
    children: box.children?.map(child => scaleSolvedBoxWidths(child, scaleFactor)),
  };
}

/**
 * Recursively scale both width and height in a SolvedBox tree by a factor
 * This maintains aspect ratios while scaling the entire box proportionally
 */
function scaleSolvedBoxProportionally(box: SolvedBox, scaleFactor: number): SolvedBox {
  return {
    ...box,
    width: box.width * scaleFactor,
    height: box.height * scaleFactor,
    children: box.children?.map(child => scaleSolvedBoxProportionally(child, scaleFactor)),
  };
}

/**
 * Solve a box tree to get actual pixel dimensions
 * @param box - The box tree to solve
 * @param containerSize - Available size in the container direction
 * @param containerDirection - Whether container constrains width ('horizontal') or height ('vertical')
 * @param gap - Gap between children (for combined boxes)
 */
function solveBox(
  box: Box,
  containerSize: number,
  containerDirection: 'horizontal' | 'vertical' = 'horizontal',
  gap: number = 0
): SolvedBox {
  const ratio = box.ratio; // width / height

  if (box.type === 'single') {
    if (containerDirection === 'horizontal') {
      const width = containerSize;
      const height = containerSize / ratio;
      return { width, height, content: box.content };
    } else {
      const height = containerSize;
      const width = containerSize * ratio;
      return { width, height, content: box.content };
    }
  }

  if (!box.children || box.children.length === 0) {
    throw new Error('Combined box must have children');
  }

  const direction = box.direction!;
  const childCount = box.children.length;

  // Calculate total gap space between children
  const totalGapSpace = childCount > 1 ? (childCount - 1) * gap : 0;

  let sharedDimension: number;

  if (containerDirection === 'horizontal') {
    // Container constrains width. For horizontal children, they share height = width / ratio
    sharedDimension = direction === 'horizontal' ? containerSize / ratio : containerSize;
  } else {
    // Container constrains height. For vertical children, they share width = height * ratio
    sharedDimension = direction === 'horizontal' ? containerSize : containerSize * ratio;
  }

  const solvedChildren = box.children.map(child => {
    // When direction is 'horizontal', children share the same HEIGHT (sharedDimension)
    // So we solve each child with 'vertical' constraint (height constraint)
    // When direction is 'vertical', children share the same WIDTH (sharedDimension)
    // So we solve each child with 'horizontal' constraint (width constraint)
    const childDirection = direction === 'horizontal' ? 'vertical' : 'horizontal';
    return solveBox(child, sharedDimension, childDirection, gap);
  });

  if (direction === 'horizontal') {
    const calculatedWidth = solvedChildren.reduce((sum, child) => sum + child.width, 0);

    // Validate before division - if invalid, distribute width equally
    if (!calculatedWidth || !Number.isFinite(calculatedWidth) || calculatedWidth <= 0) {
      // Fallback: distribute width equally among children, accounting for gaps
      const availableWidth = containerSize - totalGapSpace;
      const equalWidth = availableWidth / solvedChildren.length;
      const scaledChildren = solvedChildren.map(child => ({
        ...child,
        width: equalWidth,
      }));
      return { width: containerSize, height: sharedDimension, children: scaledChildren };
    }

    // Scale widths proportionally to ensure total equals containerSize minus gaps
    // CSS gap property will add the visual spacing between children
    const targetWidthsSum = containerSize - totalGapSpace;
    const scaleFactor = targetWidthsSum / calculatedWidth;

    // Validate scaleFactor before using it
    if (!Number.isFinite(scaleFactor) || scaleFactor <= 0) {
      // Use scaleFactor = 1 (no scaling) as fallback
      return { width: containerSize, height: sharedDimension, children: solvedChildren };
    }

    const scaledChildren = solvedChildren.map(child => scaleSolvedBoxWidths(child, scaleFactor));
    return { width: containerSize, height: sharedDimension, children: scaledChildren };
  } else {
    const width = sharedDimension;
    // For vertical stacks with gaps, scale down child heights so that:
    // scaledHeightsSum + gaps = originalHeightsSum (total height stays same)
    const rawChildHeightsSum = solvedChildren.reduce((sum, child) => sum + child.height, 0);

    // Scale factor: we want (scaledSum + gaps) = rawSum, so scaledSum = rawSum - gaps
    const targetHeightsSum = rawChildHeightsSum - totalGapSpace;
    const gapScaleFactor =
      totalGapSpace > 0 && rawChildHeightsSum > 0 ? targetHeightsSum / rawChildHeightsSum : 1;

    // Scale down child heights (CSS gap will add the visual spacing)
    let scaledChildren = solvedChildren.map(child => ({
      ...child,
      height: child.height * gapScaleFactor,
    }));

    // Calculate height after gap scaling
    const scaledChildrenHeightsSum = scaledChildren.reduce((sum, child) => sum + child.height, 0);
    const gapScaledHeight = scaledChildrenHeightsSum + totalGapSpace;

    // If this vertical stack is part of a horizontal combination, we need to ensure
    // its total height matches containerSize (the height constraint from parent)
    // When containerDirection === 'horizontal' and direction === 'vertical',
    // containerSize is the width constraint, but it's also the target height
    // that the parent expects (since parent's sharedDimension = containerSize)
    let finalHeight = gapScaledHeight;
    if (containerDirection === 'horizontal') {
      // This vertical stack is a child of a horizontal combination
      // The parent expects all children to have height = containerSize
      // Scale only the children's heights (gap space is fixed by CSS)
      // Target: containerSize = scaledChildrenHeightsSum * heightScaleFactor + totalGapSpace
      const targetChildrenHeightsSum = containerSize - totalGapSpace;
      if (
        scaledChildrenHeightsSum > 0 &&
        Math.abs(targetChildrenHeightsSum - scaledChildrenHeightsSum) > 0.001
      ) {
        const heightScaleFactor = targetChildrenHeightsSum / scaledChildrenHeightsSum;
        // Scale children proportionally (width and height to maintain aspect ratios)
        scaledChildren = scaledChildren.map(child =>
          scaleSolvedBoxProportionally(child, heightScaleFactor)
        );
        finalHeight = containerSize;
      }
    }

    return { width, height: finalHeight, children: scaledChildren };
  }
}

/**
 * Extract CalculatedContentSize array from solved box tree
 */
function extractCalculatedSizes(solved: SolvedBox): CalculatedContentSize[] {
  if (solved.content) {
    return [{ content: solved.content, width: solved.width, height: solved.height }];
  }

  if (solved.children) {
    return solved.children.flatMap(child => extractCalculatedSizes(child));
  }

  return [];
}

// ===================== Size Calculation by Pattern Type =====================

/**
 * Calculate dimensions for main + stacked secondary layout
 * Used by: main-stacked, panorama-vertical, all 5-star vertical patterns
 *
 * Layout structure:
 * - Main image (left): has padding-right (inside its border-box width)
 * - Stacked container (right): has padding-left that constrains its children's widths
 * - Stacked items: no side padding, must fit within container's content area
 *
 * The horizontal gap is created by:
 * - Main's padding-right: inside main's width (border-box)
 * - Stacked container's padding-left: OUTSIDE stacked items, INSIDE container
 *
 * So stacked items' widths must be reduced by the container's padding-left (half-gap).
 *
 * TODO: Verify gap math works correctly when main is positioned on the right.
 * When mainPosition === 'right', the layout is flipped:
 * - Main image (right): has padding-left (inside its border-box width)
 * - Stacked container (left): has padding-right instead of padding-left
 * The box model should work the same way (just flipped), but verify that:
 * 1. Stacked items' widths are correctly reduced by container's padding-right (halfGap)
 * 2. Main image width calculation accounts for padding-left instead of padding-right
 * If issues arise, we may need to pass mainPosition to this function and adjust the gap math.
 */
function calculateMainStackedSizes(
  items: AnyContentModel[],
  rowWidth: number,
  chunkSize: number = LAYOUT.defaultChunkSize,
  mainIndex: number = 0
): CalculatedContentSize[] {
  const gap = LAYOUT.gridGap;

  // Pick main and secondaries based on mainIndex
  const main = items[mainIndex];
  const secondaries = items.filter((_, i) => i !== mainIndex);
  const sec1 = secondaries[0];
  const sec2 = secondaries[1];

  if (!main || !sec1 || !sec2) {
    return calculateStandardRowSizes(items, rowWidth, chunkSize);
  }

  const mainBox = createBoxFromContent(main, chunkSize);
  const sec1Box = createBoxFromContent(sec1, chunkSize);
  const sec2Box = createBoxFromContent(sec2, chunkSize);

  const verticalStackBox = combineBoxes([sec1Box, sec2Box], 'vertical');
  const rowBox = combineBoxes([mainBox, verticalStackBox], 'horizontal');
  const solved = solveBox(rowBox, rowWidth, 'horizontal', gap);

  // Results are in [main, sec1, sec2] order — map back to original item positions
  const solvedSizes = extractCalculatedSizes(solved);
  const results: CalculatedContentSize[] = Array.from({ length: items.length }) as CalculatedContentSize[];
  results[mainIndex] = solvedSizes[0]!;
  let secIdx = 0;
  for (let i = 0; i < items.length; i++) {
    if (i !== mainIndex) {
      const size = solvedSizes[1 + secIdx]!;
      // Stacked items use solved size directly — CSS gap handles spacing
      results[i] = size;
      secIdx++;
    }
  }

  return results;
}

/**
 * Calculate dimensions for nested quad layout
 *
 * Layout structure:
 * ┌──────────┬───────────┐
 * │          │  T1 │ T2  │  ← Top pair (horizontal combination)
 * │   Main   ├───────────┤
 * │          │  Bottom   │  ← Bottom single
 * └──────────┴───────────┘
 *
 * Box algebra:
 * 1. Combine top pair horizontally: [T1, T2] → topPairBox
 * 2. Combine topPairBox + bottom vertically: [topPairBox, bottom] → stackedGroup
 * 3. Combine main + stackedGroup horizontally: [main, stackedGroup] → final row
 *
 * @param items - All 4 items in the row
 * @param rowWidth - Row width budget
 * @param chunkSize - Slot width for rating-based scaling
 * @param layout - NestedQuadLayout descriptor with indices
 * @returns Calculated sizes for each item in original order
 */
function calculateNestedQuadSizes(
  items: AnyContentModel[],
  rowWidth: number,
  chunkSize: number = LAYOUT.defaultChunkSize,
  layout: { mainIndex: number; topPairIndices: [number, number]; bottomIndex: number }
): CalculatedContentSize[] {
  const gap = LAYOUT.gridGap;

  if (items.length !== 4) {
    console.warn('calculateNestedQuadSizes called with != 4 items, falling back');
    return calculateStandardRowSizes(items, rowWidth, chunkSize);
  }

  // Extract items by role
  const main = items[layout.mainIndex];
  const top1 = items[layout.topPairIndices[0]];
  const top2 = items[layout.topPairIndices[1]];
  const bottom = items[layout.bottomIndex];

  if (!main || !top1 || !top2 || !bottom) {
    return calculateStandardRowSizes(items, rowWidth, chunkSize);
  }

  // Build box structure
  const mainBox = createBoxFromContent(main, chunkSize);
  const top1Box = createBoxFromContent(top1, chunkSize);
  const top2Box = createBoxFromContent(top2, chunkSize);
  const bottomBox = createBoxFromContent(bottom, chunkSize);

  // 1. Combine top pair horizontally
  const topPairBox = combineBoxes([top1Box, top2Box], 'horizontal');

  // 2. Combine top pair + bottom vertically
  const stackedGroupBox = combineBoxes([topPairBox, bottomBox], 'vertical');

  // 3. Combine main + stacked group horizontally
  const rowBox = combineBoxes([mainBox, stackedGroupBox], 'horizontal');

  // Solve the entire row
  const solved = solveBox(rowBox, rowWidth, 'horizontal', gap);
  const flatSizes = extractCalculatedSizes(solved);

  // flatSizes order: [main, top1, top2, bottom]
  // Map back to original item order — CSS gap handles spacing
  const results: CalculatedContentSize[] = Array.from({ length: 4 }) as CalculatedContentSize[];
  results[layout.mainIndex] = flatSizes[0]!;
  results[layout.topPairIndices[0]] = flatSizes[1]!;
  results[layout.topPairIndices[1]] = flatSizes[2]!;
  results[layout.bottomIndex] = flatSizes[3]!;

  return results;
}

/**
 * Calculate dimensions for standalone item
 */
function calculateStandaloneSizes(
  items: AnyContentModel[],
  rowWidth: number
): CalculatedContentSize[] {
  const item = items[0];
  if (!item) return [];

  const { width, height } = getContentDimensions(item);
  const ratio = width / Math.max(1, height);
  const calculatedHeight = rowWidth / ratio;

  return [
    {
      content: item,
      width: rowWidth,
      height: calculatedHeight,
    },
  ];
}

/**
 * Calculate dimensions for standard horizontal row
 * Applies slot width scaling for proportional space allocation
 *
 * Note: Horizontal gaps are created by CSS padding INSIDE elements (box-sizing: border-box),
 * so element widths should sum to rowWidth. No gap subtraction needed for horizontal rows.
 */
function calculateStandardRowSizes(
  items: AnyContentModel[],
  rowWidth: number,
  chunkSize: number = LAYOUT.defaultChunkSize
): CalculatedContentSize[] {
  const gap = LAYOUT.gridGap;

  if (items.length === 0) return [];

  if (items.length === 1) {
    const item = items[0];
    // 5-star verticals should NOT take full width - they get half width
    // This treats them similar to 4-star horizontal images adjacent to vertical
    if (item && isContentImage(item) && item.rating === 5 && isVerticalImage(item)) {
      const { width: imgWidth, height: imgHeight } = getContentDimensions(item);
      const ratio = imgWidth / Math.max(1, imgHeight);
      const halfRowWidth = rowWidth / 2;
      const calculatedHeight = halfRowWidth / ratio;
      return [
        {
          content: item,
          width: halfRowWidth,
          height: calculatedHeight,
        },
      ];
    }
    return calculateStandaloneSizes(items, rowWidth);
  }

  // Create boxes with slot width scaling, using prev/next context for accurate slot width calculation
  const boxes = items.map((item, index) => {
    const prevItem = index > 0 ? items[index - 1] : undefined;
    const nextItem = index < items.length - 1 ? items[index + 1] : undefined;
    return createBoxFromContent(item, chunkSize, prevItem, nextItem);
  });

  const rowBox = combineBoxes(boxes, 'horizontal');
  // Solve with full rowWidth (CSS padding is inside elements due to border-box)
  // Pass gap for any nested vertical stacks that use CSS gap property
  const solved = solveBox(rowBox, rowWidth, 'horizontal', gap);
  return extractCalculatedSizes(solved);
}

/**
 * Size calculator lookup by pattern type
 * All calculators now accept chunkSize parameter for slot width calculation
 * Note: 'nested-quad' is handled specially in calculateRowSizesFromPattern, not in this lookup
 */
const SIZE_CALCULATORS: Record<
  Exclude<PatternType, 'nested-quad'>,
  (items: AnyContentModel[], rowWidth: number, chunkSize?: number) => CalculatedContentSize[]
> = {
  standalone: calculateStandaloneSizes,
  'main-stacked': calculateMainStackedSizes,
  'panorama-vertical': calculateMainStackedSizes,
  'five-star-vertical-2v': calculateMainStackedSizes,
  'five-star-vertical-2h': calculateMainStackedSizes,
  'five-star-vertical-mixed': calculateMainStackedSizes,
  standard: calculateStandardRowSizes,
};

// ===================== Public API: Size Calculation =====================

/**
 * Calculate sizes for a row using pattern metadata
 * Primary API - use when you have pattern information
 *
 * @param row - Row with pattern metadata
 * @param rowWidth - Total available width for the row
 * @param chunkSize - Number of normal-width items per row (default: 4)
 * @returns Calculated dimensions for all items in the row
 */
export function calculateRowSizesFromPattern(
  row: RowWithPattern,
  rowWidth: number,
  chunkSize: number = LAYOUT.defaultChunkSize
): CalculatedContentSize[] {
  // For nested-quad patterns, use specialized calculator
  if (row.pattern.type === 'nested-quad') {
    return calculateNestedQuadSizes(row.items, rowWidth, chunkSize, {
      mainIndex: row.pattern.mainIndex,
      topPairIndices: row.pattern.topPairIndices,
      bottomIndex: row.pattern.bottomIndex,
    });
  }

  // For main-stacked patterns, pass mainIndex so the calculator picks the right dominant image
  if ('mainIndex' in row.pattern) {
    return calculateMainStackedSizes(row.items, rowWidth, chunkSize, row.pattern.mainIndex);
  }
  const calculator = SIZE_CALCULATORS[row.pattern.type];
  return calculator(row.items, rowWidth, chunkSize);
}

/**
 * Calculate sizes for a single row
 * Legacy API - re-detects pattern from items
 *
 * @param row - Array of content items in the row
 * @param rowWidth - Total available width for the row
 * @param chunkSize - Number of normal-width items per row (default: 4)
 * @returns Calculated dimensions for all items in the row
 */
export function calculateRowSizes(
  row: AnyContentModel[],
  rowWidth: number,
  chunkSize: number = LAYOUT.defaultChunkSize
): CalculatedContentSize[] {
  if (row.length === 0) return [];

  // Detect pattern for legacy API
  if (row.length === 3) {
    const main = row[0];
    if (main && isContentImage(main)) {
      const rating = main.rating || 0;
      // 5-star vertical patterns or 3-4 star main-stacked
      if ((rating === 5 && isVerticalImage(main)) || (rating >= 3 && rating <= 4)) {
        return calculateMainStackedSizes(row, rowWidth, chunkSize);
      }
    }
  }

  return calculateStandardRowSizes(row, rowWidth, chunkSize);
}

