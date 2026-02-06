/**
 * Unit tests for rowCombination.ts
 * Tests CombinationPattern enum, PATTERN_TABLE, isRowComplete, matchPattern, getOrientation
 */

import { LAYOUT } from '@/app/constants';
import type { ContentImageModel } from '@/app/types/Content';
import {
  CombinationPattern,
  getOrientation,
  isRowComplete,
  matchPattern,
  PATTERN_TABLE,
  PATTERNS_BY_PRIORITY,
  type RowResult,
} from '@/app/utils/rowCombination';

// ===================== Test Fixtures =====================

const createImageContent = (
  id: number,
  overrides?: Partial<ContentImageModel>
): ContentImageModel => ({
  id,
  contentType: 'IMAGE',
  imageUrl: `/test/image-${id}.jpg`,
  imageWidth: 1920,
  imageHeight: 1080,
  aspectRatio: 1920 / 1080,
  rating: 0,
  orderIndex: id,
  ...overrides,
});

const createHorizontalImage = (id: number, rating: number): ContentImageModel =>
  createImageContent(id, {
    imageWidth: 1920,
    imageHeight: 1080,
    aspectRatio: 1920 / 1080,
    rating,
  });

const createVerticalImage = (id: number, rating: number): ContentImageModel =>
  createImageContent(id, {
    imageWidth: 1080,
    imageHeight: 1920,
    aspectRatio: 1080 / 1920,
    rating,
  });

const createSquareImage = (id: number, rating: number): ContentImageModel =>
  createImageContent(id, {
    imageWidth: 1000,
    imageHeight: 1000,
    aspectRatio: 1,
    rating,
  });

const createPanorama = (id: number, rating: number): ContentImageModel =>
  createImageContent(id, {
    imageWidth: 3000,
    imageHeight: 1000,
    aspectRatio: 3,
    rating,
  });

// ===================== Constants =====================

const DESKTOP = LAYOUT.desktopSlotWidth; // 5

// ===================== getOrientation Tests =====================

describe('getOrientation', () => {
  it('should return "horizontal" for landscape images (AR > 1.0)', () => {
    expect(getOrientation(createHorizontalImage(1, 3))).toBe('horizontal');
    expect(getOrientation(createPanorama(1, 3))).toBe('horizontal');
  });

  it('should return "vertical" for portrait images (AR < 1.0)', () => {
    expect(getOrientation(createVerticalImage(1, 3))).toBe('vertical');
  });

  it('should return "vertical" for square images (AR = 1.0)', () => {
    expect(getOrientation(createSquareImage(1, 3))).toBe('vertical');
  });
});

// ===================== PATTERN_TABLE Tests =====================

describe('PATTERN_TABLE', () => {
  it('should have an entry for every matchable CombinationPattern enum value', () => {
    const matchablePatterns = Object.values(CombinationPattern).filter(
      (p) => p !== CombinationPattern.FORCE_FILL
    );
    for (const pattern of matchablePatterns) {
      expect(PATTERN_TABLE[pattern as Exclude<CombinationPattern, CombinationPattern.FORCE_FILL>]).toBeDefined();
    }
  });

  it('should NOT have an entry for FORCE_FILL', () => {
    expect((PATTERN_TABLE as Record<string, unknown>)[CombinationPattern.FORCE_FILL]).toBeUndefined();
  });

  it('should define STANDALONE with 1 requirement', () => {
    const def = PATTERN_TABLE[CombinationPattern.STANDALONE];
    expect(def.requires).toHaveLength(1);
    expect(def.requires[0]?.orientation).toBe('horizontal');
    expect(def.requires[0]?.minRating).toBe(5);
    expect(def.direction).toBeNull();
  });

  it('should define VERTICAL_PAIR with 2 vertical requirements', () => {
    const def = PATTERN_TABLE[CombinationPattern.VERTICAL_PAIR];
    expect(def.requires).toHaveLength(2);
    expect(def.requires[0]?.orientation).toBe('vertical');
    expect(def.requires[1]?.orientation).toBe('vertical');
    expect(def.direction).toBe('horizontal');
    expect(def.ratingProximity).toBe(0);
    expect(def.maxProximity).toBe(2);
  });

  it('should define DOMINANT_SECONDARY with horizontal dominant + vertical secondary', () => {
    const def = PATTERN_TABLE[CombinationPattern.DOMINANT_SECONDARY];
    expect(def.requires).toHaveLength(2);
    expect(def.requires[0]?.orientation).toBe('horizontal');
    expect(def.requires[0]?.minRating).toBe(4);
    expect(def.requires[1]?.orientation).toBe('vertical');
    expect(def.requires[1]?.maxRating).toBe(3);
    expect(def.ratingProximity).toBeUndefined();
    expect(def.maxProximity).toBe(3);
  });

  it('should define TRIPLE_HORIZONTAL with 3 horizontal requirements', () => {
    const def = PATTERN_TABLE[CombinationPattern.TRIPLE_HORIZONTAL];
    expect(def.requires).toHaveLength(3);
    for (const req of def.requires) {
      expect(req.orientation).toBe('horizontal');
    }
    expect(def.ratingProximity).toBe(0);
    expect(def.maxProximity).toBe(1);
  });

  it('should define MULTI_SMALL as flexible', () => {
    const def = PATTERN_TABLE[CombinationPattern.MULTI_SMALL];
    expect(def.flexible).toBe(true);
    expect(def.minRowWidth).toBe(3);
    expect(def.ratingProximity).toBe(0);
    expect(def.maxProximity).toBe(2);
  });

  it('should define DOMINANT_VERTICAL_PAIR with 3 requirements', () => {
    const def = PATTERN_TABLE[CombinationPattern.DOMINANT_VERTICAL_PAIR];
    expect(def.requires).toHaveLength(3);
    expect(def.requires[0]?.orientation).toBe('horizontal');
    expect(def.requires[1]?.orientation).toBe('vertical');
    expect(def.requires[2]?.orientation).toBe('vertical');
    expect(def.ratingProximity).toBeUndefined();
    expect(def.maxProximity).toBe(3);
  });
});

// ===================== PATTERNS_BY_PRIORITY Tests =====================

describe('PATTERNS_BY_PRIORITY', () => {
  it('should contain all matchable patterns (excludes FORCE_FILL)', () => {
    const matchablePatterns = Object.values(CombinationPattern).filter(
      (p) => p !== CombinationPattern.FORCE_FILL
    );
    expect(PATTERNS_BY_PRIORITY).toHaveLength(matchablePatterns.length);
    for (const pattern of matchablePatterns) {
      expect(PATTERNS_BY_PRIORITY).toContain(pattern);
    }
    expect(PATTERNS_BY_PRIORITY).not.toContain(CombinationPattern.FORCE_FILL);
  });

  it('should have STANDALONE first (highest priority)', () => {
    expect(PATTERNS_BY_PRIORITY[0]).toBe(CombinationPattern.STANDALONE);
  });

  it('should have MULTI_SMALL last (lowest priority)', () => {
    expect(PATTERNS_BY_PRIORITY[PATTERNS_BY_PRIORITY.length - 1]).toBe(
      CombinationPattern.MULTI_SMALL
    );
  });
});

// ===================== isRowComplete Tests =====================

describe('isRowComplete', () => {
  describe('desktop layout (rowWidth=5)', () => {
    it('should return true for a single H5* (fills entire row)', () => {
      const items = [createHorizontalImage(1, 5)];
      expect(isRowComplete(items, DESKTOP)).toBe(true);
    });

    it('should return true for H4* + V3* (2.5 + ~1.67 = ~4.17, 83%+ of 5)', () => {
      const items = [createHorizontalImage(1, 4), createVerticalImage(2, 3)];
      // H4* effective = 4, componentValue = 2.5
      // V3* effective = 2 (vertical penalty), componentValue = 1.25
      // Total = 3.75, 3.75/5 = 0.75 — NOT complete
      expect(isRowComplete(items, DESKTOP)).toBe(false);
    });

    it('should return true for H4* + H3* (2.5 + 1.67 = 4.17, 83%)', () => {
      const items = [createHorizontalImage(1, 4), createHorizontalImage(2, 3)];
      // H4* componentValue = 2.5, H3* componentValue = 5/3 ≈ 1.67
      // Total ≈ 4.17, 4.17/5 = 0.83 — NOT complete (needs >= 0.9)
      expect(isRowComplete(items, DESKTOP)).toBe(false);
    });

    it('should return true for H4* + H4* (2.5 + 2.5 = 5, 100%)', () => {
      const items = [createHorizontalImage(1, 4), createHorizontalImage(2, 4)];
      expect(isRowComplete(items, DESKTOP)).toBe(true);
    });

    it('should return false for a single V3* (~1.67/5 = 33%)', () => {
      const items = [createVerticalImage(1, 3)];
      expect(isRowComplete(items, DESKTOP)).toBe(false);
    });

    it('should return false for empty array', () => {
      expect(isRowComplete([], DESKTOP)).toBe(false);
    });

    it('should return true for three H3* images (3 × 1.67 = 5, 100%)', () => {
      const items = [
        createHorizontalImage(1, 3),
        createHorizontalImage(2, 3),
        createHorizontalImage(3, 3),
      ];
      expect(isRowComplete(items, DESKTOP)).toBe(true);
    });

    it('should return true for five H1* images (5 × 1 = 5, 100%)', () => {
      const items = Array.from({ length: 5 }, (_, i) => createHorizontalImage(i + 1, 1));
      expect(isRowComplete(items, DESKTOP)).toBe(true);
    });
  });

  describe('threshold behavior', () => {
    it('should return true at exactly 90% fill', () => {
      // Need total componentValue = 4.5 on rowWidth=5
      // H5* = 5 componentValue → 100% ✓
      // We need exactly 90%: 4.5 / 5 = 0.9
      // H4* (2.5) + H2* (1.25) + H1* (1) = 4.75 → 95% ✓
      const items = [
        createHorizontalImage(1, 4),
        createHorizontalImage(2, 2),
        createHorizontalImage(3, 1),
      ];
      expect(isRowComplete(items, DESKTOP)).toBe(true);
    });
  });
});

// ===================== matchPattern Tests =====================

describe('matchPattern', () => {
  describe('STANDALONE pattern', () => {
    it('should match a single H5* image', () => {
      const window = [createHorizontalImage(1, 5)];
      const result = matchPattern(
        CombinationPattern.STANDALONE,
        PATTERN_TABLE[CombinationPattern.STANDALONE],
        window,
        DESKTOP
      );
      expect(result).not.toBeNull();
      expect(result!.patternName).toBe(CombinationPattern.STANDALONE);
      expect(result!.usedIndices).toEqual([0]);
      expect(result!.components).toHaveLength(1);
      expect(result!.direction).toBeNull();
    });

    it('should match H5* at index 0 when other items exist in window', () => {
      const window = [
        createHorizontalImage(1, 5),  // H5* at index 0 - will match
        createVerticalImage(2, 2),
        createHorizontalImage(3, 3),
      ];
      const result = matchPattern(
        CombinationPattern.STANDALONE,
        PATTERN_TABLE[CombinationPattern.STANDALONE],
        window,
        DESKTOP
      );
      expect(result).not.toBeNull();
      expect(result!.usedIndices).toEqual([0]); // Index of the H5*
    });

    it('should NOT match H5* at index 1 (must include index 0 for sequential processing)', () => {
      const window = [
        createVerticalImage(1, 2),    // V2* at index 0
        createHorizontalImage(2, 5),  // H5* at index 1 - won't match (doesn't include index 0)
        createHorizontalImage(3, 3),
      ];
      const result = matchPattern(
        CombinationPattern.STANDALONE,
        PATTERN_TABLE[CombinationPattern.STANDALONE],
        window,
        DESKTOP
      );
      expect(result).toBeNull(); // Must include index 0 for sequential processing
    });

    it('should NOT match a V5* (vertical penalty: effective rating 4)', () => {
      const window = [createVerticalImage(1, 5)];
      const result = matchPattern(
        CombinationPattern.STANDALONE,
        PATTERN_TABLE[CombinationPattern.STANDALONE],
        window,
        DESKTOP
      );
      expect(result).toBeNull();
    });

    it('should NOT match an H4* (rating too low)', () => {
      const window = [createHorizontalImage(1, 4)];
      const result = matchPattern(
        CombinationPattern.STANDALONE,
        PATTERN_TABLE[CombinationPattern.STANDALONE],
        window,
        DESKTOP
      );
      expect(result).toBeNull();
    });

    it('should NOT match when rowWidth < minRowWidth', () => {
      const window = [createHorizontalImage(1, 5)];
      const result = matchPattern(
        CombinationPattern.STANDALONE,
        PATTERN_TABLE[CombinationPattern.STANDALONE],
        window,
        4 // Less than minRowWidth of 5
      );
      expect(result).toBeNull();
    });
  });

  describe('VERTICAL_PAIR pattern', () => {
    it('should match two vertical images with same effective rating', () => {
      // V3* + V3* → both effective 2 → difference = 0 ✓
      const window = [createVerticalImage(1, 3), createVerticalImage(2, 3)];
      const result = matchPattern(
        CombinationPattern.VERTICAL_PAIR,
        PATTERN_TABLE[CombinationPattern.VERTICAL_PAIR],
        window,
        DESKTOP
      );
      expect(result).not.toBeNull();
      expect(result!.components).toHaveLength(2);
      expect(result!.direction).toBe('horizontal');
    });

    it('should NOT match verticals with different effective ratings', () => {
      // V3* effective = 2, V4* effective = 3 → difference = 1 > proximity of 0
      const window = [createVerticalImage(1, 3), createVerticalImage(2, 4)];
      const result = matchPattern(
        CombinationPattern.VERTICAL_PAIR,
        PATTERN_TABLE[CombinationPattern.VERTICAL_PAIR],
        window,
        DESKTOP
      );
      expect(result).toBeNull();
    });

    it('should match square images (treated as vertical)', () => {
      const window = [createSquareImage(1, 3), createSquareImage(2, 3)];
      const result = matchPattern(
        CombinationPattern.VERTICAL_PAIR,
        PATTERN_TABLE[CombinationPattern.VERTICAL_PAIR],
        window,
        DESKTOP
      );
      expect(result).not.toBeNull();
    });

    it('should NOT match two horizontal images', () => {
      const window = [createHorizontalImage(1, 3), createHorizontalImage(2, 3)];
      const result = matchPattern(
        CombinationPattern.VERTICAL_PAIR,
        PATTERN_TABLE[CombinationPattern.VERTICAL_PAIR],
        window,
        DESKTOP
      );
      expect(result).toBeNull();
    });

    it('should NOT match verticals with any rating difference (proximity = 0)', () => {
      // V5* effective = 4, V2* effective = 1 → difference = 3 > proximity of 0
      const window = [createVerticalImage(1, 5), createVerticalImage(2, 2)];
      const result = matchPattern(
        CombinationPattern.VERTICAL_PAIR,
        PATTERN_TABLE[CombinationPattern.VERTICAL_PAIR],
        window,
        DESKTOP
      );
      expect(result).toBeNull();
    });

    it('should NOT match V4* + V3* (different effective ratings)', () => {
      // V4* effective = 3, V3* effective = 2 → difference = 1 > proximity of 0
      const window = [createVerticalImage(1, 4), createVerticalImage(2, 3)];
      const result = matchPattern(
        CombinationPattern.VERTICAL_PAIR,
        PATTERN_TABLE[CombinationPattern.VERTICAL_PAIR],
        window,
        DESKTOP
      );
      expect(result).toBeNull();
    });

    it('should match V1* + V1* (low-rated pair, same rating)', () => {
      // V1* effective = 0, V1* effective = 0 → difference = 0 ✓
      const window = [createVerticalImage(1, 1), createVerticalImage(2, 1)];
      const result = matchPattern(
        CombinationPattern.VERTICAL_PAIR,
        PATTERN_TABLE[CombinationPattern.VERTICAL_PAIR],
        window,
        DESKTOP
      );
      expect(result).not.toBeNull();
    });

    it('should NOT match if only one vertical in window', () => {
      const window = [createVerticalImage(1, 3)];
      const result = matchPattern(
        CombinationPattern.VERTICAL_PAIR,
        PATTERN_TABLE[CombinationPattern.VERTICAL_PAIR],
        window,
        DESKTOP
      );
      expect(result).toBeNull();
    });
  });

  describe('DOMINANT_SECONDARY pattern', () => {
    it('should match H4* + V2*', () => {
      const window = [createHorizontalImage(1, 4), createVerticalImage(2, 2)];
      const result = matchPattern(
        CombinationPattern.DOMINANT_SECONDARY,
        PATTERN_TABLE[CombinationPattern.DOMINANT_SECONDARY],
        window,
        DESKTOP
      );
      expect(result).not.toBeNull();
      expect(result!.components).toHaveLength(2);
      expect(result!.direction).toBe('horizontal');
    });

    it('should match H5* + V3* (H5* effective=5, V3* effective=2)', () => {
      const window = [createHorizontalImage(1, 5), createVerticalImage(2, 3)];
      const result = matchPattern(
        CombinationPattern.DOMINANT_SECONDARY,
        PATTERN_TABLE[CombinationPattern.DOMINANT_SECONDARY],
        window,
        DESKTOP
      );
      expect(result).not.toBeNull();
    });

    it('should NOT match H3* + V2* (dominant requires minRating 4)', () => {
      const window = [createHorizontalImage(1, 3), createVerticalImage(2, 2)];
      const result = matchPattern(
        CombinationPattern.DOMINANT_SECONDARY,
        PATTERN_TABLE[CombinationPattern.DOMINANT_SECONDARY],
        window,
        DESKTOP
      );
      expect(result).toBeNull();
    });

    it('should NOT match H4* + V4* (secondary maxRating is 3, V4* effective=3 is ok)', () => {
      const window = [createHorizontalImage(1, 4), createVerticalImage(2, 4)];
      // V4* effective = 3 (vertical penalty), maxRating = 3 → 3 <= 3 ✓
      const result = matchPattern(
        CombinationPattern.DOMINANT_SECONDARY,
        PATTERN_TABLE[CombinationPattern.DOMINANT_SECONDARY],
        window,
        DESKTOP
      );
      expect(result).not.toBeNull();
    });

    it('should find items in any order within window', () => {
      const window = [
        createVerticalImage(1, 2),
        createHorizontalImage(2, 3),
        createHorizontalImage(3, 4),
      ];
      const result = matchPattern(
        CombinationPattern.DOMINANT_SECONDARY,
        PATTERN_TABLE[CombinationPattern.DOMINANT_SECONDARY],
        window,
        DESKTOP
      );
      expect(result).not.toBeNull();
      expect(result!.usedIndices).toContain(2); // H4* at index 2
      expect(result!.usedIndices).toContain(0); // V2* at index 0
    });
  });

  describe('TRIPLE_HORIZONTAL pattern', () => {
    it('should match three H3* images', () => {
      const window = [
        createHorizontalImage(1, 3),
        createHorizontalImage(2, 3),
        createHorizontalImage(3, 3),
      ];
      const result = matchPattern(
        CombinationPattern.TRIPLE_HORIZONTAL,
        PATTERN_TABLE[CombinationPattern.TRIPLE_HORIZONTAL],
        window,
        DESKTOP
      );
      expect(result).not.toBeNull();
      expect(result!.components).toHaveLength(3);
    });

    it('should NOT match H2* + H3* + H2* (different ratings, proximity = 0)', () => {
      const window = [
        createHorizontalImage(1, 2),
        createHorizontalImage(2, 3),
        createHorizontalImage(3, 2),
      ];
      const result = matchPattern(
        CombinationPattern.TRIPLE_HORIZONTAL,
        PATTERN_TABLE[CombinationPattern.TRIPLE_HORIZONTAL],
        window,
        DESKTOP
      );
      expect(result).toBeNull();
    });

    it('should NOT match H2* + H2* + H2* when ratingProximity fails (all 2, diff=0, ok)', () => {
      // Actually all same rating should pass proximity check
      const window = [
        createHorizontalImage(1, 2),
        createHorizontalImage(2, 2),
        createHorizontalImage(3, 2),
      ];
      const result = matchPattern(
        CombinationPattern.TRIPLE_HORIZONTAL,
        PATTERN_TABLE[CombinationPattern.TRIPLE_HORIZONTAL],
        window,
        DESKTOP
      );
      expect(result).not.toBeNull();
    });

    it('should NOT match if window has only 2 horizontal images', () => {
      const window = [createHorizontalImage(1, 3), createHorizontalImage(2, 3)];
      const result = matchPattern(
        CombinationPattern.TRIPLE_HORIZONTAL,
        PATTERN_TABLE[CombinationPattern.TRIPLE_HORIZONTAL],
        window,
        DESKTOP
      );
      expect(result).toBeNull();
    });
  });

  describe('MULTI_SMALL pattern', () => {
    it('should match three low-rated items', () => {
      const window = [
        createHorizontalImage(1, 1),
        createVerticalImage(2, 2),
        createHorizontalImage(3, 1),
      ];
      const result = matchPattern(
        CombinationPattern.MULTI_SMALL,
        PATTERN_TABLE[CombinationPattern.MULTI_SMALL],
        window,
        DESKTOP
      );
      expect(result).not.toBeNull();
      expect(result!.components).toHaveLength(3);
    });

    it('should NOT match if items have ratings above maxRating', () => {
      const window = [
        createHorizontalImage(1, 3), // effective 3, above maxRating 2
        createHorizontalImage(2, 1),
        createHorizontalImage(3, 1),
      ];
      const result = matchPattern(
        CombinationPattern.MULTI_SMALL,
        PATTERN_TABLE[CombinationPattern.MULTI_SMALL],
        window,
        DESKTOP
      );
      expect(result).toBeNull();
    });

    it('should work with rowWidth=3 (minimum)', () => {
      const window = [
        createHorizontalImage(1, 1),
        createHorizontalImage(2, 1),
        createHorizontalImage(3, 1),
      ];
      const result = matchPattern(
        CombinationPattern.MULTI_SMALL,
        PATTERN_TABLE[CombinationPattern.MULTI_SMALL],
        window,
        3
      );
      expect(result).not.toBeNull();
    });

    it('should accept V3* as low-rated (effective rating 2 after vertical penalty)', () => {
      const window = [
        createVerticalImage(1, 3), // effective = 2
        createVerticalImage(2, 3), // effective = 2
        createVerticalImage(3, 3), // effective = 2
      ];
      const result = matchPattern(
        CombinationPattern.MULTI_SMALL,
        PATTERN_TABLE[CombinationPattern.MULTI_SMALL],
        window,
        DESKTOP
      );
      expect(result).not.toBeNull();
    });
  });

  describe('DOMINANT_VERTICAL_PAIR pattern', () => {
    it('should match H4* + V3* + V3*', () => {
      const window = [
        createHorizontalImage(1, 4),
        createVerticalImage(2, 3),
        createVerticalImage(3, 3),
      ];
      const result = matchPattern(
        CombinationPattern.DOMINANT_VERTICAL_PAIR,
        PATTERN_TABLE[CombinationPattern.DOMINANT_VERTICAL_PAIR],
        window,
        DESKTOP
      );
      expect(result).not.toBeNull();
      expect(result!.components).toHaveLength(3);
      expect(result!.direction).toBe('horizontal');
    });

    it('should find items in mixed order within window', () => {
      const window = [
        createVerticalImage(1, 3), // effective 2
        createHorizontalImage(2, 5), // effective 5, qualifies as minRating 4
        createHorizontalImage(3, 2),
        createVerticalImage(4, 3), // effective 2, meets minRating 2
      ];
      const result = matchPattern(
        CombinationPattern.DOMINANT_VERTICAL_PAIR,
        PATTERN_TABLE[CombinationPattern.DOMINANT_VERTICAL_PAIR],
        window,
        DESKTOP
      );
      expect(result).not.toBeNull();
      // Should pick H5* at index 1, V3* at index 0, V3* at index 3
      expect(result!.usedIndices).toContain(1);
    });

    it('should NOT match with rowWidth < 5', () => {
      const window = [
        createHorizontalImage(1, 4),
        createVerticalImage(2, 3),
        createVerticalImage(3, 3),
      ];
      const result = matchPattern(
        CombinationPattern.DOMINANT_VERTICAL_PAIR,
        PATTERN_TABLE[CombinationPattern.DOMINANT_VERTICAL_PAIR],
        window,
        4
      );
      expect(result).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should return null for empty window', () => {
      const result = matchPattern(
        CombinationPattern.STANDALONE,
        PATTERN_TABLE[CombinationPattern.STANDALONE],
        [],
        DESKTOP
      );
      expect(result).toBeNull();
    });

    it('should not reuse the same item for multiple requirements', () => {
      // Only one vertical — can't satisfy VERTICAL_PAIR which needs two
      const window = [createVerticalImage(1, 3), createHorizontalImage(2, 3)];
      const result = matchPattern(
        CombinationPattern.VERTICAL_PAIR,
        PATTERN_TABLE[CombinationPattern.VERTICAL_PAIR],
        window,
        DESKTOP
      );
      expect(result).toBeNull();
    });

    it('should pick items from a larger window correctly (must include index 0)', () => {
      const window = [
        createHorizontalImage(1, 5),  // H5* at index 0 - satisfies dominant requirement
        createHorizontalImage(2, 2),
        createVerticalImage(3, 4),   // V4* (effective 3) - satisfies secondary
        createHorizontalImage(4, 4),
        createVerticalImage(5, 3),   // V3* (effective 2) - also satisfies secondary
      ];
      // DOMINANT_SECONDARY: needs H(4+) + V(0-3)
      // Should match H5* (index 0) + V4* (index 2, effective=3)
      const result = matchPattern(
        CombinationPattern.DOMINANT_SECONDARY,
        PATTERN_TABLE[CombinationPattern.DOMINANT_SECONDARY],
        window,
        DESKTOP
      );
      expect(result).not.toBeNull();
      expect(result!.components).toHaveLength(2);
      expect(result!.usedIndices).toContain(0); // Must include index 0
    });
  });
});

// ===================== forceCompleteRow Tests =====================

describe('forceCompleteRow', () => {
  // Need to import forceCompleteRow
  const { forceCompleteRow } = require('@/app/utils/rowCombination');

  it('should take items until row is complete', () => {
    const window = [
      createHorizontalImage(1, 3), // 1.67
      createHorizontalImage(2, 3), // 1.67
      createHorizontalImage(3, 3), // 1.67
      createHorizontalImage(4, 1), // 1.0
    ];
    const result = forceCompleteRow(window, DESKTOP);
    // Should take 3x H3* = 5.0 componentValue, which is 100%
    expect(result.components).toHaveLength(3);
    expect(result.usedIndices).toEqual([0, 1, 2]);
    expect(result.direction).toBe('horizontal');
  });

  it('should take all items if row never completes (final row case)', () => {
    const window = [
      createHorizontalImage(1, 1), // 1.0
      createVerticalImage(2, 1),   // 0.6
    ];
    const result = forceCompleteRow(window, DESKTOP);
    // Total = 1.0 + 0.6 = 1.6, only 32% — but that's okay for final row
    expect(result.components).toHaveLength(2);
    expect(result.usedIndices).toEqual([0, 1]);
  });

  it('should stop as soon as 90% threshold is hit', () => {
    const window = [
      createHorizontalImage(1, 5), // 5.0 componentValue = 100%
      createHorizontalImage(2, 4), // Won't be needed
      createHorizontalImage(3, 3),
    ];
    const result = forceCompleteRow(window, DESKTOP);
    expect(result.components).toHaveLength(1);
    expect(result.usedIndices).toEqual([0]);
  });

  it('should throw error for empty window', () => {
    expect(() => forceCompleteRow([], DESKTOP)).toThrow('empty window');
  });

  it('should pick best-fit item instead of blindly taking next sequential item', () => {
    // V4* effective=3 (vertical penalty), cv = 5/(6-3) = 1.67
    // After taking V4* (1.67), remaining gap = 3.33
    // H4* cv=2.50, distance from gap = |2.50 - 3.33| = 0.83 ← best fit
    // H3* cv=1.67, distance = |1.67 - 3.33| = 1.66
    // H1* cv=1.00, distance = |1.00 - 3.33| = 2.33
    // Picks H4* (index 2) → total 4.17 (83%), not complete yet
    // Remaining gap = 0.83
    // H3* cv=1.67, distance = |1.67 - 0.83| = 0.84
    // H1* cv=1.00, distance = |1.00 - 0.83| = 0.17 ← best fit
    // Picks H1* (index 3) → total 5.17 (103%) → complete
    //
    // Old behavior would take: V4*(0), H3*(1), H4*(2) → total 5.84 (117%)
    // New behavior takes:      V4*(0), H4*(2), H1*(3) → total 5.17 (103%) — closer to 100%
    const window = [
      createVerticalImage(1, 4),     // cv=1.67 (effective=3)
      createHorizontalImage(2, 3),   // cv=1.67
      createHorizontalImage(3, 4),   // cv=2.50
      createHorizontalImage(4, 1),   // cv=1.00
    ];
    const result = forceCompleteRow(window, DESKTOP);
    expect(result.usedIndices).toContain(0); // Always starts with index 0
    expect(result.usedIndices).toContain(2); // H4* best fit for 3.33 gap
    expect(result.usedIndices).toContain(3); // H1* best fit for 0.83 gap
    expect(result.components).toHaveLength(3);
    // Crucially, index 1 (H3*) is NOT picked — it's farther from the gap both times
    expect(result.usedIndices).not.toContain(1);
  });

  it('should prefer item that lands closer to 100% over one that overshoots more', () => {
    // H3* (1.67) at index 0. Remaining = 3.33
    // H4* (2.50) → total 4.17 (83%) — underfills
    // H3* (1.67) → total 3.34 (67%) — underfills more
    // After picking H4* (best fit, distance 0.83), remaining = 0.83
    // H3* (1.67) distance = |1.67 - 0.83| = 0.84
    // H1* (1.0)  distance = |1.0 - 0.83| = 0.17 ← best fit
    const window = [
      createHorizontalImage(1, 3),  // cv=1.67
      createHorizontalImage(2, 4),  // cv=2.50
      createHorizontalImage(3, 3),  // cv=1.67
      createHorizontalImage(4, 1),  // cv=1.00
    ];
    const result = forceCompleteRow(window, DESKTOP);
    // Takes H3*(0), then H4*(1) best fit for 3.33 gap → total 4.17 (83%)
    // Not yet complete. Then H1*(3) best fit for 0.83 gap → total 5.17 (103%) → complete
    expect(result.usedIndices).toContain(0);
    expect(result.usedIndices).toContain(1); // H4*
    expect(result.usedIndices).toContain(3); // H1* picked over H3* (closer to gap)
    expect(result.components).toHaveLength(3);
  });

  it('should still take items sequentially when all have equal component values', () => {
    const window = [
      createHorizontalImage(1, 3), // cv=1.67
      createHorizontalImage(2, 3), // cv=1.67
      createHorizontalImage(3, 3), // cv=1.67
      createHorizontalImage(4, 3), // cv=1.67
    ];
    const result = forceCompleteRow(window, DESKTOP);
    // All equal cv, so best-fit picks lowest index when tied
    // Takes 3 items to reach 100%
    expect(result.components).toHaveLength(3);
    expect(result.usedIndices).toEqual([0, 1, 2]);
  });
});

// ===================== buildRows Tests =====================

describe('buildRows', () => {
  // Need to import buildRows
  const { buildRows } = require('@/app/utils/rowCombination');

  it('should create a single row from one H5* image', () => {
    const items = [createHorizontalImage(1, 5)];
    const rows = buildRows(items, DESKTOP);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.components).toHaveLength(1);
    expect(rows[0]?.patternName).toBe(CombinationPattern.STANDALONE);
  });

  it('should create two rows from two H5* images', () => {
    const items = [createHorizontalImage(1, 5), createHorizontalImage(2, 5)];
    const rows = buildRows(items, DESKTOP);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.patternName).toBe(CombinationPattern.STANDALONE);
    expect(rows[1]?.patternName).toBe(CombinationPattern.STANDALONE);
  });

  it('should match VERTICAL_PAIR pattern for two V3* images', () => {
    const items = [createVerticalImage(1, 3), createVerticalImage(2, 3)];
    const rows = buildRows(items, DESKTOP);
    // V3* + V3* fills ~2.5/5 = 50%, NOT complete
    // Should fall through to forceCompleteRow
    expect(rows).toHaveLength(1);
    expect(rows[0]?.components).toHaveLength(2);
  });

  it('should match TRIPLE_HORIZONTAL for three H3* images', () => {
    const items = [
      createHorizontalImage(1, 3),
      createHorizontalImage(2, 3),
      createHorizontalImage(3, 3),
    ];
    const rows = buildRows(items, DESKTOP);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.components).toHaveLength(3);
    expect(rows[0]?.patternName).toBe(CombinationPattern.TRIPLE_HORIZONTAL);
  });

  it('should use forceCompleteRow when no pattern matches', () => {
    const items = [
      createHorizontalImage(1, 1),
      createVerticalImage(2, 1),
      createHorizontalImage(3, 2),
      createVerticalImage(4, 2),
      createHorizontalImage(5, 1),
    ];
    const rows = buildRows(items, DESKTOP);
    expect(rows.length).toBeGreaterThan(0);
    // All rows should be used
    const totalItems = rows.reduce((sum: number, row: RowResult) => sum + row.components.length, 0);
    expect(totalItems).toBe(items.length);
  });

  it('should process all items and leave none behind', () => {
    const items = [
      createHorizontalImage(1, 5),
      createHorizontalImage(2, 4),
      createVerticalImage(3, 3),
      createVerticalImage(4, 3),
      createHorizontalImage(5, 3),
      createHorizontalImage(6, 2),
    ];
    const rows = buildRows(items, DESKTOP);
    const totalItems = rows.reduce((sum: number, row: RowResult) => sum + row.components.length, 0);
    expect(totalItems).toBe(items.length);
  });

  it('should respect Rule 1: no half-empty rows except possibly the last', () => {
    const items = [
      createHorizontalImage(1, 5),
      createHorizontalImage(2, 5),
      createHorizontalImage(3, 3),
      createHorizontalImage(4, 3),
      createHorizontalImage(5, 3),
    ];
    const rows = buildRows(items, DESKTOP);

    // All rows except the last should be >= 90% full
    for (let i = 0; i < rows.length - 1; i++) {
      const row = rows[i];
      if (row) {
        expect(isRowComplete(row.components, DESKTOP)).toBe(true);
      }
    }
  });

  it('should work with rowWidth=4 (tablet)', () => {
    const items = [
      createHorizontalImage(1, 4),
      createHorizontalImage(2, 4),
    ];
    const rows = buildRows(items, 4);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.components).toHaveLength(2);
    expect(isRowComplete(rows[0]!.components, 4)).toBe(true);
  });

  it('should work with rowWidth=3 (small tablet)', () => {
    const items = [
      createHorizontalImage(1, 1),
      createHorizontalImage(2, 1),
      createHorizontalImage(3, 1),
    ];
    const rows = buildRows(items, 3);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.components).toHaveLength(3);
  });

  it('should prioritize DOMINANT_VERTICAL_PAIR over VERTICAL_PAIR', () => {
    const items = [
      createHorizontalImage(1, 4),
      createVerticalImage(2, 3),
      createVerticalImage(3, 3),
    ];
    const rows = buildRows(items, DESKTOP);
    // H4* (2.5) + V3* (1.25) + V3* (1.25) = 5.0, 100%
    expect(rows).toHaveLength(1);
    expect(rows[0]?.patternName).toBe(CombinationPattern.DOMINANT_VERTICAL_PAIR);
    expect(rows[0]?.components).toHaveLength(3);
  });

  it('should handle empty input', () => {
    const rows = buildRows([], DESKTOP);
    expect(rows).toHaveLength(0);
  });
});
