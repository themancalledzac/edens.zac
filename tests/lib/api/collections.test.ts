/**
 * Unit tests for collections.ts
 * Tests collection API functions and response parsing
 */

import { parseCollectionArrayResponse } from '@/app/lib/api/collections';
import type { CollectionModel } from '@/app/types/Collection';

// Test fixtures
const createCollection = (
  id: number,
  overrides?: Partial<CollectionModel>
): CollectionModel => ({
  id,
  slug: `collection-${id}`,
  title: `Collection ${id}`,
  description: `Description ${id}`,
  collectionType: 'GALLERY',
  visible: true,
  coverImageId: null,
  coverImageUrl: null,
  ...overrides,
});

describe('parseCollectionArrayResponse', () => {
  describe('Direct array responses', () => {
    it('should return array when data is directly an array', () => {
      const data = [
        createCollection(1),
        createCollection(2),
        createCollection(3),
      ];
      const result = parseCollectionArrayResponse(data);
      expect(result).toEqual(data);
    });

    it('should return empty array when data is empty array', () => {
      const result = parseCollectionArrayResponse([]);
      expect(result).toEqual([]);
    });

    it('should handle array with single item', () => {
      const data = [createCollection(1)];
      const result = parseCollectionArrayResponse(data);
      expect(result).toEqual(data);
    });
  });

  describe('Wrapped object responses', () => {
    it('should extract array from content property', () => {
      const collections = [
        createCollection(1),
        createCollection(2),
      ];
      const data = { content: collections };
      const result = parseCollectionArrayResponse(data);
      expect(result).toEqual(collections);
    });

    it('should extract array from collections property', () => {
      const collections = [
        createCollection(1),
        createCollection(2),
      ];
      const data = { collections };
      const result = parseCollectionArrayResponse(data);
      expect(result).toEqual(collections);
    });

    it('should extract array from items property', () => {
      const collections = [
        createCollection(1),
        createCollection(2),
      ];
      const data = { items: collections };
      const result = parseCollectionArrayResponse(data);
      expect(result).toEqual(collections);
    });

    it('should prefer content over collections over items', () => {
      const content = [createCollection(1)];
      const collections = [createCollection(2)];
      const items = [createCollection(3)];
      const data = { content, collections, items };
      const result = parseCollectionArrayResponse(data);
      expect(result).toEqual(content);
    });
  });

  describe('Invalid responses', () => {
    it('should return empty array when data is null', () => {
      const result = parseCollectionArrayResponse(null);
      expect(result).toEqual([]);
    });

    it('should return empty array when data is undefined', () => {
      const result = parseCollectionArrayResponse();
      expect(result).toEqual([]);
    });

    it('should return empty array when data is empty object', () => {
      const result = parseCollectionArrayResponse({});
      expect(result).toEqual([]);
    });

    it('should return empty array when data is string', () => {
      const result = parseCollectionArrayResponse('invalid');
      expect(result).toEqual([]);
    });

    it('should return empty array when data is number', () => {
      const result = parseCollectionArrayResponse(123);
      expect(result).toEqual([]);
    });

    it('should return empty array when object has no array properties', () => {
      const data = {
        total: 10,
        page: 0,
        size: 20,
      };
      const result = parseCollectionArrayResponse(data);
      expect(result).toEqual([]);
    });

    it('should return empty array when object has non-array values for known properties', () => {
      const data = {
        content: 'not an array',
        collections: 123,
        items: null,
      };
      const result = parseCollectionArrayResponse(data);
      expect(result).toEqual([]);
    });
  });

  describe('Edge cases', () => {
    it('should handle object with multiple array properties (prefers content)', () => {
      const content = [createCollection(1)];
      const collections = [createCollection(2), createCollection(3)];
      const data = { content, collections };
      const result = parseCollectionArrayResponse(data);
      expect(result).toEqual(content);
    });

    it('should handle nested objects with array properties', () => {
      const collections = [createCollection(1)];
      const data = {
        response: {
          content: collections,
        },
        metadata: {},
      };
      // Note: This won't find nested arrays, only top-level properties
      const result = parseCollectionArrayResponse(data);
      expect(result).toEqual([]);
    });

    it('should preserve collection object structure', () => {
      const collection = createCollection(1, {
        title: 'Test Collection',
        description: 'Test Description',
        collectionType: 'BLOG',
        visible: false,
      });
      const data = [collection];
      const result = parseCollectionArrayResponse(data);
      expect(result[0]).toEqual(collection);
      expect(result[0]?.title).toBe('Test Collection');
      expect(result[0]?.collectionType).toBe('BLOG');
    });
  });
});

