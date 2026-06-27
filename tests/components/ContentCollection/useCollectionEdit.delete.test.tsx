/**
 * Focused test for useCollectionEdit's handleDeleteCollection path — the hard
 * delete of an entire collection (admin Danger zone). On success it calls
 * deleteCollection(id), evicts the slug's storage, revalidates caches, and
 * navigates home. The home system collection is guarded.
 */

import { act, renderHook, waitFor } from '@testing-library/react';

import { revalidateCollectionCache } from '@/app/components/ContentCollection/edit/collectionEditUtils';
import { useCollectionEdit } from '@/app/components/ContentCollection/edit/useCollectionEdit';
import {
  deleteCollection,
  getCollectionUpdateMetadata,
  getMetadata,
  updateCollection,
  updateCollectionRating,
} from '@/app/lib/api/collections';
import { collectionStorage } from '@/app/lib/storage/collectionStorage';
import {
  type CollectionModel,
  CollectionType,
  type CollectionUpdateResponseDTO,
  type GeneralMetadataDTO,
} from '@/app/types/Collection';
import { CollectionVisibility } from '@/app/types/CollectionVisibility';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: jest.fn(), refresh: jest.fn() }),
}));

const mockRouterPush = jest.fn();

jest.mock('@/app/lib/api/collections');
jest.mock('@/app/lib/api/content');
jest.mock('@/app/lib/storage/collectionStorage');

jest.mock('@/app/utils/contentLayout', () => ({
  processContentBlocks: (content: unknown[]) => content,
}));

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

const mockDeleteCollection = deleteCollection as jest.MockedFunction<typeof deleteCollection>;
const mockGetCollectionUpdateMetadata = getCollectionUpdateMetadata as jest.MockedFunction<
  typeof getCollectionUpdateMetadata
>;
const mockGetMetadata = getMetadata as jest.MockedFunction<typeof getMetadata>;
const mockRevalidateCollectionCache = revalidateCollectionCache as jest.MockedFunction<
  typeof revalidateCollectionCache
>;
const mockStorageGetFull = collectionStorage.getFull as jest.MockedFunction<
  typeof collectionStorage.getFull
>;
const mockStorageClear = collectionStorage.clear as jest.MockedFunction<
  typeof collectionStorage.clear
>;
const mockStorageClearFull = collectionStorage.clearFull as jest.MockedFunction<
  typeof collectionStorage.clearFull
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

function renderEdit(opts: { collection?: CollectionModel } = {}) {
  const collection = opts.collection ?? makeCollection();
  return renderHook(() =>
    useCollectionEdit({
      collection,
      slug: collection.slug,
      enabled: true,
    })
  );
}

describe('useCollectionEdit — handleDeleteCollection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouterPush.mockReset();
    mockStorageGetFull.mockReturnValue(null);
    mockGetCollectionUpdateMetadata.mockResolvedValue(makeResponse());
    mockGetMetadata.mockResolvedValue(makeMetadata());
    (updateCollection as jest.MockedFunction<typeof updateCollection>).mockResolvedValue(
      makeResponse()
    );
    (
      updateCollectionRating as jest.MockedFunction<typeof updateCollectionRating>
    ).mockResolvedValue();
    mockDeleteCollection.mockResolvedValue({ success: true });
    jest.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('deletes, evicts storage, revalidates, and navigates home on confirm', async () => {
    const { result } = renderEdit();
    await waitFor(() => expect(result.current.currentState).not.toBeNull());

    await act(async () => {
      await result.current.handleDeleteCollection();
    });

    expect(mockDeleteCollection).toHaveBeenCalledWith(42);
    expect(mockStorageClear).toHaveBeenCalledWith('smith-wedding');
    expect(mockStorageClearFull).toHaveBeenCalledWith('smith-wedding');
    expect(mockRevalidateCollectionCache).toHaveBeenCalledWith('smith-wedding');
    expect(mockRouterPush).toHaveBeenCalledWith('/');
  });

  it('also revalidates each parent collection slug', async () => {
    mockGetCollectionUpdateMetadata.mockResolvedValue(
      makeResponse({
        parents: [
          { id: 7, name: 'Weddings', slug: 'weddings' },
          { id: 8, name: 'Featured', slug: 'featured' },
        ],
      })
    );
    const { result } = renderEdit();
    await waitFor(() => expect(result.current.currentState).not.toBeNull());

    await act(async () => {
      await result.current.handleDeleteCollection();
    });

    expect(mockRevalidateCollectionCache).toHaveBeenCalledWith('smith-wedding');
    expect(mockRevalidateCollectionCache).toHaveBeenCalledWith('weddings');
    expect(mockRevalidateCollectionCache).toHaveBeenCalledWith('featured');
  });

  it('does nothing when the confirm is cancelled', async () => {
    (window.confirm as jest.Mock).mockReturnValue(false);
    const { result } = renderEdit();
    await waitFor(() => expect(result.current.currentState).not.toBeNull());

    await act(async () => {
      await result.current.handleDeleteCollection();
    });

    expect(mockDeleteCollection).not.toHaveBeenCalled();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('surfaces an error and does not navigate when the delete fails', async () => {
    mockDeleteCollection.mockRejectedValue(new Error('boom'));
    const { result } = renderEdit();
    await waitFor(() => expect(result.current.currentState).not.toBeNull());

    await act(async () => {
      await result.current.handleDeleteCollection();
    });

    expect(result.current.error).toBeTruthy();
    expect(mockRouterPush).not.toHaveBeenCalled();
    expect(result.current.deleting).toBe(false);
  });

  it('guards the home collection — never deletes', async () => {
    mockGetCollectionUpdateMetadata.mockResolvedValue(
      makeResponse({ id: 1, slug: 'home', title: 'Home' })
    );
    const { result } = renderEdit({
      collection: makeCollection({ id: 1, slug: 'home', title: 'Home' }),
    });
    await waitFor(() => expect(result.current.currentState).not.toBeNull());

    await act(async () => {
      await result.current.handleDeleteCollection();
    });

    expect(mockDeleteCollection).not.toHaveBeenCalled();
    expect(mockRouterPush).not.toHaveBeenCalled();
    expect(result.current.error).toBeTruthy();
  });
});
