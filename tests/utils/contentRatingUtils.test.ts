/**
 * Unit tests for contentRatingUtils.ts
 * Tests unified standalone detection logic
 */

import type { ContentImageModel } from '@/app/types/Content';
import { isStandaloneItem, isFiveStarHorizontal } from '@/app/utils/contentRatingUtils';

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
      expect(isStandaloneItem(undefined)).toBe(false);
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
    expect(isFiveStarHorizontal(undefined)).toBe(false);
  });
});
