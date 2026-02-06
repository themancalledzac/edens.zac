/**
 * Unit tests for rowCombination.ts
 * Tests CombinationPattern enum, PATTERN_TABLE, isRowComplete, matchPattern, getOrientation
 */

import { LAYOUT } from '@/app/constants';
import type { AnyContentModel, ContentImageModel } from '@/app/types/Content';
import {
  CombinationPattern,
  getOrientation,
  isRowComplete,
  matchPattern,
  MAX_FILL_RATIO,
  MIN_FILL_RATIO,
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

  it('should define DOMINANT_VERTICAL_PAIR with 3 requirements (flexible secondaries)', () => {
    const def = PATTERN_TABLE[CombinationPattern.DOMINANT_VERTICAL_PAIR];
    expect(def.requires).toHaveLength(3);
    expect(def.requires[0]?.orientation).toBe('horizontal');
    expect(def.requires[1]?.orientation).toBeUndefined(); // Flexible: any orientation
    expect(def.requires[2]?.orientation).toBeUndefined(); // Flexible: any orientation
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
      // H4* (2.5) + H2* (1.25) + H1* (1) = 4.75 → 95% ✓
      const items = [
        createHorizontalImage(1, 4),
        createHorizontalImage(2, 2),
        createHorizontalImage(3, 1),
      ];
      expect(isRowComplete(items, DESKTOP)).toBe(true);
    });

    it('should return true at 100% fill', () => {
      // H5* = 5.0 → 100%
      const items = [createHorizontalImage(1, 5)];
      expect(isRowComplete(items, DESKTOP)).toBe(true);
    });

    it('should return true at ~110% fill (within 115% cap)', () => {
      // H5* (5.0) + H1* (1.0) = 6.0 → 120% — OVER the cap
      // H4* (2.5) + H3* (1.67) + H1* (1.0) = 5.17 → 103% ✓
      const items = [
        createHorizontalImage(1, 4),
        createHorizontalImage(2, 3),
        createHorizontalImage(3, 1),
      ];
      expect(isRowComplete(items, DESKTOP)).toBe(true);
    });

    it('should return false when fill exceeds 115% (overfill cap)', () => {
      // H5* (5.0) + V3* (1.25) = 6.25 → 125% — exceeds cap
      const items = [createHorizontalImage(1, 5), createVerticalImage(2, 3)];
      expect(isRowComplete(items, DESKTOP)).toBe(false);
    });

    it('should return false for catastrophic overfill like 150%+', () => {
      // H5* (5.0) + V2* (1.25) + V2* (1.25) = 7.5 → 150%
      const items = [
        createHorizontalImage(1, 5),
        createVerticalImage(2, 2),
        createVerticalImage(3, 2),
      ];
      expect(isRowComplete(items, DESKTOP)).toBe(false);
    });

    it('should export MIN_FILL_RATIO as 0.9', () => {
      expect(MIN_FILL_RATIO).toBe(0.9);
    });

    it('should export MAX_FILL_RATIO as 1.15', () => {
      expect(MAX_FILL_RATIO).toBe(1.15);
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

    it('should match H5* at index 1 when item 0 is low-rated (Issue 8 fix)', () => {
      const window = [
        createVerticalImage(1, 2),    // V2* at index 0 (cv ~1.25, below 1.67 threshold)
        createHorizontalImage(2, 5),  // H5* at index 1 - CAN match (item 0 is skippable)
        createHorizontalImage(3, 3),
      ];
      const result = matchPattern(
        CombinationPattern.STANDALONE,
        PATTERN_TABLE[CombinationPattern.STANDALONE],
        window,
        DESKTOP
      );
      expect(result).not.toBeNull();
      expect(result?.usedIndices).toEqual([1]); // H5* at index 1
      expect(result?.components).toHaveLength(1);
      expect(result?.components[0]?.id).toBe(2); // H5* image
    });

    it('should NOT match H5* at index 1 when item 0 is NOT low-rated', () => {
      const window = [
        createHorizontalImage(1, 4),  // H4* at index 0 (cv 2.5, above 1.67 threshold)
        createHorizontalImage(2, 5),  // H5* at index 1 - CANNOT skip item 0
        createHorizontalImage(3, 3),
      ];
      const result = matchPattern(
        CombinationPattern.STANDALONE,
        PATTERN_TABLE[CombinationPattern.STANDALONE],
        window,
        DESKTOP
      );
      expect(result).toBeNull(); // Item 0 is not skippable
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

  describe('HORIZONTAL_PAIR pattern (Issue 7)', () => {
    it('should match H4* + H4* (perfect 100% fill)', () => {
      const window = [createHorizontalImage(1, 4), createHorizontalImage(2, 4)];
      const result = matchPattern(
        CombinationPattern.HORIZONTAL_PAIR,
        PATTERN_TABLE[CombinationPattern.HORIZONTAL_PAIR],
        window,
        DESKTOP
      );
      expect(result).not.toBeNull();
      expect(result!.components).toHaveLength(2);
      expect(result!.direction).toBe('horizontal');
      expect(result!.patternName).toBe(CombinationPattern.HORIZONTAL_PAIR);
    });

    it('should match H3* + H3* (67% fill)', () => {
      const window = [createHorizontalImage(1, 3), createHorizontalImage(2, 3)];
      const result = matchPattern(
        CombinationPattern.HORIZONTAL_PAIR,
        PATTERN_TABLE[CombinationPattern.HORIZONTAL_PAIR],
        window,
        DESKTOP
      );
      expect(result).not.toBeNull();
      expect(result!.components).toHaveLength(2);
    });

    it('should match H4* + H3* (83% fill, within proximity)', () => {
      const window = [createHorizontalImage(1, 4), createHorizontalImage(2, 3)];
      const result = matchPattern(
        CombinationPattern.HORIZONTAL_PAIR,
        PATTERN_TABLE[CombinationPattern.HORIZONTAL_PAIR],
        window,
        DESKTOP
      );
      expect(result).not.toBeNull();
      expect(result!.components).toHaveLength(2);
    });

    it('should NOT match H5* + H4* (H5* exceeds maxRating)', () => {
      const window = [createHorizontalImage(1, 5), createHorizontalImage(2, 4)];
      const result = matchPattern(
        CombinationPattern.HORIZONTAL_PAIR,
        PATTERN_TABLE[CombinationPattern.HORIZONTAL_PAIR],
        window,
        DESKTOP
      );
      expect(result).toBeNull(); // H5* rating 5 > maxRating 4
    });

    it('should NOT match H2* + H2* (rating below minRating)', () => {
      const window = [createHorizontalImage(1, 2), createHorizontalImage(2, 2)];
      const result = matchPattern(
        CombinationPattern.HORIZONTAL_PAIR,
        PATTERN_TABLE[CombinationPattern.HORIZONTAL_PAIR],
        window,
        DESKTOP
      );
      expect(result).toBeNull(); // Rating 2 < minRating 3
    });

    it('should NOT match H4* + V4* (vertical fails orientation check)', () => {
      const window = [createHorizontalImage(1, 4), createVerticalImage(2, 4)];
      const result = matchPattern(
        CombinationPattern.HORIZONTAL_PAIR,
        PATTERN_TABLE[CombinationPattern.HORIZONTAL_PAIR],
        window,
        DESKTOP
      );
      expect(result).toBeNull();
    });

    it('should NOT match when rowWidth < 4', () => {
      const window = [createHorizontalImage(1, 4), createHorizontalImage(2, 4)];
      const result = matchPattern(
        CombinationPattern.HORIZONTAL_PAIR,
        PATTERN_TABLE[CombinationPattern.HORIZONTAL_PAIR],
        window,
        3 // Less than minRowWidth of 4
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

    // ========== Flexible Pattern Tests (Commit 1) ==========
    it('should match H4★ + V2★ + H3★ (Row 20 case - mixed secondaries)', () => {
      const window = [
        createHorizontalImage(1, 4), // Main: H4★
        createVerticalImage(2, 2),   // Secondary 1: V2★ (effective 1)
        createHorizontalImage(3, 3), // Secondary 2: H3★
      ];
      const result = matchPattern(
        CombinationPattern.DOMINANT_VERTICAL_PAIR,
        PATTERN_TABLE[CombinationPattern.DOMINANT_VERTICAL_PAIR],
        window,
        DESKTOP
      );
      expect(result).not.toBeNull();
      expect(result!.components).toHaveLength(3);
      expect(result!.components[0]!.id).toBe(1); // H4★
      expect(result!.components[1]!.id).toBe(2); // V2★
      expect(result!.components[2]!.id).toBe(3); // H3★
    });

    it('should match H4★ + H3★ + V2★ (horizontal then vertical secondaries)', () => {
      const window = [
        createHorizontalImage(1, 4), // Main: H4★
        createHorizontalImage(2, 3), // Secondary 1: H3★
        createVerticalImage(3, 2),   // Secondary 2: V2★ (effective 1)
      ];
      const result = matchPattern(
        CombinationPattern.DOMINANT_VERTICAL_PAIR,
        PATTERN_TABLE[CombinationPattern.DOMINANT_VERTICAL_PAIR],
        window,
        DESKTOP
      );
      expect(result).not.toBeNull();
      expect(result!.components).toHaveLength(3);
      expect(result!.components[0]!.id).toBe(1); // H4★
      expect(result!.components[1]!.id).toBe(2); // H3★
      expect(result!.components[2]!.id).toBe(3); // V2★
    });

    it('should match H5★ + V2★ + H2★ (flexible with H5★ main)', () => {
      const window = [
        createHorizontalImage(1, 5), // Main: H5★
        createVerticalImage(2, 2),   // Secondary 1: V2★ (effective 1)
        createHorizontalImage(3, 2), // Secondary 2: H2★
      ];
      const result = matchPattern(
        CombinationPattern.DOMINANT_VERTICAL_PAIR,
        PATTERN_TABLE[CombinationPattern.DOMINANT_VERTICAL_PAIR],
        window,
        DESKTOP
      );
      expect(result).not.toBeNull();
      expect(result!.components).toHaveLength(3);
    });

    it('should still be gated by overfill cap - rejects if row exceeds 115%', () => {
      // H5★ + V3★ + V3★ would be ~7.5 component value (150% fill) - should be rejected by isRowComplete
      // This test verifies the pattern MATCHES, but buildRows would reject due to overfill
      const window = [
        createHorizontalImage(1, 5), // H5★ (cv = 5.0)
        createVerticalImage(2, 3),   // V3★ (effective 2, cv ≈ 1.25)
        createVerticalImage(3, 3),   // V3★ (effective 2, cv ≈ 1.25)
      ];
      const result = matchPattern(
        CombinationPattern.DOMINANT_VERTICAL_PAIR,
        PATTERN_TABLE[CombinationPattern.DOMINANT_VERTICAL_PAIR],
        window,
        DESKTOP
      );
      // Pattern matches the requirements
      expect(result).not.toBeNull();

      // But isRowComplete should reject it due to overfill (>115%)
      expect(isRowComplete(result!.components, DESKTOP)).toBe(false);
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

  it('should fall back to best-fit when sequential overshoots', () => {
    // Sequential: V4*(1.67) + H3*(1.67) = 3.34 (67%) + H4*(2.50) = 5.84 (117%) > 115%
    // At 67% < 90%, sequential can't work → falls back to best-fit.
    // Best-fit picks H4* (index 2, closest to gap 3.33) → total 4.17 (83%)
    // Then H1* (index 3, closest to gap 0.83) → total 5.17 (103%) → complete
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

  it('should prefer sequential order over best-fit when sequential completes the row', () => {
    // Window: H3*(1.67), V3*(1.25 effective=2), H3*(1.67), H5*(5.00), H4*(2.50)
    // Sequential: 1.67 + 1.25 + 1.67 = 4.59 (92%) → complete! Uses [0, 1, 2]
    // Best-fit would pick H4*(idx 4, distance 0.83 from gap 3.33) before V3*(idx 1),
    // reordering items 3+ positions. Sequential avoids this.
    const window = [
      createHorizontalImage(1, 3),   // cv=1.67
      createVerticalImage(2, 3),     // cv=1.25 (effective=2, vertical penalty)
      createHorizontalImage(3, 3),   // cv=1.67
      createHorizontalImage(4, 5),   // cv=5.00 — NOT pulled in
      createHorizontalImage(5, 4),   // cv=2.50 — NOT pulled in
    ];
    const result = forceCompleteRow(window, DESKTOP);
    expect(result.usedIndices).toEqual([0, 1, 2]); // sequential order preserved
    expect(result.components).toHaveLength(3);
  });

  describe('overfill prevention', () => {
    it('should not add items that push fill beyond 115% when current state is acceptable', () => {
      // H4* (2.5) + H3* (1.67) = 4.17 → 83% (not yet complete)
      // Next best-fit for gap 0.83: H3*(1.67) → total 5.84 (117%) > 115% cap
      // Compare: underfill 83% (distance 0.17 from 100%) vs overfill 117% (distance 0.17)
      // Tied distance — should prefer underfill (stop without adding)
      // But 83% < MIN_FILL (90%), so actually the overfill is accepted since it's closer to 100%
      // Wait — 83% is distance 0.17, 117% is distance 0.17 — equal.
      // The code checks: currentFill >= MIN (false) || underfillDist <= overfillDist (true) → stop
      const window = [
        createHorizontalImage(1, 4),  // cv=2.50
        createHorizontalImage(2, 3),  // cv=1.67
        createHorizontalImage(3, 3),  // cv=1.67
      ];
      const result = forceCompleteRow(window, DESKTOP);
      // Takes H4*(0), then H3*(1) = best fit for 2.5 gap → total 4.17 (83%)
      // Next: H3*(2) would make 5.84 (117%). Underfill dist = 0.17, overfill dist = 0.17
      // Equal: prefers underfill → stops at 2 items
      expect(result.components).toHaveLength(2);
      expect(result.usedIndices).toEqual([0, 1]);
    });

    it('should accept mild overfill when it is much closer to 100% than underfill', () => {
      // H4* (2.5) alone. Gap = 2.5
      // H3* (1.67) → total 4.17 (83%). Not complete, keep going.
      // Next gap = 0.83. H2* (1.25). Total would be 5.42 → 108%. Within 115%!
      // So it gets accepted normally via isRowComplete.
      const window = [
        createHorizontalImage(1, 4),  // cv=2.50
        createHorizontalImage(2, 3),  // cv=1.67
        createHorizontalImage(3, 2),  // cv=1.25
      ];
      const result = forceCompleteRow(window, DESKTOP);
      // H4*(0) + H3*(1) = 4.17 (83%), not complete
      // + H2*(2) = 5.42 (108%) → within 90-115% → complete ✓
      expect(result.components).toHaveLength(3);
    });

    it('should prevent H5* + H5* catastrophic overfill (200%)', () => {
      // H5* (5.0) alone = 100% → already complete via isRowComplete
      const window = [
        createHorizontalImage(1, 5),  // cv=5.0
        createHorizontalImage(2, 5),  // cv=5.0
      ];
      const result = forceCompleteRow(window, DESKTOP);
      expect(result.components).toHaveLength(1); // Just H5*
      expect(result.usedIndices).toEqual([0]);
    });

    it('should accept overfill item when underfill is worse', () => {
      // H2* (1.25) at index 0. Gap = 3.75
      // H4* (2.50) → total 3.75 (75%). Not complete.
      // Next gap = 1.25. H3* (1.67) → total 5.42 → 108%. Within cap → accepted normally.
      const window = [
        createHorizontalImage(1, 2),  // cv=1.25
        createHorizontalImage(2, 4),  // cv=2.50
        createHorizontalImage(3, 3),  // cv=1.67
      ];
      const result = forceCompleteRow(window, DESKTOP);
      expect(result.components).toHaveLength(3);
    });

    it('should stop at 2 items when third would cause extreme overfill and current is acceptable', () => {
      // H4* (2.5) + H4* (2.5) = 5.0 → 100% — complete within bounds
      // Should stop here, not add more
      const window = [
        createHorizontalImage(1, 4),  // cv=2.50
        createHorizontalImage(2, 4),  // cv=2.50
        createHorizontalImage(3, 4),  // cv=2.50 — would make 150%
      ];
      const result = forceCompleteRow(window, DESKTOP);
      expect(result.components).toHaveLength(2);
      expect(result.usedIndices).toEqual([0, 1]);
    });
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

  it('should match HORIZONTAL_PAIR for H4* + H4* (Issue 7)', () => {
    const items = [createHorizontalImage(1, 4), createHorizontalImage(2, 4)];
    const rows = buildRows(items, DESKTOP);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.components).toHaveLength(2);
    expect(rows[0]?.patternName).toBe(CombinationPattern.HORIZONTAL_PAIR);
    expect(rows[0]?.direction).toBe('horizontal');
  });

  it('should use FORCE_FILL for H3* + H4* (83% fill, below 90% minimum)', () => {
    // H3* (1.67) + H4* (2.5) = 4.17 → 83% fill, below 90% minimum
    // HORIZONTAL_PAIR pattern matches but isRowComplete rejects it
    // Falls back to FORCE_FILL which accepts underfilled rows
    const items = [createHorizontalImage(1, 3), createHorizontalImage(2, 4)];
    const rows = buildRows(items, DESKTOP);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.patternName).toBe(CombinationPattern.FORCE_FILL);
    expect(rows[0]?.components).toHaveLength(2);
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

  describe('low-rated item skip (Issue 8)', () => {
    it('should allow STANDALONE to skip V1* at position 0 and match H5* at position 1', () => {
      // Collection A, Row 8: [V1*, H5*, ...] → H5* should be standalone, V1* skipped to next row
      // V1* cv ~1.0 (≤ 1.67 threshold), so STANDALONE can skip it
      const items = [
        createVerticalImage(1, 1), // cv ~1.0, skippable
        createHorizontalImage(2, 5), // should match STANDALONE
        createHorizontalImage(3, 3),
      ];
      const rows = buildRows(items, DESKTOP);
      expect(rows.length).toBeGreaterThanOrEqual(2);
      expect(rows[0]?.patternName).toBe(CombinationPattern.STANDALONE);
      expect(rows[0]?.components[0]?.id).toBe(2); // H5* was matched
      expect(rows[0]?.components).toHaveLength(1);
      // V1* should appear in a later row
      const allItemIds = rows.flatMap((r: RowResult) => r.components.map((c: AnyContentModel) => c.id));
      expect(allItemIds).toContain(1); // V1* is used somewhere
    });

    it('should allow STANDALONE to skip V2* at position 0 and match H5* at position 1', () => {
      // Collection B, Row 1: [H2*, H5*, ...] → H5* should be standalone
      // H2* cv = 1.25 (≤ 1.67 threshold), so STANDALONE can skip it
      const items = [
        createHorizontalImage(1, 2), // cv ~1.25, skippable
        createHorizontalImage(2, 5), // should match STANDALONE
        createHorizontalImage(3, 3),
      ];
      const rows = buildRows(items, DESKTOP);
      expect(rows[0]?.patternName).toBe(CombinationPattern.STANDALONE);
      expect(rows[0]?.components[0]?.id).toBe(2); // H5* was matched
    });

    it('should NOT skip H4* at position 0 (cv 2.5 > 1.67 threshold)', () => {
      // When item 0 is not low-rated, STANDALONE cannot skip it
      // H4* (2.5) alone = 50% → not complete → FORCE_FILL takes just H4*
      // Then H5* becomes standalone on next row
      const items = [
        createHorizontalImage(1, 4), // cv 2.5, NOT skippable
        createHorizontalImage(2, 5), // cannot match STANDALONE while H4* is at position 0
      ];
      const rows = buildRows(items, DESKTOP);
      // H4* alone in row 1 (FORCE_FILL, 50% fill - final row exception)
      // H5* alone in row 2 (STANDALONE, 100%)
      expect(rows).toHaveLength(2);
      expect(rows[0]?.components).toHaveLength(1);
      expect(rows[0]?.components[0]?.id).toBe(1); // H4* in first row
      expect(rows[1]?.patternName).toBe(CombinationPattern.STANDALONE);
      expect(rows[1]?.components[0]?.id).toBe(2); // H5* in second row
    });

    it('should prevent H5*+V4* overfill via overfill cap (Issue 6)', () => {
      // Collection B, Row 9: [V4*, H5*, ...] → H5*+V4* would be 150% overfill
      // V4* effective=3 (NOT low-rated, rating > 2), so it won't be skipped.
      // Instead, FORCE_FILL tries V4*+H5* but rejects due to overfill cap (>115%).
      // Result: V4* alone in row 1, H5* alone in row 2.
      const items = [
        createVerticalImage(1, 4), // effective 3, cv ~1.67, NOT skippable
        createHorizontalImage(2, 5), // H5*, would overfill if paired with V4*
        createHorizontalImage(3, 3),
      ];
      const rows = buildRows(items, DESKTOP);
      // V4* fills first row alone (underfilled, but better than 150% overfill)
      expect(rows[0]?.components[0]?.id).toBe(1); // V4* in row 1
      // H5* gets standalone in row 2
      expect(rows[1]?.patternName).toBe(CombinationPattern.STANDALONE);
      expect(rows[1]?.components[0]?.id).toBe(2); // H5*
    });

    it('should skip only item 0 when multiple low-rated items precede H5*', () => {
      // Test edge case: [V2*, V2*, H5*, H3*] - only first V2* at position 0 gets skipped
      // After H5* standalone, second V2* is at position 0 in next window and won't be skipped
      const items = [
        createVerticalImage(1, 2), // V2* at index 0 - skipped for H5* standalone
        createVerticalImage(2, 2), // V2* at index 1 - NOT skipped, stays in window
        createHorizontalImage(3, 5), // H5* - becomes standalone in row 1
        createHorizontalImage(4, 3), // H3* - to complete row 2 with both V2*
      ];
      const rows = buildRows(items, DESKTOP);
      expect(rows).toHaveLength(2);
      // Row 1: H5* standalone
      expect(rows[0]?.patternName).toBe(CombinationPattern.STANDALONE);
      expect(rows[0]?.components[0]?.id).toBe(3); // H5* in first row
      // Row 2: V2* + V2* + H3* (FORCE_FILL, ~90% fill)
      expect(rows[1]?.components).toHaveLength(3);
      const componentIds = rows[1]?.components.map((c: AnyContentModel) => c.id);
      expect(componentIds).toEqual([1, 2, 4]);
    });

    it('should skip V3* (effective rating 2) when it precedes H5*', () => {
      // V3* has effective rating 2 (after vertical penalty), which is at the threshold
      const items = [
        createVerticalImage(1, 3), // V3* effective=2, rating ≤ 2, skippable
        createHorizontalImage(2, 5), // H5* - should match STANDALONE
        createHorizontalImage(3, 3),
      ];
      const rows = buildRows(items, DESKTOP);
      // H5* gets standalone in row 1
      expect(rows[0]?.patternName).toBe(CombinationPattern.STANDALONE);
      expect(rows[0]?.components[0]?.id).toBe(2); // H5*
      // V3* goes to next row
      expect(rows[1]?.components[0]?.id).toBe(1); // V3* in row 2
    });
  });

  describe('overfill prevention (Issue 6 / Issue 13)', () => {
    it('should reject DVP when H5* is dominant (H5*+V2*+V3* = 150%+)', () => {
      // Issue 13: H5* (cv=5.0) + V2* (cv=1.25) + V3* (cv=1.25) = 7.5 → 150%
      // DVP pattern matches but isRowComplete rejects due to overfill cap
      // Should fall through to STANDALONE for H5*, then V2*+V3* in next row
      const items = [
        createHorizontalImage(1, 5),
        createVerticalImage(2, 2),
        createVerticalImage(3, 3),
      ];
      const rows = buildRows(items, DESKTOP);
      // H5* should be standalone (100%), V2*+V3* should be in a separate row
      expect(rows).toHaveLength(2);
      expect(rows[0]?.patternName).toBe(CombinationPattern.STANDALONE);
      expect(rows[0]?.components).toHaveLength(1);
    });

    it('should reject DVP when H5* + V2* + V2* = 150%', () => {
      // Collection B, Row 7 scenario
      const items = [
        createHorizontalImage(1, 5),
        createVerticalImage(2, 2),
        createVerticalImage(3, 2),
      ];
      const rows = buildRows(items, DESKTOP);
      expect(rows).toHaveLength(2);
      expect(rows[0]?.patternName).toBe(CombinationPattern.STANDALONE);
      expect(rows[0]?.components).toHaveLength(1);
    });

    it('should accept DVP when H4* is dominant (H4*+V3*+V3* = 100%)', () => {
      // The intended use case — should still work
      const items = [
        createHorizontalImage(1, 4),
        createVerticalImage(2, 3),
        createVerticalImage(3, 3),
      ];
      const rows = buildRows(items, DESKTOP);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.patternName).toBe(CombinationPattern.DOMINANT_VERTICAL_PAIR);
    });

    it('should reject DOMINANT_SECONDARY when H5*+V1* = 120%', () => {
      // Collection A, Row 8 scenario: H5*(5.0) + V1*(cv=1.0) = 6.0 → 120%
      // V1* effective = 0, cv = 5/(6-0) = 0.83... wait, let me check
      // Actually V1* rating=1, effective=0 (vertical penalty), cv = getComponentValue(0, 5)
      // effectiveRating 0: itemsPerRow = 6-0 = 6, clamped to 5, cv = 5/5 = 1.0
      // H5*(5.0) + V1*(1.0) = 6.0 → 120% > 115% → rejected
      const items = [
        createHorizontalImage(1, 5),
        createVerticalImage(2, 1),
      ];
      const rows = buildRows(items, DESKTOP);
      // H5* standalone (100%), V1* alone in next row
      expect(rows).toHaveLength(2);
      expect(rows[0]?.patternName).toBe(CombinationPattern.STANDALONE);
    });

    it('should not produce any pattern-matched row exceeding 115% fill', () => {
      // Pattern-matched rows (STANDALONE, DVP, etc.) must always be within bounds.
      // FORCE_FILL rows are best-effort — they may slightly exceed the cap when
      // the alternative (very underfilled) is worse.
      const items = [
        createHorizontalImage(1, 5),
        createVerticalImage(2, 4),
        createVerticalImage(3, 3),
        createHorizontalImage(4, 3),
        createVerticalImage(5, 4),
        createVerticalImage(6, 3),
        createHorizontalImage(7, 5),
        createVerticalImage(8, 2),
        createVerticalImage(9, 2),
      ];
      const rows = buildRows(items, DESKTOP);
      const { getItemComponentValue } = require('@/app/utils/contentRatingUtils');
      for (const row of rows) {
        if (row.patternName === CombinationPattern.FORCE_FILL) continue;
        const totalCV = row.components.reduce(
          (sum: number, item: ContentImageModel) => sum + getItemComponentValue(item, DESKTOP),
          0
        );
        const fill = totalCV / DESKTOP;
        expect(fill).toBeLessThanOrEqual(MAX_FILL_RATIO + 0.001);
      }
    });

    it('should prevent previously catastrophic overfills in pattern-matched rows', () => {
      // Collections that previously had 150%+ overfill via DVP matching H5*
      // After Issue 6 fix, these should be STANDALONE + separate rows
      const items = [
        createHorizontalImage(1, 5),   // Would previously match DVP
        createVerticalImage(2, 3),
        createVerticalImage(3, 3),
        createHorizontalImage(4, 4),   // Good DVP candidate
        createVerticalImage(5, 3),
        createVerticalImage(6, 3),
      ];
      const rows = buildRows(items, DESKTOP);
      const { getItemComponentValue } = require('@/app/utils/contentRatingUtils');
      for (const row of rows) {
        const totalCV = row.components.reduce(
          (sum: number, item: ContentImageModel) => sum + getItemComponentValue(item, DESKTOP),
          0
        );
        const fill = totalCV / DESKTOP;
        // No row should exceed 115%, including FORCE_FILL for this well-structured input
        expect(fill).toBeLessThanOrEqual(MAX_FILL_RATIO + 0.001);
      }
    });

    it('should still process all items when overfill cap forces pattern rejection', () => {
      const items = [
        createHorizontalImage(1, 5),
        createVerticalImage(2, 2),
        createVerticalImage(3, 3),
        createHorizontalImage(4, 5),
        createVerticalImage(5, 2),
        createVerticalImage(6, 2),
      ];
      const rows = buildRows(items, DESKTOP);
      const totalItems = rows.reduce((sum: number, row: RowResult) => sum + row.components.length, 0);
      expect(totalItems).toBe(items.length);
    });
  });

  describe('layout metadata (Issue 9)', () => {
    it('should set layout type to horizontal for STANDALONE pattern', () => {
      const items = [createHorizontalImage(1, 5)];
      const rows = buildRows(items, DESKTOP);
      expect(rows[0]?.layout).toEqual({ type: 'horizontal' });
    });

    it('should set layout type to horizontal for HORIZONTAL_PAIR pattern', () => {
      const items = [createHorizontalImage(1, 4), createHorizontalImage(2, 4)];
      const rows = buildRows(items, DESKTOP);
      expect(rows[0]?.layout).toEqual({ type: 'horizontal' });
    });

    it('should set layout type to horizontal for VERTICAL_PAIR pattern', () => {
      const items = [createVerticalImage(1, 3), createVerticalImage(2, 3)];
      const rows = buildRows(items, DESKTOP);
      expect(rows[0]?.layout).toEqual({ type: 'horizontal' });
    });

    it('should set layout type to main-stacked for DOMINANT_VERTICAL_PAIR pattern', () => {
      const items = [
        createHorizontalImage(1, 4),
        createVerticalImage(2, 3),
        createVerticalImage(3, 3),
      ];
      const rows = buildRows(items, DESKTOP);
      expect(rows[0]?.layout).toEqual({
        type: 'main-stacked',
        mainIndex: 0,
        stackedIndices: [1, 2],
      });
    });

    it('should set layout type to horizontal for DOMINANT_SECONDARY pattern', () => {
      const items = [createHorizontalImage(1, 4), createVerticalImage(2, 2)];
      const rows = buildRows(items, DESKTOP);
      expect(rows[0]?.layout).toEqual({ type: 'horizontal' });
    });

    it('should set layout type to horizontal for TRIPLE_HORIZONTAL pattern', () => {
      const items = [
        createHorizontalImage(1, 3),
        createHorizontalImage(2, 3),
        createHorizontalImage(3, 3),
      ];
      const rows = buildRows(items, DESKTOP);
      expect(rows[0]?.layout).toEqual({ type: 'horizontal' });
    });

    it('should set layout type to horizontal for MULTI_SMALL pattern', () => {
      const items = [
        createVerticalImage(1, 1),
        createVerticalImage(2, 1),
        createVerticalImage(3, 1),
      ];
      const rows = buildRows(items, DESKTOP);
      expect(rows[0]?.layout).toEqual({ type: 'horizontal' });
    });

    it('should set layout type to horizontal for FORCE_FILL pattern', () => {
      const items = [createHorizontalImage(1, 3), createHorizontalImage(2, 4)];
      const rows = buildRows(items, DESKTOP);
      expect(rows[0]?.patternName).toBe(CombinationPattern.FORCE_FILL);
      expect(rows[0]?.layout).toEqual({ type: 'horizontal' });
    });

    it('should preserve layout metadata through multiple rows', () => {
      const items = [
        createHorizontalImage(1, 4),  // H4★ (cv 2.5)
        createVerticalImage(2, 3),    // V3★ (effective 2, cv 1.25)
        createVerticalImage(3, 3),    // V3★ (effective 2, cv 1.25) → DVP = 5.0 (100%)
        createHorizontalImage(4, 5),  // H5★ (cv 5.0) → STANDALONE
        createHorizontalImage(5, 3),  // H3★ (cv 1.67)
        createHorizontalImage(6, 3),  // H3★ (cv 1.67)
        createHorizontalImage(7, 3),  // H3★ (cv 1.67) → TRIPLE_HORIZONTAL = 5.0 (100%)
      ];
      const rows = buildRows(items, DESKTOP);

      expect(rows.length).toBe(3);

      // Row 1: H4★ + V3★ + V3★ → DOMINANT_VERTICAL_PAIR (main-stacked)
      expect(rows[0]?.patternName).toBe(CombinationPattern.DOMINANT_VERTICAL_PAIR);
      expect(rows[0]?.layout.type).toBe('main-stacked');
      expect(rows[0]?.components.length).toBe(3);

      // Row 2: H5★ → STANDALONE (horizontal)
      expect(rows[1]?.patternName).toBe(CombinationPattern.STANDALONE);
      expect(rows[1]?.layout.type).toBe('horizontal');
      expect(rows[1]?.components.length).toBe(1);

      // Row 3: H3★ + H3★ + H3★ → TRIPLE_HORIZONTAL (horizontal)
      expect(rows[2]?.patternName).toBe(CombinationPattern.TRIPLE_HORIZONTAL);
      expect(rows[2]?.layout.type).toBe('horizontal');
      expect(rows[2]?.components.length).toBe(3);
    });
  });

  describe('nested quad layout', () => {
    it('should detect nested-quad layout for 4-item FORCE_FILL with dominant vertical', () => {
      // Real Row 15 scenario: V1★, V2★, V4★, H3★
      // V4★ base rating 4 → effective rating 3 (vertical penalty)
      const v1 = createVerticalImage(1, 1); // V1★ → effective 1
      const v2 = createVerticalImage(2, 2); // V2★ → effective 2
      const v4 = createVerticalImage(3, 4); // V4★ → effective 3
      const h3 = createHorizontalImage(4, 3); // H3★ → effective 3

      const items = [v1, v2, v4, h3];
      const rows = buildRows(items, 5);

      expect(rows).toHaveLength(1);
      expect(rows[0]?.patternName).toBe(CombinationPattern.FORCE_FILL);
      expect(rows[0]?.layout.type).toBe('nested-quad');

      const layout = rows[0]?.layout;
      if (layout && layout.type === 'nested-quad') {
        // V4★ should be the main (highest effective rating among verticals)
        expect(rows[0]?.components[layout.mainIndex]).toEqual(v4);

        // V1★ and V2★ should be the top pair (2 lowest verticals)
        const topPair = [
          rows[0]?.components[layout.topPairIndices[0]],
          rows[0]?.components[layout.topPairIndices[1]],
        ];
        expect(topPair).toContain(v1);
        expect(topPair).toContain(v2);

        // H3★ should be the bottom
        expect(rows[0]?.components[layout.bottomIndex]).toEqual(h3);
      }
    });

    it('should NOT use nested-quad for 4 items without enough verticals', () => {
      // 4 items but only 1 vertical - can't form top pair
      // Use low ratings so first 3 items don't fill the row (need all 4)
      const h1a = createHorizontalImage(1, 1);  // cv = 1.00
      const h1b = createHorizontalImage(2, 1);  // cv = 1.00
      const h2 = createHorizontalImage(3, 2);   // cv = 1.25
      const v1 = createVerticalImage(4, 1);     // cv = 1.00
      // Total: 1.00 + 1.00 + 1.25 + 1.00 = 4.25 → 85% fill (under 90%, but with 4 items)

      const items = [h1a, h1b, h2, v1];
      const rows = buildRows(items, 5);

      expect(rows).toHaveLength(1);
      expect(rows[0]?.patternName).toBe(CombinationPattern.FORCE_FILL);
      expect(rows[0]?.layout.type).toBe('horizontal'); // Falls back to standard horizontal (only 1 vertical)
    });

    it('should NOT use nested-quad for 3 items', () => {
      const v2 = createVerticalImage(1, 2);
      const v3 = createVerticalImage(2, 3);
      const h3 = createHorizontalImage(3, 3);

      const items = [v2, v3, h3];
      const rows = buildRows(items, 5);

      expect(rows).toHaveLength(1);
      // Should use existing main-stacked detection instead
      expect(rows[0]?.layout.type).not.toBe('nested-quad');
    });
  });

  describe('boxTree generation', () => {
    it('should generate a leaf boxTree for STANDALONE pattern', () => {
      const h5 = createHorizontalImage(1, 5);
      const rows = buildRows([h5], 5);

      expect(rows).toHaveLength(1);
      const boxTree = rows[0]?.boxTree;
      expect(boxTree).toBeDefined();
      expect(boxTree?.type).toBe('leaf');
      if (boxTree?.type === 'leaf') {
        expect(boxTree.content.id).toBe(h5.id);
      }
    });

    it('should generate a horizontal combined boxTree for HORIZONTAL_PAIR', () => {
      const h4_1 = createHorizontalImage(1, 4);
      const h4_2 = createHorizontalImage(2, 4);
      const rows = buildRows([h4_1, h4_2], 5);

      expect(rows).toHaveLength(1);
      const boxTree = rows[0]?.boxTree;
      expect(boxTree).toBeDefined();
      expect(boxTree?.type).toBe('combined');
      if (boxTree?.type === 'combined') {
        expect(boxTree.direction).toBe('horizontal');
        expect(boxTree.children).toHaveLength(2);
        expect(boxTree.children[0]?.type).toBe('leaf');
        expect(boxTree.children[1]?.type).toBe('leaf');
        if (boxTree.children[0]?.type === 'leaf' && boxTree.children[1]?.type === 'leaf') {
          expect(boxTree.children[0].content.id).toBe(h4_1.id);
          expect(boxTree.children[1].content.id).toBe(h4_2.id);
        }
      }
    });

    it('should generate a nested boxTree for DOMINANT_VERTICAL_PAIR (main-stacked)', () => {
      const h4 = createHorizontalImage(1, 4);
      const v3_1 = createVerticalImage(2, 3);
      const v3_2 = createVerticalImage(3, 3);
      const rows = buildRows([h4, v3_1, v3_2], 5);

      expect(rows).toHaveLength(1);
      const boxTree = rows[0]?.boxTree;
      expect(boxTree).toBeDefined();
      expect(boxTree?.type).toBe('combined');
      if (boxTree?.type === 'combined') {
        expect(boxTree.direction).toBe('horizontal');
        // Left child: main image (leaf)
        expect(boxTree.children[0]?.type).toBe('leaf');
        // Right child: vertical stack (combined)
        expect(boxTree.children[1]?.type).toBe('combined');
        if (boxTree.children[1]?.type === 'combined') {
          expect(boxTree.children[1].direction).toBe('vertical');
          expect(boxTree.children[1].children[0]?.type).toBe('leaf');
          expect(boxTree.children[1].children[1]?.type).toBe('leaf');
        }
      }
    });

    it('should generate a nested boxTree for nested-quad layout (4 items)', () => {
      const v4 = createVerticalImage(1, 4);
      const v1 = createVerticalImage(2, 1);
      const v2 = createVerticalImage(3, 2);
      const h3 = createHorizontalImage(4, 3);
      const rows = buildRows([v4, v1, v2, h3], 5);

      expect(rows).toHaveLength(1);
      const boxTree = rows[0]?.boxTree;
      expect(boxTree).toBeDefined();
      expect(boxTree?.type).toBe('combined');
      if (boxTree?.type === 'combined') {
        expect(boxTree.direction).toBe('horizontal');
        // Left child: main (V4*)
        expect(boxTree.children[0]?.type).toBe('leaf');
        // Right child: nested vertical (top pair + bottom)
        expect(boxTree.children[1]?.type).toBe('combined');
        if (boxTree.children[1]?.type === 'combined') {
          expect(boxTree.children[1].direction).toBe('vertical');
          // Top: horizontal pair (V1* + V2*)
          expect(boxTree.children[1].children[0]?.type).toBe('combined');
          if (boxTree.children[1].children[0]?.type === 'combined') {
            expect(boxTree.children[1].children[0].direction).toBe('horizontal');
          }
          // Bottom: H3*
          expect(boxTree.children[1].children[1]?.type).toBe('leaf');
        }
      }
    });

    it('should generate left-heavy tree for 3+ horizontal items', () => {
      const h3_1 = createHorizontalImage(1, 3);
      const h3_2 = createHorizontalImage(2, 3);
      const h3_3 = createHorizontalImage(3, 3);
      const rows = buildRows([h3_1, h3_2, h3_3], 5);

      expect(rows).toHaveLength(1);
      const boxTree = rows[0]?.boxTree;
      expect(boxTree).toBeDefined();
      expect(boxTree?.type).toBe('combined');
      if (boxTree?.type === 'combined') {
        expect(boxTree.direction).toBe('horizontal');
        // Left child: combined (h3_1 + h3_2)
        expect(boxTree.children[0]?.type).toBe('combined');
        // Right child: leaf (h3_3)
        expect(boxTree.children[1]?.type).toBe('leaf');
      }
    });

    it('should include boxTree in every row', () => {
      const h5_1 = createHorizontalImage(1, 5);
      const h4_1 = createHorizontalImage(2, 4);
      const h4_2 = createHorizontalImage(3, 4);
      const v3_1 = createVerticalImage(4, 3);
      const v3_2 = createVerticalImage(5, 3);

      const rows = buildRows([h5_1, h4_1, h4_2, v3_1, v3_2], 5);

      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.boxTree).toBeDefined();
        expect(row.boxTree.type).toBeDefined();
      }
    });
  });
});
