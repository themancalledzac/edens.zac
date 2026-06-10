/**
 * Focused test for useCollectionEdit's handleBulkRemove path, driven through the
 * hook's select-mode bottom-bar cells.
 *
 * "Remove" must remove the selected images from THIS collection only
 * (non-destructive) — it reuses updateImages with each image's `collections`
 * trimmed of the current collection id. It must NOT call deleteImages (the
 * permanent S3 + DB hard delete), which stays reachable only via the per-image
 * metadata modal's Delete.
 */

import { act, renderHook, waitFor } from '@testing-library/react';

import { useCollectionEdit } from '@/app/components/ContentCollection/edit/useCollectionEdit';
import {
  getCollectionUpdateMetadata,
  getMetadata,
  saveGalleryAccess,
  setCollectionPeople,
  updateCollection,
  updateCollectionRating,
} from '@/app/lib/api/collections';
import { deleteImages, updateImages } from '@/app/lib/api/content';
import { collectionStorage } from '@/app/lib/storage/collectionStorage';
import {
  type CollectionModel,
  CollectionType,
  type CollectionUpdateResponseDTO,
  type GeneralMetadataDTO,
} from '@/app/types/Collection';
import { CollectionVisibility } from '@/app/types/CollectionVisibility';
import { type ContentImageModel } from '@/app/types/Content';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockRouterReplace }),
}));

const mockRouterReplace = jest.fn();

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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mockSaveGalleryAccess = saveGalleryAccess as jest.MockedFunction<typeof saveGalleryAccess>;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mockSetCollectionPeople = setCollectionPeople as jest.MockedFunction<
  typeof setCollectionPeople
>;
const mockUpdateImages = updateImages as jest.MockedFunction<typeof updateImages>;
const mockDeleteImages = deleteImages as jest.MockedFunction<typeof deleteImages>;
const mockStorageGetFull = collectionStorage.getFull as jest.MockedFunction<
  typeof collectionStorage.getFull
>;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mockStorageUpdate = collectionStorage.update as jest.MockedFunction<
  typeof collectionStorage.update
>;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mockStorageUpdateFull = collectionStorage.updateFull as jest.MockedFunction<
  typeof collectionStorage.updateFull
>;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mockStorageUpdateImagesInCache = collectionStorage.updateImagesInCache as jest.MockedFunction<
  typeof collectionStorage.updateImagesInCache
>;

jest.mock('@/app/components/ContentCollection/edit/collectionEditUtils', () => {
  const actual = jest.requireActual(
    '@/app/components/ContentCollection/edit/collectionEditUtils'
  ) as Record<string, unknown>;
  return {
    ...actual,
    revalidateCollectionCache: jest.fn(async () => {}),
    revalidateMetadataCache: jest.fn(async () => {}),
  };
});

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

describe('useCollectionEdit — bulk remove from collection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouterReplace.mockReset();
    mockStorageGetFull.mockReturnValue(null);
    mockGetCollectionUpdateMetadata.mockResolvedValue(makeResponse());
    mockUpdateCollection.mockResolvedValue(makeResponse());
    mockGetMetadata.mockResolvedValue(makeMetadata());
    (
      updateCollectionRating as jest.MockedFunction<typeof updateCollectionRating>
    ).mockResolvedValue();
    mockUpdateImages.mockResolvedValue({ updatedImages: [] });
    jest.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const imageFixtures: ContentImageModel[] = [
    {
      id: 11,
      contentType: 'IMAGE',
      orderIndex: 0,
      imageUrl: 'a.jpg',
      locations: [],
      collections: [{ collectionId: 42, name: 'Smith Wedding', visible: true }],
    } as unknown as ContentImageModel,
    {
      id: 12,
      contentType: 'IMAGE',
      orderIndex: 1,
      imageUrl: 'b.jpg',
      locations: [],
      collections: [{ collectionId: 42, name: 'Smith Wedding', visible: true }],
    } as unknown as ContentImageModel,
  ];

  function collectionWithImages() {
    return makeCollection({
      id: 42,
      content: imageFixtures as never,
    });
  }

  function responseWithImages(): CollectionUpdateResponseDTO {
    return makeResponse({ id: 42, content: imageFixtures as never });
  }

  it('removes selected images from THIS collection via updateImages (non-destructive), never deleteImages', async () => {
    const collection = collectionWithImages();
    // Make getCollectionUpdateMetadata return the collection WITH images so that
    // currentState?.collection (used in bottomBarCells "all" onClick) has them.
    mockGetCollectionUpdateMetadata.mockResolvedValue(responseWithImages());
    const { result } = renderEdit({ enabled: true, collection });
    await waitFor(() => expect(result.current.currentState).not.toBeNull());

    // Enter select mode
    act(() => result.current.enterSelect());

    // Click "All" to select all images
    const all = result.current.bottomBarCells.find(c => c.key === 'all');
    expect(all).toBeDefined();
    act(() => all?.onClick?.());

    // Both images should now be selected
    expect(result.current.selectedIds.sort()).toEqual([11, 12]);

    // Click "Remove" to trigger handleBulkRemove
    const remove = result.current.bottomBarCells.find(c => c.key === 'remove');
    expect(remove).toBeDefined();
    await act(async () => {
      remove?.onClick?.();
      await Promise.resolve();
    });

    // updateImages must be called exactly once
    await waitFor(() => expect(mockUpdateImages).toHaveBeenCalledTimes(1));

    // Hard delete must never be invoked from the bar
    expect(mockDeleteImages).not.toHaveBeenCalled();

    // Each diff must trim only the current collection (42) via collections.remove
    const diffs = mockUpdateImages.mock.calls[0]?.[0] as Array<{
      id: number;
      collections?: { remove?: number[] };
    }>;
    expect(diffs).toHaveLength(2);
    expect(diffs.map(d => d.id).sort()).toEqual([11, 12]);
    for (const d of diffs) {
      expect(d.collections?.remove).toEqual([42]);
    }

    // Confirm dialog must say "remove ... from this collection", NOT "delete"
    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringMatching(/remove .*from this collection/i)
    );
    expect(window.confirm).toHaveBeenCalledWith(expect.not.stringMatching(/delete/i));
  });

  it('aborts the remove when the user cancels the confirm', async () => {
    (window.confirm as jest.Mock).mockReturnValue(false);
    const collection = collectionWithImages();
    mockGetCollectionUpdateMetadata.mockResolvedValue(responseWithImages());
    const { result } = renderEdit({ enabled: true, collection });
    await waitFor(() => expect(result.current.currentState).not.toBeNull());

    act(() => result.current.enterSelect());
    const all = result.current.bottomBarCells.find(c => c.key === 'all');
    act(() => all?.onClick?.());

    const remove = result.current.bottomBarCells.find(c => c.key === 'remove');
    await act(async () => {
      remove?.onClick?.();
      await Promise.resolve();
    });

    expect(mockUpdateImages).not.toHaveBeenCalled();
    expect(mockDeleteImages).not.toHaveBeenCalled();
  });
});
