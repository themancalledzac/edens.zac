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
import { updateImages } from '@/app/lib/api/content';
import { collectionStorage } from '@/app/lib/storage/collectionStorage';
import {
  type CollectionModel,
  CollectionType,
  type CollectionUpdateResponseDTO,
  type GeneralMetadataDTO,
} from '@/app/types/Collection';
import { CollectionVisibility } from '@/app/types/CollectionVisibility';
import { type ContentImageModel, type ContentImageUpdateResponse } from '@/app/types/Content';

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
const mockSaveGalleryAccess = saveGalleryAccess as jest.MockedFunction<typeof saveGalleryAccess>;
const mockSetCollectionPeople = setCollectionPeople as jest.MockedFunction<
  typeof setCollectionPeople
>;
const mockUpdateImages = updateImages as jest.MockedFunction<typeof updateImages>;
const mockStorageGetFull = collectionStorage.getFull as jest.MockedFunction<
  typeof collectionStorage.getFull
>;
const mockStorageUpdate = collectionStorage.update as jest.MockedFunction<
  typeof collectionStorage.update
>;
const mockStorageUpdateFull = collectionStorage.updateFull as jest.MockedFunction<
  typeof collectionStorage.updateFull
>;
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

describe('useCollectionEdit — handler tests', () => {
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
  });

  describe('handleUpdate — cache write + slug-change navigation', () => {
    it('writes to collectionStorage after a successful save', async () => {
      const { result } = renderEdit({ enabled: true });
      await waitFor(() => expect(result.current.currentState).not.toBeNull());

      await act(async () => {
        result.current.setUpdateField('title', 'New Title');
        await result.current.handleUpdate({ title: 'New Title' });
      });

      expect(mockStorageUpdate).toHaveBeenCalledWith('smith-wedding', expect.any(Object));
      expect(mockStorageUpdateFull).toHaveBeenCalledWith('smith-wedding', expect.any(Object));
    });

    it('calls router.replace when the slug changes after a save', async () => {
      mockUpdateCollection.mockResolvedValue(makeResponse({ slug: 'new-slug' }));
      const { result } = renderEdit({ enabled: true });
      await waitFor(() => expect(result.current.currentState).not.toBeNull());

      await act(async () => {
        result.current.setUpdateField('title', 'Changed');
        await result.current.handleUpdate({ title: 'Changed' });
      });

      expect(mockRouterReplace).toHaveBeenCalledWith('/new-slug?manage=1');
    });

    it('does NOT call router.replace when the slug is unchanged', async () => {
      const { result } = renderEdit({ enabled: true });
      await waitFor(() => expect(result.current.currentState).not.toBeNull());

      await act(async () => {
        result.current.setUpdateField('title', 'Changed');
        await result.current.handleUpdate({ title: 'Changed' });
      });

      expect(mockRouterReplace).not.toHaveBeenCalled();
    });

    it('propagates the save error to result.current.error when updateCollection throws', async () => {
      mockUpdateCollection.mockRejectedValue(new Error('Server error'));
      const { result } = renderEdit({ enabled: true });
      await waitFor(() => expect(result.current.currentState).not.toBeNull());

      await act(async () => {
        result.current.setUpdateField('title', 'X');
        await result.current.handleUpdate({ title: 'X' });
      });

      expect(result.current.error).toBeTruthy();
    });

    it('inherits locations to images lacking them when a location is added and the response resolves locations', async () => {
      const locationId = 5;
      const imageWithNoLocation = {
        id: 11,
        contentType: 'IMAGE' as const,
        orderIndex: 0,
        imageUrl: 'https://cdn.example.com/11.jpg',
        locations: [] as [],
        collections: [],
        tags: [],
        people: [],
        rating: null,
        blackAndWhite: false,
        isFilm: false,
        imageWidth: 1920,
        imageHeight: 1080,
        title: 'Image 11',
        alt: 'Image 11',
      } as unknown as ContentImageModel;

      const responseWithLocations = makeResponse({
        locations: [{ id: locationId, name: 'Paris', slug: 'paris' }],
        content: [imageWithNoLocation],
      });
      mockUpdateCollection.mockResolvedValue(responseWithLocations);
      mockUpdateImages.mockResolvedValue({ updatedImages: [], newMetadata: {} });
      mockGetCollectionUpdateMetadata.mockResolvedValue(responseWithLocations);

      const collection = makeCollection({ content: [imageWithNoLocation] });
      const { result } = renderEdit({ enabled: true, collection });
      await waitFor(() => expect(result.current.currentState).not.toBeNull());

      act(() => result.current.setUpdateField('locations', { prev: [locationId] }));

      await act(async () => {
        await result.current.handleUpdate();
      });

      await waitFor(() => expect(mockUpdateImages).toHaveBeenCalledTimes(1));
      const updateCall = mockUpdateImages.mock.calls[0]?.[0] ?? [];
      expect(updateCall).toHaveLength(1);
      expect(updateCall[0]?.id).toBe(11);
    });

    it('does NOT call updateImages when the response has no locations', async () => {
      const responseNoLocations = makeResponse({ locations: [], content: [] });
      mockUpdateCollection.mockResolvedValue(responseNoLocations);

      const { result } = renderEdit({ enabled: true });
      await waitFor(() => expect(result.current.currentState).not.toBeNull());

      act(() => result.current.setUpdateField('locations', { prev: [5] }));

      await act(async () => {
        await result.current.handleUpdate();
      });

      expect(mockUpdateImages).not.toHaveBeenCalled();
    });
  });

  describe('handleMetadataSaveSuccess — cache write + refetch + state merge', () => {
    it('calls updateImagesInCache then fetches a fresh state and resets selectedIds', async () => {
      const { result } = renderEdit({ enabled: true });
      await waitFor(() => expect(result.current.currentState).not.toBeNull());

      act(() => result.current.enterSelect());

      const updatedImage = {
        id: 1,
        contentType: 'IMAGE' as const,
        orderIndex: 0,
        imageUrl: 'https://cdn.example.com/1.jpg',
        locations: [] as [],
        collections: [],
        tags: [],
        people: [],
        rating: null,
        blackAndWhite: false,
        isFilm: false,
        imageWidth: 1920,
        imageHeight: 1080,
        title: 'Image 1',
        alt: 'Image 1',
      } as unknown as ContentImageModel;
      const updateResponse: ContentImageUpdateResponse = {
        updatedImages: [updatedImage],
        newMetadata: {},
      };

      await act(async () => {
        await result.current.handleMetadataSaveSuccess(updateResponse);
      });

      expect(mockStorageUpdateImagesInCache).toHaveBeenCalledWith(
        'smith-wedding',
        updateResponse.updatedImages
      );
      expect(mockGetCollectionUpdateMetadata).toHaveBeenCalledWith('smith-wedding');
      expect(result.current.selectedIds).toEqual([]);
    });

    it('skips updateImagesInCache when updatedImages is empty', async () => {
      const { result } = renderEdit({ enabled: true });
      await waitFor(() => expect(result.current.currentState).not.toBeNull());

      const updateResponse: ContentImageUpdateResponse = { updatedImages: [], newMetadata: {} };

      await act(async () => {
        await result.current.handleMetadataSaveSuccess(updateResponse);
      });

      expect(mockStorageUpdateImagesInCache).not.toHaveBeenCalled();
      expect(mockGetCollectionUpdateMetadata).toHaveBeenCalledWith('smith-wedding');
    });

    it('sets error when getCollectionUpdateMetadata throws during metadata save success', async () => {
      const { result } = renderEdit({ enabled: true });
      await waitFor(() => expect(result.current.currentState).not.toBeNull());

      mockGetCollectionUpdateMetadata.mockRejectedValueOnce(new Error('Fetch failed'));

      await act(async () => {
        await result.current.handleMetadataSaveSuccess({ updatedImages: [], newMetadata: {} });
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('handleDeleteSuccess — cache write + refetch + reset', () => {
    it('fetches fresh state, writes caches, and clears selectedIds after deletion', async () => {
      const { result } = renderEdit({ enabled: true });
      await waitFor(() => expect(result.current.currentState).not.toBeNull());

      act(() => result.current.enterSelect());

      await act(async () => {
        await result.current.handleDeleteSuccess([1, 2]);
      });

      expect(mockGetCollectionUpdateMetadata).toHaveBeenCalledWith('smith-wedding');
      expect(mockStorageUpdate).toHaveBeenCalled();
      expect(mockStorageUpdateFull).toHaveBeenCalled();
      expect(result.current.selectedIds).toEqual([]);
    });

    it('sets error when currentState is null at the time of deletion', async () => {
      const { result } = renderEdit({ enabled: false });

      await act(async () => {
        await result.current.handleDeleteSuccess([1]);
      });

      expect(result.current.error).toBeTruthy();
      expect(mockGetCollectionUpdateMetadata).not.toHaveBeenCalled();
    });

    it('sets error when refetch fails after a successful deletion', async () => {
      const { result } = renderEdit({ enabled: true });
      await waitFor(() => expect(result.current.currentState).not.toBeNull());

      mockGetCollectionUpdateMetadata.mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        await result.current.handleDeleteSuccess([1]);
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('handleSaveAccess — PARENT propagate-confirm path', () => {
    it('calls window.confirm for PARENT type and propagates when confirmed', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
      mockSaveGalleryAccess.mockResolvedValue({
        saved: true,
        emailsSent: false,
        reason: null,
        password: 'pass1234',
        emails: [],
      });

      const collection = makeCollection({ type: CollectionType.PARENT });
      mockGetCollectionUpdateMetadata.mockResolvedValue(
        makeResponse({ type: CollectionType.PARENT })
      );
      const { result } = renderEdit({ enabled: true, collection });
      await waitFor(() => expect(result.current.currentState).not.toBeNull());

      act(() => result.current.setGalleryPassword('pass1234'));

      await act(async () => {
        await result.current.handleSaveAccess();
      });

      expect(confirmSpy).toHaveBeenCalled();
      expect(mockSaveGalleryAccess).toHaveBeenCalledWith(
        42,
        expect.objectContaining({ propagateToChildren: true })
      );
      confirmSpy.mockRestore();
    });

    it('does NOT propagate when confirm is declined for PARENT type', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
      mockSaveGalleryAccess.mockResolvedValue({
        saved: true,
        emailsSent: false,
        reason: null,
        password: 'pass1234',
        emails: [],
      });

      const collection = makeCollection({ type: CollectionType.PARENT });
      mockGetCollectionUpdateMetadata.mockResolvedValue(
        makeResponse({ type: CollectionType.PARENT })
      );
      const { result } = renderEdit({ enabled: true, collection });
      await waitFor(() => expect(result.current.currentState).not.toBeNull());

      act(() => result.current.setGalleryPassword('pass1234'));

      await act(async () => {
        await result.current.handleSaveAccess();
      });

      expect(mockSaveGalleryAccess).toHaveBeenCalledWith(
        42,
        expect.objectContaining({ propagateToChildren: false })
      );
      confirmSpy.mockRestore();
    });

    it('does NOT call window.confirm for non-PARENT types', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
      mockSaveGalleryAccess.mockResolvedValue({
        saved: true,
        emailsSent: false,
        reason: null,
        password: 'pass1234',
        emails: [],
      });

      const collection = makeCollection({ type: CollectionType.CLIENT_GALLERY });
      mockGetCollectionUpdateMetadata.mockResolvedValue(
        makeResponse({ type: CollectionType.CLIENT_GALLERY })
      );
      const { result } = renderEdit({ enabled: true, collection });
      await waitFor(() => expect(result.current.currentState).not.toBeNull());

      act(() => result.current.setGalleryPassword('pass1234'));

      await act(async () => {
        await result.current.handleSaveAccess();
      });

      expect(confirmSpy).not.toHaveBeenCalled();
      confirmSpy.mockRestore();
    });
  });

  describe('handleSavePeople', () => {
    it('calls setCollectionPeople with filtered positive-id person ids', async () => {
      mockSetCollectionPeople.mockResolvedValue();

      const { result } = renderEdit({ enabled: true });
      await waitFor(() => expect(result.current.currentState).not.toBeNull());

      act(() =>
        result.current.setCollectionPeople([
          { id: 1, name: 'Alice', slug: 'alice' },
          { id: 0, name: 'New Person', slug: '' },
          { id: 3, name: 'Bob', slug: 'bob' },
        ])
      );

      await act(async () => {
        await result.current.handleSavePeople();
      });

      expect(mockSetCollectionPeople).toHaveBeenCalledWith(42, [1, 3]);
      expect(result.current.peopleStatus).toBe('People saved.');
      expect(result.current.peopleSaving).toBe(false);
    });

    it('sets peopleStatus to a non-null error string when setCollectionPeople throws', async () => {
      mockSetCollectionPeople.mockRejectedValue(new Error('People API down'));

      const { result } = renderEdit({ enabled: true });
      await waitFor(() => expect(result.current.currentState).not.toBeNull());

      await act(async () => {
        await result.current.handleSavePeople();
      });

      expect(result.current.peopleStatus).toBeTruthy();
      expect(result.current.peopleSaving).toBe(false);
    });
  });

  describe('bottomBarCells — add mode', () => {
    it('add mode shows Text / Upload / Cancel cells in that order', () => {
      const { result } = renderEdit({ enabled: false });
      act(() => result.current.enterAdd());
      expect(result.current.manageMode).toBe('add');
      const labels = result.current.bottomBarCells.map(c => c.label);
      expect(labels).toEqual(['Text', 'Upload', 'Cancel']);
    });

    it('add mode Upload cell has a fileInput descriptor (not a plain button)', () => {
      const { result } = renderEdit({ enabled: false });
      act(() => result.current.enterAdd());
      const upload = result.current.bottomBarCells.find(c => c.key === 'upload');
      expect(upload).toBeDefined();
      expect(upload?.fileInput).toBeDefined();
      expect(upload?.fileInput?.multiple).toBe(true);
    });

    it('add mode Cancel cell calls setIsAddMode(false) (returns to browse)', () => {
      const { result } = renderEdit({ enabled: false });
      act(() => result.current.enterAdd());
      expect(result.current.manageMode).toBe('add');
      const cancel = result.current.bottomBarCells.find(c => c.key === 'cancel');
      act(() => cancel?.onClick?.());
      expect(result.current.manageMode).toBe('browse');
    });

    it('add mode Text cell calls handleCreateNewTextBlock (isTextBlockModalOpen becomes true)', () => {
      const { result } = renderEdit({ enabled: false });
      act(() => result.current.enterAdd());
      const text = result.current.bottomBarCells.find(c => c.key === 'text');
      act(() => text?.onClick?.());
      expect(result.current.isTextBlockModalOpen).toBe(true);
    });
  });

  describe('bottomBarCells — reorder mode Save gating', () => {
    it('reorder Save is disabled when no moves have been made', () => {
      const { result } = renderEdit({
        enabled: false,
        collection: makeCollection({ displayMode: 'ORDERED' }),
      });
      act(() => result.current.enterReorder());
      const save = result.current.bottomBarCells.find(c => c.key === 'save');
      expect(save?.disabled).toBe(true);
    });

    it('reorder Save label is "Save" with variant primary', () => {
      const { result } = renderEdit({ enabled: false });
      act(() => result.current.enterReorder());
      const save = result.current.bottomBarCells.find(c => c.key === 'save');
      expect(save?.label).toBe('Save');
      expect(save?.variant).toBe('primary');
    });
  });

  describe('allCollections — empty when metadata returns null', () => {
    it('allCollections stays empty if getMetadata resolves to null', async () => {
      mockGetMetadata.mockResolvedValue(null);
      const { result } = renderEdit({ enabled: true });
      await waitFor(() => expect(result.current.isLoadingState).toBe(false));
      expect(result.current.allCollections).toEqual([]);
    });
  });
});
