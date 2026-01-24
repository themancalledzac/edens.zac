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
import { getContentDimensions, hasImage, isContentImage } from '@/app/utils/contentTypeGuards';
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
 * Get aspect ratio for content item
 */
function getAspectRatio(item: AnyContentModel): number {
  if (!hasImage(item)) return 1.0;

  const { width, height } = getContentDimensions(item);
  if (width <= 0 || height <= 0) return 1.0;

  return width / height;
}

/**
 * Check if content is vertical/square (aspect ratio <= 1.0, excluding tall panoramas)
 */
function isVertical(item: AnyContentModel): boolean {
  const ratio = getAspectRatio(item);
  return ratio <= 1.0 && ratio > 0.5;
}

/**
 * Get slot width for content item (based on rating, aspect ratio, and context)
 */
function getSlotWidth(
  item: AnyContentModel,
  chunkSize: number,
  prevItem?: AnyContentModel,
  nextItem?: AnyContentModel
): number {
  const halfSlot = Math.floor(chunkSize / 2);

  // Header items (cover image & metadata) always fill half the row each
  if (item.id === -1 || item.id === -2) {
    return halfSlot;
  }

  // Collection cards (with slug for navigation) get half slot
  if ('slug' in item && item.slug) {
    return halfSlot;
  }

  const ratio = getAspectRatio(item);
  const isHoriz = ratio > 1.0;

  // Wide panorama → standalone if 3+ star, halfSlot if 0-2 star
  if (ratio >= 2) {
    if (isContentImage(item)) {
      const rating = item.rating || 0;
      return rating >= 3 ? Infinity : halfSlot;
    }
    return Infinity;
  }

  // Tall panorama → normal slot
  if (ratio <= 0.5) return 1;

  // Rating-based logic (only for images with ratings)
  if (isContentImage(item)) {
    const rating = item.rating || 0;

    if (isHoriz) {
      // 5-star horizontal → always standalone
      if (rating === 5) return Infinity;

      // 4-star horizontal → standalone unless adjacent to vertical
      if (rating === 4) {
        const adjacentToVertical =
          (prevItem && isVertical(prevItem)) || (nextItem && isVertical(nextItem));
        return adjacentToVertical ? halfSlot : Infinity;
      }

      // 3-star horizontal → half slot
      if (rating === 3) return halfSlot;

      // 1-2 star horizontal → normal
      return 1;
    } else {
      // Vertical images
      // 3+ star vertical → half slot
      if (rating >= 3) return halfSlot;

      // 1-2 star vertical → normal
      return 1;
    }
  }

  return 1;
}

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
      rating: isContentImage(item) ? (item.rating || 0) : 0,
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
    const windowEnd = Math.min(content.length, pointer + 5);
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
 * Get fraction from content item using existing getContentDimensions
 */
function getContentFraction(content: AnyContentModel): Fraction {
  const { width, height } = getContentDimensions(content);
  return createFraction(width, Math.max(1, height));
}

/**
 * Simplify a fraction to lowest terms
 */
function simplifyFraction(f: Fraction): Fraction {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(Math.abs(f.numerator), Math.abs(f.denominator));
  if (divisor === 0) return f;
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
 */
function createBoxFromContent(content: AnyContentModel): Box {
  const ratio = getContentFraction(content);
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
 * Solve a box tree to get actual pixel dimensions
 */
function solveBox(
  box: Box,
  containerSize: number,
  containerDirection: 'horizontal' | 'vertical' = 'horizontal'
): SolvedBox {
  if (box.type === 'single') {
    const { numerator, denominator } = box.ratio;

    if (containerDirection === 'horizontal') {
      const width = containerSize;
      const height = (containerSize * denominator) / numerator;
      return {
        width,
        height,
        content: box.content,
      };
    } else {
      const height = containerSize;
      const width = (containerSize * numerator) / denominator;
      return {
        width,
        height,
        content: box.content,
      };
    }
  }

  if (!box.children || box.children.length === 0) {
    throw new Error('Combined box must have children');
  }

  const direction = box.direction!;
  const { numerator, denominator } = box.ratio;

  let sharedDimension: number;

  if (containerDirection === 'horizontal') {
    sharedDimension =
      direction === 'horizontal' ? (containerSize * denominator) / numerator : containerSize;
  } else {
    sharedDimension =
      direction === 'horizontal' ? containerSize : (containerSize * numerator) / denominator;
  }

  const solvedChildren = box.children.map(child => {
    const childDirection = direction === 'horizontal' ? 'horizontal' : 'vertical';
    return solveBox(child, sharedDimension, childDirection);
  });

  if (direction === 'horizontal') {
    const width = solvedChildren.reduce((sum, child) => sum + child.width, 0);
    const height = sharedDimension;
    return { width, height, children: solvedChildren };
  } else {
    const width = sharedDimension;
    const height = solvedChildren.reduce((sum, child) => sum + child.height, 0);
    return { width, height, children: solvedChildren };
  }
}

/**
 * Extract CalculatedContentSize array from solved box tree
 */
function extractCalculatedSizes(solved: SolvedBox): CalculatedContentSize[] {
  if (solved.content) {
    return [
      {
        content: solved.content,
        width: solved.width,
        height: solved.height,
      },
    ];
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
 */
function calculateMainStackedSizes(
  items: AnyContentModel[],
  rowWidth: number
): CalculatedContentSize[] {
  const main = items[0];
  const sec1 = items[1];
  const sec2 = items[2];

  if (!main || !sec1 || !sec2) {
    return calculateStandardRowSizes(items, rowWidth);
  }

  const mainBox = createBoxFromContent(main);
  const sec1Box = createBoxFromContent(sec1);
  const sec2Box = createBoxFromContent(sec2);

  const verticalStackBox = combineBoxes([sec1Box, sec2Box], 'vertical');
  const rowBox = combineBoxes([mainBox, verticalStackBox], 'horizontal');
  const solved = solveBox(rowBox, rowWidth, 'horizontal');

  return extractCalculatedSizes(solved);
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

  return [
    {
      content: item,
      width: rowWidth,
      height: rowWidth / ratio,
    },
  ];
}

/**
 * Calculate dimensions for standard horizontal row
 */
function calculateStandardRowSizes(
  items: AnyContentModel[],
  rowWidth: number
): CalculatedContentSize[] {
  if (items.length === 0) return [];

  if (items.length === 1) {
    return calculateStandaloneSizes(items, rowWidth);
  }

  const boxes = items.map(item => createBoxFromContent(item));
  const rowBox = combineBoxes(boxes, 'horizontal');
  const solved = solveBox(rowBox, rowWidth, 'horizontal');

  return extractCalculatedSizes(solved);
}

/**
 * Size calculator lookup by pattern type
 */
const SIZE_CALCULATORS: Record<PatternType, (items: AnyContentModel[], rowWidth: number) => CalculatedContentSize[]> = {
  'standalone': calculateStandaloneSizes,
  'main-stacked': calculateMainStackedSizes,
  'panorama-vertical': calculateMainStackedSizes,
  'five-star-vertical-2v': calculateMainStackedSizes,
  'five-star-vertical-2h': calculateMainStackedSizes,
  'five-star-vertical-mixed': calculateMainStackedSizes,
  'standard': calculateStandardRowSizes,
};

// ===================== Public API: Size Calculation =====================

/**
 * Calculate sizes for a row using pattern metadata
 * Primary API - use when you have pattern information
 *
 * @param row - Row with pattern metadata
 * @param rowWidth - Total available width for the row
 * @returns Calculated dimensions for all items in the row
 */
export function calculateRowSizesFromPattern(
  row: RowWithPattern,
  rowWidth: number
): CalculatedContentSize[] {
  const calculator = SIZE_CALCULATORS[row.pattern.type];
  return calculator(row.items, rowWidth);
}

/**
 * Calculate sizes for a single row
 * Legacy API - re-detects pattern from items
 *
 * @param row - Array of content items in the row
 * @param rowWidth - Total available width for the row
 * @returns Calculated dimensions for all items in the row
 */
export function calculateRowSizes(
  row: AnyContentModel[],
  rowWidth: number
): CalculatedContentSize[] {
  if (row.length === 0) return [];

  // Detect pattern for legacy API
  if (row.length === 3) {
    const main = row[0];
    if (main && isContentImage(main)) {
      const rating = main.rating || 0;
      // 5-star vertical patterns or 3-4 star main-stacked
      if ((rating === 5 && isVertical(main)) || (rating >= 3 && rating <= 4)) {
        return calculateMainStackedSizes(row, rowWidth);
      }
    }
  }

  return calculateStandardRowSizes(row, rowWidth);
}
