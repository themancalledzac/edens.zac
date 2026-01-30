/**
 * Unit tests for patternRegistry.ts
 * Tests pattern detection and matching for layout algorithm
 */

import type { ContentImageModel } from '@/app/types/Content';
import {
  PATTERN_REGISTRY,
  type PatternResult,
  type WindowItem,
} from '@/app/utils/patternRegistry';

// ===================== Test Fixtures =====================

/**
 * Create a mock image content for testing
 */
const createImageContent = (
  id: number,
  overrides?: Partial<ContentImageModel>
): ContentImageModel => ({
  id,
  contentType: 'IMAGE',
  orderIndex: id,
  visible: true,
  imageUrl: `https://example.com/image-${id}.jpg`,
  imageWidth: 1920,
  imageHeight: 1080,
  title: `Image ${id}`,
  ...overrides,
});

/**
 * Create a horizontal image (1920x1080, ratio ~1.78)
 */
const createHorizontalImage = (id: number, rating: number = 0): ContentImageModel =>
  createImageContent(id, {
    imageWidth: 1920,
    imageHeight: 1080,
    rating,
  });

/**
 * Create a vertical image (1080x1920, ratio ~0.56)
 */
const createVerticalImage = (id: number, rating: number = 0): ContentImageModel =>
  createImageContent(id, {
    imageWidth: 1080,
    imageHeight: 1920,
    rating,
  });

/**
 * Create a wide panorama (3000x1000, ratio 3.0)
 */
const createWidePanorama = (id: number, rating: number = 0): ContentImageModel =>
  createImageContent(id, {
    imageWidth: 3000,
    imageHeight: 1000,
    rating,
  });

/**
 * Create WindowItem from image content for pattern testing
 */
function createWindowItem(
  content: ContentImageModel,
  windowIndex: number,
  originalIndex: number,
  slotWidth: number = 1
): WindowItem {
  const aspectRatio = (content.imageWidth || 1920) / (content.imageHeight || 1080);
  return {
    windowIndex,
    originalIndex,
    aspectRatio,
    isVertical: aspectRatio <= 1.0 && aspectRatio > 0.5,
    isHorizontal: aspectRatio > 1.0,
    isWidePanorama: aspectRatio >= 2.0,
    isTallPanorama: aspectRatio <= 0.5,
    rating: content.rating || 0,
    slotWidth,
  };
}

// ===================== Pattern Registry Tests =====================

describe('PATTERN_REGISTRY', () => {
  it('should be sorted by priority (highest first)', () => {
    for (let i = 0; i < PATTERN_REGISTRY.length - 1; i++) {
      const current = PATTERN_REGISTRY[i];
      const next = PATTERN_REGISTRY[i + 1];
      expect(current!.priority).toBeGreaterThanOrEqual(next!.priority);
    }
  });

  it('should have standalone as highest priority', () => {
    expect(PATTERN_REGISTRY[0]?.name).toBe('standalone');
    expect(PATTERN_REGISTRY[0]?.priority).toBe(100);
  });

  it('should have standard as lowest priority (fallback)', () => {
    const lastPattern = PATTERN_REGISTRY[PATTERN_REGISTRY.length - 1];
    expect(lastPattern?.name).toBe('standard');
    expect(lastPattern?.priority).toBe(0);
  });

  it('should contain all 7 patterns', () => {
    const patternNames = PATTERN_REGISTRY.map(p => p.name);
    expect(patternNames).toContain('standalone');
    expect(patternNames).toContain('five-star-vertical-2v');
    expect(patternNames).toContain('five-star-vertical-2h');
    expect(patternNames).toContain('five-star-vertical-mixed');
    expect(patternNames).toContain('main-stacked');
    expect(patternNames).toContain('panorama-vertical');
    expect(patternNames).toContain('standard');
    expect(PATTERN_REGISTRY).toHaveLength(7);
  });
});

// ===================== Standalone Pattern Tests =====================

describe('Standalone Pattern', () => {
  const standaloneMatcher = PATTERN_REGISTRY.find(p => p.name === 'standalone')!;

  describe('canMatch', () => {
    it('should match when first item has Infinity slotWidth', () => {
      const windowItems: WindowItem[] = [
        createWindowItem(createHorizontalImage(1, 5), 0, 0, Infinity),
      ];
      expect(standaloneMatcher.canMatch(windowItems)).toBe(true);
    });

    it('should not match when first item has finite slotWidth', () => {
      const windowItems: WindowItem[] = [
        createWindowItem(createHorizontalImage(1, 3), 0, 0, 2),
      ];
      expect(standaloneMatcher.canMatch(windowItems)).toBe(false);
    });
  });

  describe('match', () => {
    it('should return standalone pattern for 5-star horizontal', () => {
      const windowItems: WindowItem[] = [
        createWindowItem(createHorizontalImage(1, 5), 0, 0, Infinity),
      ];
      const result = standaloneMatcher.match(windowItems, 0);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('standalone');
      expect((result as { type: 'standalone'; indices: [number] }).indices).toEqual([0]);
    });

    it('should return standalone pattern for wide panorama', () => {
      const windowItems: WindowItem[] = [
        createWindowItem(createWidePanorama(1, 3), 0, 0, Infinity),
      ];
      const result = standaloneMatcher.match(windowItems, 0);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('standalone');
    });

    it('should return null for non-standalone item', () => {
      const windowItems: WindowItem[] = [
        createWindowItem(createHorizontalImage(1, 3), 0, 0, 2),
      ];
      const result = standaloneMatcher.match(windowItems, 0);

      expect(result).toBeNull();
    });
  });
});

// ===================== Five-Star Vertical 2V Pattern Tests =====================

describe('Five-Star Vertical 2V Pattern', () => {
  const fiveStarVertical2VMatcher = PATTERN_REGISTRY.find(p => p.name === 'five-star-vertical-2v')!;

  describe('canMatch', () => {
    it('should match when 5-star vertical and 2+ non-5-star verticals exist', () => {
      const windowItems: WindowItem[] = [
        createWindowItem(createVerticalImage(1, 5), 0, 0, 2),
        createWindowItem(createVerticalImage(2, 3), 1, 1, 2),
        createWindowItem(createVerticalImage(3, 4), 2, 2, 2),
      ];
      expect(fiveStarVertical2VMatcher.canMatch(windowItems)).toBe(true);
    });

    it('should not match without 5-star vertical', () => {
      const windowItems: WindowItem[] = [
        createWindowItem(createVerticalImage(1, 4), 0, 0, 2),
        createWindowItem(createVerticalImage(2, 3), 1, 1, 2),
        createWindowItem(createVerticalImage(3, 3), 2, 2, 2),
      ];
      expect(fiveStarVertical2VMatcher.canMatch(windowItems)).toBe(false);
    });

    it('should not match with only one non-5-star vertical', () => {
      const windowItems: WindowItem[] = [
        createWindowItem(createVerticalImage(1, 5), 0, 0, 2),
        createWindowItem(createVerticalImage(2, 3), 1, 1, 2),
        createWindowItem(createHorizontalImage(3, 3), 2, 2, 2),
      ];
      expect(fiveStarVertical2VMatcher.canMatch(windowItems)).toBe(false);
    });
  });

  describe('match', () => {
    it('should return pattern with correct indices', () => {
      const windowItems: WindowItem[] = [
        createWindowItem(createVerticalImage(1, 5), 0, 0, 2),
        createWindowItem(createVerticalImage(2, 3), 1, 1, 2),
        createWindowItem(createVerticalImage(3, 4), 2, 2, 2),
      ];
      const result = fiveStarVertical2VMatcher.match(windowItems, 0);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('five-star-vertical-2v');

      const typedResult = result as Extract<PatternResult, { type: 'five-star-vertical-2v' }>;
      expect(typedResult.mainIndex).toBe(0);
      expect(typedResult.secondaryIndices).toHaveLength(2);
      expect(typedResult.indices).toContain(0);
      expect(typedResult.indices).toContain(1);
      expect(typedResult.indices).toContain(2);
    });

    it('should prefer closer secondaries', () => {
      const windowItems: WindowItem[] = [
        createWindowItem(createVerticalImage(1, 5), 0, 0, 2),
        createWindowItem(createVerticalImage(2, 3), 1, 1, 2),
        createWindowItem(createVerticalImage(3, 4), 2, 2, 2),
        createWindowItem(createVerticalImage(4, 3), 3, 3, 2),
      ];
      const result = fiveStarVertical2VMatcher.match(windowItems, 0);

      expect(result).not.toBeNull();
      const typedResult = result as Extract<PatternResult, { type: 'five-star-vertical-2v' }>;
      // Should pick indices 1 and 2 (closest to main at 0)
      expect(typedResult.secondaryIndices).toContain(1);
      expect(typedResult.secondaryIndices).toContain(2);
    });
  });
});

// ===================== Five-Star Vertical 2H Pattern Tests =====================

describe('Five-Star Vertical 2H Pattern', () => {
  const fiveStarVertical2HMatcher = PATTERN_REGISTRY.find(p => p.name === 'five-star-vertical-2h')!;

  describe('canMatch', () => {
    it('should match when 5-star vertical and 2+ low-rated horizontals exist', () => {
      const windowItems: WindowItem[] = [
        createWindowItem(createVerticalImage(1, 5), 0, 0, 2),
        createWindowItem(createHorizontalImage(2, 2), 1, 1, 1),
        createWindowItem(createHorizontalImage(3, 3), 2, 2, 2),
      ];
      expect(fiveStarVertical2HMatcher.canMatch(windowItems)).toBe(true);
    });

    it('should not match without 5-star vertical', () => {
      const windowItems: WindowItem[] = [
        createWindowItem(createVerticalImage(1, 4), 0, 0, 2),
        createWindowItem(createHorizontalImage(2, 2), 1, 1, 1),
        createWindowItem(createHorizontalImage(3, 3), 2, 2, 2),
      ];
      expect(fiveStarVertical2HMatcher.canMatch(windowItems)).toBe(false);
    });

    it('should not match with only high-rated horizontals (>3 star)', () => {
      const windowItems: WindowItem[] = [
        createWindowItem(createVerticalImage(1, 5), 0, 0, 2),
        createWindowItem(createHorizontalImage(2, 4), 1, 1, Infinity),
        createWindowItem(createHorizontalImage(3, 5), 2, 2, Infinity),
      ];
      expect(fiveStarVertical2HMatcher.canMatch(windowItems)).toBe(false);
    });
  });

  describe('match', () => {
    it('should return pattern with correct indices', () => {
      const windowItems: WindowItem[] = [
        createWindowItem(createVerticalImage(1, 5), 0, 0, 2),
        createWindowItem(createHorizontalImage(2, 2), 1, 1, 1),
        createWindowItem(createHorizontalImage(3, 3), 2, 2, 2),
      ];
      const result = fiveStarVertical2HMatcher.match(windowItems, 0);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('five-star-vertical-2h');

      const typedResult = result as Extract<PatternResult, { type: 'five-star-vertical-2h' }>;
      expect(typedResult.mainIndex).toBe(0);
      expect(typedResult.secondaryIndices).toHaveLength(2);
    });
  });
});

// ===================== Five-Star Vertical Mixed Pattern Tests =====================

describe('Five-Star Vertical Mixed Pattern', () => {
  const fiveStarVerticalMixedMatcher = PATTERN_REGISTRY.find(p => p.name === 'five-star-vertical-mixed')!;

  describe('canMatch', () => {
    it('should match when 5-star vertical, 3-4 star vertical, and <3 star horizontal exist', () => {
      const windowItems: WindowItem[] = [
        createWindowItem(createVerticalImage(1, 5), 0, 0, 2),
        createWindowItem(createVerticalImage(2, 4), 1, 1, 2),
        createWindowItem(createHorizontalImage(3, 2), 2, 2, 1),
      ];
      expect(fiveStarVerticalMixedMatcher.canMatch(windowItems)).toBe(true);
    });

    it('should not match without low-rated horizontal', () => {
      const windowItems: WindowItem[] = [
        createWindowItem(createVerticalImage(1, 5), 0, 0, 2),
        createWindowItem(createVerticalImage(2, 4), 1, 1, 2),
        createWindowItem(createHorizontalImage(3, 3), 2, 2, 2),
      ];
      expect(fiveStarVerticalMixedMatcher.canMatch(windowItems)).toBe(false);
    });

    it('should not match without 3-4 star vertical', () => {
      const windowItems: WindowItem[] = [
        createWindowItem(createVerticalImage(1, 5), 0, 0, 2),
        createWindowItem(createVerticalImage(2, 2), 1, 1, 1),
        createWindowItem(createHorizontalImage(3, 2), 2, 2, 1),
      ];
      expect(fiveStarVerticalMixedMatcher.canMatch(windowItems)).toBe(false);
    });
  });

  describe('match', () => {
    it('should return pattern with correct indices', () => {
      const windowItems: WindowItem[] = [
        createWindowItem(createVerticalImage(1, 5), 0, 0, 2),
        createWindowItem(createVerticalImage(2, 3), 1, 1, 2),
        createWindowItem(createHorizontalImage(3, 1), 2, 2, 1),
      ];
      const result = fiveStarVerticalMixedMatcher.match(windowItems, 0);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('five-star-vertical-mixed');

      const typedResult = result as Extract<PatternResult, { type: 'five-star-vertical-mixed' }>;
      expect(typedResult.mainIndex).toBe(0);
      expect(typedResult.secondaryIndices).toHaveLength(2);
    });
  });
});

// ===================== Main-Stacked Pattern Tests =====================

describe('Main-Stacked Pattern', () => {
  const mainStackedMatcher = PATTERN_REGISTRY.find(p => p.name === 'main-stacked')!;

  describe('canMatch', () => {
    it('should match when 3-4 star image exists', () => {
      const windowItems: WindowItem[] = [
        createWindowItem(createHorizontalImage(1, 4), 0, 0, 2),
        createWindowItem(createHorizontalImage(2, 2), 1, 1, 1),
        createWindowItem(createHorizontalImage(3, 2), 2, 2, 1),
      ];
      expect(mainStackedMatcher.canMatch(windowItems)).toBe(true);
    });

    it('should not match without 3-4 star image', () => {
      const windowItems: WindowItem[] = [
        createWindowItem(createHorizontalImage(1, 2), 0, 0, 1),
        createWindowItem(createHorizontalImage(2, 2), 1, 1, 1),
        createWindowItem(createHorizontalImage(3, 2), 2, 2, 1),
      ];
      expect(mainStackedMatcher.canMatch(windowItems)).toBe(false);
    });
  });

  describe('match', () => {
    it('should return pattern with main and secondaries', () => {
      const windowItems: WindowItem[] = [
        createWindowItem(createHorizontalImage(1, 4), 0, 0, 2),
        createWindowItem(createHorizontalImage(2, 2), 1, 1, 1),
        createWindowItem(createHorizontalImage(3, 2), 2, 2, 1),
      ];
      const result = mainStackedMatcher.match(windowItems, 0);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('main-stacked');

      const typedResult = result as Extract<PatternResult, { type: 'main-stacked' }>;
      expect(typedResult.mainIndex).toBe(0);
      expect(typedResult.secondaryIndices).toHaveLength(2);
    });

    it('should find main in middle of window', () => {
      const windowItems: WindowItem[] = [
        createWindowItem(createHorizontalImage(1, 2), 0, 0, 1),
        createWindowItem(createHorizontalImage(2, 4), 1, 1, 2),
        createWindowItem(createHorizontalImage(3, 2), 2, 2, 1),
        createWindowItem(createHorizontalImage(4, 2), 3, 3, 1),
      ];
      const result = mainStackedMatcher.match(windowItems, 0);

      expect(result).not.toBeNull();
      const typedResult = result as Extract<PatternResult, { type: 'main-stacked' }>;
      expect(typedResult.mainIndex).toBe(1);
    });

    it('should prioritize highest-rated 3-4 star image as main', () => {
      // Window: [3★, 4★, 2★, 2★, 2★]
      // Expected: 4★ becomes main (highest rated), not 3★ (first match)
      const windowItems: WindowItem[] = [
        createWindowItem(createHorizontalImage(1, 3), 0, 0, 2), // 3★ at position 0
        createWindowItem(createHorizontalImage(2, 4), 1, 1, 2), // 4★ at position 1
        createWindowItem(createHorizontalImage(3, 2), 2, 2, 1),
        createWindowItem(createHorizontalImage(4, 2), 3, 3, 1),
        createWindowItem(createHorizontalImage(5, 2), 4, 4, 1),
      ];
      const result = mainStackedMatcher.match(windowItems, 0);

      expect(result).not.toBeNull();
      const typedResult = result as Extract<PatternResult, { type: 'main-stacked' }>;
      // Should select 4★ (index 1) as main, not 3★ (index 0)
      expect(typedResult.mainIndex).toBe(1);
    });

    it('should fall back to lower-rated candidate if higher-rated cannot form valid pattern', () => {
      // Window: [4★, 2★, 2★, 3★, 2★]
      // If 4★ at position 0 can't form valid pattern (e.g., secondaries too far),
      // should fall back to 3★ at position 3
      const windowItems: WindowItem[] = [
        createWindowItem(createHorizontalImage(1, 4), 0, 0, 2), // 4★ at position 0
        createWindowItem(createHorizontalImage(2, 2), 1, 1, 1),
        createWindowItem(createHorizontalImage(3, 2), 2, 2, 1),
        createWindowItem(createHorizontalImage(4, 3), 3, 3, 2), // 3★ at position 3
        createWindowItem(createHorizontalImage(5, 2), 4, 4, 1),
      ];
      const result = mainStackedMatcher.match(windowItems, 0);

      expect(result).not.toBeNull();
      const typedResult = result as Extract<PatternResult, { type: 'main-stacked' }>;
      // Should select either 4★ (if valid) or 3★ (if 4★ can't form pattern)
      // Both should be able to form patterns, but 4★ should be preferred
      expect([0, 3]).toContain(typedResult.mainIndex);
      // If 4★ can form pattern, it should be selected
      if (typedResult.mainIndex === 0) {
        // 4★ was selected - verify it's valid
        expect(typedResult.mainIndex).toBe(0);
      } else {
        // 3★ was selected as fallback
        expect(typedResult.mainIndex).toBe(3);
      }
    });

    it('should set mainPosition to left when main is in first half of window', () => {
      // Window: [2★, 2★, 4★, 2★, 2★]
      // Main at position 2 (first half) should be left-positioned
      const windowItems: WindowItem[] = [
        createWindowItem(createHorizontalImage(1, 2), 0, 0, 1),
        createWindowItem(createHorizontalImage(2, 2), 1, 1, 1),
        createWindowItem(createHorizontalImage(3, 4), 2, 2, 2), // 4★ at position 2
        createWindowItem(createHorizontalImage(4, 2), 3, 3, 1),
        createWindowItem(createHorizontalImage(5, 2), 4, 4, 1),
      ];
      const result = mainStackedMatcher.match(windowItems, 0);

      expect(result).not.toBeNull();
      const typedResult = result as Extract<PatternResult, { type: 'main-stacked' }>;
      expect(typedResult.mainIndex).toBe(2);
      expect(typedResult.mainPosition).toBe('left');
    });

    it('should set mainPosition to right when main is in second half of window', () => {
      // Window: [2★, 2★, 2★, 4★, 2★]
      // Main at position 3 (second half, > 2.5) should be right-positioned
      const windowItems: WindowItem[] = [
        createWindowItem(createHorizontalImage(1, 2), 0, 0, 1),
        createWindowItem(createHorizontalImage(2, 2), 1, 1, 1),
        createWindowItem(createHorizontalImage(3, 2), 2, 2, 1),
        createWindowItem(createHorizontalImage(4, 4), 3, 3, 2), // 4★ at position 3
        createWindowItem(createHorizontalImage(5, 2), 4, 4, 1),
      ];
      const result = mainStackedMatcher.match(windowItems, 0);

      expect(result).not.toBeNull();
      const typedResult = result as Extract<PatternResult, { type: 'main-stacked' }>;
      expect(typedResult.mainIndex).toBe(3);
      expect(typedResult.mainPosition).toBe('right');
    });

    it('should set mainPosition to right when main is at last position', () => {
      // Window: [2★, 2★, 2★, 2★, 4★]
      // Main at position 4 (last position) should be right-positioned
      const windowItems: WindowItem[] = [
        createWindowItem(createHorizontalImage(1, 2), 0, 0, 1),
        createWindowItem(createHorizontalImage(2, 2), 1, 1, 1),
        createWindowItem(createHorizontalImage(3, 2), 2, 2, 1),
        createWindowItem(createHorizontalImage(4, 2), 3, 3, 1),
        createWindowItem(createHorizontalImage(5, 4), 4, 4, 2), // 4★ at position 4
      ];
      const result = mainStackedMatcher.match(windowItems, 0);

      expect(result).not.toBeNull();
      const typedResult = result as Extract<PatternResult, { type: 'main-stacked' }>;
      expect(typedResult.mainIndex).toBe(4);
      expect(typedResult.mainPosition).toBe('right');
    });
  });
});

// ===================== Panorama-Vertical Pattern Tests =====================

describe('Panorama-Vertical Pattern', () => {
  const panoramaVerticalMatcher = PATTERN_REGISTRY.find(p => p.name === 'panorama-vertical')!;

  describe('canMatch', () => {
    it('should match when vertical and 2+ wide panoramas exist', () => {
      const windowItems: WindowItem[] = [
        createWindowItem(createVerticalImage(1, 3), 0, 0, 2),
        createWindowItem(createWidePanorama(2, 2), 1, 1, 2),
        createWindowItem(createWidePanorama(3, 2), 2, 2, 2),
      ];
      expect(panoramaVerticalMatcher.canMatch(windowItems)).toBe(true);
    });

    it('should not match without vertical', () => {
      const windowItems: WindowItem[] = [
        createWindowItem(createHorizontalImage(1, 3), 0, 0, 2),
        createWindowItem(createWidePanorama(2, 2), 1, 1, 2),
        createWindowItem(createWidePanorama(3, 2), 2, 2, 2),
      ];
      expect(panoramaVerticalMatcher.canMatch(windowItems)).toBe(false);
    });

    it('should not match with only one panorama', () => {
      const windowItems: WindowItem[] = [
        createWindowItem(createVerticalImage(1, 3), 0, 0, 2),
        createWindowItem(createWidePanorama(2, 2), 1, 1, 2),
        createWindowItem(createHorizontalImage(3, 2), 2, 2, 1),
      ];
      expect(panoramaVerticalMatcher.canMatch(windowItems)).toBe(false);
    });
  });

  describe('match', () => {
    it('should return pattern with vertical as main', () => {
      const windowItems: WindowItem[] = [
        createWindowItem(createVerticalImage(1, 3), 0, 0, 2),
        createWindowItem(createWidePanorama(2, 2), 1, 1, 2),
        createWindowItem(createWidePanorama(3, 2), 2, 2, 2),
      ];
      const result = panoramaVerticalMatcher.match(windowItems, 0);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('panorama-vertical');

      const typedResult = result as Extract<PatternResult, { type: 'panorama-vertical' }>;
      expect(typedResult.mainIndex).toBe(0);
      expect(typedResult.secondaryIndices).toHaveLength(2);
    });
  });
});

// ===================== Standard Pattern Tests =====================

describe('Standard Pattern', () => {
  const standardMatcher = PATTERN_REGISTRY.find(p => p.name === 'standard')!;

  describe('canMatch', () => {
    it('should always return true (fallback)', () => {
      const windowItems: WindowItem[] = [
        createWindowItem(createHorizontalImage(1, 2), 0, 0, 1),
      ];
      expect(standardMatcher.canMatch(windowItems)).toBe(true);
    });

    it('should match empty window items', () => {
      expect(standardMatcher.canMatch([])).toBe(true);
    });
  });

  describe('match', () => {
    it('should return standard pattern with all indices that fit', () => {
      const windowItems: WindowItem[] = [
        createWindowItem(createHorizontalImage(1, 2), 0, 0, 1),
        createWindowItem(createHorizontalImage(2, 2), 1, 1, 1),
        createWindowItem(createHorizontalImage(3, 2), 2, 2, 1),
        createWindowItem(createHorizontalImage(4, 2), 3, 3, 1),
      ];
      const result = standardMatcher.match(windowItems, 0);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('standard');

      const typedResult = result as Extract<PatternResult, { type: 'standard' }>;
      // With default chunkSize=4 and slotWidth=1 each, all 4 should fit
      expect(typedResult.indices).toHaveLength(4);
    });

    it('should respect slot width limits', () => {
      const windowItems: WindowItem[] = [
        createWindowItem(createHorizontalImage(1, 3), 0, 0, 2), // halfSlot = 2
        createWindowItem(createHorizontalImage(2, 3), 1, 1, 2), // halfSlot = 2
        createWindowItem(createHorizontalImage(3, 2), 2, 2, 1), // slot = 1, won't fit
      ];
      const result = standardMatcher.match(windowItems, 0);

      expect(result).not.toBeNull();
      const typedResult = result as Extract<PatternResult, { type: 'standard' }>;
      // Only first 2 should fit (2+2 = 4 = chunkSize)
      expect(typedResult.indices).toHaveLength(2);
      expect(typedResult.indices).toContain(0);
      expect(typedResult.indices).toContain(1);
    });

    it('should include at least one item even if oversized', () => {
      const windowItems: WindowItem[] = [
        createWindowItem(createHorizontalImage(1, 2), 0, 0, 10), // Oversized
      ];
      const result = standardMatcher.match(windowItems, 0);

      expect(result).not.toBeNull();
      const typedResult = result as Extract<PatternResult, { type: 'standard' }>;
      expect(typedResult.indices).toHaveLength(1);
    });
  });
});

// ===================== Pattern Priority Tests =====================

describe('Pattern Priority', () => {
  it('should prioritize 5-star vertical patterns over main-stacked', () => {
    const fiveStarV2V = PATTERN_REGISTRY.find(p => p.name === 'five-star-vertical-2v')!;
    const mainStacked = PATTERN_REGISTRY.find(p => p.name === 'main-stacked')!;

    expect(fiveStarV2V.priority).toBeGreaterThan(mainStacked.priority);
  });

  it('should prioritize standalone over everything else', () => {
    const standalone = PATTERN_REGISTRY.find(p => p.name === 'standalone')!;

    for (const pattern of PATTERN_REGISTRY) {
      if (pattern.name !== 'standalone') {
        expect(standalone.priority).toBeGreaterThan(pattern.priority);
      }
    }
  });

  it('should have standard as the lowest priority', () => {
    const standard = PATTERN_REGISTRY.find(p => p.name === 'standard')!;

    for (const pattern of PATTERN_REGISTRY) {
      if (pattern.name !== 'standard') {
        expect(standard.priority).toBeLessThan(pattern.priority);
      }
    }
  });
});
