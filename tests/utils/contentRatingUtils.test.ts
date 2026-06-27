/**
 * Unit tests for contentRatingUtils.ts
 * Tests unified standalone detection logic
 */

import {
  getArExtremeness,
  getEffectiveRating,
  getHeightDemand,
  getProminence,
  getRating,
  getWidthCost,
  isCollectionCard,
} from '@/app/utils/contentRatingUtils';
import {
  createHorizontalImage,
  createPanelContent,
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

  describe('vertical images (no penalty — retired in directional prominence)', () => {
    it('should return the raw rating for vertical images (directionality handled by AR extremeness, not a penalty)', () => {
      expect(getEffectiveRating(createVerticalImage(1, 5))).toBe(5); // V5★ → 5 (was 4 under the penalty)
      expect(getEffectiveRating(createVerticalImage(1, 4))).toBe(4); // V4★ → 4 (was 3)
      expect(getEffectiveRating(createVerticalImage(1, 3))).toBe(3); // V3★ → 3 (was 2)
      expect(getEffectiveRating(createVerticalImage(1, 2))).toBe(2); // V2★ → 2 (was 1)
    });

    it('clamps low-rated verticals to [0, 5] without a penalty', () => {
      expect(getEffectiveRating(createVerticalImage(1, 1))).toBe(1); // V1★ → 1 (was 0 under the penalty)
      expect(getEffectiveRating(createVerticalImage(1, 0))).toBe(0); // V0★ → 0
    });
  });

  describe('square images (no penalty)', () => {
    it('should return the raw rating for square images (no longer treated as penalised verticals)', () => {
      expect(getEffectiveRating(createSquareImage(1, 5))).toBe(5); // was 4 under the penalty
      expect(getEffectiveRating(createSquareImage(1, 3))).toBe(3); // was 2
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

  describe('panel content', () => {
    it('should return the panel rating for PANEL content', () => {
      expect(getEffectiveRating(createPanelContent(1, { rating: 5 }))).toBe(5);
      expect(getEffectiveRating(createPanelContent(1, { rating: 3 }))).toBe(3);
      expect(getEffectiveRating(createPanelContent(1, { rating: 0 }))).toBe(0);
    });

    it('clamps panel rating to [0, 5]', () => {
      expect(getEffectiveRating(createPanelContent(1, { rating: 6 }))).toBe(5);
      expect(getEffectiveRating(createPanelContent(1, { rating: -1 }))).toBe(0);
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
    // Note: slotWidth does not affect effective rating — width scaling is handled
    // downstream by the prominence width-cost Hv = √(P·AR).
    it('should return the same effective rating independent of slot context', () => {
      const image = createHorizontalImage(1, 4);
      expect(getEffectiveRating(image)).toBe(4);
    });
  });
});

// getEffectiveRatingFromAspectRatio deleted — no production callers
// getComponentValue / getItemComponentValue deleted — retired cv value-model replaced by prominence P / width-cost Hv

// ===================== getArExtremeness Tests =====================

describe('getArExtremeness', () => {
  it('is 1 for square, symmetric for wide and tall', () => {
    expect(getArExtremeness(1.0)).toBeCloseTo(1.0, 5);
    expect(getArExtremeness(3.0)).toBeCloseTo(3.0, 5);
    expect(getArExtremeness(1 / 3)).toBeCloseTo(3.0, 5);
  });
});

// getProminenceRating deleted — consolidated into getEffectiveRating (the vertical
// penalty was already retired, making the two identical). getEffectiveRating's
// suite above covers the rating semantics; getProminence below covers P.

// ===================== getProminence Tests =====================

describe('getProminence (orientation-agnostic P)', () => {
  it('gives a 5★ portrait the same P as a 5★ landscape (no vertical penalty)', () => {
    expect(getProminence(createVerticalImage(1, 5))).toBeCloseTo(
      getProminence(createHorizontalImage(2, 5)),
      5
    );
  });

  it('gives a 3:1 panorama P=10 at 5★', () => {
    expect(getProminence(createPanorama(2, 5))).toBeCloseTo(10.0, 5);
  });

  it('scales 5★ extremeness 5 → 10 across square-ish and 3:1', () => {
    expect(getProminence(createHorizontalImage(1, 5))).toBeCloseTo(5.0, 1);
    expect(getProminence(createPanorama(2, 5))).toBeCloseTo(10.0, 5);
  });
});

// ===================== Hv / Vv Decomposition Tests =====================

describe('Hv / Vv decomposition', () => {
  it('Hv·Vv ≈ P and Hv/Vv = AR', () => {
    const pano = createPanorama(1, 5);
    expect(getWidthCost(pano) * getHeightDemand(pano)).toBeCloseTo(getProminence(pano), 4);
    expect(getWidthCost(pano) / getHeightDemand(pano)).toBeCloseTo(3.0, 4);
  });
  it('a panorama is wide-dominant, a portrait is height-dominant, at equal P', () => {
    const pano = createPanorama(1, 5);
    const portrait = createVerticalImage(2, 5);
    expect(getWidthCost(pano)).toBeGreaterThan(getHeightDemand(pano));
    expect(getHeightDemand(portrait)).toBeGreaterThan(getWidthCost(portrait));
  });
});
