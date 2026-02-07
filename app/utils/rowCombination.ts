/**
 * Row Combination - Pattern-Based Row Building
 *
 * Defines the CombinationPattern enum, PatternDef types, PATTERN_TABLE lookup,
 * and core utility functions for the row-first layout algorithm.
 *
 * Key concepts:
 * - A "component" is anything that occupies row space: a single image, gif, text, or combined block.
 * - Component value = proportion of row width an item occupies (effectiveRating / rowWidth).
 * - A row is "complete" when total component values >= 0.9 (90% threshold).
 * - Patterns are declarative data entries checked by a single generic matchPattern() function.
 */

import type { AnyContentModel } from '@/app/types/Content';
import {
  getEffectiveRating,
  getItemComponentValue,
} from '@/app/utils/contentRatingUtils';
import { getAspectRatio } from '@/app/utils/contentTypeGuards';

// =============================================================================
// TYPES
// =============================================================================

/** Orientation classification for pattern matching */
export type Orientation = 'horizontal' | 'vertical';

/** A single requirement within a pattern definition */
export interface PatternRequirement {
  orientation?: Orientation;
  minRating: number;
  maxRating?: number;
}

/** Recursive tree structure for rendering combinations */
export type BoxTree =
  | { type: 'leaf'; content: AnyContentModel }
  | {
      type: 'combined';
      direction: 'horizontal' | 'vertical';
      children: [BoxTree, BoxTree]
    };

/** Layout descriptor for how a row should be rendered */
export interface HorizontalLayout {
  type: 'horizontal';
}

export interface MainStackedLayout {
  type: 'main-stacked';
  mainIndex: number; // Index within components array (typically 0)
  stackedIndices: [number, number]; // Indices of items to stack (typically [1, 2])
}

export interface NestedQuadLayout {
  type: 'nested-quad';
  mainIndex: number; // Index of the dominant image (full row height)
  topPairIndices: [number, number]; // Indices of items in the top horizontal pair
  bottomIndex: number; // Index of the bottom item
}

export interface CompoundHeroLayout {
  type: 'compound-hero';
  heroIndex: number; // Index of the H5★ hero image (full width)
  heroPosition: 'top' | 'bottom'; // Where hero appears in the compound row
  supportingIndices: number[]; // Indices of supporting items (horizontal row)
}

export type LayoutDescriptor = HorizontalLayout | MainStackedLayout | NestedQuadLayout | CompoundHeroLayout;

/** Defines a known-good combination pattern */
export interface PatternDef {
  requires: PatternRequirement[];
  direction: 'horizontal' | 'vertical' | null;
  layout: LayoutDescriptor; // Single source of truth for pattern rendering
  /** Ideal proximity for Rule 2 pattern matching (0 = same rating only) */
  ratingProximity?: number;
  /** Absolute max proximity for Rule 3 fallback — prevents absurd pairings like H5*+H0* */
  maxProximity?: number;
  minRowWidth: number;
  flexible?: boolean;
}

/** Result of a successful pattern match */
export interface MatchResult {
  patternName: CombinationPattern;
  usedIndices: number[];
  components: AnyContentModel[];
  direction: 'horizontal' | 'vertical' | null;
  layout?: LayoutDescriptor; // Optional custom layout (e.g., nested-quad for 4-item FORCE_FILL)
}

// =============================================================================
// COMBINATION PATTERN ENUM
// =============================================================================

export enum CombinationPattern {
  STANDALONE = 'STANDALONE',
  COMPOUND_HERO = 'COMPOUND_HERO',
  HORIZONTAL_PAIR = 'HORIZONTAL_PAIR',
  VERTICAL_PAIR = 'VERTICAL_PAIR',
  DOMINANT_SECONDARY = 'DOMINANT_SECONDARY',
  TRIPLE_HORIZONTAL = 'TRIPLE_HORIZONTAL',
  MULTI_SMALL = 'MULTI_SMALL',
  DOMINANT_VERTICAL_PAIR = 'DOMINANT_VERTICAL_PAIR',
  FORCE_FILL = 'FORCE_FILL',
}

// =============================================================================
// PATTERN TABLE
// =============================================================================

/** Patterns that can be matched by the pattern matcher (excludes FORCE_FILL) */
export type MatchablePattern = Exclude<CombinationPattern, CombinationPattern.FORCE_FILL>;

export const PATTERN_TABLE: Record<MatchablePattern, PatternDef> = {
  [CombinationPattern.STANDALONE]: {
    requires: [{ orientation: 'horizontal', minRating: 5 }],
    direction: null,
    layout: { type: 'horizontal' },
    minRowWidth: 5,
  },

  [CombinationPattern.COMPOUND_HERO]: {
    requires: [
      { orientation: 'horizontal', minRating: 5 }, // H5★ hero (can be anywhere in match)
      { minRating: 0, maxRating: 3 }, // Supporting items (3 low-rated items needed for ~90%+ fill)
      { minRating: 0, maxRating: 3 },
      { minRating: 0, maxRating: 3 },
    ],
    direction: null, // Compound layout (vertical stack with hero + horizontal row)
    layout: { type: 'compound-hero', heroIndex: 0, heroPosition: 'top', supportingIndices: [1, 2, 3] },
    minRowWidth: 5,
  },

  [CombinationPattern.HORIZONTAL_PAIR]: {
    requires: [
      { orientation: 'horizontal', minRating: 3, maxRating: 4 },
      { orientation: 'horizontal', minRating: 3, maxRating: 4 },
    ],
    direction: 'horizontal',
    layout: { type: 'horizontal' },
    ratingProximity: 1,
    minRowWidth: 4,
  },

  [CombinationPattern.VERTICAL_PAIR]: {
    requires: [
      { orientation: 'vertical', minRating: 0, maxRating: 4 },
      { orientation: 'vertical', minRating: 0, maxRating: 4 },
    ],
    direction: 'horizontal',
    layout: { type: 'horizontal' },
    ratingProximity: 0,
    maxProximity: 2,
    minRowWidth: 4,
  },

  [CombinationPattern.DOMINANT_SECONDARY]: {
    requires: [
      { orientation: 'horizontal', minRating: 4 },
      { orientation: 'vertical', minRating: 0, maxRating: 3 },
    ],
    direction: 'horizontal',
    layout: { type: 'horizontal' },
    maxProximity: 3,
    minRowWidth: 4,
  },

  [CombinationPattern.TRIPLE_HORIZONTAL]: {
    requires: [
      { orientation: 'horizontal', minRating: 2, maxRating: 3 },
      { orientation: 'horizontal', minRating: 2, maxRating: 3 },
      { orientation: 'horizontal', minRating: 2, maxRating: 3 },
    ],
    direction: 'horizontal',
    layout: { type: 'horizontal' },
    ratingProximity: 0,
    maxProximity: 1,
    minRowWidth: 5,
  },

  [CombinationPattern.MULTI_SMALL]: {
    requires: [
      { minRating: 0, maxRating: 2 },
      { minRating: 0, maxRating: 2 },
      { minRating: 0, maxRating: 2 },
    ],
    direction: 'horizontal',
    layout: { type: 'horizontal' },
    ratingProximity: 0,
    maxProximity: 2,
    minRowWidth: 3,
    flexible: true,
  },

  [CombinationPattern.DOMINANT_VERTICAL_PAIR]: {
    requires: [
      { orientation: 'horizontal', minRating: 4 },
      { minRating: 0, maxRating: 3 }, // Any orientation, effective 0-3 (catches V2★→eff 1, H3★, etc.)
      { minRating: 0, maxRating: 3 }, // Any orientation, effective 0-3
    ],
    direction: 'horizontal',
    layout: { type: 'main-stacked', mainIndex: 0, stackedIndices: [1, 2] },
    maxProximity: 3,
    minRowWidth: 5,
  },
};

/** Patterns ordered by priority (highest value first, Rule 1 gates all) */
export const PATTERNS_BY_PRIORITY: MatchablePattern[] = [
  CombinationPattern.COMPOUND_HERO,        // H5★ + 3 supporting (specific use of H5★)
  CombinationPattern.STANDALONE,           // H5★ alone (generic fallback)
  CombinationPattern.HORIZONTAL_PAIR,
  CombinationPattern.DOMINANT_VERTICAL_PAIR,
  CombinationPattern.DOMINANT_SECONDARY,
  CombinationPattern.VERTICAL_PAIR,
  CombinationPattern.TRIPLE_HORIZONTAL,
  CombinationPattern.MULTI_SMALL,
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the orientation of a content item.
 * Horizontal: aspect ratio > 1.0
 * Vertical: aspect ratio <= 1.0 (includes square)
 */
export function getOrientation(item: AnyContentModel): Orientation {
  const ar = getAspectRatio(item);
  return ar > 1.0 ? 'horizontal' : 'vertical';
}

/**
 * Get the effective rating for a content item in the context of pattern matching.
 * Uses the existing getEffectiveRating from contentRatingUtils but with
 * rowWidth as the slot width parameter.
 */
function getItemRating(item: AnyContentModel, rowWidth: number): number {
  return getEffectiveRating(item, rowWidth);
}

// =============================================================================
// isRowComplete
// =============================================================================

/** Minimum fill ratio for a row to be considered complete */
export const MIN_FILL_RATIO = 0.9;
/** Maximum fill ratio — rows exceeding this are rejected to prevent item squeezing */
export const MAX_FILL_RATIO = 1.15;

/**
 * Check if a set of components fills a row within acceptable bounds.
 *
 * A row is "complete" when fill is between 90% and 115% of row width.
 * The lower bound allows small gaps rather than forcing exact fits.
 * The upper bound prevents items from being squeezed far smaller than intended
 * (e.g., 150% fill means each item loses ~1/3 of its intended size).
 *
 * NOTE: COMPOUND_HERO pattern uses custom validation (see buildRows)
 *
 * @param components - Items to check
 * @param rowWidth - Row width budget (e.g., 5 for desktop)
 * @returns true if total component value is within 90-115% of row width
 */
export function isRowComplete(components: AnyContentModel[], rowWidth: number): boolean {
  if (components.length === 0) return false;

  const totalValue = components.reduce(
    (sum, item) => sum + getItemComponentValue(item, rowWidth),
    0
  );

  const fill = totalValue / rowWidth;
  return fill >= MIN_FILL_RATIO && fill <= MAX_FILL_RATIO;
}

// =============================================================================
// matchPattern
// =============================================================================

/**
 * Check if a single item satisfies a pattern requirement.
 */
function itemSatisfiesRequirement(
  item: AnyContentModel,
  req: PatternRequirement,
  rowWidth: number
): boolean {
  // Check orientation if specified
  if (req.orientation && getOrientation(item) !== req.orientation) {
    return false;
  }

  // Check rating bounds
  const rating = getItemRating(item, rowWidth);
  if (rating < req.minRating) return false;
  if (req.maxRating !== undefined && rating > req.maxRating) return false;

  return true;
}

/**
 * Generic pattern matcher: checks if items in a window satisfy a PatternDef.
 *
 * Uses a greedy assignment approach: for each requirement in the pattern,
 * finds the first unassigned item in the window that satisfies it.
 * Also enforces ratingProximity if specified.
 *
 * CRITICAL: To preserve item order (fix Issue 1), this matcher ONLY accepts
 * patterns that include item 0 (the first item in the window). This forces
 * sequential processing and prevents high-priority patterns from "jumping
 * the queue" and skipping over earlier items.
 *
 * EXCEPTION (Issue 8): STANDALONE pattern is allowed to skip a low-rated item
 * at position 0 if the component value is ≤ 1.67 (e.g., V1★, V2★, H2★ at rowWidth=5).
 * This prevents bad pairings like H5★+V1★ = 120% when H5★ should be standalone.
 *
 * @param patternName - The pattern enum value (for result labeling)
 * @param pattern - The pattern definition to match against
 * @param window - Available items to match (working window, typically 5 items)
 * @param rowWidth - Current row width budget
 * @returns MatchResult if pattern is satisfied, null otherwise
 */
export function matchPattern(
  patternName: CombinationPattern,
  pattern: PatternDef,
  window: AnyContentModel[],
  rowWidth: number
): MatchResult | null {
  // Quick exit: not enough items
  if (window.length < pattern.requires.length) return null;

  // Quick exit: row width too narrow for this pattern
  if (rowWidth < pattern.minRowWidth) return null;

  // CRITICAL: Determine start position for sequential matching
  // By default, start from position 0 (first item in window)
  // EXCEPTION: STANDALONE can skip position 0 if it's low-rated (≤2★)
  let startPosition = 0;

  if (patternName === CombinationPattern.STANDALONE && window[0]) {
    const item0Rating = getItemRating(window[0], rowWidth);
    const LOW_RATED_THRESHOLD = 2;

    // Allow skipping position 0 if it's low-rated (rating ≤ 2)
    // This prevents bad pairings like H5★+V1★ when H5★ should be standalone
    if (item0Rating <= LOW_RATED_THRESHOLD) {
      startPosition = 1; // Start searching from position 1
    }
  }

  // CRITICAL: Create candidate window from startPosition with size limit
  // STANDALONE can search a limited distance ahead (3 positions max)
  // This prevents long-distance grabs while still allowing reasonable lookahead
  // For all other patterns, allow searching pattern.requires.length + 3 positions ahead
  //
  // NOTE: window is already limited to 5 items, so candidateWindow can never
  // exceed that boundary regardless of maxWindowSize value
  const maxWindowSize =
    patternName === CombinationPattern.STANDALONE
      ? 3 // STANDALONE searches up to 3 positions (balances flexibility vs locality)
      : pattern.requires.length + 3; // Other patterns → reasonable search window

  const candidateWindow = window.slice(startPosition, startPosition + maxWindowSize);
  if (candidateWindow.length < pattern.requires.length) return null;

  const used = new Set<number>();
  const matchedIndices: number[] = []; // Relative to candidateWindow
  const matchedItems: AnyContentModel[] = [];

  // For each requirement, find the first matching unassigned item in candidateWindow
  for (const req of pattern.requires) {
    let found = false;
    for (let i = 0; i < candidateWindow.length; i++) {
      if (used.has(i)) continue;

      const item = candidateWindow[i];
      if (!item) continue;

      if (itemSatisfiesRequirement(item, req, rowWidth)) {
        used.add(i);
        matchedIndices.push(i); // Index in candidateWindow
        matchedItems.push(item);
        found = true;
        break;
      }
    }
    if (!found) return null;
  }

  // CRITICAL: If startPosition=0, matched items MUST include position 0
  // This prevents patterns from skipping position 0 when it's not low-rated
  // Example: Window [H4★, H5★] - STANDALONE cannot skip H4★ to grab H5★
  if (startPosition === 0 && !matchedIndices.includes(0)) {
    return null;
  }

  // CRITICAL: Enforce contiguous consumption within candidateWindow
  // Matched items must form a continuous range (no gaps)
  // Example: Can match [0, 1, 2] but NOT [0, 1, 4] (gap at 2-3)
  const sortedIndices = [...matchedIndices].sort((a, b) => a - b);
  for (let i = 1; i < sortedIndices.length; i++) {
    const current = sortedIndices[i];
    const previous = sortedIndices[i - 1];
    if (current === undefined || previous === undefined || current !== previous + 1) {
      // Non-contiguous match (has gaps) → reject pattern
      return null;
    }
  }

  // Enforce ratingProximity: all matched items must be within N stars of each other
  if (pattern.ratingProximity !== undefined) {
    const ratings = matchedItems.map(item => getItemRating(item, rowWidth));
    const minRating = Math.min(...ratings);
    const maxRating = Math.max(...ratings);
    if (maxRating - minRating > pattern.ratingProximity) {
      return null;
    }
  }

  // Convert matched indices back to original window positions
  const globalIndices = matchedIndices.map(idx => idx + startPosition);

  return {
    patternName,
    usedIndices: globalIndices,
    components: matchedItems,
    direction: pattern.direction,
  };
}

// =============================================================================
// forceCompleteRow
// =============================================================================

/**
 * Helper: calculate the total component value of a set of items.
 */
function getTotalCV(components: AnyContentModel[], rowWidth: number): number {
  return components.reduce(
    (sum, item) => sum + getItemComponentValue(item, rowWidth),
    0
  );
}


/**
 * Fallback row completion strategy (Rule 3).
 *
 * Tries sequential fill first (items 0, 1, 2, ...) to preserve original
 * item order. Falls back to best-fit selection only when the next sequential
 * item would overshoot past 115% while current fill is still under 90%.
 *
 * @param window - Available items (working window)
 * @param rowWidth - Current row width budget
 * @returns MatchResult with the forced row composition
 */
export function forceCompleteRow(
  window: AnyContentModel[],
  rowWidth: number
): MatchResult {
  if (window.length === 0) {
    throw new Error('forceCompleteRow called with empty window');
  }

  // --- Sequential fill attempt (preserves item order) ---
  let seqTotal = 0;
  let seqCount = 0;
  let seqFailed = false;

  for (let i = 0; i < window.length; i++) {
    const cv = getItemComponentValue(window[i]!, rowWidth);
    const newFill = (seqTotal + cv) / rowWidth;

    if (newFill > MAX_FILL_RATIO) {
      // Next item overshoots. If we're already at 90%+, return what we have.
      // Otherwise, sequential can't work — fall through to best-fit.
      seqFailed = (seqTotal / rowWidth) < MIN_FILL_RATIO;
      break;
    }

    seqTotal += cv;
    seqCount = i + 1;
    if (newFill >= MIN_FILL_RATIO) break;
  }

  if (!seqFailed && seqCount > 0) {
    console.log('[forceCompleteRow] Sequential fill succeeded with', seqCount, 'items');
    const seqComponents = window.slice(0, seqCount);
    const seqIndices = Array.from({ length: seqCount }, (_, i) => i);

    return {
      patternName: CombinationPattern.FORCE_FILL,
      usedIndices: seqIndices,
      components: seqComponents,
      direction: 'horizontal',
    };
  }

  // --- Best-fit fallback (may reorder items within window) ---
  const components: AnyContentModel[] = [];
  const usedIndices: number[] = [];
  const available = new Set(window.map((_, i) => i));

  // Always take item 0 first (preserve sequential order)
  const first = window[0]!;
  components.push(first);
  usedIndices.push(0);
  available.delete(0);

  // If item 0 alone completes the row, we're done
  if (!isRowComplete(components, rowWidth)) {
    // Pick best-fit items until row is complete or no items remain
    while (available.size > 0) {
      const currentTotal = getTotalCV(components, rowWidth);
      const remaining = rowWidth - currentTotal;

      // Find the item whose component value is closest to the remaining gap
      let bestIndex = -1;
      let bestDistance = Infinity;

      for (const idx of available) {
        const item = window[idx];
        if (!item) continue;
        const cv = getItemComponentValue(item, rowWidth);
        const distance = Math.abs(cv - remaining);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = idx;
        }
      }

      if (bestIndex === -1) break;

      // Check if adding this item would overfill beyond the cap
      const candidateCV = getItemComponentValue(window[bestIndex]!, rowWidth);
      const newTotal = currentTotal + candidateCV;
      const newFill = newTotal / rowWidth;

      if (newFill > MAX_FILL_RATIO) {
        // Adding this item overshoots. Compare: current underfill vs overfill with item.
        const currentFill = currentTotal / rowWidth;
        const underfillDistance = Math.abs(1.0 - currentFill);
        const overfillDistance = Math.abs(1.0 - newFill);

        if (currentFill >= MIN_FILL_RATIO || underfillDistance <= overfillDistance) {
          // Current state is already acceptable OR closer to 100% — stop here
          break;
        }
        // Overfill is closer to 100% — accept the item and stop
        components.push(window[bestIndex]!);
        usedIndices.push(bestIndex);
        break;
      }

      components.push(window[bestIndex]!);
      usedIndices.push(bestIndex);
      available.delete(bestIndex);

      if (isRowComplete(components, rowWidth)) {
        break;
      }
    }
  }

  // If we've exhausted the window and still not complete, that's acceptable
  // (final row exception to Rule 1)

  return {
    patternName: CombinationPattern.FORCE_FILL,
    usedIndices,
    components,
    direction: 'horizontal',
  };
}

// =============================================================================
// buildRows
// =============================================================================

/** A row result from the row-building algorithm */
export interface RowResult {
  components: AnyContentModel[];
  direction: 'horizontal' | 'vertical' | null;
  patternName: CombinationPattern;
  layout: LayoutDescriptor; // Layout metadata for rendering (KEPT for migration safety)
  boxTree: BoxTree; // NEW: Recursive rendering tree
}

// =============================================================================
// BOX TREE GENERATION
// =============================================================================

/**
 * Creates a BoxTree from a pattern match result.
 *
 * The BoxTree is a recursive structure that represents how components should be
 * combined for rendering. Each leaf is a single content item, and each combined
 * node specifies horizontal or vertical arrangement of its children.
 *
 * @param pattern - The matched pattern type
 * @param components - The components that matched the pattern
 * @param layout - The layout descriptor (contains indices for complex layouts)
 * @returns BoxTree representing the render structure
 */
function createBoxTreeFromPattern(
  pattern: CombinationPattern,
  components: AnyContentModel[],
  layout: LayoutDescriptor
): BoxTree {
  // STANDALONE: single leaf
  if (pattern === CombinationPattern.STANDALONE) {
    return { type: 'leaf', content: components[0]! };
  }

  // COMPOUND_HERO: hero (full width) + supporting items (horizontal row)
  // Stacked vertically: hero at top or bottom based on original sequence
  if (pattern === CombinationPattern.COMPOUND_HERO && layout.type === 'compound-hero') {
    const { heroIndex, supportingIndices, heroPosition } = layout;
    const hero = components[heroIndex]!;
    const supporting = supportingIndices.map(idx => components[idx]!);

    console.log('[COMPOUND_HERO BoxTree] Building tree for', supporting.length, 'supporting items');
    console.log('[COMPOUND_HERO BoxTree] Hero position:', heroPosition);
    console.log('[COMPOUND_HERO BoxTree] Supporting IDs:', supporting.map(s => s.id));

    // Build left-heavy horizontal tree for supporting items: (((A + B) + C) + D) ...
    const buildHorizontalTree = (items: AnyContentModel[]): BoxTree => {
      if (items.length === 1) {
        return { type: 'leaf', content: items[0]! };
      }
      if (items.length === 2) {
        return {
          type: 'combined',
          direction: 'horizontal',
          children: [
            { type: 'leaf', content: items[0]! },
            { type: 'leaf', content: items[1]! }
          ]
        };
      }
      // 3+ items: build left-heavy tree by adding items one at a time
      // Result: (((A + B) + C) + D) + E ...
      let tree: BoxTree = {
        type: 'combined',
        direction: 'horizontal',
        children: [
          { type: 'leaf', content: items[0]! },
          { type: 'leaf', content: items[1]! }
        ]
      };

      for (let i = 2; i < items.length; i++) {
        tree = {
          type: 'combined',
          direction: 'horizontal',
          children: [tree, { type: 'leaf', content: items[i]! }]
        };
      }

      return tree;
    };

    const heroLeaf: BoxTree = { type: 'leaf', content: hero };
    const supportingTree = buildHorizontalTree(supporting);

    // Debug: Print tree structure
    const printTree = (tree: BoxTree, depth: number = 0): string => {
      const indent = '  '.repeat(depth);
      if (tree.type === 'leaf') {
        return `${indent}LEAF(${tree.content.id})`;
      }
      return `${indent}${tree.direction}\n${printTree(tree.children[0], depth + 1)}\n${printTree(tree.children[1], depth + 1)}`;
    };
    console.log('[COMPOUND_HERO BoxTree] Supporting tree structure:\n' + printTree(supportingTree));

    // Stack vertically: hero at top or bottom
    const result: BoxTree = {
      type: 'combined' as const,
      direction: 'vertical' as const,
      children: (heroPosition === 'top'
        ? [heroLeaf, supportingTree]
        : [supportingTree, heroLeaf]) as [BoxTree, BoxTree]
    };

    console.log('[COMPOUND_HERO BoxTree] Final tree structure:\n' + printTree(result));
    return result;
  }

  // HORIZONTAL_PAIR: two leaves side-by-side
  if (pattern === CombinationPattern.HORIZONTAL_PAIR) {
    return {
      type: 'combined',
      direction: 'horizontal',
      children: [
        { type: 'leaf', content: components[0]! },
        { type: 'leaf', content: components[1]! }
      ]
    };
  }

  // VERTICAL_PAIR: two leaves stacked vertically
  if (pattern === CombinationPattern.VERTICAL_PAIR) {
    return {
      type: 'combined',
      direction: 'horizontal',
      children: [
        { type: 'leaf', content: components[0]! },
        { type: 'leaf', content: components[1]! }
      ]
    };
  }

  // DOMINANT_SECONDARY: dominant + secondary side-by-side
  if (pattern === CombinationPattern.DOMINANT_SECONDARY) {
    return {
      type: 'combined',
      direction: 'horizontal',
      children: [
        { type: 'leaf', content: components[0]! },
        { type: 'leaf', content: components[1]! }
      ]
    };
  }

  // DOMINANT_VERTICAL_PAIR (main-stacked): main | (top / bottom)
  if (pattern === CombinationPattern.DOMINANT_VERTICAL_PAIR && layout.type === 'main-stacked') {
    const { mainIndex, stackedIndices } = layout;
    return {
      type: 'combined',
      direction: 'horizontal',
      children: [
        { type: 'leaf', content: components[mainIndex]! }, // Left: main
        {
          type: 'combined',
          direction: 'vertical',
          children: [
            { type: 'leaf', content: components[stackedIndices[0]]! }, // Top
            { type: 'leaf', content: components[stackedIndices[1]]! }  // Bottom
          ]
        }
      ]
    };
  }

  // NESTED_QUAD: main | (topPair / bottom)
  if (layout.type === 'nested-quad') {
    const { mainIndex, topPairIndices, bottomIndex } = layout;
    return {
      type: 'combined',
      direction: 'horizontal',
      children: [
        { type: 'leaf', content: components[mainIndex]! }, // Left: main
        {
          type: 'combined',
          direction: 'vertical',
          children: [
            {
              type: 'combined',
              direction: 'horizontal',
              children: [
                { type: 'leaf', content: components[topPairIndices[0]]! }, // Top-left
                { type: 'leaf', content: components[topPairIndices[1]]! }  // Top-right
              ]
            },
            { type: 'leaf', content: components[bottomIndex]! } // Bottom
          ]
        }
      ]
    };
  }

  // TRIPLE_HORIZONTAL: three items side-by-side
  if (pattern === CombinationPattern.TRIPLE_HORIZONTAL && components.length === 3) {
    return {
      type: 'combined',
      direction: 'horizontal',
      children: [
        {
          type: 'combined',
          direction: 'horizontal',
          children: [
            { type: 'leaf', content: components[0]! },
            { type: 'leaf', content: components[1]! }
          ]
        },
        { type: 'leaf', content: components[2]! }
      ]
    };
  }

  // MULTI_SMALL / FORCE_FILL: chain items horizontally
  // Handle 2+ items by building a left-heavy tree: ((A + B) + C) + D ...
  if (components.length === 2) {
    return {
      type: 'combined',
      direction: 'horizontal',
      children: [
        { type: 'leaf', content: components[0]! },
        { type: 'leaf', content: components[1]! }
      ]
    };
  }

  // For 3+ items, build left-heavy horizontal tree
  if (components.length >= 3) {
    let tree: BoxTree = {
      type: 'combined',
      direction: 'horizontal',
      children: [
        { type: 'leaf', content: components[0]! },
        { type: 'leaf', content: components[1]! }
      ]
    };

    for (let i = 2; i < components.length; i++) {
      tree = {
        type: 'combined',
        direction: 'horizontal',
        children: [tree, { type: 'leaf', content: components[i]! }]
      };
    }

    return tree;
  }

  // Single item fallback (shouldn't happen, but safe default)
  return { type: 'leaf', content: components[0]! };
}

/**
 * Row-first layout algorithm (Rule 1 > Rule 2 > Rule 3).
 *
 * Builds rows one at a time using a working window (lookahead of 5 items).
 * For each row:
 * 1. Try patterns in priority order (Rule 2)
 * 2. Only accept if the row is complete (Rule 1 gate)
 * 3. If no pattern works, force-fill the row (Rule 3)
 *
 * This prevents half-empty rows and ensures all items are used.
 *
 * @param items - All content items to layout
 * @param rowWidth - Row width budget (5 for desktop, 4 for tablet, etc.)
 * @returns Array of rows, each with components and their combination direction
 */
export function buildRows(
  items: AnyContentModel[],
  rowWidth: number
): RowResult[] {
  console.log('[buildRows] Starting with', items.length, 'items, rowWidth=', rowWidth);
  const rows: RowResult[] = [];
  const remaining = [...items];

  while (remaining.length > 0) {
    const window = remaining.slice(0, 5); // Working window (lookahead)
    console.log('[buildRows] Window size:', window.length, 'items');

    // RULE 2: Try patterns in priority order
    let matched = false;
    for (const patternName of PATTERNS_BY_PRIORITY) {
      const pattern = PATTERN_TABLE[patternName];
      if (!pattern) continue;

      const match = matchPattern(patternName, pattern, window, rowWidth);

      // Debug: Log COMPOUND_HERO attempts
      if (patternName === CombinationPattern.COMPOUND_HERO) {
        console.log('[COMPOUND_HERO Debug] Match result:', match ? 'MATCHED' : 'NULL', {
          windowIds: window.map(w => w.id),
          windowRatings: window.map(w => getItemRating(w, rowWidth)),
        });
      }

      // RULE 1 gate: Only accept if row is complete
      // SPECIAL: COMPOUND_HERO validates supporting row separately
      let isComplete = false;
      if (match) {
        if (match.patternName === CombinationPattern.COMPOUND_HERO) {
          // For COMPOUND_HERO: hero is always 100% (H5★), only validate supporting items
          const heroIndex = match.components.findIndex(
            item => getOrientation(item) === 'horizontal' && getItemRating(item, rowWidth) === 5
          );
          const supporting = match.components.filter((_, idx) => idx !== heroIndex);
          isComplete = supporting.length === 3 && isRowComplete(supporting, rowWidth);
        } else {
          isComplete = isRowComplete(match.components, rowWidth);
        }
      }

      if (match && isComplete) {
        console.log('[buildRows] Pattern matched:', patternName, 'with', match.components.length, 'items');

        // COMPOUND_HERO: Dynamically determine hero position based on sequence
        let customLayout: LayoutDescriptor = pattern.layout;
        if (match.patternName === CombinationPattern.COMPOUND_HERO) {
          // Find H5★ hero in matched components
          const heroIndex = match.components.findIndex(
            item => getOrientation(item) === 'horizontal' && getItemRating(item, rowWidth) === 5
          );

          if (heroIndex !== -1) {
            const supportingIndices = match.components
              .map((_, idx) => idx)
              .filter(idx => idx !== heroIndex);

            // Determine position based on hero's original window position
            const heroWindowIndex = match.usedIndices[heroIndex] || 0;
            const minUsedIndex = Math.min(...match.usedIndices);

            // Hero at start of consumed range → top; hero at end → bottom
            const isHeroAtStart = heroWindowIndex === minUsedIndex;
            const heroPosition: 'top' | 'bottom' = isHeroAtStart ? 'top' : 'bottom';

            customLayout = {
              type: 'compound-hero',
              heroIndex,
              heroPosition,
              supportingIndices,
            };

            console.log('[buildRows] 🎯 COMPOUND_HERO matched!', {
              heroIndex,
              heroPosition,
              supportingCount: supportingIndices.length,
              usedIndices: match.usedIndices,
              componentRatings: match.components.map(c => getItemRating(c, rowWidth)),
            });
          }
        }

        // Generate BoxTree for rendering
        const boxTree = createBoxTreeFromPattern(
          match.patternName,
          match.components,
          customLayout
        );

        rows.push({
          components: match.components,
          direction: match.direction,
          patternName: match.patternName,
          layout: customLayout,
          boxTree,
        });

        // Remove used items from remaining (in reverse order to preserve indices)
        const sortedIndices = [...match.usedIndices].sort((a, b) => b - a);
        for (const idx of sortedIndices) {
          remaining.splice(idx, 1);
        }

        matched = true;
        break;
      }
    }

    // RULE 3: Fallback — force-fill the row
    if (!matched) {
      const forced = forceCompleteRow(window, rowWidth);
      const forcedLayout = forced.layout ?? { type: 'horizontal' };

      // Generate BoxTree for rendering
      const boxTree = createBoxTreeFromPattern(
        forced.patternName,
        forced.components,
        forcedLayout
      );

      rows.push({
        components: forced.components,
        direction: forced.direction,
        patternName: forced.patternName,
        layout: forcedLayout, // Use custom layout if provided, else horizontal
        boxTree,
      });

      // Remove used items
      const sortedIndices = [...forced.usedIndices].sort((a, b) => b - a);
      for (const idx of sortedIndices) {
        remaining.splice(idx, 1);
      }
    }
  }

  return rows;
}
