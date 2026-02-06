/**
 * Pattern Registry
 *
 * Contains pattern type definitions and pattern matcher implementations.
 * Each pattern defines how to detect and match a specific layout configuration.
 *
 * To add a new pattern:
 * 1. Add the pattern type to PatternResult discriminated union
 * 2. Add pattern config to PATTERN_CONFIGS (for main+secondary patterns) OR create custom matcher
 * 3. Registry is auto-built and sorted by priority
 */

import { LAYOUT } from '@/app/constants';

// ===================== Type Definitions =====================

/**
 * Discriminated union for pattern results
 * Each pattern type has its own shape with specific metadata
 */
export type PatternResult =
  | { type: 'standalone'; indices: [number] }
  | {
      type: 'main-stacked';
      mainIndex: number;
      secondaryIndices: [number, number];
      indices: number[];
      mainPosition?: 'left' | 'right';
    }
  | {
      type: 'panorama-vertical';
      mainIndex: number;
      secondaryIndices: [number, number];
      indices: number[];
    }
  | {
      type: 'five-star-vertical-2v';
      mainIndex: number;
      secondaryIndices: [number, number];
      indices: number[];
    }
  | {
      type: 'five-star-vertical-2h';
      mainIndex: number;
      secondaryIndices: [number, number];
      indices: number[];
    }
  | {
      type: 'five-star-vertical-mixed';
      mainIndex: number;
      secondaryIndices: [number, number];
      indices: number[];
    }
  | {
      type: 'nested-quad';
      mainIndex: number;
      topPairIndices: [number, number];
      bottomIndex: number;
      indices: number[];
    }
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
 * Validate movement constraints (items can move max patternMaxMovement positions)
 */
function validateMovementConstraints(indices: number[], windowStart: number): boolean {
  const sortedIndices = [...indices].sort((a, b) => a - b);
  const maxWindowIdx = LAYOUT.patternWindowSize - 1;

  for (let finalPos = 0; finalPos < indices.length; finalPos++) {
    const idx = indices[finalPos];
    if (idx === undefined) return false;

    const originalPos = sortedIndices.indexOf(idx);
    const movement = Math.abs(finalPos - originalPos);

    const originalWindowPos = idx - windowStart;
    if (originalWindowPos < 0 || originalWindowPos > maxWindowIdx) return false;

    if (movement > LAYOUT.patternMaxMovement) return false;
  }

  return true;
}

/**
 * Find candidates within distance of a main item
 */
function findCandidatesWithinDistance(
  windowItems: WindowItem[],
  mainIdx: number,
  maxDistance: number = LAYOUT.patternMaxMovement
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

// ===================== Pattern Configuration System =====================

/**
 * Configuration for main+secondary patterns (the most common pattern type)
 * This enables adding new patterns with minimal code
 */
interface MainSecondaryPatternConfig {
  name: PatternType;
  priority: number;
  /** Predicate to identify the main item */
  isMain: (item: WindowItem) => boolean;
  /** Check if window has potential for this pattern (quick filter) */
  canMatchWindow: (items: WindowItem[]) => boolean;
  /** Filter for valid secondary candidates */
  filterSecondaries: (candidate: WindowItem, main: WindowItem) => boolean;
  /** How many secondaries are required */
  requiredSecondaries: number;
  /** Optional: scoring function for secondaries (lower = better) */
  scoreSecondary?: (candidate: WindowItem, main: WindowItem) => number;
  /** Optional: whether to use "pair" matching (find one of each type) vs "count" matching */
  matchMode?: 'count' | 'pair';
  /** Optional: for pair mode, filters for each secondary type */
  secondaryFilters?: Array<(candidate: WindowItem) => boolean>;
  /** Optional: include mainPosition in result (for main-stacked) */
  includeMainPosition?: boolean;
  /** Optional: scoring function for main candidates (lower = better, tried first) */
  scoreMain?: (item: WindowItem, windowIndex: number) => number;
}

/**
 * Default secondary scoring: prefer closer items, then lower ratings
 */
function defaultSecondaryScore(candidate: WindowItem, main: WindowItem): number {
  const distance = Math.abs(candidate.windowIndex - main.windowIndex);
  return distance * 10 + candidate.rating;
}

/**
 * Factory function to create main+secondary pattern matchers
 * This eliminates ~90% of the duplication across similar patterns
 */
function createMainSecondaryMatcher(config: MainSecondaryPatternConfig): PatternMatcher {
  const {
    name,
    priority,
    isMain,
    canMatchWindow,
    filterSecondaries,
    requiredSecondaries,
    scoreSecondary = defaultSecondaryScore,
    matchMode = 'count',
    secondaryFilters,
    includeMainPosition = false,
    scoreMain,
  } = config;

  return {
    name,
    priority,
    minItems: 1 + requiredSecondaries,
    maxItems: 1 + requiredSecondaries,

    canMatch(windowItems: WindowItem[]): boolean {
      return canMatchWindow(windowItems);
    },

    match(windowItems: WindowItem[], windowStart: number): PatternResult | null {
      // Find all main candidates
      let mainCandidates = windowItems
        .map((item, idx) => ({ item, windowIndex: idx }))
        .filter(({ item }) => isMain(item));

      // Sort main candidates if scoring function provided
      if (scoreMain) {
        mainCandidates = mainCandidates.sort(
          (a, b) => scoreMain(a.item, a.windowIndex) - scoreMain(b.item, b.windowIndex)
        );
      }

      for (const { item: main, windowIndex: mainIdx } of mainCandidates) {
        const candidates = findCandidatesWithinDistance(windowItems, mainIdx);

        let selectedSecondaries: WindowItem[];

        if (matchMode === 'pair' && secondaryFilters) {
          // Pair mode: find one item matching each filter
          const found: WindowItem[] = [];
          for (const filter of secondaryFilters) {
            const match = candidates.find(c => filter(c) && !found.includes(c));
            if (match) found.push(match);
          }
          if (found.length < requiredSecondaries) continue;
          selectedSecondaries = found;
        } else {
          // Count mode: find N items matching the filter, sorted by score
          const filtered = candidates
            .filter(c => filterSecondaries(c, main))
            .sort((a, b) => scoreSecondary(a, main) - scoreSecondary(b, main));

          if (filtered.length < requiredSecondaries) continue;
          selectedSecondaries = filtered.slice(0, requiredSecondaries);
        }

        const indices = [
          main.originalIndex,
          ...selectedSecondaries.map(s => s.originalIndex),
        ];

        if (validateMovementConstraints(indices, windowStart)) {
          const result: PatternResult = {
            type: name,
            mainIndex: main.originalIndex,
            secondaryIndices: [
              selectedSecondaries[0]!.originalIndex,
              selectedSecondaries[1]!.originalIndex,
            ] as [number, number],
            indices: [...indices].sort((a, b) => a - b),
          } as PatternResult;

          // Add mainPosition for main-stacked pattern
          if (includeMainPosition && name === 'main-stacked') {
            (result as Extract<PatternResult, { type: 'main-stacked' }>).mainPosition =
              mainIdx > windowItems.length / 2 ? 'right' : 'left';
          }

          return result;
        }
      }
      return null;
    },
  };
}

// ===================== Pattern Configurations =====================

/**
 * Pattern configurations - add new patterns here!
 *
 * Each config defines:
 * - name: Pattern type (must exist in PatternResult union)
 * - priority: Higher = tried first (100=standalone, 0=fallback)
 * - isMain: How to identify the main item
 * - canMatchWindow: Quick check if pattern is possible
 * - filterSecondaries: Which items can be secondaries
 * - requiredSecondaries: How many secondaries needed
 */
const PATTERN_CONFIGS: MainSecondaryPatternConfig[] = [
  // 5★ Vertical + 2 Non-5★ Verticals
  {
    name: 'five-star-vertical-2v',
    priority: 95,
    isMain: item => item.isVertical && item.rating === 5,
    canMatchWindow: items => {
      const has5StarVertical = items.some(w => w.isVertical && w.rating === 5);
      const otherVerticals = items.filter(w => w.isVertical && w.rating !== 5);
      return has5StarVertical && otherVerticals.length >= 2;
    },
    filterSecondaries: candidate => candidate.isVertical && candidate.rating !== 5,
    requiredSecondaries: 2,
  },

  // 5★ Vertical + 2 Horizontal (≤3★)
  {
    name: 'five-star-vertical-2h',
    priority: 94,
    isMain: item => item.isVertical && item.rating === 5,
    canMatchWindow: items => {
      const has5StarVertical = items.some(w => w.isVertical && w.rating === 5);
      const lowRatedHorizontals = items.filter(w => w.isHorizontal && w.rating <= 3);
      return has5StarVertical && lowRatedHorizontals.length >= 2;
    },
    filterSecondaries: candidate => candidate.isHorizontal && candidate.rating <= 3,
    requiredSecondaries: 2,
  },

  // 5★ Vertical + 3-4★ Vertical + <3★ Horizontal (mixed)
  {
    name: 'five-star-vertical-mixed',
    priority: 93,
    isMain: item => item.isVertical && item.rating === 5,
    canMatchWindow: items => {
      const has5StarVertical = items.some(w => w.isVertical && w.rating === 5);
      const has34Vertical = items.some(w => w.isVertical && w.rating >= 3 && w.rating <= 4);
      const hasLowHorizontal = items.some(w => w.isHorizontal && w.rating < 3);
      return has5StarVertical && has34Vertical && hasLowHorizontal;
    },
    filterSecondaries: () => true, // We use pair mode instead
    requiredSecondaries: 2,
    matchMode: 'pair',
    secondaryFilters: [
      c => c.isVertical && c.rating >= 3 && c.rating <= 4,
      c => c.isHorizontal && c.rating < 3,
    ],
  },

  // Main-Stacked: 3-4★ main with 2 secondaries stacked
  {
    name: 'main-stacked',
    priority: 80,
    isMain: item => item.rating >= 3 && item.rating <= 4,
    canMatchWindow: items => items.some(w => w.rating >= 3 && w.rating <= 4),
    filterSecondaries: () => true, // All items can be secondaries
    requiredSecondaries: 2,
    // Prefer higher-rated mains first, then earlier in window
    scoreMain: (item, windowIndex) => -item.rating * 10 + windowIndex,
    scoreSecondary: (candidate, main) => {
      let score = 0;
      // Prefer lower-rated secondaries
      score += candidate.rating >= main.rating ? 100 : candidate.rating * 10;
      // Slight penalty for verticals as secondaries
      if (candidate.isVertical) score -= 5;
      // Distance penalty
      const distance = Math.abs(candidate.windowIndex - main.windowIndex);
      score += distance * 2;
      // Bonus for close items
      if (distance <= 2) score -= 10;
      return score;
    },
    includeMainPosition: true,
  },

  // Panorama-Vertical: Vertical image + 2 wide panoramas stacked
  {
    name: 'panorama-vertical',
    priority: 75,
    isMain: item => item.isVertical,
    canMatchWindow: items => {
      const hasVertical = items.some(w => w.isVertical);
      const panoramas = items.filter(w => w.isWidePanorama);
      return hasVertical && panoramas.length >= 2;
    },
    filterSecondaries: candidate => candidate.isWidePanorama,
    requiredSecondaries: 2,
  },
];

// ===================== Special Pattern Definitions =====================

/**
 * Standalone: Single item that takes full width
 * Triggers: 5-star horizontal, wide panorama, 4-star horizontal (unless adjacent to vertical)
 *
 * This pattern is special and doesn't fit the main+secondary model
 */
const standaloneMatcher: PatternMatcher = {
  name: 'standalone',
  priority: 100,
  minItems: 1,
  maxItems: 1,

  canMatch(windowItems) {
    const first = windowItems[0];
    if (!first) return false;

    // Wide panorama → always standalone
    if (first.isWidePanorama) return true;

    // 5-star horizontal → always standalone
    if (first.rating === 5 && first.isHorizontal) return true;

    // 4-star horizontal → standalone unless adjacent to vertical
    if (first.rating === 4 && first.isHorizontal) {
      const hasVerticalInWindow = windowItems.some((w, idx) => idx !== 0 && w.isVertical);
      return !hasVerticalInWindow;
    }

    return false;
  },

  match(windowItems) {
    const first = windowItems[0];
    if (!first) return null;

    // Wide panorama → standalone
    if (first.isWidePanorama) {
      return { type: 'standalone', indices: [first.originalIndex] };
    }

    // 5-star horizontal → standalone
    if (first.rating === 5 && first.isHorizontal) {
      return { type: 'standalone', indices: [first.originalIndex] };
    }

    // 4-star horizontal → standalone unless adjacent to vertical
    if (first.rating === 4 && first.isHorizontal) {
      const hasVerticalInWindow = windowItems.some((w, idx) => idx !== 0 && w.isVertical);
      if (!hasVerticalInWindow) {
        return { type: 'standalone', indices: [first.originalIndex] };
      }
    }

    return null;
  },
};

/**
 * Standard: Slot-based layout (fallback)
 *
 * This pattern is special - it's the catch-all that always matches
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
 * Build pattern matchers from configs
 */
const configBasedMatchers = PATTERN_CONFIGS.map(config => createMainSecondaryMatcher(config));

/**
 * Pattern registry - sorted by priority (highest first)
 *
 * Priority guide:
 * - 100: Standalone (must be first - these items cannot combine)
 * - 90-99: 5-star vertical patterns (highest value content)
 * - 80-89: Main-stacked patterns (high-rated content)
 * - 70-79: Special combination patterns (panorama-vertical)
 * - 0: Standard fallback (always matches)
 *
 * To add a new pattern:
 * 1. Add to PatternResult type union at top of file
 * 2. Add config to PATTERN_CONFIGS array
 * 3. That's it! The registry auto-builds and sorts by priority
 */
export const PATTERN_REGISTRY: PatternMatcher[] = [
  standaloneMatcher,
  ...configBasedMatchers,
  standardMatcher,
].sort((a, b) => b.priority - a.priority);

// ===================== Export Pattern Configs for Extension =====================

/**
 * Export for testing and potential runtime pattern additions
 */
export { createMainSecondaryMatcher, type MainSecondaryPatternConfig };
