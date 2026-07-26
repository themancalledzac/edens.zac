import { act, renderHook, waitFor } from '@testing-library/react';

import { useCollectionEdit } from '@/app/components/ContentCollection/edit/useCollectionEdit';
import {
  getCollectionUpdateMetadata,
  getMetadata,
  reorderCollectionContent,
  updateCollection,
  updateCollectionRating,
} from '@/app/lib/api/collections';
import { createImages, updateGif } from '@/app/lib/api/content';
import { collectionStorage } from '@/app/lib/storage/collectionStorage';
import {
  type CollectionListModel,
  type CollectionModel,
  CollectionType,
  type CollectionUpdateResponseDTO,
  type GeneralMetadataDTO,
} from '@/app/types/Collection';
import { CollectionVisibility } from '@/app/types/CollectionVisibility';
import {
  type AnyContentModel,
  type ContentGifModel,
  type ContentImageModel,
} from '@/app/types/Content';

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
const mockReorderCollectionContent = reorderCollectionContent as jest.MockedFunction<
  typeof reorderCollectionContent
>;
const mockGetMetadata = getMetadata as jest.MockedFunction<typeof getMetadata>;
const mockUpdateCollectionRating = updateCollectionRating as jest.MockedFunction<
  typeof updateCollectionRating
>;
const mockStorageGetFull = collectionStorage.getFull as jest.MockedFunction<
  typeof collectionStorage.getFull
>;
const mockCreateImages = createImages as jest.MockedFunction<typeof createImages>;
const mockUpdateGif = updateGif as jest.MockedFunction<typeof updateGif>;

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
    isClient: false,
    isBlog: false,
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

/** Mirrors tests/utils/contentFilter.test.ts's makeImage fixture. */
function makeContentImage(overrides: Partial<ContentImageModel> = {}): ContentImageModel {
  return {
    id: 1,
    contentType: 'IMAGE',
    orderIndex: 0,
    imageUrl: 'https://example.com/test.jpg',
    imageWidth: 1600,
    imageHeight: 1067,
    locations: [],
    ...overrides,
  };
}

/** Mirrors tests/utils/contentFilter.test.ts's makeGif fixture. */
function makeContentGif(overrides: Partial<ContentGifModel> = {}): ContentGifModel {
  return {
    id: 200,
    contentType: 'GIF',
    orderIndex: 0,
    gifUrl: 'https://example.com/test.gif',
    ...overrides,
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

    it('exitToBrowse() cancels an active reorder session (Escape no-op fix)', () => {
      const { result } = renderEdit({ enabled: false });
      act(() => result.current.enterReorder());
      expect(result.current.manageMode).toBe('reorder');
      expect(result.current.reorder.active).toBe(true);

      act(() => result.current.exitToBrowse());

      expect(result.current.manageMode).toBe('browse');
      expect(result.current.reorder.active).toBe(false);
    });

    it('disabled→enabled transition does not resurrect a stale reorder session', () => {
      const collection = makeCollection();
      const { result, rerender } = renderHook(
        ({ enabled }: { enabled: boolean }) =>
          useCollectionEdit({ collection, slug: collection.slug, enabled }),
        { initialProps: { enabled: true } }
      );

      // Enter reorder while enabled
      act(() => result.current.enterReorder());
      expect(result.current.manageMode).toBe('reorder');

      // Disable the hook (simulates leaving ?manage=1)
      rerender({ enabled: false });

      // Re-enable (simulates returning to ?manage=1)
      rerender({ enabled: true });

      // Session must NOT have been resurrected
      expect(result.current.manageMode).toBe('browse');
      expect(result.current.reorder.active).toBe(false);
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

    it('browse keeps Reorder enabled for CHRONOLOGICAL displayMode (auto-converts on click)', () => {
      const { result } = renderEdit({
        enabled: false,
        collection: makeCollection({ displayMode: 'CHRONOLOGICAL' }),
      });
      const reorderCell = result.current.bottomBarCells.find(c => c.label === 'Reorder');
      expect(reorderCell?.disabled).toBe(false);
    });

    it('clicking Reorder on a CHRONOLOGICAL collection saves displayMode ORDERED, then enters reorder', async () => {
      mockGetCollectionUpdateMetadata.mockResolvedValue(
        makeResponse({ displayMode: 'CHRONOLOGICAL' })
      );
      const { result } = renderEdit({
        collection: makeCollection({ displayMode: 'CHRONOLOGICAL' }),
      });
      await waitFor(() => expect(result.current.currentState).not.toBeNull());

      const reorderCell = result.current.bottomBarCells.find(c => c.key === 'reorder');
      await act(async () => {
        reorderCell?.onClick?.();
      });

      expect(mockUpdateCollection).toHaveBeenCalledWith(
        42,
        expect.objectContaining({ displayMode: 'ORDERED' })
      );
      await waitFor(() => expect(result.current.manageMode).toBe('reorder'));
      expect(result.current.reorder.active).toBe(true);
    });

    it('enterReorder on a non-empty CHRONOLOGICAL collection materializes the full captureDate order (WRITE A) before switching to ORDERED (WRITE B), then seeds reorder from it', async () => {
      // captureDate order (asc) differs from array order: img2 (01-01) < img1 (01-05).
      // The undated gif is not dateable, so it keeps its own slot (index 2).
      const content: AnyContentModel[] = [
        makeContentImage({ id: 1, captureDate: '2024-01-05', createdAt: '2024-06-01' }),
        makeContentImage({ id: 2, captureDate: '2024-01-01', createdAt: '2024-06-02' }),
        makeContentGif({ id: 3, createdAt: '2024-06-03' }),
      ];
      mockGetCollectionUpdateMetadata.mockResolvedValue(
        makeResponse({ displayMode: 'CHRONOLOGICAL', content })
      );
      mockReorderCollectionContent.mockResolvedValue(makeCollection({ content }));
      mockUpdateCollection.mockResolvedValue(makeResponse({ displayMode: 'ORDERED', content }));

      const { result } = renderEdit({
        collection: makeCollection({ displayMode: 'CHRONOLOGICAL', content }),
      });
      await waitFor(() => expect(result.current.currentState).not.toBeNull());

      const reorderCell = result.current.bottomBarCells.find(c => c.key === 'reorder');
      await act(async () => {
        reorderCell?.onClick?.();
      });

      // WRITE A: the full chronological order (not a diff) is sent to reorderCollectionContent.
      expect(mockReorderCollectionContent).toHaveBeenCalledWith(42, [
        { contentId: 2, newOrderIndex: 0 },
        { contentId: 1, newOrderIndex: 1 },
        { contentId: 3, newOrderIndex: 2 },
      ]);
      // WRITE B: the displayMode switch.
      expect(mockUpdateCollection).toHaveBeenCalledWith(
        42,
        expect.objectContaining({ displayMode: 'ORDERED' })
      );

      // WRITE A happens strictly before WRITE B.
      const reorderCallOrder = mockReorderCollectionContent.mock.invocationCallOrder[0]!;
      const updateCallOrder = mockUpdateCollection.mock.invocationCallOrder[0]!;
      expect(reorderCallOrder).toBeLessThan(updateCallOrder);

      // The reorder session is seeded from the materialized chronological order, not the
      // (now-stale) upload-order processedContent.
      await waitFor(() => expect(result.current.manageMode).toBe('reorder'));
      expect(result.current.reorder.active).toBe(true);
      expect(result.current.reorder.displayOrder).toEqual([2, 1, 3]);
    });

    it('enterReorder on CHRONOLOGICAL does not switch to ORDERED when WRITE A (the materialization write) fails', async () => {
      const content: AnyContentModel[] = [
        makeContentImage({ id: 1, captureDate: '2024-01-01' }),
        makeContentImage({ id: 2, captureDate: '2024-01-02' }),
      ];
      mockGetCollectionUpdateMetadata.mockResolvedValue(
        makeResponse({ displayMode: 'CHRONOLOGICAL', content })
      );
      mockReorderCollectionContent.mockRejectedValue(new Error('reorder failed'));

      const { result } = renderEdit({
        collection: makeCollection({ displayMode: 'CHRONOLOGICAL', content }),
      });
      await waitFor(() => expect(result.current.currentState).not.toBeNull());

      const reorderCell = result.current.bottomBarCells.find(c => c.key === 'reorder');
      await act(async () => {
        reorderCell?.onClick?.();
      });

      expect(mockReorderCollectionContent).toHaveBeenCalled();
      expect(mockUpdateCollection).not.toHaveBeenCalled();
      expect(result.current.error).toMatch(/reorder failed/i);
      expect(result.current.manageMode).toBe('browse');
      expect(result.current.reorder.active).toBe(false);
    });

    it('enterReorder on CHRONOLOGICAL surfaces an error when the admin DTO never loaded', async () => {
      // Failed admin load: the fetch settles null, cells re-enable, currentState stays null.
      mockGetCollectionUpdateMetadata.mockResolvedValue(null);
      const { result } = renderEdit({
        collection: makeCollection({ displayMode: 'CHRONOLOGICAL' }),
      });
      await flushEffects();
      expect(result.current.currentState).toBeNull();
      expect(result.current.isLoadingState).toBe(false);

      // Dismiss the load error so the assertion below can only see enterReorder's own error.
      act(() => result.current.clearError());

      act(() => result.current.enterReorder());

      expect(mockUpdateCollection).not.toHaveBeenCalled();
      expect(result.current.error).toMatch(/not loaded/i);
      expect(result.current.manageMode).toBe('browse');
    });

    it('browse cells (Select/Reorder/Add/Edit) are disabled while an inline save is in flight', async () => {
      const { result } = renderEdit({ enabled: true });
      await waitFor(() => expect(result.current.currentState).not.toBeNull());

      // Hold the save open so `saving` stays true.
      let resolveSave!: (value: CollectionUpdateResponseDTO | null) => void;
      mockUpdateCollection.mockReturnValue(
        new Promise<CollectionUpdateResponseDTO | null>(resolve => {
          resolveSave = resolve;
        })
      );

      let savePromise!: Promise<void>;
      act(() => {
        savePromise = result.current.handleUpdate({ title: 'Inline Save' });
      });
      expect(result.current.saving).toBe(true);

      // Mid-save, every mode-mutating browse cell is disabled (Reorder would fire a SECOND
      // concurrent updateCollection via the auto-convert and race the in-flight response).
      const byKey = (key: string) => result.current.bottomBarCells.find(c => c.key === key);
      expect(byKey('select')?.disabled).toBe(true);
      expect(byKey('reorder')?.disabled).toBe(true);
      expect(byKey('add')?.disabled).toBe(true);
      expect(byKey('edit')?.disabled).toBe(true);

      await act(async () => {
        resolveSave(makeResponse());
        await savePromise;
      });

      expect(result.current.saving).toBe(false);
      expect(byKey('reorder')?.disabled).toBe(false);
      await flushEffects();
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

    it('browse Add cell shows "Uploading…" and is disabled while operationLoading is true', async () => {
      // Arrange: hold createImages open so operationLoading stays true
      let resolveUpload!: () => void;
      const uploadPromise = new Promise<void>(resolve => {
        resolveUpload = resolve;
      });
      mockCreateImages.mockReturnValue(uploadPromise as unknown as ReturnType<typeof createImages>);
      // refreshCollectionAfterOperation calls getCollectionUpdateMetadata after the inner fn
      mockGetCollectionUpdateMetadata.mockResolvedValue(makeResponse());

      const { result } = renderEdit({ enabled: false });

      // Enter add mode to access the upload cell's onFiles callback
      act(() => result.current.enterAdd());

      const uploadCell = result.current.bottomBarCells.find(c => c.key === 'upload');
      expect(uploadCell?.fileInput).toBeDefined();

      // Build a minimal FileList-like object
      const file = new File(['x'], 'img.jpg', { type: 'image/jpeg' });
      const files = {
        0: file,
        length: 1,
        item: (i: number) => (i === 0 ? file : null),
      } as unknown as FileList;

      // Fire the upload — operationLoading goes true; add mode exits and we land in browse
      act(() => {
        uploadCell!.fileInput!.onFiles(files);
      });

      // While in flight the browse Add cell should be labelled 'Uploading…' and disabled
      const addCell = result.current.bottomBarCells.find(c => c.key === 'add');
      expect(addCell?.label).toBe('Uploading…');
      expect(addCell?.disabled).toBe(true);

      // Resolve upload and verify label returns to 'Add'
      await act(async () => {
        resolveUpload();
        await uploadPromise;
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const addCellAfter = result.current.bottomBarCells.find(c => c.key === 'add');
      expect(addCellAfter?.label).toBe('Add');
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

  describe('isParent gating (derived from child-collection content)', () => {
    it('is true for a collection containing child-collection refs (and false without them)', () => {
      const leaf = renderEdit({ enabled: false });
      expect(leaf.result.current.isParent).toBe(false);

      const parent = renderEdit({
        enabled: false,
        collection: makeCollection({
          content: [
            {
              id: 900,
              contentType: 'COLLECTION',
              orderIndex: 0,
              slug: 'child-gallery',
              referencedCollectionId: 901,
            },
          ],
        }),
      });
      expect(parent.result.current.isParent).toBe(true);
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

    it('surfaces a failure via error and rethrows so the caller skips its optimistic commit', async () => {
      mockUpdateCollectionRating.mockRejectedValueOnce(new Error('boom'));
      const { result } = renderEdit({ enabled: false });

      await act(async () => {
        await expect(result.current.updateCollectionRating(700, 4)).rejects.toThrow('boom');
      });

      expect(result.current.error).not.toBeNull();
    });
  });

  describe('updateData seeding', () => {
    it('seeds collectionEndDate from the collection, not from collectionDate', async () => {
      const { result } = renderEdit({
        enabled: false,
        collection: makeCollection({
          collectionDate: '2026-03-03',
          collectionEndDate: '2026-03-07',
        }),
      });

      expect(result.current.updateData.collectionDate).toBe('2026-03-03');
      expect(result.current.updateData.collectionEndDate).toBe('2026-03-07');
    });

    it("seeds collectionEndDate as '' when the collection has no end date", () => {
      const { result } = renderEdit({
        enabled: false,
        collection: makeCollection({ collectionEndDate: undefined }),
      });

      expect(result.current.updateData.collectionEndDate).toBe('');
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

  describe('clearError', () => {
    it('clears the error state when called after a failed fetch', async () => {
      mockGetCollectionUpdateMetadata.mockRejectedValue(new Error('Network error'));
      const { result } = renderEdit({ enabled: true });
      await flushEffects();
      expect(result.current.error).toBe('Network error');
      act(() => result.current.clearError());
      expect(result.current.error).toBeNull();
    });
  });

  describe('admin DTO readiness', () => {
    /** Metadata calls that never settle — models the cold-load window without act() noise. */
    const mockPendingFetches = () => {
      mockGetCollectionUpdateMetadata.mockReturnValue(
        new Promise<CollectionUpdateResponseDTO | null>(() => {})
      );
      mockGetMetadata.mockReturnValue(new Promise<GeneralMetadataDTO | null>(() => {}));
    };

    it('sets an error and keeps currentState null when the metadata fetch resolves null', async () => {
      mockGetCollectionUpdateMetadata.mockResolvedValue(null);
      const { result } = renderEdit({ enabled: true });
      await flushEffects();

      expect(result.current.currentState).toBeNull();
      expect(result.current.isLoadingState).toBe(false);
      expect(result.current.error).toMatch(/failed to load collection data/i);
    });

    it('disables the browse cells (Select/Reorder/Add/Edit) while the fetch is in flight', () => {
      mockPendingFetches();
      const { result } = renderEdit({ enabled: true });

      const byKey = (key: string) => result.current.bottomBarCells.find(c => c.key === key);
      expect(result.current.isLoadingState).toBe(true);
      expect(byKey('select')?.disabled).toBe(true);
      expect(byKey('reorder')?.disabled).toBe(true);
      expect(byKey('add')?.disabled).toBe(true);
      expect(byKey('edit')?.disabled).toBe(true);
    });

    it('keeps the browse Cancel (exit manage) enabled while the fetch is in flight', () => {
      mockPendingFetches();
      const { result } = renderEdit({ enabled: true, onExitManage: jest.fn() });

      const cancel = result.current.bottomBarCells.find(c => c.key === 'cancel');
      expect(cancel).toBeDefined();
      expect(cancel?.disabled).toBeUndefined();
    });

    it('handleUpdate before the DTO loads surfaces an error instead of silently dropping', async () => {
      mockPendingFetches();
      const { result } = renderEdit({ enabled: true });

      await act(async () => {
        await result.current.handleUpdate({ title: 'Typed Early' });
      });

      expect(mockUpdateCollection).not.toHaveBeenCalled();
      expect(result.current.error).toMatch(/not saved/i);
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

  describe('capture-date pick mode', () => {
    const GIF_ID = 300;
    const datedContent: AnyContentModel[] = [
      makeContentImage({ id: 1, captureDate: '2024-06-14T00:00:00Z' }),
      makeContentImage({ id: 2, captureDate: null }),
      makeContentGif({ id: GIF_ID }),
    ];

    async function armPick() {
      mockGetCollectionUpdateMetadata.mockResolvedValue(makeResponse({ content: datedContent }));
      const { result } = renderEdit({ collection: makeCollection({ content: datedContent }) });
      await waitFor(() => expect(result.current.currentState).not.toBeNull());

      // Open the metadata sheet on the GIF, then hand off to the grid.
      act(() => result.current.handleImageClick(GIF_ID));
      expect(result.current.editingContent?.id).toBe(GIF_ID);
      act(() => result.current.startCaptureDatePick());
      return result;
    }

    it('startCaptureDatePick() closes the sheet and enters pick-date with a Cancel-only bar', async () => {
      const result = await armPick();

      expect(result.current.manageMode).toBe('pick-date');
      expect(result.current.editingContent).toBeNull();
      expect(result.current.bottomBarCells.map(c => c.key)).toEqual(['cancel']);
    });

    it('startCaptureDatePick() is a no-op while the editor is closed or open on an image', async () => {
      mockGetCollectionUpdateMetadata.mockResolvedValue(makeResponse({ content: datedContent }));
      const { result } = renderEdit({ collection: makeCollection({ content: datedContent }) });
      await waitFor(() => expect(result.current.currentState).not.toBeNull());

      act(() => result.current.startCaptureDatePick());
      expect(result.current.manageMode).toBe('browse');

      act(() => result.current.handleImageClick(1));
      expect(result.current.editingContent?.id).toBe(1);
      act(() => result.current.startCaptureDatePick());
      expect(result.current.manageMode).toBe('browse');
    });

    it('clicking a dated image patches the GIF with that captureDate and returns to browse', async () => {
      const result = await armPick();

      await act(async () => {
        result.current.handleImageClick(1);
      });

      expect(mockUpdateGif).toHaveBeenCalledWith(GIF_ID, { captureDate: '2024-06-14T00:00:00Z' });
      await waitFor(() => expect(result.current.manageMode).toBe('browse'));
      expect(result.current.error).toBeNull();
    });

    it('clicking an undated block errors and stays in pick-date so another can be chosen', async () => {
      const result = await armPick();

      await act(async () => {
        result.current.handleImageClick(2);
      });

      expect(mockUpdateGif).not.toHaveBeenCalled();
      expect(result.current.error).toMatch(/no capture date/i);
      expect(result.current.manageMode).toBe('pick-date');

      // A second click on a valid source still commits.
      await act(async () => {
        result.current.handleImageClick(1);
      });
      expect(mockUpdateGif).toHaveBeenCalledWith(GIF_ID, { captureDate: '2024-06-14T00:00:00Z' });
    });

    it('a grid click in pick-date never opens the metadata editor', async () => {
      const result = await armPick();

      await act(async () => {
        result.current.handleImageClick(1);
      });

      expect(result.current.editingContent).toBeNull();
    });

    it('exitToBrowse() cancels the pick without patching', async () => {
      const result = await armPick();

      act(() => result.current.exitToBrowse());

      expect(result.current.manageMode).toBe('browse');
      expect(mockUpdateGif).not.toHaveBeenCalled();
    });
  });
});
