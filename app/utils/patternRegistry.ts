/**
 * Pattern Registry
 *
 * Contains pattern type definitions and pattern matcher implementations.
 * Each pattern defines how to detect and match a specific layout configuration.
 *
 * To add a new pattern:
 * 1. Add the pattern type to PatternResult discriminated union
 * 2. Create a PatternMatcher implementation
 * 3. Add it to PATTERN_REGISTRY with appropriate priority
 */

import { LAYOUT } from '@/app/constants';

// ===================== Type Definitions =====================

/**
 * Discriminated union for pattern results
 * Each pattern type has its own shape with specific metadata
 */
export type PatternResult =
  | { type: 'standalone'; indices: [number] }
  | { type: 'main-stacked'; mainIndex: number; secondaryIndices: [number, number]; indices: number[] }
  | { type: 'panorama-vertical'; mainIndex: number; secondaryIndices: [number, number]; indices: number[] }
  | { type: 'five-star-vertical-2v'; mainIndex: number; secondaryIndices: [number, number]; indices: number[] }
  | { type: 'five-star-vertical-2h'; mainIndex: number; secondaryIndices: [number, number]; indices: number[] }
  | { type: 'five-star-vertical-mixed'; mainIndex: number; secondaryIndices: [number, number]; indices: number[] }
  | { type: 'standard'; indices: number[] };

/**
 * Pattern types for discriminated union
 */
export type PatternType = PatternResult['type'];

/**
 * Window item with metadata for pattern detection
 * Built by the algorithm and passed to pattern matchers
 */
export interface WindowItem {
  windowIndex: number;
  originalIndex: number;
  aspectRatio: number;
  isVertical: boolean;
  isHorizontal: boolean;
  isWidePanorama: boolean;
  isTallPanorama: boolean;
  rating: number;
  slotWidth: number;
}

/**
 * Pattern matcher interface for the registry
 */
export interface PatternMatcher {
  readonly name: PatternType;
  readonly priority: number;
  readonly minItems: number;
  readonly maxItems: number;
  canMatch(windowItems: WindowItem[]): boolean;
  match(windowItems: WindowItem[], windowStart: number): PatternResult | null;
}

// ===================== Pattern Helpers =====================

/**
 * Validate movement constraints (items can move max 2 positions)
 */
function validateMovementConstraints(indices: number[], windowStart: number): boolean {
  const sortedIndices = [...indices].sort((a, b) => a - b);

  for (let finalPos = 0; finalPos < indices.length; finalPos++) {
    const idx = indices[finalPos];
    if (idx === undefined) return false;

    const originalPos = sortedIndices.indexOf(idx);
    const movement = Math.abs(finalPos - originalPos);

    const originalWindowPos = idx - windowStart;
    if (originalWindowPos < 0 || originalWindowPos > 4) return false;

    if (movement > 2) return false;
  }

  return true;
}

/**
 * Find candidates within distance of a main item
 */
function findCandidatesWithinDistance(
  windowItems: WindowItem[],
  mainIdx: number,
  maxDistance: number = 2
): WindowItem[] {
  const candidates: WindowItem[] = [];
  for (let i = 0; i < windowItems.length; i++) {
    if (i === mainIdx) continue;
    const distance = Math.abs(i - mainIdx);
    if (distance <= maxDistance) {
      const item = windowItems[i];
      if (item) candidates.push(item);
    }
  }
  return candidates;
}

// ===================== Pattern Definitions =====================

/**
 * Standalone: Single item that takes full width
 * Triggers: 5-star horizontal, wide panorama 3+ star
 */
const standaloneMatcher: PatternMatcher = {
  name: 'standalone',
  priority: 100,
  minItems: 1,
  maxItems: 1,

  canMatch(windowItems) {
    const first = windowItems[0];
    return !!first && first.slotWidth === Infinity;
  },

  match(windowItems) {
    const first = windowItems[0];
    if (!first || first.slotWidth !== Infinity) return null;
    return { type: 'standalone', indices: [first.originalIndex] };
  },
};

/**
 * 5★ Vertical + 2 Non-5★ Verticals
 * Main: 5★ vertical (full height, ~50% width)
 * Secondaries: 2 non-5★ vertical images (each half height, stacked)
 */
const fiveStarVertical2VMatcher: PatternMatcher = {
  name: 'five-star-vertical-2v',
  priority: 95,
  minItems: 3,
  maxItems: 3,

  canMatch(windowItems) {
    const has5StarVertical = windowItems.some(w => w.isVertical && w.rating === 5);
    const otherVerticals = windowItems.filter(w => w.isVertical && w.rating !== 5);
    return has5StarVertical && otherVerticals.length >= 2;
  },

  match(windowItems, windowStart) {
    for (let mainIdx = 0; mainIdx < windowItems.length; mainIdx++) {
      const main = windowItems[mainIdx];
      if (!main || !main.isVertical || main.rating !== 5) continue;

      const candidates = findCandidatesWithinDistance(windowItems, mainIdx)
        .filter(c => c.isVertical && c.rating !== 5)
        .sort((a, b) => {
          const distA = Math.abs(a.windowIndex - mainIdx);
          const distB = Math.abs(b.windowIndex - mainIdx);
          if (distA !== distB) return distA - distB;
          return a.rating - b.rating;
        });

      if (candidates.length < 2) continue;

      const sec1 = candidates[0]!;
      const sec2 = candidates[1]!;
      const indices = [main.originalIndex, sec1.originalIndex, sec2.originalIndex];

      if (validateMovementConstraints(indices, windowStart)) {
        return {
          type: 'five-star-vertical-2v',
          mainIndex: main.originalIndex,
          secondaryIndices: [sec1.originalIndex, sec2.originalIndex],
          indices: [...indices].sort((a, b) => a - b),
        };
      }
    }
    return null;
  },
};

/**
 * 5★ Vertical + 2 Horizontal (≤3★)
 * Main: 5★ vertical (full height, ~50% width)
 * Secondaries: 2 horizontal images rated ≤3 stars (each half height, stacked)
 */
const fiveStarVertical2HMatcher: PatternMatcher = {
  name: 'five-star-vertical-2h',
  priority: 94,
  minItems: 3,
  maxItems: 3,

  canMatch(windowItems) {
    const has5StarVertical = windowItems.some(w => w.isVertical && w.rating === 5);
    const lowRatedHorizontals = windowItems.filter(w => w.isHorizontal && w.rating <= 3);
    return has5StarVertical && lowRatedHorizontals.length >= 2;
  },

  match(windowItems, windowStart) {
    for (let mainIdx = 0; mainIdx < windowItems.length; mainIdx++) {
      const main = windowItems[mainIdx];
      if (!main || !main.isVertical || main.rating !== 5) continue;

      const candidates = findCandidatesWithinDistance(windowItems, mainIdx)
        .filter(c => c.isHorizontal && c.rating <= 3)
        .sort((a, b) => {
          const distA = Math.abs(a.windowIndex - mainIdx);
          const distB = Math.abs(b.windowIndex - mainIdx);
          if (distA !== distB) return distA - distB;
          return a.rating - b.rating;
        });

      if (candidates.length < 2) continue;

      const sec1 = candidates[0]!;
      const sec2 = candidates[1]!;
      const indices = [main.originalIndex, sec1.originalIndex, sec2.originalIndex];

      if (validateMovementConstraints(indices, windowStart)) {
        return {
          type: 'five-star-vertical-2h',
          mainIndex: main.originalIndex,
          secondaryIndices: [sec1.originalIndex, sec2.originalIndex],
          indices: [...indices].sort((a, b) => a - b),
        };
      }
    }
    return null;
  },
};

/**
 * 5★ Vertical + 3-4★ Vertical + <3★ Horizontal
 * Main: 5★ vertical (full height, ~50% width)
 * Secondaries: one 3-4★ vertical + one <3★ horizontal (stacked)
 */
const fiveStarVerticalMixedMatcher: PatternMatcher = {
  name: 'five-star-vertical-mixed',
  priority: 93,
  minItems: 3,
  maxItems: 3,

  canMatch(windowItems) {
    const has5StarVertical = windowItems.some(w => w.isVertical && w.rating === 5);
    const has34Vertical = windowItems.some(w => w.isVertical && w.rating >= 3 && w.rating <= 4);
    const hasLowHorizontal = windowItems.some(w => w.isHorizontal && w.rating < 3);
    return has5StarVertical && has34Vertical && hasLowHorizontal;
  },

  match(windowItems, windowStart) {
    for (let mainIdx = 0; mainIdx < windowItems.length; mainIdx++) {
      const main = windowItems[mainIdx];
      if (!main || !main.isVertical || main.rating !== 5) continue;

      const candidates = findCandidatesWithinDistance(windowItems, mainIdx);

      const verticalCandidate = candidates.find(c => c.isVertical && c.rating >= 3 && c.rating <= 4);
      const horizontalCandidate = candidates.find(c => c.isHorizontal && c.rating < 3);

      if (!verticalCandidate || !horizontalCandidate) continue;

      const indices = [main.originalIndex, verticalCandidate.originalIndex, horizontalCandidate.originalIndex];

      if (validateMovementConstraints(indices, windowStart)) {
        return {
          type: 'five-star-vertical-mixed',
          mainIndex: main.originalIndex,
          secondaryIndices: [verticalCandidate.originalIndex, horizontalCandidate.originalIndex],
          indices: [...indices].sort((a, b) => a - b),
        };
      }
    }
    return null;
  },
};

/**
 * Main-Stacked: 3-4★ main with 2 secondaries stacked
 */
const mainStackedMatcher: PatternMatcher = {
  name: 'main-stacked',
  priority: 80,
  minItems: 3,
  maxItems: 3,

  canMatch(windowItems) {
    return windowItems.some(w => w.rating >= 3 && w.rating <= 4);
  },

  match(windowItems, windowStart) {
    for (let mainIdx = 0; mainIdx < windowItems.length; mainIdx++) {
      const main = windowItems[mainIdx];
      if (!main || main.rating < 3 || main.rating > 4) continue;

      const candidates = findCandidatesWithinDistance(windowItems, mainIdx);
      if (candidates.length < 2) continue;

      const scored = candidates.map(candidate => {
        let score = 0;
        score += candidate.rating >= main.rating ? 100 : candidate.rating * 10;
        if (candidate.isVertical) score -= 5;
        const distance = Math.abs(candidate.windowIndex - main.windowIndex);
        score += distance * 2;
        if (distance <= 2) score -= 10;
        return { candidate, score };
      });

      scored.sort((a, b) => a.score - b.score);
      if (scored.length < 2) continue;

      const sec1 = scored[0]!.candidate;
      const sec2 = scored[1]!.candidate;
      const indices = [main.originalIndex, sec1.originalIndex, sec2.originalIndex];

      if (validateMovementConstraints(indices, windowStart)) {
        return {
          type: 'main-stacked',
          mainIndex: main.originalIndex,
          secondaryIndices: [sec1.originalIndex, sec2.originalIndex],
          indices: [...indices].sort((a, b) => a - b),
        };
      }
    }
    return null;
  },
};

/**
 * Panorama-Vertical: Vertical image + 2 wide panoramas stacked
 */
const panoramaVerticalMatcher: PatternMatcher = {
  name: 'panorama-vertical',
  priority: 75,
  minItems: 3,
  maxItems: 3,

  canMatch(windowItems) {
    const hasVertical = windowItems.some(w => w.isVertical);
    const panoramas = windowItems.filter(w => w.isWidePanorama);
    return hasVertical && panoramas.length >= 2;
  },

  match(windowItems, windowStart) {
    for (let vertIdx = 0; vertIdx < windowItems.length; vertIdx++) {
      const vertical = windowItems[vertIdx];
      if (!vertical || !vertical.isVertical) continue;

      const panoramas = findCandidatesWithinDistance(windowItems, vertIdx)
        .filter(c => c.isWidePanorama)
        .sort((a, b) => {
          const aDist = Math.abs(a.windowIndex - vertical.windowIndex);
          const bDist = Math.abs(b.windowIndex - vertical.windowIndex);
          if (aDist !== bDist) return aDist - bDist;
          return a.rating - b.rating;
        });

      if (panoramas.length < 2) continue;

      const p1 = panoramas[0]!;
      const p2 = panoramas[1]!;
      const indices = [vertical.originalIndex, p1.originalIndex, p2.originalIndex];

      if (validateMovementConstraints(indices, windowStart)) {
        return {
          type: 'panorama-vertical',
          mainIndex: vertical.originalIndex,
          secondaryIndices: [p1.originalIndex, p2.originalIndex],
          indices: [...indices].sort((a, b) => a - b),
        };
      }
    }
    return null;
  },
};

/**
 * Standard: Slot-based layout (fallback)
 */
const standardMatcher: PatternMatcher = {
  name: 'standard',
  priority: 0,
  minItems: 1,
  maxItems: Infinity,

  canMatch() {
    return true;
  },

  match(windowItems) {
    const effectiveChunkSize = Math.max(LAYOUT.defaultChunkSize, LAYOUT.minChunkSize);
    let currentSlots = 0;
    const indices: number[] = [];

    for (const windowItem of windowItems) {
      if (currentSlots + windowItem.slotWidth <= effectiveChunkSize) {
        indices.push(windowItem.originalIndex);
        currentSlots += windowItem.slotWidth;
        if (currentSlots === effectiveChunkSize) break;
      } else {
        break;
      }
    }

    if (indices.length === 0 && windowItems.length > 0) {
      const first = windowItems[0];
      if (first) indices.push(first.originalIndex);
    }

    return { type: 'standard', indices };
  },
};

// ===================== Registry =====================

/**
 * Pattern registry - sorted by priority (highest first)
 *
 * Priority guide:
 * - 100: Standalone (must be first - these items cannot combine)
 * - 90-99: 5-star vertical patterns (highest value content)
 * - 80-89: Main-stacked patterns (high-rated content)
 * - 70-79: Special combination patterns (panorama-vertical)
 * - 0: Standard fallback (always matches)
 */
export const PATTERN_REGISTRY: PatternMatcher[] = [
  standaloneMatcher,
  fiveStarVertical2VMatcher,
  fiveStarVertical2HMatcher,
  fiveStarVerticalMixedMatcher,
  mainStackedMatcher,
  panoramaVerticalMatcher,
  standardMatcher,
].sort((a, b) => b.priority - a.priority);
