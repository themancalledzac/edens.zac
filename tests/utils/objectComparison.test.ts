/**
 * Tests for objectComparison.ts
 *
 * Testing Strategy:
 *
 * Passing test cases for deepEqual:
 * - Primitives: same values return true
 * - Primitives: different values return false
 * - Objects: same structure and values return true
 * - Objects: different values return false
 * - Objects: different keys return false
 * - Arrays: same length and values return true
 * - Arrays: different values return false
 * - Arrays: different lengths return false
 * - Nested objects: deeply equal return true
 * - Nested arrays: deeply equal return true
 * - Null/undefined: both null return true
 * - Null/undefined: both undefined return true
 * - Null/undefined: one null, one undefined return false
 * - Same reference: returns true
 * - Empty objects: both empty return true
 * - Empty arrays: both empty return true
 *
 * Failing test cases for deepEqual:
 * - Different types return false
 * - Array vs object return false
 * - Object with extra keys return false
 * - Object with missing keys return false
 *
 * Passing test cases for hasObjectChanges:
 * - Objects with different values return true
 * - Objects with same values return false
 * - Ignores 'id' field in comparison
 * - Handles nested objects
 * - Handles arrays
 * - Handles undefined vs missing properties correctly
 *
 * Failing test cases for hasObjectChanges:
 * - Only 'id' differs: returns false (id is ignored)
 * - Objects with same values except id: returns false
 */

import { deepEqual, hasObjectChanges } from '@/app/utils/objectComparison';

describe('deepEqual', () => {
  describe('primitives', () => {
    it('should return true for same string values', () => {
      expect(deepEqual('hello', 'hello')).toBe(true);
    });

    it('should return false for different string values', () => {
      expect(deepEqual('hello', 'world')).toBe(false);
    });

    it('should return true for same number values', () => {
      expect(deepEqual(42, 42)).toBe(true);
    });

    it('should return false for different number values', () => {
      expect(deepEqual(42, 43)).toBe(false);
    });

    it('should return true for same boolean values', () => {
      expect(deepEqual(true, true)).toBe(true);
      expect(deepEqual(false, false)).toBe(true);
    });

    it('should return false for different boolean values', () => {
      expect(deepEqual(true, false)).toBe(false);
    });

    it('should return true for same null values', () => {
      expect(deepEqual(null, null)).toBe(true);
    });

    it('should return true for same undefined values', () => {
      const a = undefined;
      const b = undefined;
      expect(deepEqual(a, b)).toBe(true);
    });

    it('should return false for null vs undefined', () => {
      const a = null;
      const b = undefined;
      expect(deepEqual(a, b)).toBe(false);
    });

    it('should return false for different types', () => {
      expect(deepEqual('42', 42)).toBe(false);
      expect(deepEqual(true, 1)).toBe(false);
      expect(deepEqual(null, 0)).toBe(false);
    });
  });

  describe('arrays', () => {
    it('should return true for same array values', () => {
      expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    });

    it('should return false for different array values', () => {
      expect(deepEqual([1, 2, 3], [1, 2, 4])).toBe(false);
    });

    it('should return false for different array lengths', () => {
      expect(deepEqual([1, 2, 3], [1, 2])).toBe(false);
    });

    it('should return true for empty arrays', () => {
      expect(deepEqual([], [])).toBe(true);
    });

    it('should return true for nested arrays', () => {
      expect(
        deepEqual(
          [
            [1, 2],
            [3, 4],
          ],
          [
            [1, 2],
            [3, 4],
          ]
        )
      ).toBe(true);
    });

    it('should return false for nested arrays with different values', () => {
      expect(
        deepEqual(
          [
            [1, 2],
            [3, 4],
          ],
          [
            [1, 2],
            [3, 5],
          ]
        )
      ).toBe(false);
    });

    it('should return false for array vs object', () => {
      expect(deepEqual([1, 2, 3], { 0: 1, 1: 2, 2: 3 })).toBe(false);
    });
  });

  describe('objects', () => {
    it('should return true for same object structure and values', () => {
      expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
    });

    it('should return true for objects with same values in different key order', () => {
      expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
    });

    it('should return false for different object values', () => {
      expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
    });

    it('should return false for objects with different keys', () => {
      expect(deepEqual({ a: 1, b: 2 }, { a: 1, c: 2 })).toBe(false);
    });

    it('should return false for objects with extra keys', () => {
      expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    });

    it('should return true for empty objects', () => {
      expect(deepEqual({}, {})).toBe(true);
    });

    it('should return true for nested objects', () => {
      expect(deepEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true);
    });

    it('should return false for nested objects with different values', () => {
      expect(deepEqual({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false);
    });

    it('should return true for objects with arrays', () => {
      expect(deepEqual({ items: [1, 2, 3] }, { items: [1, 2, 3] })).toBe(true);
    });

    it('should return false for objects with different arrays', () => {
      expect(deepEqual({ items: [1, 2, 3] }, { items: [1, 2, 4] })).toBe(false);
    });

    it('should return true for same reference', () => {
      const obj = { a: 1 };
      expect(deepEqual(obj, obj)).toBe(true);
    });

    it('should handle undefined properties correctly', () => {
      expect(deepEqual({ a: 1, b: undefined }, { a: 1, b: undefined })).toBe(true);
      expect(deepEqual({ a: 1 }, { a: 1, b: undefined })).toBe(false);
    });

    it('should handle null properties correctly', () => {
      expect(deepEqual({ a: 1, b: null }, { a: 1, b: null })).toBe(true);
      expect(deepEqual({ a: 1, b: null }, { a: 1, b: undefined })).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle complex nested structures', () => {
      const obj1 = {
        a: 1,
        b: { c: [1, 2, { d: 3 }] },
        e: null,
        f: undefined,
      };
      const obj2 = {
        a: 1,
        b: { c: [1, 2, { d: 3 }] },
        e: null,
        f: undefined,
      };
      expect(deepEqual(obj1, obj2)).toBe(true);
    });

    it('should return false for complex nested structures with differences', () => {
      const obj1 = {
        a: 1,
        b: { c: [1, 2, { d: 3 }] },
      };
      const obj2 = {
        a: 1,
        b: { c: [1, 2, { d: 4 }] },
      };
      expect(deepEqual(obj1, obj2)).toBe(false);
    });
  });
});

describe('hasObjectChanges', () => {
  describe('passing cases', () => {
    it('should return true when objects have different values', () => {
      const updateState = { id: 1, title: 'New Title', rating: 5 };
      const originalState = { id: 1, title: 'Old Title', rating: 3 };
      expect(hasObjectChanges(updateState, originalState)).toBe(true);
    });

    it('should return false when objects have same values', () => {
      const updateState = { id: 1, title: 'Title', rating: 3 };
      const originalState = { id: 1, title: 'Title', rating: 3 };
      expect(hasObjectChanges(updateState, originalState)).toBe(false);
    });

    it('should ignore id field in comparison', () => {
      const updateState = { id: 1, title: 'Title', rating: 3 };
      const originalState = { id: 999, title: 'Title', rating: 3 };
      expect(hasObjectChanges(updateState, originalState)).toBe(false);
    });

    it('should return false when only id differs', () => {
      const updateState = { id: 1, title: 'Title', rating: 3 };
      const originalState = { id: 2, title: 'Title', rating: 3 };
      expect(hasObjectChanges(updateState, originalState)).toBe(false);
    });

    it('should handle nested objects', () => {
      const updateState = { id: 1, metadata: { author: 'John' } };
      const originalState = { id: 1, metadata: { author: 'Jane' } };
      expect(hasObjectChanges(updateState, originalState)).toBe(true);
    });

    it('should return false for nested objects with same values', () => {
      const updateState = { id: 1, metadata: { author: 'John' } };
      const originalState = { id: 1, metadata: { author: 'John' } };
      expect(hasObjectChanges(updateState, originalState)).toBe(false);
    });

    it('should handle arrays', () => {
      const updateState = { id: 1, tags: ['tag1', 'tag2'] };
      const originalState = { id: 1, tags: ['tag1'] };
      expect(hasObjectChanges(updateState, originalState)).toBe(true);
    });

    it('should return false for arrays with same values', () => {
      const updateState = { id: 1, tags: ['tag1', 'tag2'] };
      const originalState = { id: 1, tags: ['tag1', 'tag2'] };
      expect(hasObjectChanges(updateState, originalState)).toBe(false);
    });

    it('should handle undefined vs missing properties', () => {
      const updateState = { id: 1, title: 'Title', description: undefined };
      const originalState = { id: 1, title: 'Title' };
      expect(hasObjectChanges(updateState, originalState)).toBe(true);
    });

    it('should return false when both have undefined properties', () => {
      const updateState = { id: 1, title: 'Title', description: undefined };
      const originalState = { id: 1, title: 'Title', description: undefined };
      expect(hasObjectChanges(updateState, originalState)).toBe(false);
    });

    it('should handle null vs undefined', () => {
      const updateState = { id: 1, title: 'Title', description: null };
      const originalState = { id: 1, title: 'Title', description: undefined };
      expect(hasObjectChanges(updateState, originalState)).toBe(true);
    });

    it('should handle objects without id field', () => {
      const updateState = { title: 'New Title' };
      const originalState = { title: 'Old Title' };
      expect(hasObjectChanges(updateState, originalState)).toBe(true);
    });

    it('should return false for objects without id field and same values', () => {
      const updateState = { title: 'Title' };
      const originalState = { title: 'Title' };
      expect(hasObjectChanges(updateState, originalState)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty objects', () => {
      const updateState = { id: 1 };
      const originalState = { id: 1 };
      expect(hasObjectChanges(updateState, originalState)).toBe(false);
    });

    it('should handle complex nested structures', () => {
      const updateState = {
        id: 1,
        metadata: {
          tags: ['tag1', 'tag2'],
          author: { name: 'John', email: 'john@example.com' },
        },
      };
      const originalState = {
        id: 1,
        metadata: {
          tags: ['tag1'],
          author: { name: 'John', email: 'john@example.com' },
        },
      };
      expect(hasObjectChanges(updateState, originalState)).toBe(true);
    });

    it('should return false for complex nested structures with same values', () => {
      const updateState = {
        id: 1,
        metadata: {
          tags: ['tag1', 'tag2'],
          author: { name: 'John', email: 'john@example.com' },
        },
      };
      const originalState = {
        id: 2,
        metadata: {
          tags: ['tag1', 'tag2'],
          author: { name: 'John', email: 'john@example.com' },
        },
      };
      expect(hasObjectChanges(updateState, originalState)).toBe(false);
    });
  });
});
