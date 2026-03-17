/**
 * Unit tests for contentRatingUtils.ts
 * Tests unified standalone detection logic
 */

import { LAYOUT } from '@/app/constants';
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
  const DESKTOP_SLOTS = LAYOUT.desktopSlotWidth; // 5
  const MOBILE_SLOTS = LAYOUT.mobileSlotWidth; // 2

  describe('desktop layout (5 slots)', () => {
    it('should return 5 slots for 5★ (full width, 1 per row)', () => {
      expect(getComponentValue(5, DESKTOP_SLOTS)).toBe(5);
    });

    it('should return 2.5 slots for 4★ (2 per row)', () => {
      expect(getComponentValue(4, DESKTOP_SLOTS)).toBe(2.5);
    });

    it('should return ~1.67 slots for 3★ (3 per row)', () => {
      expect(getComponentValue(3, DESKTOP_SLOTS)).toBeCloseTo(5 / 3, 5);
    });

    it('should return 1.25 slots for 2★ (4 per row)', () => {
      expect(getComponentValue(2, DESKTOP_SLOTS)).toBe(1.25);
    });

    it('should return 1 slot for 1★ (5 per row)', () => {
      expect(getComponentValue(1, DESKTOP_SLOTS)).toBe(1);
    });

    it('should return 1 slot for 0★ (5 per row, clamped)', () => {
      expect(getComponentValue(0, DESKTOP_SLOTS)).toBe(1);
    });
  });

  describe('mobile layout (2 slots)', () => {
    it('should return 2 slots (full width) for 3-5★', () => {
      expect(getComponentValue(5, MOBILE_SLOTS)).toBe(2);
      expect(getComponentValue(4, MOBILE_SLOTS)).toBe(2);
      expect(getComponentValue(3, MOBILE_SLOTS)).toBe(2);
    });

    it('should return 1 slot (half width) for 0-2★', () => {
      expect(getComponentValue(2, MOBILE_SLOTS)).toBe(1);
      expect(getComponentValue(1, MOBILE_SLOTS)).toBe(1);
      expect(getComponentValue(0, MOBILE_SLOTS)).toBe(1);
    });
  });

  describe('default parameter', () => {
    it('should use desktop slot width by default', () => {
      expect(getComponentValue(4)).toBe(2.5); // Same as getComponentValue(4, 5)
    });
  });
});

// ===================== getItemComponentValue Tests =====================

describe('getItemComponentValue', () => {
  const DESKTOP_SLOTS = LAYOUT.desktopSlotWidth;
  const MOBILE_SLOTS = LAYOUT.mobileSlotWidth;

  describe('combines getEffectiveRating and getComponentValue', () => {
    it('should return correct slot cost for 5★ horizontal on desktop', () => {
      const image = createHorizontalImage(1, 5);
      // Effective rating: 5, Slot cost: 5
      expect(getItemComponentValue(image, DESKTOP_SLOTS)).toBe(5);
    });

    it('should return correct slot cost for 5★ vertical on desktop', () => {
      const image = createVerticalImage(1, 5);
      // Effective rating: 4 (vertical penalty), Slot cost: 2.5
      expect(getItemComponentValue(image, DESKTOP_SLOTS)).toBe(2.5);
    });

    it('should return correct slot cost for 4★ horizontal on mobile', () => {
      const image = createHorizontalImage(1, 4);
      // Effective rating: 4, Slot cost: 2 (full width on mobile for 3+)
      expect(getItemComponentValue(image, MOBILE_SLOTS)).toBe(2);
    });

    it('should return correct slot cost for 3★ vertical on mobile', () => {
      const image = createVerticalImage(1, 3);
      // Effective rating: 2 (vertical penalty), Slot cost: 1 (half width on mobile for 0-2)
      expect(getItemComponentValue(image, MOBILE_SLOTS)).toBe(1);
    });

    it('should return correct slot cost for 2★ horizontal on desktop', () => {
      const image = createHorizontalImage(1, 2);
      // Effective rating: 2, Slot cost: 1.25
      expect(getItemComponentValue(image, DESKTOP_SLOTS)).toBe(1.25);
    });
  });

  describe('worked example from documentation', () => {
    // From 01-row-layout.md: V4* takes the same slot width as H3*
    it('V4★ should have same effective rating as H3★', () => {
      const v4 = createVerticalImage(1, 4);
      const h3 = createHorizontalImage(2, 3);

      // V4★ effective = 3, H3★ effective = 3
      expect(getEffectiveRating(v4)).toBe(3);
      expect(getEffectiveRating(h3)).toBe(3);

      // Same slot cost on desktop
      expect(getItemComponentValue(v4, DESKTOP_SLOTS)).toBeCloseTo(5 / 3, 5);
      expect(getItemComponentValue(h3, DESKTOP_SLOTS)).toBeCloseTo(5 / 3, 5);
    });
  });
});
