/**
 * Behavior tests for the useCollectionEdit hook (faithful lift of ManageClient's edit brain).
 *
 * Strategy: render the hook in isolation with renderHook. The collections API and
 * collectionStorage are mocked at the module boundary so no real network/storage happens.
 * processContentBlocks is mocked to a passthrough so layout work doesn't run.
 */

import { act, renderHook, waitFor } from '@testing-library/react';

import { useCollectionEdit } from '@/app/components/ContentCollection/edit/useCollectionEdit';
import { getCollectionUpdateMetadata, updateCollection } from '@/app/lib/api/collections';
import { collectionStorage } from '@/app/lib/storage/collectionStorage';
import {
  type CollectionModel,
  CollectionType,
  type CollectionUpdateResponseDTO,
} from '@/app/types/Collection';
import { CollectionVisibility } from '@/app/types/CollectionVisibility';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
}));

jest.mock('@/app/lib/api/collections');
jest.mock('@/app/lib/api/content');
jest.mock('@/app/lib/storage/collectionStorage');

// Keep layout work out of the hook — return content unchanged.
jest.mock('@/app/utils/contentLayout', () => ({
  processContentBlocks: (content: unknown[]) => content,
}));

const mockGetCollectionUpdateMetadata = getCollectionUpdateMetadata as jest.MockedFunction<
  typeof getCollectionUpdateMetadata
>;
const mockUpdateCollection = updateCollection as jest.MockedFunction<typeof updateCollection>;
const mockStorageGetFull = collectionStorage.getFull as jest.MockedFunction<
  typeof collectionStorage.getFull
>;

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

function renderEdit(opts: { enabled?: boolean; collection?: CollectionModel } = {}) {
  const collection = opts.collection ?? makeCollection();
  return renderHook(() =>
    useCollectionEdit({
      collection,
      slug: collection.slug,
      enabled: opts.enabled ?? true,
    })
  );
}

describe('useCollectionEdit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorageGetFull.mockReturnValue(null);
    mockGetCollectionUpdateMetadata.mockResolvedValue(makeResponse());
    mockUpdateCollection.mockResolvedValue(makeResponse());
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

    it('is [info, tags, structure] in edit mode', () => {
      const { result } = renderEdit({ enabled: false });
      act(() => result.current.enterEdit());
      expect(result.current.bottomBarTabs).toEqual([
        { id: 'info', label: 'Info' },
        { id: 'tags', label: 'Tags' },
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

    it('edit contains a primary Save (disabled when not dirty) + Close', () => {
      const { result } = renderEdit({ enabled: false });
      act(() => result.current.enterEdit());

      const cells = result.current.bottomBarCells;
      const save = cells.find(c => c.key === 'save');
      const close = cells.find(c => c.key === 'close');

      expect(save).toBeDefined();
      expect(save?.label).toBe('Save');
      expect(save?.disabled).toBe(true); // not dirty yet
      expect(close).toBeDefined();
      expect(close?.label).toBe('Close');
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

      // Give any (mistaken) async effects a chance to run.
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockGetCollectionUpdateMetadata).not.toHaveBeenCalled();
      expect(mockStorageGetFull).not.toHaveBeenCalled();
      expect(result.current.currentState).toBeNull();
      expect(result.current.isLoadingState).toBe(false);
    });

    it('performs the cache-first metadata fetch when enabled', async () => {
      const { result } = renderEdit({ enabled: true });

      await waitFor(() => {
        expect(result.current.currentState).not.toBeNull();
      });

      expect(mockStorageGetFull).toHaveBeenCalledWith('smith-wedding');
      expect(mockGetCollectionUpdateMetadata).toHaveBeenCalledWith('smith-wedding');
      expect(result.current.isLoadingState).toBe(false);
    });

    it('uses cached full response and skips the API on cache hit', async () => {
      mockStorageGetFull.mockReturnValue(makeResponse());
      const { result } = renderEdit({ enabled: true });

      await waitFor(() => {
        expect(result.current.currentState).not.toBeNull();
      });

      expect(mockStorageGetFull).toHaveBeenCalledWith('smith-wedding');
      expect(mockGetCollectionUpdateMetadata).not.toHaveBeenCalled();
    });
  });
});
