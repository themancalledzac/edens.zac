/**
 * Unit tests for the pure helpers extracted from EssentialInfoSection.
 */

import {
  isCurrentCollectionVisible,
  toggleCollectionVisibility,
} from '@/app/components/Metadata/sections/essentialInfoUtils';
import type { ChildCollection, CollectionListModel } from '@/app/types/Collection';

const available: CollectionListModel[] = [
  { id: 42, name: 'Pacific Northwest', slug: 'pacific-northwest' },
  { id: 7, name: 'Other', slug: 'other' },
];

describe('isCurrentCollectionVisible', () => {
  it('returns true when there is no junction for the current collection (absent === visible)', () => {
    expect(isCurrentCollectionVisible([], 42)).toBe(true);
    expect(isCurrentCollectionVisible(undefined, 42)).toBe(true);
  });

  it('returns true when the junction exists with visible undefined', () => {
    const collections: ChildCollection[] = [{ collectionId: 42 }];
    expect(isCurrentCollectionVisible(collections, 42)).toBe(true);
  });

  it('returns true when the junction is explicitly visible=true', () => {
    const collections: ChildCollection[] = [{ collectionId: 42, visible: true }];
    expect(isCurrentCollectionVisible(collections, 42)).toBe(true);
  });

  it('returns false only when the junction is explicitly visible=false', () => {
    const collections: ChildCollection[] = [{ collectionId: 42, visible: false }];
    expect(isCurrentCollectionVisible(collections, 42)).toBe(false);
  });

  it('ignores junctions for other collections', () => {
    const collections: ChildCollection[] = [{ collectionId: 7, visible: false }];
    // No junction for 42 → default visible.
    expect(isCurrentCollectionVisible(collections, 42)).toBe(true);
  });
});

describe('toggleCollectionVisibility', () => {
  it('returns the input unchanged when currentCollectionId is null/undefined', () => {
    const collections: ChildCollection[] = [{ collectionId: 42, visible: true, orderIndex: 0 }];
    expect(toggleCollectionVisibility(collections, undefined, false, available)).toBe(collections);
  });

  it('treats an undefined collections array as empty', () => {
    expect(toggleCollectionVisibility(undefined, undefined, false, available)).toEqual([]);
  });

  describe('UPDATE branch (junction already exists)', () => {
    it('updates visible in place without re-ordering or touching siblings', () => {
      const collections: ChildCollection[] = [
        { collectionId: 7, name: 'Other', visible: true, orderIndex: 0 },
        { collectionId: 42, name: 'Pacific Northwest', visible: true, orderIndex: 1 },
      ];
      expect(toggleCollectionVisibility(collections, 42, false, available)).toEqual([
        { collectionId: 7, name: 'Other', visible: true, orderIndex: 0 },
        { collectionId: 42, name: 'Pacific Northwest', visible: false, orderIndex: 1 },
      ]);
    });

    it('can flip a hidden junction back to visible', () => {
      const collections: ChildCollection[] = [
        { collectionId: 42, name: 'Pacific Northwest', visible: false, orderIndex: 0 },
      ];
      expect(toggleCollectionVisibility(collections, 42, true, available)).toEqual([
        { collectionId: 42, name: 'Pacific Northwest', visible: true, orderIndex: 0 },
      ]);
    });

    it('preserves extra junction fields (slug, coverImageUrl) when updating', () => {
      const collections: ChildCollection[] = [
        {
          collectionId: 42,
          name: 'Pacific Northwest',
          slug: 'pnw',
          coverImageUrl: 'https://cdn/c.jpg',
          visible: true,
          orderIndex: 0,
        },
      ];
      const result = toggleCollectionVisibility(collections, 42, false, available);
      expect(result[0]).toEqual({
        collectionId: 42,
        name: 'Pacific Northwest',
        slug: 'pnw',
        coverImageUrl: 'https://cdn/c.jpg',
        visible: false,
        orderIndex: 0,
      });
    });
  });

  describe('APPEND branch (junction does not exist yet)', () => {
    it('appends a new junction with the looked-up name and a trailing orderIndex', () => {
      const collections: ChildCollection[] = [
        { collectionId: 7, name: 'Other', visible: true, orderIndex: 0 },
      ];
      expect(toggleCollectionVisibility(collections, 42, false, available)).toEqual([
        { collectionId: 7, name: 'Other', visible: true, orderIndex: 0 },
        { collectionId: 42, name: 'Pacific Northwest', visible: false, orderIndex: 1 },
      ]);
    });

    it('appends with orderIndex 0 onto an empty list', () => {
      expect(toggleCollectionVisibility([], 42, true, available)).toEqual([
        { collectionId: 42, name: 'Pacific Northwest', visible: true, orderIndex: 0 },
      ]);
    });

    it('sets name undefined when the collection is not in availableCollections', () => {
      expect(toggleCollectionVisibility([], 999, false, available)).toEqual([
        { collectionId: 999, name: undefined, visible: false, orderIndex: 0 },
      ]);
    });
  });
});
