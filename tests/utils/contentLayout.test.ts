/**
 * Unit tests for contentLayout.ts
 * Tests content processing and layout utilities
 */

import { type CollectionModel, CollectionType } from '@/app/types/Collection';
import type {
  AnyContentModel,
  ContentCollectionModel,
  ContentImageModel,
  ContentParallaxImageModel,
  ContentTextModel,
} from '@/app/types/Content';
import {
  calculateContentSizes,
  chunkContent,
  clampParallaxDimensions,
  convertCollectionContentToImage,
  convertCollectionContentToParallax,
  createHeaderRow,
  processContentBlocks,
} from '@/app/utils/contentLayout';

// Test fixtures
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

const createParallaxContent = (
  id: number,
  overrides?: Partial<ContentParallaxImageModel>
): ContentParallaxImageModel => ({
  id,
  contentType: 'IMAGE',
  orderIndex: id,
  visible: true,
  imageUrl: `https://example.com/image-${id}.jpg`,
  imageWidth: 1920,
  imageHeight: 1080,
  width: 1920,
  height: 1080,
  enableParallax: true,
  title: `Parallax ${id}`,
  ...overrides,
});

const createTextContent = (
  id: number,
  overrides?: Partial<ContentTextModel>
): ContentTextModel => ({
  id,
  contentType: 'TEXT',
  orderIndex: id,
  visible: true,
  items: [{ type: 'text', value: `Text content ${id}` }],
  format: 'plain',
  align: 'left',
  ...overrides,
});

const createCollectionContent = (
  id: number,
  overrides?: Partial<ContentCollectionModel>
): ContentCollectionModel => ({
  id,
  contentType: 'COLLECTION',
  orderIndex: id,
  visible: true,
  title: `Collection ${id}`,
  slug: `collection-${id}`,
  collectionType: 'PORTFOLIO',
  coverImage: {
    id: id * 10,
    contentType: 'IMAGE',
    orderIndex: 0,
    imageUrl: `https://example.com/cover-${id}.jpg`,
    imageWidth: 1920,
    imageHeight: 1080,
    visible: true,
  },
  ...overrides,
});

const createCollectionModel = (
  id: number,
  overrides?: Partial<CollectionModel>
): CollectionModel => ({
  id,
  type: CollectionType.PORTFOLIO,
  title: `Collection ${id}`,
  slug: `collection-${id}`,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  coverImage: {
    id: id * 10,
    contentType: 'IMAGE',
    orderIndex: 0,
    imageUrl: `https://example.com/cover-${id}.jpg`,
    imageWidth: 1920,
    imageHeight: 1080,
    visible: true,
  },
  collectionDate: '2024-01-01',
  location: 'Seattle, WA',
  description: 'A beautiful collection description',
  ...overrides,
});

describe('processContentBlocks', () => {
  describe('Filtering visible blocks', () => {
    it('should filter out blocks with visible: false when filterVisible is true', () => {
      const content: AnyContentModel[] = [
        createImageContent(1, { visible: true }),
        createImageContent(2, { visible: false }),
        createImageContent(3, { visible: true }),
      ];
      const result = processContentBlocks(content, true);
      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe(1);
      expect(result[1]?.id).toBe(3);
    });

    it('should not filter when filterVisible is false', () => {
      const content: AnyContentModel[] = [
        createImageContent(1, { visible: true }),
        createImageContent(2, { visible: false }),
      ];
      const result = processContentBlocks(content, false);
      expect(result).toHaveLength(2);
    });

    it('should sort non-visible content to bottom when filterVisible is false', () => {
      const content: AnyContentModel[] = [
        createImageContent(1, { visible: false, orderIndex: 1 }),
        createImageContent(2, { visible: true, orderIndex: 2 }),
        createImageContent(3, { visible: false, orderIndex: 3 }),
        createImageContent(4, { visible: true, orderIndex: 4 }),
      ];
      const result = processContentBlocks(content, false);

      // All items should be present
      expect(result).toHaveLength(4);

      // Visible items should come first (sorted by orderIndex)
      expect(result[0]?.id).toBe(2);
      expect(result[1]?.id).toBe(4);

      // Non-visible items should come last (preserving relative order)
      expect(result[2]?.id).toBe(1);
      expect(result[3]?.id).toBe(3);
    });

    it('should sort non-visible content to bottom with collection-specific visibility', () => {
      const content: AnyContentModel[] = [
        createImageContent(1, {
          visible: true,
          orderIndex: 1,
          collections: [{ collectionId: 1, name: 'Collection 1', visible: false }],
        }),
        createImageContent(2, {
          visible: true,
          orderIndex: 2,
          collections: [{ collectionId: 1, name: 'Collection 1', visible: true }],
        }),
        createImageContent(3, {
          visible: true,
          orderIndex: 3,
          collections: [{ collectionId: 1, name: 'Collection 1', visible: false }],
        }),
      ];
      const result = processContentBlocks(content, false, 1);

      // All items should be present
      expect(result).toHaveLength(3);

      // Visible item should come first
      expect(result[0]?.id).toBe(2);

      // Non-visible items (collection-specific) should come last
      expect(result[1]?.id).toBe(1);
      expect(result[2]?.id).toBe(3);
    });

    it('should preserve relative order within visible and non-visible groups', () => {
      const content: AnyContentModel[] = [
        createImageContent(1, { visible: false, orderIndex: 3 }),
        createImageContent(2, { visible: true, orderIndex: 1 }),
        createImageContent(3, { visible: false, orderIndex: 1 }),
        createImageContent(4, { visible: true, orderIndex: 2 }),
      ];
      const result = processContentBlocks(content, false);

      // Visible items first, sorted by orderIndex: 2, 4
      expect(result[0]?.id).toBe(2);
      expect(result[1]?.id).toBe(4);

      // Non-visible items last, sorted by orderIndex: 3, 1
      expect(result[2]?.id).toBe(3);
      expect(result[3]?.id).toBe(1);
    });

    it('should filter image blocks with collection-specific visibility', () => {
      const content: AnyContentModel[] = [
        createImageContent(1, {
          collections: [{ collectionId: 1, name: 'Collection 1', visible: true }],
        }),
        createImageContent(2, {
          collections: [{ collectionId: 1, name: 'Collection 1', visible: false }],
        }),
      ];
      const result = processContentBlocks(content, true, 1);
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(1);
    });

    it('should not filter when collectionId is not provided', () => {
      const content: AnyContentModel[] = [
        createImageContent(1, {
          collections: [{ collectionId: 1, name: 'Collection 1', visible: false }],
        }),
      ];
      const result = processContentBlocks(content, true);
      expect(result).toHaveLength(1);
    });
  });

  describe('Transforming collection blocks', () => {
    it('should convert CollectionContentModel to ParallaxImageContentModel', () => {
      const content: AnyContentModel[] = [createCollectionContent(1)];
      const result = processContentBlocks(content);
      expect(result[0]?.contentType).toBe('IMAGE');
      expect((result[0] as ContentParallaxImageModel).enableParallax).toBe(true);
    });

    it('should preserve collection metadata in parallax conversion', () => {
      const collection = createCollectionContent(1, {
        title: 'Test Collection',
        slug: 'test-collection',
      });
      const content: AnyContentModel[] = [collection];
      const result = processContentBlocks(content);
      const parallax = result[0] as ContentParallaxImageModel;
      expect(parallax.title).toBe('Test Collection');
      expect(parallax.imageUrl).toBe('https://example.com/cover-1.jpg');
    });

    it('should not transform non-collection blocks', () => {
      const content: AnyContentModel[] = [createImageContent(1), createTextContent(2)];
      const result = processContentBlocks(content);
      expect(result[0]?.contentType).toBe('IMAGE');
      expect(result[1]?.contentType).toBe('TEXT');
    });
  });


  describe('Ensuring parallax dimensions', () => {
    it('should preserve imageWidth and imageHeight when present', () => {
      const content: AnyContentModel[] = [
        createParallaxContent(1, {
          imageWidth: 1920,
          imageHeight: 1080,
        }),
      ];
      const result = processContentBlocks(content);
      const parallax = result[0] as ContentParallaxImageModel;
      expect(parallax.imageWidth).toBe(1920);
      expect(parallax.imageHeight).toBe(1080);
    });

    it('should use width/height as fallback for imageWidth/imageHeight', () => {
      const content: AnyContentModel[] = [
        createParallaxContent(1, {
          imageWidth: undefined,
          imageHeight: undefined,
          width: 1920,
          height: 1080,
        }),
      ];
      const result = processContentBlocks(content);
      const parallax = result[0] as ContentParallaxImageModel;
      expect(parallax.imageWidth).toBe(1920);
      expect(parallax.imageHeight).toBe(1080);
    });

    it('should not modify non-parallax blocks', () => {
      const content: AnyContentModel[] = [createImageContent(1), createTextContent(2)];
      const result = processContentBlocks(content);
      expect(result[0]?.contentType).toBe('IMAGE');
      expect(result[1]?.contentType).toBe('TEXT');
    });

    it('should not modify non-parallax image blocks', () => {
      const content: AnyContentModel[] = [
        createImageContent(1, {
          imageWidth: undefined,
        }),
      ];
      const result = processContentBlocks(content);
      const image = result[0] as ContentImageModel;
      expect(image.imageWidth).toBeUndefined();
    });
  });

  describe('Sorting by orderIndex', () => {
    it('should sort blocks by orderIndex ascending', () => {
      const content: AnyContentModel[] = [
        createImageContent(3, { orderIndex: 3 }),
        createImageContent(1, { orderIndex: 1 }),
        createImageContent(2, { orderIndex: 2 }),
      ];
      const result = processContentBlocks(content);
      expect(result[0]?.orderIndex).toBe(1);
      expect(result[1]?.orderIndex).toBe(2);
      expect(result[2]?.orderIndex).toBe(3);
    });

    it('should treat undefined orderIndex as 0', () => {
      const content: AnyContentModel[] = [
        createImageContent(2, { orderIndex: 2 }),
        createImageContent(1, { orderIndex: undefined }),
      ];
      const result = processContentBlocks(content);
      expect(result[0]?.orderIndex).toBeUndefined(); // Treated as 0, so comes first
      expect(result[1]?.orderIndex).toBe(2);
    });

    it('should not mutate original array', () => {
      const content: AnyContentModel[] = [
        createImageContent(2, { orderIndex: 2 }),
        createImageContent(1, { orderIndex: 1 }),
      ];
      const original = [...content];
      processContentBlocks(content);
      expect(content).toEqual(original);
    });
  });

  describe('Reordering images before collections', () => {
    it('should place images before collections', () => {
      const content: AnyContentModel[] = [
        createCollectionContent(1, { orderIndex: 1 }),
        createImageContent(2, { orderIndex: 2 }),
        createImageContent(3, { orderIndex: 3 }),
        createCollectionContent(4, { orderIndex: 4 }),
      ];
      const result = processContentBlocks(content);

      // First two should be images (IDs 2 and 3)
      expect(result[0]?.id).toBe(2);
      expect(result[1]?.id).toBe(3);

      // Last two should be collections (IDs 1 and 4, converted to parallax)
      expect(result[2]?.id).toBe(1);
      expect(result[3]?.id).toBe(4);
      // After transformation, they should be parallax images with slug
      expect((result[2] as ContentParallaxImageModel).enableParallax).toBe(true);
      expect((result[3] as ContentParallaxImageModel).enableParallax).toBe(true);
      expect((result[2] as ContentParallaxImageModel).slug).toBe('collection-1');
      expect((result[3] as ContentParallaxImageModel).slug).toBe('collection-4');
    });

    it('should preserve relative order within images and collections groups', () => {
      const content: AnyContentModel[] = [
        createCollectionContent(1, { orderIndex: 1 }),
        createImageContent(2, { orderIndex: 2 }),
        createCollectionContent(3, { orderIndex: 3 }),
        createImageContent(4, { orderIndex: 4 }),
        createImageContent(5, { orderIndex: 5 }),
        createCollectionContent(6, { orderIndex: 6 }),
      ];
      const result = processContentBlocks(content);

      // Images should come first in their order: 2, 4, 5
      expect(result[0]?.id).toBe(2);
      expect(result[1]?.id).toBe(4);
      expect(result[2]?.id).toBe(5);

      // Collections should come after in their order: 1, 3, 6
      expect(result[3]?.id).toBe(1);
      expect(result[4]?.id).toBe(3);
      expect(result[5]?.id).toBe(6);
    });

    it('should handle content with only images', () => {
      const content: AnyContentModel[] = [
        createImageContent(1, { orderIndex: 1 }),
        createImageContent(2, { orderIndex: 2 }),
        createImageContent(3, { orderIndex: 3 }),
      ];
      const result = processContentBlocks(content);

      expect(result).toHaveLength(3);
      expect(result[0]?.id).toBe(1);
      expect(result[1]?.id).toBe(2);
      expect(result[2]?.id).toBe(3);
    });

    it('should handle content with only collections', () => {
      const content: AnyContentModel[] = [
        createCollectionContent(1, { orderIndex: 1 }),
        createCollectionContent(2, { orderIndex: 2 }),
        createCollectionContent(3, { orderIndex: 3 }),
      ];
      const result = processContentBlocks(content);

      expect(result).toHaveLength(3);
      expect(result[0]?.id).toBe(1);
      expect(result[1]?.id).toBe(2);
      expect(result[2]?.id).toBe(3);
      // All should be converted to parallax images with slugs
      for (const item of result) {
        expect((item as ContentParallaxImageModel).enableParallax).toBe(true);
        expect((item as ContentParallaxImageModel).slug).toBeDefined();
      }
    });

    it('should work with text and other content types', () => {
      const content: AnyContentModel[] = [
        createCollectionContent(1, { orderIndex: 1 }),
        createTextContent(2, { orderIndex: 2 }),
        createImageContent(3, { orderIndex: 3 }),
      ];
      const result = processContentBlocks(content);

      // Text and image should come first (non-collections)
      expect(result[0]?.id).toBe(2);
      expect(result[1]?.id).toBe(3);

      // Collection should come last (converted to parallax with slug)
      expect(result[2]?.id).toBe(1);
      expect((result[2] as ContentParallaxImageModel).enableParallax).toBe(true);
      expect((result[2] as ContentParallaxImageModel).slug).toBe('collection-1');
    });

    it('should work with chronological display mode', () => {
      const content: AnyContentModel[] = [
        createCollectionContent(1, {
          orderIndex: 1,
          createdAt: '2023-01-01T00:00:00Z',
        }),
        createImageContent(2, {
          orderIndex: 2,
          createdAt: '2023-01-03T00:00:00Z',
        }),
        createImageContent(3, {
          orderIndex: 3,
          createdAt: '2023-01-02T00:00:00Z',
        }),
        createCollectionContent(4, {
          orderIndex: 4,
          createdAt: '2023-01-04T00:00:00Z',
        }),
      ];
      const result = processContentBlocks(content, true, undefined, 'CHRONOLOGICAL');

      // Images should come first, sorted by createdAt: 3 (Jan 2), 2 (Jan 3)
      expect(result[0]?.id).toBe(3);
      expect(result[1]?.id).toBe(2);

      // Collections should come after, sorted by createdAt: 1 (Jan 1), 4 (Jan 4)
      expect(result[2]?.id).toBe(1);
      expect(result[3]?.id).toBe(4);
    });
  });

  describe('Full pipeline integration', () => {
    it('should apply all transformations in correct order', () => {
      const content: AnyContentModel[] = [
        createImageContent(3, {
          visible: false,
          orderIndex: 3,
        }),
        createImageContent(2, {
          visible: true,
          orderIndex: 2,
        }),
        createCollectionContent(1, { orderIndex: 0 }),
        createImageContent(1, {
          visible: true,
          orderIndex: 1,
        }),
      ];
      const result = processContentBlocks(content, true, 1);

      // Should be filtered (visible: false removed) - 3 items remain
      expect(result).toHaveLength(3);

      // Images should come before collections
      // After sorting by orderIndex: image(1), image(2), collection(0)
      // After reordering: images first [image(1), image(2)], then collections [collection(0)]
      const firstTwoItems = result.slice(0, 2);
      const lastItem = result[2];

      // First two items should be regular images (without slug)
      for (const item of firstTwoItems) {
        expect((item as ContentParallaxImageModel).slug).toBeUndefined();
      }

      // Last item should be the converted collection (with slug and enableParallax)
      expect((lastItem as ContentParallaxImageModel).enableParallax).toBe(true);
      expect((lastItem as ContentParallaxImageModel).slug).toBe('collection-1');
      expect(lastItem?.id).toBe(1); // This is the collection

      // Verify the images are in the correct order (1, then 2)
      expect(firstTwoItems[0]?.id).toBe(1);
      expect(firstTwoItems[1]?.id).toBe(2);
    });

    it('should handle empty array', () => {
      const result = processContentBlocks([]);
      expect(result).toEqual([]);
    });

    it('should handle array with only invisible blocks', () => {
      const content: AnyContentModel[] = [
        createImageContent(1, { visible: false }),
        createImageContent(2, { visible: false }),
      ];
      const result = processContentBlocks(content, true);
      expect(result).toEqual([]);
    });
  });
});

describe('extractCollectionDimensions (tested via convertCollectionContentToParallax and convertCollectionContentToImage)', () => {
  describe('dimension extraction', () => {
    it('should prioritize imageWidth/imageHeight over width/height in convertCollectionContentToParallax', () => {
      // Use dimensions within the parallax AR clamp range [4:5, 5:4] to isolate priority behavior
      const collection = createCollectionContent(1, {
        coverImage: {
          id: 10,
          contentType: 'IMAGE',
          orderIndex: 0,
          imageUrl: 'https://example.com/cover.jpg',
          imageWidth: 1200,
          imageHeight: 1000,
          width: 800, // Should be ignored
          height: 700, // Should be ignored
        },
      });
      const result = convertCollectionContentToParallax(collection);
      expect(result.imageWidth).toBe(1200);
      expect(result.imageHeight).toBe(1000);
      expect(result.width).toBe(1200);
      expect(result.height).toBe(1000);
    });

    it('should fall back to width/height when imageWidth/imageHeight are missing in convertCollectionContentToParallax', () => {
      // Use dimensions within the parallax AR clamp range [4:5, 5:4] to isolate fallback behavior
      const collection = createCollectionContent(1, {
        coverImage: {
          id: 10,
          contentType: 'IMAGE',
          orderIndex: 0,
          imageUrl: 'https://example.com/cover.jpg',
          width: 1000,
          height: 900,
        },
      });
      const result = convertCollectionContentToParallax(collection);
      expect(result.imageWidth).toBe(1000);
      expect(result.imageHeight).toBe(900);
      expect(result.width).toBe(1000);
      expect(result.height).toBe(900);
    });

    it('should prioritize imageWidth/imageHeight over width/height in convertCollectionContentToImage', () => {
      const collection = createCollectionContent(1, {
        coverImage: {
          id: 10,
          contentType: 'IMAGE',
          orderIndex: 0,
          imageUrl: 'https://example.com/cover.jpg',
          imageWidth: 1920,
          imageHeight: 1080,
          width: 800, // Should be ignored
          height: 600, // Should be ignored
        },
      });
      const result = convertCollectionContentToImage(collection);
      expect(result.imageWidth).toBe(1920);
      expect(result.imageHeight).toBe(1080);
      expect(result.width).toBe(1920);
      expect(result.height).toBe(1080);
    });

    it('should fall back to width/height when imageWidth/imageHeight are missing in convertCollectionContentToImage', () => {
      const collection = createCollectionContent(1, {
        coverImage: {
          id: 10,
          contentType: 'IMAGE',
          orderIndex: 0,
          imageUrl: 'https://example.com/cover.jpg',
          width: 800,
          height: 600,
        },
      });
      const result = convertCollectionContentToImage(collection);
      expect(result.imageWidth).toBe(800);
      expect(result.imageHeight).toBe(600);
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
    });

    it('should handle undefined dimensions in convertCollectionContentToParallax', () => {
      const collection = createCollectionContent(1, {
        coverImage: {
          id: 10,
          contentType: 'IMAGE',
          orderIndex: 0,
          imageUrl: 'https://example.com/cover.jpg',
        },
      });
      const result = convertCollectionContentToParallax(collection);
      expect(result.imageWidth).toBeUndefined();
      expect(result.imageHeight).toBeUndefined();
      expect(result.width).toBeUndefined();
      expect(result.height).toBeUndefined();
    });

    it('should handle undefined dimensions in convertCollectionContentToImage', () => {
      const collection = createCollectionContent(1, {
        coverImage: {
          id: 10,
          contentType: 'IMAGE',
          orderIndex: 0,
          imageUrl: 'https://example.com/cover.jpg',
        },
      });
      const result = convertCollectionContentToImage(collection);
      expect(result.imageWidth).toBeUndefined();
      expect(result.imageHeight).toBeUndefined();
      expect(result.width).toBeUndefined();
      expect(result.height).toBeUndefined();
    });

    it('should handle null coverImage in convertCollectionContentToParallax', () => {
      const collection = createCollectionContent(1, {
        coverImage: null,
      });
      const result = convertCollectionContentToParallax(collection);
      expect(result.imageWidth).toBeUndefined();
      expect(result.imageHeight).toBeUndefined();
    });

    it('should handle null coverImage in convertCollectionContentToImage', () => {
      const collection = createCollectionContent(1, {
        coverImage: null,
      });
      const result = convertCollectionContentToImage(collection);
      expect(result.imageWidth).toBeUndefined();
      expect(result.imageHeight).toBeUndefined();
    });

    it('should handle undefined coverImage in convertCollectionContentToParallax', () => {
      const collection = createCollectionContent(1, {
        coverImage: undefined,
      });
      const result = convertCollectionContentToParallax(collection);
      expect(result.imageWidth).toBeUndefined();
      expect(result.imageHeight).toBeUndefined();
    });

    it('should handle undefined coverImage in convertCollectionContentToImage', () => {
      const collection = createCollectionContent(1, {
        coverImage: undefined,
      });
      const result = convertCollectionContentToImage(collection);
      expect(result.imageWidth).toBeUndefined();
      expect(result.imageHeight).toBeUndefined();
    });
  });
});

describe('clampParallaxDimensions', () => {
  it('should clamp excessively tall images to 4:5 aspect ratio', () => {
    // 1000x2000 is 1:2 AR — should be clamped to 1000x1250 (4:5)
    const result = clampParallaxDimensions(1000, 2000);
    expect(result.imageWidth).toBe(1000);
    expect(result.imageHeight).toBe(1250);
  });

  it('should clamp excessively wide images to 5:4 aspect ratio', () => {
    // 2000x1000 is 2:1 AR — should be clamped to 2000x1600 (5:4)
    const result = clampParallaxDimensions(2000, 1000);
    expect(result.imageWidth).toBe(2000);
    expect(result.imageHeight).toBe(1600);
  });

  it('should not clamp images within the 4:5 to 5:4 range', () => {
    // 1200x1000 is 1.2 AR — within [0.8, 1.25]
    const result = clampParallaxDimensions(1200, 1000);
    expect(result.imageWidth).toBe(1200);
    expect(result.imageHeight).toBe(1000);
  });

  it('should not clamp images exactly at 4:5', () => {
    const result = clampParallaxDimensions(800, 1000);
    expect(result.imageWidth).toBe(800);
    expect(result.imageHeight).toBe(1000);
  });

  it('should not clamp images exactly at 5:4', () => {
    const result = clampParallaxDimensions(1000, 800);
    expect(result.imageWidth).toBe(1000);
    expect(result.imageHeight).toBe(800);
  });

  it('should not clamp square images', () => {
    const result = clampParallaxDimensions(1000, 1000);
    expect(result.imageWidth).toBe(1000);
    expect(result.imageHeight).toBe(1000);
  });

  it('should pass through undefined dimensions unchanged', () => {
    const result = clampParallaxDimensions();
    expect(result.imageWidth).toBeUndefined();
    expect(result.imageHeight).toBeUndefined();
  });

  it('should clamp a tall cover image via convertCollectionContentToParallax', () => {
    const collection = createCollectionContent(1, {
      coverImage: {
        id: 10,
        contentType: 'IMAGE',
        orderIndex: 0,
        imageUrl: 'https://example.com/tall.jpg',
        imageWidth: 1000,
        imageHeight: 2000,
      },
    });
    const result = convertCollectionContentToParallax(collection);
    expect(result.imageWidth).toBe(1000);
    expect(result.imageHeight).toBe(1250); // clamped from 2000
  });

  it('should clamp a wide cover image via convertCollectionContentToParallax', () => {
    const collection = createCollectionContent(1, {
      coverImage: {
        id: 10,
        contentType: 'IMAGE',
        orderIndex: 0,
        imageUrl: 'https://example.com/wide.jpg',
        imageWidth: 2000,
        imageHeight: 1000,
      },
    });
    const result = convertCollectionContentToParallax(collection);
    expect(result.imageWidth).toBe(2000);
    expect(result.imageHeight).toBe(1600); // clamped from 1000
  });

  it('should NOT clamp dimensions in convertCollectionContentToImage (admin path)', () => {
    const collection = createCollectionContent(1, {
      coverImage: {
        id: 10,
        contentType: 'IMAGE',
        orderIndex: 0,
        imageUrl: 'https://example.com/tall.jpg',
        imageWidth: 1000,
        imageHeight: 2000,
      },
    });
    const result = convertCollectionContentToImage(collection);
    expect(result.imageWidth).toBe(1000);
    expect(result.imageHeight).toBe(2000); // NOT clamped
  });
});

describe('createHeaderRow', () => {
  const componentWidth = 800;
  const chunkSize = 4;

  describe('Normal cases with full metadata', () => {
    it('should create header row with two items: cover image and metadata text block', () => {
      const collection = createCollectionModel(1);
      const result = createHeaderRow(collection, componentWidth, chunkSize);

      expect(result).not.toBeNull();
      expect(result?.items).toHaveLength(2);
      expect(result?.patternName).toBe('header');
      expect(result?.items[0]?.content.contentType).toBe('IMAGE');
      expect(result?.items[1]?.content.contentType).toBe('TEXT');
    });

    it('should create header row with cover image block with correct properties', () => {
      const collection = createCollectionModel(1);
      const result = createHeaderRow(collection, componentWidth, chunkSize);
      const coverBlock = result?.items[0]?.content as ContentParallaxImageModel;

      expect(coverBlock).toBeDefined();
      expect(coverBlock.id).toBe(-1);
      expect(coverBlock.contentType).toBe('IMAGE');
      expect(coverBlock.enableParallax).toBe(true);
      expect(coverBlock.imageUrl).toBe('https://example.com/cover-1.jpg');
      expect(coverBlock.overlayText).toBe('Collection 1');
      expect(coverBlock.title).toBe('Collection 1');
    });

    it('should create header row with metadata block with all metadata items', () => {
      const collection = createCollectionModel(1);
      const result = createHeaderRow(collection, componentWidth, chunkSize);
      const metadataBlock = result?.items[1]?.content as ContentTextModel;

      expect(metadataBlock).toBeDefined();
      expect(metadataBlock.id).toBe(-2);
      expect(metadataBlock.contentType).toBe('TEXT');
      expect(metadataBlock.items).toHaveLength(3);
    });

    it('should calculate sizes for header row items', () => {
      const collection = createCollectionModel(1);
      const result = createHeaderRow(collection, componentWidth, chunkSize);

      expect(result?.items[0]?.width).toBeGreaterThan(0);
      expect(result?.items[0]?.height).toBeGreaterThan(0);
      expect(result?.items[1]?.width).toBeGreaterThan(0);
      expect(result?.items[1]?.height).toBeGreaterThan(0);

      // Cover + description widths should sum to componentWidth
      const totalWidth = (result?.items[0]?.width || 0) + (result?.items[1]?.width || 0);
      expect(totalWidth).toBeCloseTo(componentWidth, 1);
    });
  });

  describe('Height-constrained sizing', () => {
    it('should give horizontal cover ~50% width (clamped to max)', () => {
      // Horizontal: 1920x1080 = 1.78 aspect ratio
      const collection = createCollectionModel(1, {
        coverImage: {
          id: 10,
          contentType: 'IMAGE',
          orderIndex: 0,
          imageUrl: 'https://example.com/cover.jpg',
          imageWidth: 1920,
          imageHeight: 1080,
          visible: true,
        },
      });
      const result = createHeaderRow(collection, componentWidth, chunkSize);

      // Horizontal images hit the 50% max cap
      const coverWidth = result?.items[0]?.width || 0;
      const maxCoverWidth = componentWidth * 0.5;
      expect(coverWidth).toBeCloseTo(maxCoverWidth, 1);
    });

    it('should give vertical cover narrower width (~36%)', () => {
      // Vertical: 1080x1920, clamped to 1080x1350 (AR 0.8) by parallax AR clamp
      const collection = createCollectionModel(1, {
        coverImage: {
          id: 10,
          contentType: 'IMAGE',
          orderIndex: 0,
          imageUrl: 'https://example.com/cover.jpg',
          imageWidth: 1080,
          imageHeight: 1920,
          visible: true,
        },
      });
      const result = createHeaderRow(collection, componentWidth, chunkSize);

      const coverWidth = result?.items[0]?.width || 0;
      const minCoverWidth = componentWidth * 0.3;
      const maxCoverWidth = componentWidth * 0.5;

      // Clamped AR (0.8) produces coverWidth = maxRowHeight * 0.8 = 360 * 0.8 = 288
      expect(coverWidth).toBeGreaterThan(minCoverWidth);
      expect(coverWidth).toBeLessThan(maxCoverWidth);
      expect(coverWidth).toBeCloseTo(288, 0);
    });

    it('should give square cover intermediate width (~45%)', () => {
      // Square: 1000x1000 = 1.0 aspect ratio
      const collection = createCollectionModel(1, {
        coverImage: {
          id: 10,
          contentType: 'IMAGE',
          orderIndex: 0,
          imageUrl: 'https://example.com/cover.jpg',
          imageWidth: 1000,
          imageHeight: 1000,
          visible: true,
        },
      });
      const result = createHeaderRow(collection, componentWidth, chunkSize);

      const coverWidth = result?.items[0]?.width || 0;
      const minCoverWidth = componentWidth * 0.3;
      const maxCoverWidth = componentWidth * 0.5;

      // Square should be between min and max
      expect(coverWidth).toBeGreaterThan(minCoverWidth);
      expect(coverWidth).toBeLessThan(maxCoverWidth);
    });

    it('should produce shorter row for vertical covers than 50/50 split would', () => {
      // Vertical: 1080x1920 = 0.5625 aspect ratio
      const collection = createCollectionModel(1, {
        coverImage: {
          id: 10,
          contentType: 'IMAGE',
          orderIndex: 0,
          imageUrl: 'https://example.com/cover.jpg',
          imageWidth: 1080,
          imageHeight: 1920,
          visible: true,
        },
      });
      const result = createHeaderRow(collection, componentWidth, chunkSize);

      const rowHeight = result?.items[0]?.height || 0;

      // Without height constraint, a 50% width vertical would produce:
      // height = (componentWidth * 0.5) / 0.5625 = 400 / 0.5625 = 711px
      // With constraint, using 30% min width:
      // height = (componentWidth * 0.3) / 0.5625 = 240 / 0.5625 = 427px
      // So the row is ~40% shorter than it would be without the constraint
      const heightWithout50Split = (componentWidth * 0.5) / (1080 / 1920);
      expect(rowHeight).toBeLessThan(heightWithout50Split);
    });

    it('should give description block more width when cover is vertical', () => {
      // Vertical cover
      const collection = createCollectionModel(1, {
        coverImage: {
          id: 10,
          contentType: 'IMAGE',
          orderIndex: 0,
          imageUrl: 'https://example.com/cover.jpg',
          imageWidth: 1080,
          imageHeight: 1920,
          visible: true,
        },
      });
      const result = createHeaderRow(collection, componentWidth, chunkSize);

      const coverWidth = result?.items[0]?.width || 0;
      const descWidth = result?.items[1]?.width || 0;

      // Description should be wider than cover for vertical images
      expect(descWidth).toBeGreaterThan(coverWidth);
      // With clamped AR (0.8), cover = 288, desc = 800 - 288 = 512
      expect(descWidth).toBeCloseTo(512, 0);
    });
  });

  describe('Partial metadata cases', () => {
    it('should create header row with only cover image when no metadata', () => {
      const collection = createCollectionModel(1, {
        collectionDate: undefined,
        location: undefined,
        description: undefined,
      });
      const result = createHeaderRow(collection, componentWidth, chunkSize);

      expect(result).not.toBeNull();
      expect(result?.items).toHaveLength(1);
      expect(result?.items[0]?.content.contentType).toBe('IMAGE');
    });
  });

  describe('Missing cover image cases', () => {
    it('should return null when coverImage is null', () => {
      const collection = createCollectionModel(1, {
        coverImage: null,
      });
      const result = createHeaderRow(collection, componentWidth, chunkSize);

      expect(result).toBeNull();
    });

    it('should return null when coverImage is undefined', () => {
      const collection = createCollectionModel(1, {
        coverImage: undefined,
      });
      const result = createHeaderRow(collection, componentWidth, chunkSize);

      expect(result).toBeNull();
    });

    it('should return null when cover image has no dimensions', () => {
      const collection = createCollectionModel(1);
      if (collection.coverImage) {
        collection.coverImage.imageWidth = undefined;
        collection.coverImage.imageHeight = undefined;
      }
      const result = createHeaderRow(collection, componentWidth, chunkSize);

      expect(result).toBeNull();
    });
  });
});

describe('chunkContent', () => {
  // Helper: create horizontal image (1920x1080, ratio ~1.78)
  const createHorizontalImage = (id: number, rating?: number): ContentImageModel =>
    createImageContent(id, {
      imageWidth: 1920,
      imageHeight: 1080,
      rating,
    });

  // Helper: create vertical image (1080x1920, ratio ~0.56)
  const createVerticalImage = (id: number, rating?: number): ContentImageModel =>
    createImageContent(id, {
      imageWidth: 1080,
      imageHeight: 1920,
      rating,
    });

  // Helper: create square image (1080x1080, ratio 1.0)
  const createSquareImage = (id: number, rating?: number): ContentImageModel =>
    createImageContent(id, {
      imageWidth: 1080,
      imageHeight: 1080,
      rating,
    });

  // Helper: create wide panorama (3000x1000, ratio 3.0)
  const createWidePanorama = (id: number): ContentImageModel =>
    createImageContent(id, {
      imageWidth: 3000,
      imageHeight: 1000,
    });

  // Helper: create tall panorama (1000x3000, ratio ~0.33)
  const createTallPanorama = (id: number): ContentImageModel =>
    createImageContent(id, {
      imageWidth: 1000,
      imageHeight: 3000,
    });

  describe('Empty and edge cases', () => {
    it('should return empty array for empty input', () => {
      expect(chunkContent([])).toEqual([]);
    });

    it('should return empty array for null/undefined input', () => {
      expect(chunkContent(null as unknown as ContentImageModel[])).toEqual([]);
      expect(chunkContent(undefined as unknown as ContentImageModel[])).toEqual([]);
    });

    it('should enforce minimum chunkSize of 2', () => {
      // With chunkSize=1, halfSlot would be 0 without protection
      // A 3-star image gets halfSlot, so with minimum enforcement it should work
      const content = [createHorizontalImage(1, 3)];
      const result = chunkContent(content, 1);
      // Should still work (not crash or infinite loop)
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('5-star horizontal images (standalone)', () => {
    it('should place 5-star horizontal image in its own row', () => {
      const content = [createHorizontalImage(1, 5), createHorizontalImage(2, 1)];
      const result = chunkContent(content);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveLength(1);
      expect(result[0]?.[0]?.id).toBe(1);
    });

    it('should place multiple 5-star horizontal images in separate rows', () => {
      const content = [
        createHorizontalImage(1, 5),
        createHorizontalImage(2, 5),
        createHorizontalImage(3, 5),
      ];
      const result = chunkContent(content);

      expect(result).toHaveLength(3);
      for (const row of result) {
        expect(row).toHaveLength(1);
      }
    });
  });

  describe('4-star horizontal images (context-dependent)', () => {
    it('should place 4-star horizontal alone when no adjacent verticals', () => {
      const content = [createHorizontalImage(1, 4), createHorizontalImage(2, 1)];
      const result = chunkContent(content);

      // 4-star alone gets standalone row
      expect(result[0]).toHaveLength(1);
      expect(result[0]?.[0]?.id).toBe(1);
    });

    it('should pair 4-star horizontal with adjacent vertical', () => {
      const content = [createHorizontalImage(1, 4), createVerticalImage(2, 3)];
      const result = chunkContent(content);

      // Should pair together (both get halfSlot)
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(2);
    });

    it('should pair 4-star horizontal with preceding vertical', () => {
      const content = [createVerticalImage(1, 3), createHorizontalImage(2, 4)];
      const result = chunkContent(content);

      // Should pair together
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(2);
    });
  });

  describe('Vertical images', () => {
    it('should treat square images as vertical (ratio = 1.0)', () => {
      const content = [createSquareImage(1, 3), createSquareImage(2, 3)];
      const result = chunkContent(content);

      // Two 3-star squares should pair (each gets halfSlot = 2)
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(2);
    });

    it('should pair vertical 3+ star images together', () => {
      const content = [createVerticalImage(1, 3), createVerticalImage(2, 4)];
      const result = chunkContent(content);

      // Both get halfSlot, should pair
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(2);
    });

    it('should fit 4 low-star vertical images in one row', () => {
      const content = [
        createVerticalImage(1, 1),
        createVerticalImage(2, 2),
        createVerticalImage(3, 1),
        createVerticalImage(4, 2),
      ];
      const result = chunkContent(content, 4);

      // 1-2 star verticals get slot=1, so 4 fit in chunkSize=4
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(4);
    });
  });

  describe('3-star images (half slot)', () => {
    it('should pair two 3-star horizontal images', () => {
      const content = [createHorizontalImage(1, 3), createHorizontalImage(2, 3)];
      const result = chunkContent(content);

      // Both get halfSlot (2), total 4 = chunkSize
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(2);
    });

    it('should pair 3-star horizontal with 3-star vertical', () => {
      const content = [createHorizontalImage(1, 3), createVerticalImage(2, 3)];
      const result = chunkContent(content);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(2);
    });
  });

  describe('Panorama images', () => {
    it('should place wide panorama in standalone row', () => {
      const content = [
        createHorizontalImage(1, 1),
        createWidePanorama(2),
        createHorizontalImage(3, 1),
      ];
      const result = chunkContent(content);

      // Wide panorama (ratio >= 2) gets Infinity slot → standalone
      expect(result.some(row => row.length === 1 && row[0]?.id === 2)).toBe(true);
    });

    it('should treat tall panorama as normal slot', () => {
      const content = [
        createTallPanorama(1),
        createTallPanorama(2),
        createTallPanorama(3),
        createTallPanorama(4),
      ];
      const result = chunkContent(content, 4);

      // Tall panorama (ratio <= 0.5) gets slot=1, so 4 fit in chunkSize=4
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(4);
    });
  });

  describe('Header items (cover image and metadata)', () => {
    it('should pair header items together', () => {
      const headerCover = createImageContent(-1); // Cover image
      const headerMetadata: ContentTextModel = {
        id: -2,
        contentType: 'TEXT',
        orderIndex: -1,
        visible: true,
        items: [{ type: 'text', value: 'Description' }],
        format: 'plain',
        align: 'left',
      };

      const content = [headerCover, headerMetadata];
      const result = chunkContent(content);

      // Both header items get halfSlot, should pair in one row
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(2);
    });
  });

  describe('Collection cards (slug property)', () => {
    it('should pair collection cards together', () => {
      const collections = [createCollectionContent(1), createCollectionContent(2)];
      // Process to get parallax images with slugs
      const processed = processContentBlocks(collections);
      const result = chunkContent(processed);

      // Collection cards get halfSlot, 2 should pair
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(2);
    });

    it('should fit 2 collection cards per row', () => {
      const collections = [
        createCollectionContent(1),
        createCollectionContent(2),
        createCollectionContent(3),
        createCollectionContent(4),
      ];
      const processed = processContentBlocks(collections);
      const result = chunkContent(processed);

      // 4 collections = 2 rows of 2
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveLength(2);
      expect(result[1]).toHaveLength(2);
    });
  });

  describe('Lonely vertical reordering', () => {
    it('should swap lonely vertical + 5-star horizontal', () => {
      // Input: [V, 5H] where V has no partner before it
      const content = [createVerticalImage(1, 3), createHorizontalImage(2, 5)];
      const result = chunkContent(content);

      // After reorder: [5H, V]
      // 5H is standalone, V is alone
      expect(result[0]).toHaveLength(1);
      expect(result[0]?.[0]?.id).toBe(2); // 5H first
      expect(result[1]?.[0]?.id).toBe(1); // V second
    });

    it('should NOT swap when vertical can pair with previous', () => {
      // Input: [4H, V, 5H] - V can pair with 4H
      const content = [
        createHorizontalImage(1, 4),
        createVerticalImage(2, 3),
        createHorizontalImage(3, 5),
      ];
      const result = chunkContent(content);

      // No swap needed: 4H+V pair, 5H standalone
      // Check that 4H and V are together
      const firstRow = result[0];
      expect(firstRow).toHaveLength(2);
      expect(firstRow?.some(item => item.id === 1)).toBe(true);
      expect(firstRow?.some(item => item.id === 2)).toBe(true);
    });
  });
});

describe('calculateContentSizes', () => {
  it('should return empty array for empty input', () => {
    expect(calculateContentSizes([], 1000)).toEqual([]);
  });

  it('should handle single image', () => {
    const content = [createImageContent(1)];
    const result = calculateContentSizes(content, 1000);

    expect(result).toHaveLength(1);
    expect(result[0]?.width).toBe(1000);
    expect(result[0]?.height).toBeGreaterThan(0);
  });

  it('should enforce minimum chunkSize of 2', () => {
    // With chunkSize=1, calculation should still work
    const content = [createImageContent(1, { rating: 3 })];
    const result = calculateContentSizes(content, 1000, 1);

    expect(result).toHaveLength(1);
    expect(result[0]?.width).toBe(1000);
  });
});

