/**
 * Unit tests for contentLayout.ts
 * Tests content processing and layout utilities
 */

import type {
  AnyContentModel,
  CollectionContentModel,
  ImageContentModel,
  ParallaxImageContentModel,
  TextContentModel,
} from '@/app/types/Content';
import {
  convertCollectionContentToImage,
  convertCollectionContentToParallax,
  processContentBlocks,
} from '@/app/utils/contentLayout';

// Test fixtures
const createImageContent = (
  id: number,
  overrides?: Partial<ImageContentModel>
): ImageContentModel => ({
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
  overrides?: Partial<ParallaxImageContentModel>
): ParallaxImageContentModel => ({
  id,
  contentType: 'PARALLAX',
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
  overrides?: Partial<TextContentModel>
): TextContentModel => ({
  id,
  contentType: 'TEXT',
  orderIndex: id,
  visible: true,
  text: `Text content ${id}`,
  format: 'plain',
  alignment: 'left',
  ...overrides,
});

const createCollectionContent = (
  id: number,
  overrides?: Partial<CollectionContentModel>
): CollectionContentModel => ({
  id,
  contentType: 'COLLECTION',
  orderIndex: id,
  visible: true,
  collectionId: id,
  title: `Collection ${id}`,
  slug: `collection-${id}`,
  coverImage: {
    id: id * 10,
    imageUrl: `https://example.com/cover-${id}.jpg`,
    imageWidth: 1920,
    imageHeight: 1080,
  },
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

    it('should filter image blocks with collection-specific visibility', () => {
      const content: AnyContentModel[] = [
        createImageContent(1, {
          collections: [
            { collectionId: 1, name: 'Collection 1', visible: true },
          ],
        }),
        createImageContent(2, {
          collections: [
            { collectionId: 1, name: 'Collection 1', visible: false },
          ],
        }),
      ];
      const result = processContentBlocks(content, true, 1);
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(1);
    });

    it('should not filter when collectionId is not provided', () => {
      const content: AnyContentModel[] = [
        createImageContent(1, {
          collections: [
            { collectionId: 1, name: 'Collection 1', visible: false },
          ],
        }),
      ];
      const result = processContentBlocks(content, true);
      expect(result).toHaveLength(1);
    });
  });

  describe('Transforming collection blocks', () => {
    it('should convert CollectionContentModel to ParallaxImageContentModel', () => {
      const content: AnyContentModel[] = [
        createCollectionContent(1),
      ];
      const result = processContentBlocks(content);
      expect(result[0]?.contentType).toBe('PARALLAX');
      expect((result[0] as ParallaxImageContentModel).enableParallax).toBe(true);
    });

    it('should preserve collection metadata in parallax conversion', () => {
      const collection = createCollectionContent(1, {
        title: 'Test Collection',
        slug: 'test-collection',
      });
      const content: AnyContentModel[] = [collection];
      const result = processContentBlocks(content);
      const parallax = result[0] as ParallaxImageContentModel;
      expect(parallax.title).toBe('Test Collection');
      expect(parallax.imageUrl).toBe('https://example.com/cover-1.jpg');
    });

    it('should not transform non-collection blocks', () => {
      const content: AnyContentModel[] = [
        createImageContent(1),
        createTextContent(2),
      ];
      const result = processContentBlocks(content);
      expect(result[0]?.contentType).toBe('IMAGE');
      expect(result[1]?.contentType).toBe('TEXT');
    });
  });

  describe('Updating image orderIndex', () => {
    it('should update orderIndex from collection-specific entry', () => {
      const content: AnyContentModel[] = [
        createImageContent(1, {
          orderIndex: 0,
          collections: [
            {
              collectionId: 1,
              name: 'Collection 1',
              visible: true,
              orderIndex: 5,
            },
          ],
        }),
      ];
      const result = processContentBlocks(content, true, 1);
      expect(result[0]?.orderIndex).toBe(5);
    });

    it('should not update orderIndex when collectionId is not provided', () => {
      const content: AnyContentModel[] = [
        createImageContent(1, {
          orderIndex: 0,
          collections: [
            {
              collectionId: 1,
              name: 'Collection 1',
              visible: true,
              orderIndex: 5,
            },
          ],
        }),
      ];
      const result = processContentBlocks(content);
      expect(result[0]?.orderIndex).toBe(0);
    });

    it('should not update orderIndex when collection entry not found', () => {
      const content: AnyContentModel[] = [
        createImageContent(1, {
          orderIndex: 0,
          collections: [
            {
              collectionId: 2,
              name: 'Collection 2',
              visible: true,
              orderIndex: 5,
            },
          ],
        }),
      ];
      const result = processContentBlocks(content, true, 1);
      expect(result[0]?.orderIndex).toBe(0);
    });

    it('should not update when orderIndex is undefined in collection entry', () => {
      const content: AnyContentModel[] = [
        createImageContent(1, {
          orderIndex: 0,
          collections: [
            {
              collectionId: 1,
              name: 'Collection 1',
              visible: true,
            },
          ],
        }),
      ];
      const result = processContentBlocks(content, true, 1);
      expect(result[0]?.orderIndex).toBe(0);
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
      const parallax = result[0] as ParallaxImageContentModel;
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
      const parallax = result[0] as ParallaxImageContentModel;
      expect(parallax.imageWidth).toBe(1920);
      expect(parallax.imageHeight).toBe(1080);
    });

    it('should not modify non-parallax blocks', () => {
      const content: AnyContentModel[] = [
        createImageContent(1),
        createTextContent(2),
      ];
      const result = processContentBlocks(content);
      expect(result[0]?.contentType).toBe('IMAGE');
      expect(result[1]?.contentType).toBe('TEXT');
    });

    it('should not modify parallax blocks without enableParallax', () => {
      const content: AnyContentModel[] = [
        createParallaxContent(1, {
          enableParallax: false,
          imageWidth: undefined,
        }),
      ];
      const result = processContentBlocks(content);
      const parallax = result[0] as ParallaxImageContentModel;
      expect(parallax.imageWidth).toBeUndefined();
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
          collections: [
            {
              collectionId: 1,
              name: 'Collection 1',
              visible: true,
              orderIndex: 5,
            },
          ],
        }),
        createCollectionContent(1),
        createImageContent(1, {
          visible: true,
          orderIndex: 1,
        }),
      ];
      const result = processContentBlocks(content, true, 1);
      
      // Should be filtered (visible: false removed)
      expect(result).toHaveLength(3);
      
      // Collection should be converted to parallax
      expect(result.find(b => b.id === 1 && b.contentType === 'PARALLAX')).toBeDefined();
      
      // Image with collection orderIndex should be updated
      const imageWithCollection = result.find(b => b.id === 2);
      expect(imageWithCollection?.orderIndex).toBe(5);
      
      // Should be sorted by orderIndex
      const orderIndices = result.map(b => b.orderIndex ?? 0);
      expect(orderIndices).toEqual([...orderIndices].sort((a, b) => a - b));
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
      const result = convertCollectionContentToParallax(collection);
      expect(result.imageWidth).toBe(1920);
      expect(result.imageHeight).toBe(1080);
      expect(result.width).toBe(1920);
      expect(result.height).toBe(1080);
    });

    it('should fall back to width/height when imageWidth/imageHeight are missing in convertCollectionContentToParallax', () => {
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
      const result = convertCollectionContentToParallax(collection);
      expect(result.imageWidth).toBe(800);
      expect(result.imageHeight).toBe(600);
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
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

