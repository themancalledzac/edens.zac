import { type ChildCollection, type CollectionListModel } from '@/app/types/Collection';
import { toggleRelation } from '@/app/utils/collectionToggle';

const buildEntry = (collection: CollectionListModel, index: number): ChildCollection => ({
  collectionId: collection.id,
  name: collection.name,
  orderIndex: index,
});

const toggled: CollectionListModel = { id: 5, name: 'Five' };

describe('toggleRelation', () => {
  it('appends an unsaved collection to newValue using buildEntry', () => {
    const result = toggleRelation(undefined, toggled, new Set([1]), buildEntry);
    expect(result).toEqual({
      remove: undefined,
      newValue: [{ collectionId: 5, name: 'Five', orderIndex: 0 }],
    });
  });

  it('passes the current newValue length as the index', () => {
    const current = { newValue: [{ collectionId: 9 }] };
    const result = toggleRelation(current, toggled, new Set(), buildEntry);
    expect(result?.newValue).toEqual([
      { collectionId: 9 },
      { collectionId: 5, name: 'Five', orderIndex: 1 },
    ]);
  });

  it('removes a pending addition and returns undefined when nothing remains', () => {
    const current = { newValue: [{ collectionId: 5 }] };
    expect(toggleRelation(current, toggled, new Set(), buildEntry)).toBeUndefined();
  });

  it('keeps other pending additions when un-adding one', () => {
    const current = { newValue: [{ collectionId: 5 }, { collectionId: 9 }] };
    const result = toggleRelation(current, toggled, new Set(), buildEntry);
    expect(result).toEqual({ remove: undefined, newValue: [{ collectionId: 9 }] });
  });

  it('appends a saved collection to remove', () => {
    const result = toggleRelation(undefined, toggled, new Set([5]), buildEntry);
    expect(result).toEqual({ remove: [5], newValue: undefined });
  });

  it('un-removes a pending removal and returns undefined when nothing remains', () => {
    const current = { remove: [5] };
    expect(toggleRelation(current, toggled, new Set([5]), buildEntry)).toBeUndefined();
  });

  it('keeps other pending removals when un-removing one', () => {
    const current = { remove: [5, 7] };
    const result = toggleRelation(current, toggled, new Set([5, 7]), buildEntry);
    expect(result).toEqual({ remove: [7], newValue: undefined });
  });

  it('preserves unrelated keys such as prev', () => {
    const prev = [{ collectionId: 1 }];
    const result = toggleRelation({ prev }, toggled, new Set([5]), buildEntry);
    expect(result).toEqual({ prev, remove: [5], newValue: undefined });
  });

  it('does not mutate the current update', () => {
    const current = { remove: [7], newValue: [{ collectionId: 9 }] };
    toggleRelation(current, toggled, new Set([5]), buildEntry);
    expect(current).toEqual({ remove: [7], newValue: [{ collectionId: 9 }] });
  });
});
