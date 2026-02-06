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

/** Defines a known-good combination pattern */
export interface PatternDef {
  requires: PatternRequirement[];
  direction: 'horizontal' | 'vertical' | null;
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
}

// =============================================================================
// COMBINATION PATTERN ENUM
// =============================================================================

export enum CombinationPattern {
  STANDALONE = 'STANDALONE',
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

// TODO: Notes:
//  - Do we need a 'default of none' for things like `minRowWidth`?
//  - 

/** Patterns that can be matched by the pattern matcher (excludes FORCE_FILL) */
export type MatchablePattern = Exclude<CombinationPattern, CombinationPattern.FORCE_FILL>;

export const PATTERN_TABLE: Record<MatchablePattern, PatternDef> = {
  [CombinationPattern.STANDALONE]: {
    requires: [{ orientation: 'horizontal', minRating: 5 }],
    direction: null,
    minRowWidth: 5,
  },

  [CombinationPattern.VERTICAL_PAIR]: {
    requires: [
      { orientation: 'vertical', minRating: 0, maxRating: 4 },
      { orientation: 'vertical', minRating: 0, maxRating: 4 },
    ],
    direction: 'horizontal',
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
    ratingProximity: 0,
    maxProximity: 2,
    minRowWidth: 3,
    flexible: true,
  },

  [CombinationPattern.DOMINANT_VERTICAL_PAIR]: {
    requires: [
      { orientation: 'horizontal', minRating: 4 },
      { orientation: 'vertical', minRating: 2, maxRating: 3 },
      { orientation: 'vertical', minRating: 2, maxRating: 3 },
    ],
    direction: 'horizontal',
    maxProximity: 3,
    minRowWidth: 5,
  },
};

/** Patterns ordered by priority (highest value first, Rule 1 gates all) */
export const PATTERNS_BY_PRIORITY: MatchablePattern[] = [
  CombinationPattern.STANDALONE,
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

/**
 * Check if a set of components fills a row sufficiently.
 *
 * A row is "complete" when the sum of component values >= 0.9 (90% threshold).
 * This allows small gaps rather than forcing exact fits.
 *
 * @param components - Items to check
 * @param rowWidth - Row width budget (e.g., 5 for desktop)
 * @returns true if total component value >= 90% of row width
 */
export function isRowComplete(components: AnyContentModel[], rowWidth: number): boolean {
  if (components.length === 0) return false;

  const totalValue = components.reduce(
    (sum, item) => sum + getItemComponentValue(item, rowWidth),
    0
  );

  return totalValue / rowWidth >= 0.9;
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

  const used = new Set<number>();
  const matchedIndices: number[] = [];
  const matchedItems: AnyContentModel[] = [];

  // For each requirement, find the first matching unassigned item
  for (const req of pattern.requires) {
    let found = false;
    for (let i = 0; i < window.length; i++) {
      if (used.has(i)) continue;

      const item = window[i];
      if (!item) continue;

      if (itemSatisfiesRequirement(item, req, rowWidth)) {
        used.add(i);
        matchedIndices.push(i);
        matchedItems.push(item);
        found = true;
        break;
      }
    }
    if (!found) return null;
  }

  // CRITICAL: Enforce sequential processing (fix Issue 1)
  // Only accept patterns that include item 0 (first item in window).
  // This prevents patterns from "jumping the queue" and skipping earlier items.
  if (!matchedIndices.includes(0)) {
    return null;
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

  return {
    patternName,
    usedIndices: matchedIndices,
    components: matchedItems,
    direction: pattern.direction,
  };
}

// =============================================================================
// forceCompleteRow
// =============================================================================

/**
 * Fallback row completion strategy (Rule 3).
 *
 * When no ideal pattern matches, this function fills a row by:
 * 1. Always taking item 0 first (sequential order preservation)
 * 2. Then picking whichever remaining window item brings the total closest
 *    to 100% fill (best-fit selection)
 * 3. Stopping once the row is >= 90% full
 *
 * The rendering layer (solveBox) constrains all widths to componentWidth
 * regardless of fill %, so this is purely about aesthetic quality — items
 * closer to 100% fill get proportions closer to their intended sizes.
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
      const currentTotal = components.reduce(
        (sum, item) => sum + getItemComponentValue(item, rowWidth),
        0
      );
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
  const rows: RowResult[] = [];
  const remaining = [...items];

  while (remaining.length > 0) {
    const window = remaining.slice(0, 5); // Working window (lookahead)

    // RULE 2: Try patterns in priority order
    let matched = false;
    for (const patternName of PATTERNS_BY_PRIORITY) {
      const pattern = PATTERN_TABLE[patternName];
      if (!pattern) continue;

      const match = matchPattern(patternName, pattern, window, rowWidth);

      // RULE 1 gate: Only accept if row is complete
      if (match && isRowComplete(match.components, rowWidth)) {
        rows.push({
          components: match.components,
          direction: match.direction,
          patternName: match.patternName,
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
      rows.push({
        components: forced.components,
        direction: forced.direction,
        patternName: forced.patternName,
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
