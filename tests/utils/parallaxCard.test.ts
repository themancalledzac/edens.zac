/**
 * Unit tests for `buildParallaxCard` (E1).
 *
 * The characterization suite proves the four call sites still produce what they used to;
 * this one exercises each option on its own, including the two that exist purely to
 * preserve divergences between those call sites (`squareFallback`, `allowLayoutDimensions`).
 */

import { type ContentImageModel } from '@/app/types/Content';
import { buildParallaxCard } from '@/app/utils/parallaxCard';

function cover(overrides: Partial<ContentImageModel> = {}): ContentImageModel {
  return {
    id: 900,
    contentType: 'IMAGE',
    orderIndex: 0,
    imageUrl: 'https://example.com/cover.jpg',
    imageWidth: 1200,
    imageHeight: 1000,
    locations: [],
    ...overrides,
  };
}

describe('buildParallaxCard', () => {
  describe('defaults', () => {
    it('produces a minimal card from just an id and slug', () => {
      const card = buildParallaxCard({ id: 7, slug: 'a-slug' });

      expect(card).toEqual({
        contentType: 'IMAGE',
        enableParallax: true,
        id: 7,
        slug: 'a-slug',
        description: null,
        imageUrl: '',
        overlayText: 'a-slug',
        orderIndex: 0,
        visible: true,
        locations: [],
        imageWidth: undefined,
        imageHeight: undefined,
        width: undefined,
        height: undefined,
        collectionId: undefined,
        title: undefined,
        alt: undefined,
        tags: undefined,
        rating: undefined,
        isClient: undefined,
        isBlog: undefined,
        collectionDate: undefined,
        createdAt: undefined,
        updatedAt: undefined,
      });
    });

    it('defaults visible to true and orderIndex to 0', () => {
      const card = buildParallaxCard({ id: 7, slug: 'a-slug' });

      expect(card.visible).toBe(true);
      expect(card.orderIndex).toBe(0);
    });

    it('defaults description to null but preserves an explicit null', () => {
      expect(buildParallaxCard({ id: 7, slug: 's' }).description).toBeNull();
      expect(buildParallaxCard({ id: 7, slug: 's', description: null }).description).toBeNull();
      expect(buildParallaxCard({ id: 7, slug: 's', description: 'text' }).description).toBe('text');
    });
  });

  describe('overlayText', () => {
    it('prefers the title', () => {
      expect(buildParallaxCard({ id: 7, slug: 'a-slug', title: 'A Title' }).overlayText).toBe(
        'A Title'
      );
    });

    it('falls back to the slug when there is no title', () => {
      expect(buildParallaxCard({ id: 7, slug: 'a-slug' }).overlayText).toBe('a-slug');
    });

    it('falls back to an empty string when both are empty', () => {
      expect(buildParallaxCard({ id: 7, slug: '', title: '' }).overlayText).toBe('');
    });
  });

  describe('collectionId', () => {
    it('is left undefined when omitted, which is what keeps sentinel tiles unfollowable', () => {
      expect(buildParallaxCard({ id: -1000, slug: 'user' }).collectionId).toBeUndefined();
    });

    it('is carried when provided', () => {
      expect(buildParallaxCard({ id: 5, slug: 's', collectionId: 42 }).collectionId).toBe(42);
    });
  });

  describe('dimensions', () => {
    it('reads imageWidth/imageHeight from the cover', () => {
      const card = buildParallaxCard({ id: 5, slug: 's', coverImage: cover() });

      expect(card.imageWidth).toBe(1200);
      expect(card.imageHeight).toBe(1000);
      expect(card.width).toBe(1200);
      expect(card.height).toBe(1000);
    });

    it('clamps a cover wider than the 5:4 band', () => {
      const card = buildParallaxCard({
        id: 5,
        slug: 's',
        coverImage: cover({ imageWidth: 1600, imageHeight: 1000 }),
      });

      expect(card.imageWidth).toBe(1600);
      expect(card.imageHeight).toBe(1280);
    });

    it('clamps a cover taller than the 4:5 band', () => {
      const card = buildParallaxCard({
        id: 5,
        slug: 's',
        coverImage: cover({ imageWidth: 1000, imageHeight: 2000 }),
      });

      expect(card.imageWidth).toBe(1000);
      expect(card.imageHeight).toBe(1250);
    });

    it('leaves dimensions undefined for a card with no cover', () => {
      const card = buildParallaxCard({ id: 5, slug: 's' });

      expect(card.imageWidth).toBeUndefined();
      expect(card.imageHeight).toBeUndefined();
    });
  });

  describe('squareFallback', () => {
    it('substitutes a 1000x1000 square when the cover has no dimensions', () => {
      const card = buildParallaxCard({
        id: 5,
        slug: 's',
        coverImage: cover({ imageWidth: undefined, imageHeight: undefined }),
        squareFallback: true,
      });

      expect(card.imageWidth).toBe(1000);
      expect(card.imageHeight).toBe(1000);
    });

    it('substitutes the square even with no cover at all', () => {
      const card = buildParallaxCard({ id: 5, slug: 's', squareFallback: true });

      expect(card.imageWidth).toBe(1000);
      expect(card.imageHeight).toBe(1000);
    });

    it('does not touch real dimensions', () => {
      const card = buildParallaxCard({
        id: 5,
        slug: 's',
        coverImage: cover(),
        squareFallback: true,
      });

      expect(card.imageWidth).toBe(1200);
      expect(card.imageHeight).toBe(1000);
    });

    it('is off by default', () => {
      const card = buildParallaxCard({
        id: 5,
        slug: 's',
        coverImage: cover({ imageWidth: undefined, imageHeight: undefined }),
      });

      expect(card.imageWidth).toBeUndefined();
    });
  });

  describe('allowLayoutDimensions', () => {
    const layoutOnlyCover = cover({
      imageWidth: undefined,
      imageHeight: undefined,
      width: 1200,
      height: 1000,
    });

    it('reads the layout width/height fields when enabled', () => {
      const card = buildParallaxCard({
        id: 5,
        slug: 's',
        coverImage: layoutOnlyCover,
        allowLayoutDimensions: true,
      });

      expect(card.imageWidth).toBe(1200);
      expect(card.imageHeight).toBe(1000);
    });

    it('ignores them by default', () => {
      const card = buildParallaxCard({ id: 5, slug: 's', coverImage: layoutOnlyCover });

      expect(card.imageWidth).toBeUndefined();
      expect(card.imageHeight).toBeUndefined();
    });

    it('combines with squareFallback the way the public card path needs', () => {
      const card = buildParallaxCard({
        id: 5,
        slug: 's',
        coverImage: layoutOnlyCover,
        allowLayoutDimensions: true,
        squareFallback: true,
      });

      expect(card.imageWidth).toBe(1200);
      expect(card.imageHeight).toBe(1000);
    });
  });

  describe('carried fields', () => {
    it('carries the optional metadata fields verbatim', () => {
      const tags = [{ id: 1, name: 'art-gallery', slug: 'art-gallery' }];
      const card = buildParallaxCard({
        id: 5,
        slug: 's',
        tags,
        rating: 4,
        isClient: true,
        isBlog: false,
        collectionDate: '2026-01-01',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-02T00:00:00Z',
        alt: 'Alt text',
      });

      expect(card.tags).toBe(tags);
      expect(card.rating).toBe(4);
      expect(card.isClient).toBe(true);
      expect(card.isBlog).toBe(false);
      expect(card.collectionDate).toBe('2026-01-01');
      expect(card.createdAt).toBe('2026-01-01T00:00:00Z');
      expect(card.updatedAt).toBe('2026-01-02T00:00:00Z');
      expect(card.alt).toBe('Alt text');
    });

    it('takes imageUrl from the cover and empty-strings a missing one', () => {
      expect(buildParallaxCard({ id: 5, slug: 's', coverImage: cover() }).imageUrl).toBe(
        'https://example.com/cover.jpg'
      );
      expect(buildParallaxCard({ id: 5, slug: 's', coverImage: null }).imageUrl).toBe('');
    });

    it('always emits an empty locations array', () => {
      expect(buildParallaxCard({ id: 5, slug: 's' }).locations).toEqual([]);
    });
  });
});
