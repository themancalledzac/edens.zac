/**
 * Unit tests for contentRatingUtils.ts
 * Tests unified standalone detection logic
 */

import { LAYOUT } from '@/app/constants';
import type { ContentImageModel } from '@/app/types/Content';
import {
  getEffectiveRating,
  getItemSlotCost,
  getRating,
  getSlotCost,
  isCollectionCard,
  isFiveStarHorizontal,
  isStandaloneItem,
} from '@/app/utils/contentRatingUtils';

// ===================== Test Fixtures =====================

const createImageContent = (
  id: number,
  overrides?: Partial<ContentImageModel>
): ContentImageModel => ({
  id,
  contentType: 'IMAGE',
  imageUrl: `/test/image-${id}.jpg`, // Required by isContentImage type guard
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

// ===================== isStandaloneItem Tests =====================

describe('isStandaloneItem', () => {
  describe('5-star horizontal images', () => {
    it('should return true for 5-star horizontal image', () => {
      const image = createHorizontalImage(1, 5);
      expect(isStandaloneItem(image)).toBe(true);
    });

    it('should return false for 4-star horizontal image', () => {
      const image = createHorizontalImage(1, 4);
      expect(isStandaloneItem(image)).toBe(false);
    });

    it('should return false for 5-star vertical image', () => {
      const image = createVerticalImage(1, 5);
      expect(isStandaloneItem(image)).toBe(false);
    });

    it('should return false for 5-star square image (square is vertical)', () => {
      const image = createSquareImage(1, 5);
      expect(isStandaloneItem(image)).toBe(false);
    });
  });

  describe('wide panoramas', () => {
    it('should return true for wide panorama (ratio >= 2.0)', () => {
      const image = createPanorama(1, 0);
      expect(isStandaloneItem(image)).toBe(true);
    });

    it('should return true for panorama with any rating', () => {
      expect(isStandaloneItem(createPanorama(1, 0))).toBe(true);
      expect(isStandaloneItem(createPanorama(2, 3))).toBe(true);
      expect(isStandaloneItem(createPanorama(3, 5))).toBe(true);
    });

    it('should return true for exactly 2.0 ratio image', () => {
      const image = createImageContent(1, {
        imageWidth: 2000,
        imageHeight: 1000,
        aspectRatio: 2.0,
        rating: 0,
      });
      expect(isStandaloneItem(image)).toBe(true);
    });
  });

  describe('non-standalone images', () => {
    it('should return false for regular horizontal images', () => {
      expect(isStandaloneItem(createHorizontalImage(1, 0))).toBe(false);
      expect(isStandaloneItem(createHorizontalImage(1, 3))).toBe(false);
      expect(isStandaloneItem(createHorizontalImage(1, 4))).toBe(false);
    });

    it('should return false for vertical images regardless of rating', () => {
      expect(isStandaloneItem(createVerticalImage(1, 0))).toBe(false);
      expect(isStandaloneItem(createVerticalImage(1, 3))).toBe(false);
      expect(isStandaloneItem(createVerticalImage(1, 5))).toBe(false);
    });

    it('should return false for square images regardless of rating', () => {
      expect(isStandaloneItem(createSquareImage(1, 0))).toBe(false);
      expect(isStandaloneItem(createSquareImage(1, 5))).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should return false for undefined', () => {
      expect(isStandaloneItem()).toBe(false);
    });

    it('should return false for non-image content', () => {
      const textContent = {
        id: 1,
        contentType: 'TEXT' as const,
        textBlock: { title: 'Test' },
      };
      expect(isStandaloneItem(textContent as never)).toBe(false);
    });
  });
});

// ===================== isFiveStarHorizontal Tests =====================

describe('isFiveStarHorizontal (deprecated)', () => {
  it('should return true only for 5-star horizontal', () => {
    expect(isFiveStarHorizontal(createHorizontalImage(1, 5))).toBe(true);
  });

  it('should return false for panorama (does not check panorama)', () => {
    // This is the key difference from isStandaloneItem
    // isFiveStarHorizontal only checks for 5-star horizontal, not panoramas
    expect(isFiveStarHorizontal(createPanorama(1, 0))).toBe(false);
    expect(isFiveStarHorizontal(createPanorama(1, 4))).toBe(false);
  });

  it('should return true for 5-star panorama', () => {
    // A 5-star panorama is both horizontal and 5-star
    expect(isFiveStarHorizontal(createPanorama(1, 5))).toBe(true);
  });

  it('should return false for 5-star vertical', () => {
    expect(isFiveStarHorizontal(createVerticalImage(1, 5))).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isFiveStarHorizontal()).toBe(false);
  });
});

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

  describe('slotWidth parameter (unused in effective rating)', () => {
    // Note: slotWidth doesn't affect effective rating calculation
    // It's passed for future extensibility but currently unused
    it('should return same effective rating regardless of slotWidth', () => {
      const image = createHorizontalImage(1, 4);
      expect(getEffectiveRating(image, 5)).toBe(4);
      expect(getEffectiveRating(image, 2)).toBe(4);
    });
  });
});

// ===================== getSlotCost Tests =====================

describe('getSlotCost', () => {
  const DESKTOP_SLOTS = LAYOUT.desktopSlotWidth; // 5
  const MOBILE_SLOTS = LAYOUT.mobileSlotWidth; // 2

  describe('desktop layout (5 slots)', () => {
    it('should return 5 slots for 5★ (full width, 1 per row)', () => {
      expect(getSlotCost(5, DESKTOP_SLOTS)).toBe(5);
    });

    it('should return 2.5 slots for 4★ (2 per row)', () => {
      expect(getSlotCost(4, DESKTOP_SLOTS)).toBe(2.5);
    });

    it('should return ~1.67 slots for 3★ (3 per row)', () => {
      expect(getSlotCost(3, DESKTOP_SLOTS)).toBeCloseTo(5 / 3, 5);
    });

    it('should return 1.25 slots for 2★ (4 per row)', () => {
      expect(getSlotCost(2, DESKTOP_SLOTS)).toBe(1.25);
    });

    it('should return 1 slot for 1★ (5 per row)', () => {
      expect(getSlotCost(1, DESKTOP_SLOTS)).toBe(1);
    });

    it('should return 1 slot for 0★ (5 per row, clamped)', () => {
      expect(getSlotCost(0, DESKTOP_SLOTS)).toBe(1);
    });
  });

  describe('mobile layout (2 slots)', () => {
    it('should return 2 slots (full width) for 3-5★', () => {
      expect(getSlotCost(5, MOBILE_SLOTS)).toBe(2);
      expect(getSlotCost(4, MOBILE_SLOTS)).toBe(2);
      expect(getSlotCost(3, MOBILE_SLOTS)).toBe(2);
    });

    it('should return 1 slot (half width) for 0-2★', () => {
      expect(getSlotCost(2, MOBILE_SLOTS)).toBe(1);
      expect(getSlotCost(1, MOBILE_SLOTS)).toBe(1);
      expect(getSlotCost(0, MOBILE_SLOTS)).toBe(1);
    });
  });

  describe('default parameter', () => {
    it('should use desktop slot width by default', () => {
      expect(getSlotCost(4)).toBe(2.5); // Same as getSlotCost(4, 5)
    });
  });
});

// ===================== getItemSlotCost Tests =====================

describe('getItemSlotCost', () => {
  const DESKTOP_SLOTS = LAYOUT.desktopSlotWidth;
  const MOBILE_SLOTS = LAYOUT.mobileSlotWidth;

  describe('combines getEffectiveRating and getSlotCost', () => {
    it('should return correct slot cost for 5★ horizontal on desktop', () => {
      const image = createHorizontalImage(1, 5);
      // Effective rating: 5, Slot cost: 5
      expect(getItemSlotCost(image, DESKTOP_SLOTS)).toBe(5);
    });

    it('should return correct slot cost for 5★ vertical on desktop', () => {
      const image = createVerticalImage(1, 5);
      // Effective rating: 4 (vertical penalty), Slot cost: 2.5
      expect(getItemSlotCost(image, DESKTOP_SLOTS)).toBe(2.5);
    });

    it('should return correct slot cost for 4★ horizontal on mobile', () => {
      const image = createHorizontalImage(1, 4);
      // Effective rating: 4, Slot cost: 2 (full width on mobile for 3+)
      expect(getItemSlotCost(image, MOBILE_SLOTS)).toBe(2);
    });

    it('should return correct slot cost for 3★ vertical on mobile', () => {
      const image = createVerticalImage(1, 3);
      // Effective rating: 2 (vertical penalty), Slot cost: 1 (half width on mobile for 0-2)
      expect(getItemSlotCost(image, MOBILE_SLOTS)).toBe(1);
    });

    it('should return correct slot cost for 2★ horizontal on desktop', () => {
      const image = createHorizontalImage(1, 2);
      // Effective rating: 2, Slot cost: 1.25
      expect(getItemSlotCost(image, DESKTOP_SLOTS)).toBe(1.25);
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
      expect(getItemSlotCost(v4, DESKTOP_SLOTS)).toBeCloseTo(5 / 3, 5);
      expect(getItemSlotCost(h3, DESKTOP_SLOTS)).toBeCloseTo(5 / 3, 5);
    });
  });
});
