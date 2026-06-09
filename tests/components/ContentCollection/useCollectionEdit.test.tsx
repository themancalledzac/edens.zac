import { act, renderHook, waitFor } from '@testing-library/react';

import { useCollectionEdit } from '@/app/components/ContentCollection/edit/useCollectionEdit';
import {
  getCollectionUpdateMetadata,
  getMetadata,
  updateCollection,
  updateCollectionRating,
} from '@/app/lib/api/collections';
import { collectionStorage } from '@/app/lib/storage/collectionStorage';
import {
  type CollectionListModel,
  type CollectionModel,
  CollectionType,
  type CollectionUpdateResponseDTO,
  type GeneralMetadataDTO,
} from '@/app/types/Collection';
import { CollectionVisibility } from '@/app/types/CollectionVisibility';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
}));

jest.mock('@/app/lib/api/collections');
jest.mock('@/app/lib/api/content');
jest.mock('@/app/lib/storage/collectionStorage');

jest.mock('@/app/utils/contentLayout', () => ({
  processContentBlocks: (content: unknown[]) => content,
}));

const mockGetCollectionUpdateMetadata = getCollectionUpdateMetadata as jest.MockedFunction<
  typeof getCollectionUpdateMetadata
>;
const mockUpdateCollection = updateCollection as jest.MockedFunction<typeof updateCollection>;
const mockGetMetadata = getMetadata as jest.MockedFunction<typeof getMetadata>;
const mockUpdateCollectionRating = updateCollectionRating as jest.MockedFunction<
  typeof updateCollectionRating
>;
const mockStorageGetFull = collectionStorage.getFull as jest.MockedFunction<
  typeof collectionStorage.getFull
>;

function makeMetadata(overrides: Partial<GeneralMetadataDTO> = {}): GeneralMetadataDTO {
  return {
    tags: [],
    people: [],
    locations: [],
    cameras: [],
    lenses: [],
    filmTypes: [],
    filmFormats: [],
    collections: [],
    ...overrides,
  };
}

function makeListModel(overrides: Partial<CollectionListModel> = {}): CollectionListModel {
  return {
    id: 7,
    name: 'Sibling Collection',
    slug: 'sibling-collection',
    type: CollectionType.PORTFOLIO,
    ...overrides,
  };
}

function makeCollection(overrides: Partial<CollectionModel> = {}): CollectionModel {
  return {
    id: 42,
    slug: 'smith-wedding',
    title: 'Smith Wedding',
    description: 'A description',
    type: CollectionType.PORTFOLIO,
    locations: [],
    visibility: CollectionVisibility.LISTED,
    displayMode: 'ORDERED',
    collectionDate: '2026-01-01',
    rowsWide: 4,
    content: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeResponse(overrides: Partial<CollectionModel> = {}): CollectionUpdateResponseDTO {
  return {
    collection: makeCollection(overrides),
    tags: [],
    people: [],
    locations: [],
    cameras: [],
    lenses: [],
    filmTypes: [],
    filmFormats: [],
    collections: [],
  };
}

function makeResponseWith(
  collectionOverrides: Partial<CollectionModel>,
  metadata: Partial<CollectionUpdateResponseDTO>
): CollectionUpdateResponseDTO {
  return {
    ...makeResponse(collectionOverrides),
    ...metadata,
  };
}

function renderEdit(
  opts: { enabled?: boolean; collection?: CollectionModel; onExitManage?: () => void } = {}
) {
  const collection = opts.collection ?? makeCollection();
  return renderHook(() =>
    useCollectionEdit({
      collection,
      slug: collection.slug,
      enabled: opts.enabled ?? true,
      onExitManage: opts.onExitManage,
    })
  );
}

async function flushEffects() {
  // drain the data-load + getMetadata promise chains inside act
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });
}

describe('useCollectionEdit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorageGetFull.mockReturnValue(null);
    mockGetCollectionUpdateMetadata.mockResolvedValue(makeResponse());
    mockUpdateCollection.mockResolvedValue(makeResponse());
    mockGetMetadata.mockResolvedValue(makeMetadata());
    mockUpdateCollectionRating.mockResolvedValue();
  });

  describe('mode transitions', () => {
    it('starts in browse mode', () => {
      const { result } = renderEdit({ enabled: false });
      expect(result.current.manageMode).toBe('browse');
    });

    it('enterEdit() → edit', () => {
      const { result } = renderEdit({ enabled: false });
      act(() => result.current.enterEdit());
      expect(result.current.manageMode).toBe('edit');
    });

    it('enterSelect() → select', () => {
      const { result } = renderEdit({ enabled: false });
      act(() => result.current.enterSelect());
      expect(result.current.manageMode).toBe('select');
    });

    it('enterAdd() → add', () => {
      const { result } = renderEdit({ enabled: false });
      act(() => result.current.enterAdd());
      expect(result.current.manageMode).toBe('add');
    });

    it('exitToBrowse() → browse', () => {
      const { result } = renderEdit({ enabled: false });
      act(() => result.current.enterEdit());
      expect(result.current.manageMode).toBe('edit');
      act(() => result.current.exitToBrowse());
      expect(result.current.manageMode).toBe('browse');
    });
  });

  describe('isUpdateDirty', () => {
    it('is false until a field changes, then true', () => {
      const { result } = renderEdit({ enabled: false });
      expect(result.current.isUpdateDirty).toBe(false);

      act(() => result.current.setUpdateField('title', 'New Title'));
      expect(result.current.isUpdateDirty).toBe(true);
    });
  });

  describe('bottomBarTabs', () => {
    it('is undefined outside edit mode', () => {
      const { result } = renderEdit({ enabled: false });
      expect(result.current.bottomBarTabs).toBeUndefined();
    });

    it('is [info, structure] in edit mode', () => {
      const { result } = renderEdit({ enabled: false });
      act(() => result.current.enterEdit());
      expect(result.current.bottomBarTabs).toEqual([
        { id: 'info', label: 'Info' },
        { id: 'structure', label: 'Structure' },
      ]);
    });
  });

  describe('bottomBarCells', () => {
    it('browse contains Select / Reorder / Add / Edit', () => {
      const { result } = renderEdit({ enabled: false });
      const labels = result.current.bottomBarCells.map(c => c.label);
      expect(labels).toEqual(['Select', 'Reorder', 'Add', 'Edit']);
    });

    it('browse hides Add for parent-type collections', () => {
      const { result } = renderEdit({
        enabled: false,
        collection: makeCollection({ type: CollectionType.PARENT }),
      });
      const labels = result.current.bottomBarCells.map(c => c.label);
      expect(labels).toEqual(['Select', 'Reorder', 'Edit']);
    });

    it('browse disables Reorder for CHRONOLOGICAL displayMode', () => {
      const { result } = renderEdit({
        enabled: false,
        collection: makeCollection({ displayMode: 'CHRONOLOGICAL' }),
      });
      const reorderCell = result.current.bottomBarCells.find(c => c.label === 'Reorder');
      expect(reorderCell?.disabled).toBe(true);
    });

    it('browse has no Cancel cell when onExitManage is absent', () => {
      const { result } = renderEdit({ enabled: false });
      const cancel = result.current.bottomBarCells.find(c => c.key === 'cancel');
      expect(cancel).toBeUndefined();
    });

    it('browse appends a rightmost Cancel cell that calls onExitManage when provided', () => {
      const onExitManage = jest.fn();
      const { result } = renderEdit({ enabled: false, onExitManage });

      const labels = result.current.bottomBarCells.map(c => c.label);
      expect(labels).toEqual(['Select', 'Reorder', 'Add', 'Edit', 'Cancel']);

      const cancel = result.current.bottomBarCells.find(c => c.key === 'cancel');
      expect(cancel).toBeDefined();
      cancel?.onClick?.();
      expect(onExitManage).toHaveBeenCalledTimes(1);
    });

    it('select Cancel returns to browse and does NOT exit manage', () => {
      const onExitManage = jest.fn();
      const { result } = renderEdit({ enabled: false, onExitManage });

      act(() => result.current.enterSelect());
      const cancel = result.current.bottomBarCells.find(c => c.key === 'cancel');
      expect(cancel).toBeDefined();
      act(() => cancel?.onClick?.());
      expect(onExitManage).not.toHaveBeenCalled();
      expect(result.current.manageMode).toBe('browse');
    });

    it('reorder commit cell is a primary "Save" (second-from-right), then Cancel', () => {
      const { result } = renderEdit({ enabled: false });
      act(() => result.current.enterReorder());
      const labels = result.current.bottomBarCells.map(c => c.label);
      expect(labels).toEqual(['Save', 'Cancel']);
      expect(result.current.bottomBarCells.find(c => c.key === 'save')?.variant).toBe('primary');
    });

    it('select locks the right slots: … Remove · Edit · Cancel', () => {
      const { result } = renderEdit({ enabled: false });
      act(() => result.current.enterSelect());
      const cells = result.current.bottomBarCells;
      expect(cells.map(c => c.label).slice(-3)).toEqual(['Remove', 'Edit', 'Cancel']);
      expect(cells[cells.length - 1]?.key).toBe('cancel');
      expect(cells[cells.length - 2]?.key).toBe('edit');
      expect(cells[cells.length - 2]?.variant).toBe('primary');
      expect(cells[cells.length - 3]?.key).toBe('remove');
    });

    it('edit contains a primary Save (disabled when not dirty) + a rightmost Cancel', () => {
      const { result } = renderEdit({ enabled: false });
      act(() => result.current.enterEdit());

      const cells = result.current.bottomBarCells;
      const save = cells.find(c => c.key === 'save');
      const cancel = cells.find(c => c.key === 'cancel');

      expect(save).toBeDefined();
      expect(save?.label).toBe('Save');
      expect(save?.disabled).toBe(true); // not dirty yet
      expect(cancel).toBeDefined();
      expect(cancel?.label).toBe('Cancel');
      expect(cells[cells.length - 1]).toBe(cancel); // always the rightmost cell
    });

    it('edit Save becomes primary + enabled once a field changes', () => {
      const { result } = renderEdit({ enabled: false });
      act(() => result.current.enterEdit());
      act(() => result.current.setUpdateField('title', 'Changed'));

      const save = result.current.bottomBarCells.find(c => c.key === 'save');
      expect(save?.variant).toBe('primary');
      expect(save?.disabled).toBe(false);
    });
  });

  describe('enabled flag', () => {
    it('does not fetch and keeps currentState null when disabled', async () => {
      const { result } = renderEdit({ enabled: false });

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockGetCollectionUpdateMetadata).not.toHaveBeenCalled();
      expect(mockStorageGetFull).not.toHaveBeenCalled();
      expect(mockGetMetadata).not.toHaveBeenCalled();
      expect(result.current.currentState).toBeNull();
      expect(result.current.isLoadingState).toBe(false);
      expect(result.current.allCollections).toEqual([]);
    });

    it('performs the cache-first metadata fetch when enabled', async () => {
      const { result } = renderEdit({ enabled: true });

      await waitFor(() => {
        expect(result.current.currentState).not.toBeNull();
      });

      expect(mockStorageGetFull).toHaveBeenCalledWith('smith-wedding');
      expect(mockGetCollectionUpdateMetadata).toHaveBeenCalledWith('smith-wedding');
      expect(result.current.isLoadingState).toBe(false);
      await flushEffects();
    });

    it('uses cached full response and skips the API on cache hit', async () => {
      mockStorageGetFull.mockReturnValue(makeResponse());
      const { result } = renderEdit({ enabled: true });

      await waitFor(() => {
        expect(result.current.currentState).not.toBeNull();
      });

      expect(mockStorageGetFull).toHaveBeenCalledWith('smith-wedding');
      expect(mockGetCollectionUpdateMetadata).not.toHaveBeenCalled();
      await flushEffects();
    });

    it('populates allCollections from getMetadata when enabled', async () => {
      const options = [makeListModel({ id: 7 }), makeListModel({ id: 8, name: 'Other' })];
      mockGetMetadata.mockResolvedValue(makeMetadata({ collections: options }));
      const { result } = renderEdit({ enabled: true });

      await waitFor(() => {
        expect(result.current.allCollections).toHaveLength(2);
      });
      expect(mockGetMetadata).toHaveBeenCalledTimes(1);
      expect(result.current.allCollections.map(c => c.id)).toEqual([7, 8]);
      await flushEffects();
    });
  });

  describe('locations field wiring', () => {
    it('derives currentLocations from collection + updateData diff', async () => {
      mockGetCollectionUpdateMetadata.mockResolvedValue(
        makeResponseWith(
          { locations: [{ id: 5, name: 'Paris', slug: 'paris' }] },
          {
            locations: [
              { id: 5, name: 'Paris', slug: 'paris' },
              { id: 9, name: 'Lyon', slug: 'lyon' },
            ],
          }
        )
      );
      const collection = makeCollection({
        locations: [{ id: 5, name: 'Paris', slug: 'paris' }],
      });
      const { result } = renderEdit({ enabled: true, collection });

      await waitFor(() => {
        expect(result.current.currentState).not.toBeNull();
      });

      expect(result.current.currentLocations).toEqual([{ id: 5, name: 'Paris', slug: 'paris' }]);

      act(() =>
        result.current.handleLocationsChange([
          { id: 5, name: 'Paris', slug: 'paris' },
          { id: 9, name: 'Lyon', slug: 'lyon' },
        ])
      );
      expect(result.current.currentLocations.map(l => l.id)).toEqual([5, 9]);
      expect(result.current.updateData.locations?.prev).toEqual([5, 9]);
      await flushEffects();
    });

    it('emits remove when a saved location is deselected', async () => {
      mockGetCollectionUpdateMetadata.mockResolvedValue(
        makeResponseWith(
          { locations: [{ id: 5, name: 'Paris', slug: 'paris' }] },
          { locations: [{ id: 5, name: 'Paris', slug: 'paris' }] }
        )
      );
      const collection = makeCollection({
        locations: [{ id: 5, name: 'Paris', slug: 'paris' }],
      });
      const { result } = renderEdit({ enabled: true, collection });

      await waitFor(() => expect(result.current.currentState).not.toBeNull());

      act(() => result.current.handleLocationsChange([]));
      expect(result.current.updateData.locations?.remove).toEqual([5]);
      expect(result.current.currentLocations).toEqual([]);
      await flushEffects();
    });
  });

  describe('tags field wiring', () => {
    it('derives currentTags from collection + updateData diff', async () => {
      mockGetCollectionUpdateMetadata.mockResolvedValue(
        makeResponseWith(
          { tags: ['film'] },
          {
            tags: [
              { id: 3, name: 'film', slug: 'film' },
              { id: 4, name: 'bw', slug: 'bw' },
            ],
          }
        )
      );
      const collection = makeCollection({ tags: ['film'] });
      const { result } = renderEdit({ enabled: true, collection });

      await waitFor(() => expect(result.current.currentState).not.toBeNull());

      expect(result.current.currentTags).toEqual([{ id: 3, name: 'film', slug: 'film' }]);

      act(() =>
        result.current.handleTagsChange([
          { id: 3, name: 'film', slug: 'film' },
          { id: 4, name: 'bw', slug: 'bw' },
        ])
      );
      expect(result.current.currentTags.map(t => t.id)).toEqual([3, 4]);
      expect(result.current.updateData.tags?.prev).toEqual([3, 4]);
      await flushEffects();
    });
  });

  describe('collection selectors (child / sibling / parent toggles)', () => {
    it('child toggle: adding an unsaved collection stages it in pendingAdd', () => {
      const { result } = renderEdit({ enabled: false });

      expect(result.current.childIds.saved.size).toBe(0);
      act(() => result.current.handleChildToggle(makeListModel({ id: 7 })));
      expect(result.current.childIds.pendingAdd.has(7)).toBe(true);
    });

    it('child toggle: removing a saved (contained) collection stages it in pendingRemove', () => {
      const collection = makeCollection({
        content: [
          {
            id: 100,
            contentType: 'COLLECTION',
            orderIndex: 0,
            slug: 'child-7',
            collectionType: CollectionType.PORTFOLIO,
            referencedCollectionId: 7,
          },
        ],
      });
      const { result } = renderEdit({ enabled: false, collection });

      expect(result.current.childIds.saved.has(7)).toBe(true);
      act(() => result.current.handleChildToggle(makeListModel({ id: 7 })));
      expect(result.current.childIds.pendingRemove.has(7)).toBe(true);
    });

    it('sibling toggle: stages an unsaved sibling in pendingAdd', () => {
      const { result } = renderEdit({ enabled: false });

      expect(result.current.siblingIds.saved.size).toBe(0);
      act(() => result.current.handleSiblingToggle(makeListModel({ id: 11 })));
      expect(result.current.siblingIds.pendingAdd.has(11)).toBe(true);
    });

    it('parent toggle: stages an unsaved parent in pendingAdd', () => {
      const { result } = renderEdit({ enabled: false });

      expect(result.current.parentIds.saved.size).toBe(0);
      act(() => result.current.handleParentToggle(makeListModel({ id: 12 })));
      expect(result.current.parentIds.pendingAdd.has(12)).toBe(true);
    });

    it('sibling/parent saved sets derive from collection.siblings / collection.parents', () => {
      const collection = makeCollection({
        siblings: [makeListModel({ id: 21, name: 'Sib' })],
        parents: [makeListModel({ id: 31, name: 'Par' })],
      });
      const { result } = renderEdit({ enabled: false, collection });

      expect(result.current.siblingIds.saved.has(21)).toBe(true);
      expect(result.current.parentIds.saved.has(31)).toBe(true);
    });
  });

  describe('isParent gating', () => {
    it('is true for a PARENT-type collection (and false for a PORTFOLIO)', () => {
      const portfolio = renderEdit({ enabled: false });
      expect(portfolio.result.current.isParent).toBe(false);

      const parent = renderEdit({
        enabled: false,
        collection: makeCollection({ type: CollectionType.PARENT }),
      });
      expect(parent.result.current.isParent).toBe(true);
    });

    it('tracks updateData.type live (PORTFOLIO → PARENT flips isParent)', () => {
      const { result } = renderEdit({ enabled: false });
      expect(result.current.isParent).toBe(false);
      act(() => result.current.setUpdateField('type', CollectionType.PARENT));
      expect(result.current.isParent).toBe(true);
    });
  });

  describe('updateCollectionRating', () => {
    it('calls the rating API with the child collection id + rating', async () => {
      const { result } = renderEdit({ enabled: false });

      await act(async () => {
        await result.current.updateCollectionRating(700, 4);
      });

      expect(mockUpdateCollectionRating).toHaveBeenCalledWith(700, 4);
    });
  });

  describe('handleUpdate(patch) — same-tick inline save (C1)', () => {
    it('saves the patched value even when setUpdateField and handleUpdate fire on the same tick', async () => {
      const { result } = renderEdit({ enabled: true });

      await waitFor(() => expect(result.current.currentState).not.toBeNull());

      await act(async () => {
        result.current.setUpdateField('title', 'Typed Title');
        await result.current.handleUpdate({ title: 'Typed Title' });
      });

      expect(mockUpdateCollection).toHaveBeenCalledTimes(1);
      expect(mockUpdateCollection).toHaveBeenCalledWith(
        42,
        expect.objectContaining({ title: 'Typed Title' })
      );
      await flushEffects();
    });

    it('falls back to the committed buffer when no patch is provided', async () => {
      const { result } = renderEdit({ enabled: true });

      await waitFor(() => expect(result.current.currentState).not.toBeNull());

      act(() => result.current.setUpdateField('title', 'Buffered Title'));

      await act(async () => {
        await result.current.handleUpdate();
      });

      expect(mockUpdateCollection).toHaveBeenCalledWith(
        42,
        expect.objectContaining({ title: 'Buffered Title' })
      );
      await flushEffects();
    });
  });

  describe('collection.id change (I2 + I3)', () => {
    it('re-seeds updateData, resets to browse, and clears selectedIds on a new collection id', async () => {
      const collectionA = makeCollection({ id: 42, slug: 'collection-a', title: 'Alpha' });
      const collectionB = makeCollection({ id: 99, slug: 'collection-b', title: 'Beta' });

      const { result, rerender } = renderHook(
        ({ collection }: { collection: CollectionModel }) =>
          useCollectionEdit({ collection, slug: collection.slug, enabled: true }),
        { initialProps: { collection: collectionA } }
      );

      act(() => result.current.enterSelect());
      act(() => result.current.setUpdateField('title', 'Unsaved Edit'));
      expect(result.current.manageMode).toBe('select');
      expect(result.current.updateData.title).toBe('Unsaved Edit');

      rerender({ collection: collectionB });

      expect(result.current.manageMode).toBe('browse');
      expect(result.current.selectedIds).toEqual([]);
      expect(result.current.updateData.id).toBe(99);
      expect(result.current.updateData.title).toBe('Beta');
      await flushEffects();
    });

    it('does NOT wipe unsaved buffer edits when the same collection reference merely updates', async () => {
      const collection = makeCollection({ id: 42, slug: 'collection-a', title: 'Alpha' });

      const { result, rerender } = renderHook(
        ({ collection: c }: { collection: CollectionModel }) =>
          useCollectionEdit({ collection: c, slug: c.slug, enabled: false }),
        { initialProps: { collection } }
      );

      act(() => result.current.setUpdateField('title', 'Unsaved Edit'));
      expect(result.current.updateData.title).toBe('Unsaved Edit');

      rerender({ collection: { ...collection } });

      expect(result.current.updateData.title).toBe('Unsaved Edit');
    });
  });
});
