/**
 * Unit tests for contentRatingUtils.ts
 * Tests unified standalone detection logic
 */

import {
  getComponentValue,
  getEffectiveRating,
  getItemComponentValue,
  getRating,
  isCollectionCard,
} from '@/app/utils/contentRatingUtils';
import {
  createHorizontalImage,
  createPanorama,
  createSquareImage,
  createVerticalImage,
} from '@/tests/fixtures/contentFixtures';

// isStandaloneItem deleted — standalone detection is now inline in buildRows

// ===================== isCollectionCard Tests =====================

describe('isCollectionCard', () => {
  it('should return true for items with collectionType', () => {
    const collectionCard = {
      id: 1,
      contentType: 'PARALLAX' as const,
      collectionType: 'TRAVEL',
    };
    expect(isCollectionCard(collectionCard as never)).toBe(true);
  });

  it('should return false for regular images', () => {
    const image = createHorizontalImage(1, 3);
    expect(isCollectionCard(image)).toBe(false);
  });

  it('should return false for items with empty collectionType', () => {
    const item = {
      id: 1,
      contentType: 'PARALLAX' as const,
      collectionType: '',
    };
    expect(isCollectionCard(item as never)).toBe(false);
  });
});

// ===================== getRating Tests =====================

describe('getRating', () => {
  describe('raw rating mode (asStarValue=false)', () => {
    it('should return raw rating for images', () => {
      expect(getRating(createHorizontalImage(1, 0))).toBe(0);
      expect(getRating(createHorizontalImage(1, 3))).toBe(3);
      expect(getRating(createHorizontalImage(1, 5))).toBe(5);
    });

    it('should return 0 for non-images', () => {
      const textContent = {
        id: 1,
        contentType: 'TEXT' as const,
        textBlock: { title: 'Test' },
      };
      expect(getRating(textContent as never)).toBe(0);
    });

    it('should return 4 for collection cards (2-per-row layout)', () => {
      const collectionCard = {
        id: 1,
        contentType: 'PARALLAX' as const,
        collectionType: 'TRAVEL',
      };
      expect(getRating(collectionCard as never)).toBe(4);
    });
  });

  describe('star value mode (asStarValue=true)', () => {
    it('should convert 0 and 1 ratings to 1 star', () => {
      expect(getRating(createHorizontalImage(1, 0), true)).toBe(1);
      expect(getRating(createHorizontalImage(1, 1), true)).toBe(1);
    });

    it('should keep 2+ ratings as-is', () => {
      expect(getRating(createHorizontalImage(1, 2), true)).toBe(2);
      expect(getRating(createHorizontalImage(1, 3), true)).toBe(3);
      expect(getRating(createHorizontalImage(1, 5), true)).toBe(5);
    });

    it('should return 1 for non-images', () => {
      const textContent = {
        id: 1,
        contentType: 'TEXT' as const,
        textBlock: { title: 'Test' },
      };
      expect(getRating(textContent as never, true)).toBe(1);
    });

    it('should return 4 for collection cards', () => {
      const collectionCard = {
        id: 1,
        contentType: 'PARALLAX' as const,
        collectionType: 'TRAVEL',
      };
      expect(getRating(collectionCard as never, true)).toBe(4);
    });
  });
});

// ===================== getEffectiveRating Tests =====================

describe('getEffectiveRating', () => {
  describe('horizontal images (no penalty)', () => {
    it('should return raw rating for horizontal images', () => {
      expect(getEffectiveRating(createHorizontalImage(1, 5))).toBe(5);
      expect(getEffectiveRating(createHorizontalImage(1, 4))).toBe(4);
      expect(getEffectiveRating(createHorizontalImage(1, 3))).toBe(3);
      expect(getEffectiveRating(createHorizontalImage(1, 2))).toBe(2);
      expect(getEffectiveRating(createHorizontalImage(1, 1))).toBe(1);
      expect(getEffectiveRating(createHorizontalImage(1, 0))).toBe(0);
    });
  });

  describe('vertical images (penalty -1)', () => {
    it('should return rating - 1 for vertical images', () => {
      expect(getEffectiveRating(createVerticalImage(1, 5))).toBe(4); // V5★ → H4★ equivalent
      expect(getEffectiveRating(createVerticalImage(1, 4))).toBe(3); // V4★ → H3★ equivalent
      expect(getEffectiveRating(createVerticalImage(1, 3))).toBe(2); // V3★ → H2★ equivalent
      expect(getEffectiveRating(createVerticalImage(1, 2))).toBe(1); // V2★ → H1★ equivalent
    });

    it('should not go below 0 for low-rated verticals', () => {
      expect(getEffectiveRating(createVerticalImage(1, 1))).toBe(0); // V1★ → 0 (clamped)
      expect(getEffectiveRating(createVerticalImage(1, 0))).toBe(0); // V0★ → 0 (clamped)
    });
  });

  describe('square images (treated as vertical)', () => {
    it('should apply vertical penalty to square images', () => {
      expect(getEffectiveRating(createSquareImage(1, 5))).toBe(4);
      expect(getEffectiveRating(createSquareImage(1, 3))).toBe(2);
    });
  });

  describe('panoramas', () => {
    it('should return raw rating for panoramas (they are horizontal)', () => {
      expect(getEffectiveRating(createPanorama(1, 5))).toBe(5);
      expect(getEffectiveRating(createPanorama(1, 3))).toBe(3);
      expect(getEffectiveRating(createPanorama(1, 0))).toBe(0);
    });
  });

  describe('collection cards', () => {
    it('should return fixed rating of 4 for collection cards', () => {
      const collectionCard = {
        id: 1,
        contentType: 'IMAGE' as const,
        imageUrl: '/test.jpg',
        collectionType: 'TRAVEL',
      };
      expect(getEffectiveRating(collectionCard as never)).toBe(4);
    });
  });

  describe('non-image content', () => {
    it('should return 1 for non-image content', () => {
      const textContent = {
        id: 1,
        contentType: 'TEXT' as const,
        textBlock: { title: 'Test' },
      };
      expect(getEffectiveRating(textContent as never)).toBe(1);
    });
  });

  describe('orientation-only rating (no slotWidth parameter)', () => {
    // Note: slotWidth does not affect effective rating — slot-width scaling is
    // handled downstream in getComponentValue().
    it('should return the same effective rating independent of slot context', () => {
      const image = createHorizontalImage(1, 4);
      expect(getEffectiveRating(image)).toBe(4);
    });
  });
});

// getEffectiveRatingFromAspectRatio deleted — no production callers

// ===================== getComponentValue Tests =====================

describe('getComponentValue', () => {
  it('returns base weight for standard horizontal (AR=1.5)', () => {
    expect(getComponentValue(5, 1.5)).toBe(5.0);
    expect(getComponentValue(4, 1.5)).toBe(3.5);
    expect(getComponentValue(3, 1.5)).toBe(2.5);
    expect(getComponentValue(2, 1.5)).toBe(1.75);
    expect(getComponentValue(1, 1.5)).toBe(1.25);
    expect(getComponentValue(0, 1.5)).toBe(1.0);
  });

  it('caps arFactor at 1.0 for wide horizontals (AR > 1.5)', () => {
    expect(getComponentValue(5, 2.0)).toBe(5.0);
    expect(getComponentValue(3, 2.5)).toBe(2.5);
  });

  it('reduces cv for verticals (AR < 1.0) via sqrt factor', () => {
    const cv = getComponentValue(4, 0.67);
    expect(cv).toBeCloseTo(3.5 * Math.sqrt(0.67 / 1.5), 2);
    expect(cv).toBeLessThan(3.5);
    expect(cv).toBeGreaterThan(2.0);
  });

  it('reduces cv for square images (AR=1.0)', () => {
    const cv = getComponentValue(3, 1.0);
    expect(cv).toBeCloseTo(2.5 * Math.sqrt(1.0 / 1.5), 2);
  });

  it('handles effectiveRating > 5 by capping at 5', () => {
    expect(getComponentValue(6, 1.5)).toBe(5.0);
    expect(getComponentValue(10, 1.5)).toBe(5.0);
  });

  it('handles effectiveRating < 0 by flooring at 0', () => {
    expect(getComponentValue(-1, 1.5)).toBe(1.0);
  });
});

// ===================== getItemComponentValue Tests =====================

describe('getItemComponentValue', () => {
  it('returns full base weight for H5★ (AR ~1.78, capped at reference)', () => {
    const image = createHorizontalImage(1, 5);
    // H5★: effectiveRating=5, AR=1.78 (capped at 1.5) → arFactor=1.0 → cv=5.0
    expect(getItemComponentValue(image)).toBe(5.0);
  });

  it('applies vertical penalty and AR factor for V5★', () => {
    const image = createVerticalImage(1, 5);
    // V5★: effectiveRating=4, AR=0.5625 → arFactor=sqrt(0.5625/1.5)≈0.612 → cv≈2.14
    const cv = getItemComponentValue(image);
    expect(cv).toBeGreaterThan(1.5);
    expect(cv).toBeLessThan(3.5);
  });

  it('V4★ and H3★ no longer have same cv (AR factor differentiates)', () => {
    const v4 = createVerticalImage(1, 4);
    const h3 = createHorizontalImage(2, 3);
    // V4★: er=3, AR=0.5625, cv = 2.5 * sqrt(0.5625/1.5) ≈ 1.53
    // H3★: er=3, AR=1.78, cv = 2.5 * 1.0 = 2.5
    expect(getItemComponentValue(v4)).toBeLessThan(getItemComponentValue(h3));
  });

  it('does not take slotWidth parameter', () => {
    const image = createHorizontalImage(1, 3);
    // Just verify it works with no second arg
    expect(typeof getItemComponentValue(image)).toBe('number');
    expect(getItemComponentValue(image)).toBeGreaterThan(0);
  });
});
