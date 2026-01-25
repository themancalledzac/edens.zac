/**
 * Row Structure Algorithm
 *
 * Two-part layout system:
 * 1. createRowsArray() - Organizes content into rows based on patterns
 * 2. calculateRowSizes() - Calculates pixel dimensions for each row
 *
 * Uses a Pattern Registry for extensible pattern detection and
 * fraction-based box combination for precise aspect ratio calculations.
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
import {
  PATTERN_REGISTRY,
  type PatternResult,
  type PatternType,
  type WindowItem,
} from '@/app/utils/patternRegistry';

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
 * Build window items with metadata
 */
function buildWindowItems(
  window: AnyContentModel[],
  windowStart: number,
  chunkSize: number
): WindowItem[] {
  return window.map((item, windowIdx) => {
    const originalIdx = windowStart + windowIdx;
    const prevItem = windowIdx > 0 ? window[windowIdx - 1] : undefined;
    const nextItem = windowIdx < window.length - 1 ? window[windowIdx + 1] : undefined;

    const aspectRatio = getAspectRatio(item);
    const slotWidth = getSlotWidth(item, chunkSize, prevItem, nextItem);

    return {
      item,
      windowIndex: windowIdx,
      originalIndex: originalIdx,
      aspectRatio,
      isVertical: aspectRatio <= 1.0 && aspectRatio > 0.5,
      isHorizontal: aspectRatio > 1.0,
      isWidePanorama: aspectRatio >= 2.0,
      isTallPanorama: aspectRatio <= 0.5,
      rating: isContentImage(item) ? item.rating || 0 : 0,
      slotWidth,
    };
  });
}

// ===================== Pattern Detection =====================

/**
 * Detect optimal pattern in window using the registry
 */
function detectPatternInWindow(
  window: AnyContentModel[],
  windowStart: number,
  chunkSize: number
): PatternResult {
  if (window.length === 0) {
    throw new Error('Empty window');
  }

  const windowItems = buildWindowItems(window, windowStart, chunkSize);

  // Try patterns in priority order
  for (const matcher of PATTERN_REGISTRY) {
    if (windowItems.length < matcher.minItems) continue;
    if (!matcher.canMatch(windowItems)) continue;

    const result = matcher.match(windowItems, windowStart);
    if (result) {
      return result;
    }
  }

  // Should never reach here since standard always matches
  throw new Error('No pattern matched - this should not happen');
}

/**
 * Build row items from pattern result
 */
function buildRowFromPattern(
  content: AnyContentModel[],
  pattern: PatternResult
): AnyContentModel[] {
  // For patterns with main + secondaries, preserve that order
  if ('mainIndex' in pattern && 'secondaryIndices' in pattern) {
    const main = content[pattern.mainIndex];
    const sec1 = content[pattern.secondaryIndices[0]];
    const sec2 = content[pattern.secondaryIndices[1]];

    const items: AnyContentModel[] = [];
    if (main) items.push(main);
    if (sec1) items.push(sec1);
    if (sec2) items.push(sec2);
    return items;
  }

  // For standalone and standard, use indices order
  return pattern.indices
    .map(idx => content[idx])
    .filter((item): item is AnyContentModel => item !== undefined);
}

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
  chunkSize: number = LAYOUT.defaultChunkSize
): RowWithPattern[] {
  if (!content || content.length === 0) return [];

  const result: RowWithPattern[] = [];
  let pointer = 0;

  while (pointer < content.length) {
    const windowEnd = Math.min(content.length, pointer + LAYOUT.patternWindowSize);
    const window = content.slice(pointer, windowEnd);

    if (window.length === 0) break;

    const pattern = detectPatternInWindow(window, pointer, chunkSize);
    const items = buildRowFromPattern(content, pattern);

    if (items.length > 0) {
      result.push({ pattern, items });
    }

    // Advance pointer past consumed items
    const consumedIndices = [...pattern.indices].sort((a, b) => a - b);
    const lastConsumedIndex = consumedIndices[consumedIndices.length - 1];
    if (lastConsumedIndex === undefined) break;
    pointer = lastConsumedIndex + 1;
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
    console.warn('Invalid fraction input:', f);
    return { numerator: 1, denominator: 1 };
  }

  if (f.denominator === 0) {
    console.warn('Division by zero in fraction:', f);
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
    console.error('[scaleSolvedBoxWidths] Invalid scaled width:', {
      originalWidth: box.width,
      scaleFactor,
      scaledWidth,
      contentId: box.content?.id,
    });
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

    // DEBUG: Log values to trace issue
    if (!Number.isFinite(calculatedWidth) || calculatedWidth === 0) {
      console.error('[solveBox] Invalid calculatedWidth:', {
        calculatedWidth,
        containerSize,
        childCount: solvedChildren.length,
        childWidths: solvedChildren.map(c => c.width),
        direction,
      });
    }

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
      console.error('[solveBox] Invalid scaleFactor:', {
        scaleFactor,
        containerSize,
        calculatedWidth,
        direction,
      });
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
    const result = [{ content: solved.content, width: solved.width, height: solved.height }];
    // DEBUG: Check for NaN
    if (!Number.isFinite(solved.width) || !Number.isFinite(solved.height)) {
      console.error('[extractCalculatedSizes] NaN from solved box:', {
        contentId: solved.content.id,
        contentType: solved.content.contentType,
        width: solved.width,
        height: solved.height,
      });
    }
    return result;
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

  // DEBUG: Check for NaN
  if (!Number.isFinite(ratio) || !Number.isFinite(calculatedHeight)) {
    console.error('[calculateStandaloneSizes] NaN detected:', {
      contentId: item.id,
      contentType: item.contentType,
      width,
      height,
      ratio,
      rowWidth,
      calculatedHeight,
    });
  }

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
  const results = calculator(row.items, rowWidth, chunkSize);

  // DEBUG: Check for NaN in results
  for (const [idx, result] of results.entries()) {
    if (!Number.isFinite(result.width) || !Number.isFinite(result.height)) {
      console.error('[calculateRowSizesFromPattern] NaN in result:', {
        patternType: row.pattern.type,
        contentId: result.content.id,
        contentType: result.content.contentType,
        width: result.width,
        height: result.height,
        index: idx,
        rowWidth,
        chunkSize,
      });
    }
  }

  return results;
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
