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
import {
  getAspectRatio,
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
 * Check if an item is a collection card (converted from ContentCollectionModel or CollectionModel)
 * Collection cards have collectionType set during conversion
 */
function isCollectionCard(item: AnyContentModel): boolean {
  return 'collectionType' in item && !!item.collectionType;
}

/**
 * Get rating or star value for an item
 * - zeroOne=false (default): Returns raw rating (0-5), treats 0 as 0
 * - zeroOne=true: Returns star value, converts 0 or 1 to 1, 2+ stays as rating
 *
 * Special handling for collection cards:
 * - Collection cards are treated as 4-star items to ensure 2-per-row layout
 * - Two 4-star items = 8 stars (within 7-9 range) → natural 2-per-row grouping
 *
 * @param item - Content item to get rating for
 * @param zeroOne - If true, converts 0 to 1 (star value). If false, returns raw rating.
 */
function getRating(item: AnyContentModel, zeroOne: boolean = false): number {
  // Collection cards get effective rating of 4 for 2-per-row layout
  // This ensures collections are displayed in pairs (4+4=8 stars, within 7-9 range)
  if (isCollectionCard(item)) {
    return 4;
  }

  if (!isContentImage(item)) {
    return zeroOne ? 1 : 0; // Non-images: 1 star if zeroOne, 0 rating otherwise
  }
  const rating = item.rating || 0;
  if (zeroOne) {
    // Star value: 0 or 1 becomes 1, 2+ stays as rating
    return rating === 0 || rating === 1 ? 1 : rating;
  }
  // Raw rating: return as-is (0 stays 0)
  return rating;
}

/**
 * Check if an item should be standalone (take full row width)
 * Standalone candidates: 5-star horizontal, wide panorama
 * Note: 5-star verticals should NOT be standalone - they pair with other images
 */
function isStandaloneCandidate(item: AnyContentModel): boolean {
  if (!isContentImage(item)) return false;

  const rating = item.rating || 0;
  const ratio = getAspectRatio(item);
  const isHorizontal = ratio > 1.0;
  const isWidePanorama = ratio >= 2.0;

  // Wide panorama → always standalone
  if (isWidePanorama) return true;

  // 5-star horizontal → always standalone
  if (rating === 5 && isHorizontal) return true;

  return false;
}

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
    if (isStandaloneCandidate(item) && items.length > 0) {
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
    if (isStandaloneCandidate(item)) {
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
 * Calculate combined rating when two items are combined
 * Rules: (0+0||0+1||1+1)==2, (2+2)==3, (3+3)==4
 * Reserved for future combination logic implementation
 *
 * @param item1 - First item
 * @param item2 - Second item
 * @returns Combined rating value
 */
function _getCombinedRating(item1: AnyContentModel, item2: AnyContentModel): number {
  // Get star values (zeroOne=true) for combination logic
  const star1 = getRating(item1, true);
  const star2 = getRating(item2, true);

  // Same rating combinations
  if (star1 === star2) {
    if (star1 === 1) return 2; // (0+0||0+1||1+1) == 2
    if (star1 === 2) return 3; // (2+2) == 3
    if (star1 === 3) return 4; // (3+3) == 4
  }

  // Different ratings - return the higher one (no combination benefit)
  return Math.max(star1, star2);
}

/**
 * Group items by their star value for combination processing
 * Reserved for future combination logic implementation
 */
function _groupItemsByStarValue(items: AnyContentModel[]): Map<number, AnyContentModel[]> {
  const groups = new Map<number, AnyContentModel[]>();

  for (const item of items) {
    const starValue = getRating(item, true);
    if (!groups.has(starValue)) {
      groups.set(starValue, []);
    }
    groups.get(starValue)!.push(item);
  }

  return groups;
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

/**
 * Legacy API: Create array of rows without pattern metadata
 * @deprecated Use createRowsArray() which returns RowWithPattern[] instead
 */
export function createRowsArrayLegacy(
  content: AnyContentModel[],
  chunkSize: number = LAYOUT.defaultChunkSize
): AnyContentModel[][] {
  const rowsWithPatterns = createRowsArray(content, chunkSize);
  return rowsWithPatterns.map(row => row.items);
}

// ===================== Part 2: Calculate Row Sizes =====================

/**
 * Fraction representation: { numerator, denominator }
 * Always represents width/height ratio (horizontal aspect ratio)
 */
interface Fraction {
  numerator: number;
  denominator: number;
}

/**
 * Box descriptor with fraction-based aspect ratios
 */
interface Box {
  type: 'single' | 'combined';
  direction?: 'horizontal' | 'vertical';
  ratio: Fraction;
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
 * Create a fraction from width and height
 */
function createFraction(width: number, height: number): Fraction {
  return {
    numerator: width,
    denominator: height,
  };
}

/**
 * Simplify a fraction to lowest terms
 */
function simplifyFraction(f: Fraction): Fraction {
  // Guard against invalid input
  if (!Number.isFinite(f.numerator) || !Number.isFinite(f.denominator)) {
    return { numerator: 1, denominator: 1 };
  }

  if (f.denominator === 0) {
    return { numerator: 1, denominator: 1 };
  }

  const gcd = (a: number, b: number): number => {
    // Ensure we have valid finite numbers
    if (!Number.isFinite(a) || !Number.isFinite(b)) return 1;
    if (b === 0) return a;
    return gcd(b, a % b);
  };

  const divisor = gcd(Math.abs(f.numerator), Math.abs(f.denominator));
  if (divisor === 0 || !Number.isFinite(divisor)) return f;

  return {
    numerator: f.numerator / divisor,
    denominator: f.denominator / divisor,
  };
}

/**
 * Add two fractions: a/b + c/d = (ad + bc) / bd
 */
function addFractions(f1: Fraction, f2: Fraction): Fraction {
  return simplifyFraction({
    numerator: f1.numerator * f2.denominator + f2.numerator * f1.denominator,
    denominator: f1.denominator * f2.denominator,
  });
}

/**
 * Invert a fraction: a/b -> b/a (flip for vertical direction)
 */
function invertFraction(f: Fraction): Fraction {
  return {
    numerator: f.denominator,
    denominator: f.numerator,
  };
}

/**
 * Create a box directly from AnyContentModel
 * Applies slot width scaling to create "effective" aspect ratio for proportional space allocation
 *
 * Note: Standalone items should be handled by calculateStandaloneSizes, not this function.
 * This function is used for items in multi-item patterns (main-stacked, standard, etc.)
 */
function createBoxFromContent(
  content: AnyContentModel,
  chunkSize: number,
  prevItem?: AnyContentModel,
  nextItem?: AnyContentModel
): Box {
  const { width, height } = getContentDimensions(content);
  const slotWidth = getSlotWidth(content, chunkSize, prevItem, nextItem);

  // Guard: Validate slotWidth is finite and reasonable
  // If slotWidth is very large (>= chunkSize), it's likely a standalone item
  // that should be handled by calculateStandaloneSizes instead
  // Use original dimensions without scaling in this case
  if (!Number.isFinite(slotWidth) || slotWidth <= 0 || slotWidth >= chunkSize) {
    // Use original dimensions without slotWidth scaling
    const ratio = createFraction(width, Math.max(1, height));
    return {
      type: 'single',
      ratio,
      content,
    };
  }

  // Apply slot width scaling for proportional space allocation
  // Items with slotWidth=2 (3+ star) get 2x the visual space compared to slotWidth=1
  const effectiveWidth = width * slotWidth;
  const effectiveHeight = height * slotWidth;

  // Create fraction from effective dimensions
  const ratio = createFraction(effectiveWidth, Math.max(1, effectiveHeight));

  return {
    type: 'single',
    ratio,
    content,
  };
}

/**
 * Combine multiple boxes into a single box
 * Single function that handles both horizontal and vertical combination
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

  let combinedRatio: Fraction;

  if (direction === 'horizontal') {
    combinedRatio = boxes.reduce(
      (sum, box) => {
        return addFractions(sum, box.ratio);
      },
      createFraction(0, 1)
    );
  } else {
    const invertedSum = boxes.reduce(
      (sum, box) => {
        const inverted = invertFraction(box.ratio);
        return addFractions(sum, inverted);
      },
      createFraction(0, 1)
    );

    combinedRatio = invertFraction(invertedSum);
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
  if (box.type === 'single') {
    const { numerator, denominator } = box.ratio;

    if (containerDirection === 'horizontal') {
      const width = containerSize;
      const height = (containerSize * denominator) / numerator;
      return { width, height, content: box.content };
    } else {
      const height = containerSize;
      const width = (containerSize * numerator) / denominator;
      return { width, height, content: box.content };
    }
  }

  if (!box.children || box.children.length === 0) {
    throw new Error('Combined box must have children');
  }

  const direction = box.direction!;
  const { numerator, denominator } = box.ratio;
  const childCount = box.children.length;

  // Calculate total gap space between children
  const totalGapSpace = childCount > 1 ? (childCount - 1) * gap : 0;

  let sharedDimension: number;

  if (containerDirection === 'horizontal') {
    sharedDimension =
      direction === 'horizontal' ? (containerSize * denominator) / numerator : containerSize;
  } else {
    sharedDimension =
      direction === 'horizontal' ? containerSize : (containerSize * numerator) / denominator;
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
      // Fallback: distribute width equally among children (don't scale)
      const equalWidth = containerSize / solvedChildren.length;
      const scaledChildren = solvedChildren.map(child => ({
        ...child,
        width: equalWidth,
      }));
      return { width: containerSize, height: sharedDimension, children: scaledChildren };
    }

    // Scale widths proportionally to ensure total equals containerSize
    // This handles any rounding errors from fraction math
    const scaleFactor = containerSize / calculatedWidth;

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
  chunkSize: number = LAYOUT.defaultChunkSize
): CalculatedContentSize[] {
  const gap = LAYOUT.gridGap;
  const halfGap = gap / 2; // Container's padding-left = 0.4rem = 6.4px
  const main = items[0];
  const sec1 = items[1];
  const sec2 = items[2];

  if (!main || !sec1 || !sec2) {
    return calculateStandardRowSizes(items, rowWidth, chunkSize);
  }

  // For main-stacked patterns, items are already selected by pattern registry
  // We don't have original prev/next context, so pass undefined
  const mainBox = createBoxFromContent(main, chunkSize);
  const sec1Box = createBoxFromContent(sec1, chunkSize);
  const sec2Box = createBoxFromContent(sec2, chunkSize);

  const verticalStackBox = combineBoxes([sec1Box, sec2Box], 'vertical');
  const rowBox = combineBoxes([mainBox, verticalStackBox], 'horizontal');
  // Solve with full rowWidth (main's padding-right is inside its border-box)
  // Pass gap for vertical stack height calculations (CSS gap creates actual space between stacked items)
  const solved = solveBox(rowBox, rowWidth, 'horizontal', gap);

  const results = extractCalculatedSizes(solved);

  // Reduce stacked items' widths by container's padding-left (halfGap)
  // The first item is main (keep its width), remaining items are stacked (reduce widths)
  const adjustedResults = results.map((item, index) => {
    if (index === 0) {
      // Main image - width is correct (padding-right is inside its border-box)
      return item;
    }
    // Stacked items - reduce width to fit within container's content area
    return { ...item, width: item.width - halfGap };
  });

  return adjustedResults;
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
 */
const SIZE_CALCULATORS: Record<
  PatternType,
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
