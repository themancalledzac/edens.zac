/**
 * useCoverImageSelection validates the picked id against a POOL before writing coverImageId, so
 * the pool is a write path, not just a picker. Under mixed content the pool must be the UNION of
 * the collection's own images and its child collections' images (D3).
 */
import { act, renderHook, waitFor } from '@testing-library/react';

import { useCoverImageSelection } from '@/app/components/ContentCollection/edit/hooks/useCoverImageSelection';
import { updateCollection } from '@/app/lib/api/collections';
import type { CollectionModel } from '@/app/types/Collection';
import type { AnyContentModel, ContentImageModel } from '@/app/types/Content';

jest.mock('@/app/lib/api/collections');
jest.mock('@/app/lib/storage/collectionStorage');

const mockUpdateCollection = updateCollection as jest.MockedFunction<typeof updateCollection>;

function ownImage(id: number): ContentImageModel {
  return {
    id,
    contentType: 'IMAGE',
    orderIndex: id,
    imageUrl: `https://cdn.example/own-${id}.jpg`,
    locations: [],
  };
}

function childRef(id: number): AnyContentModel {
  return {
    id,
    contentType: 'COLLECTION',
    orderIndex: id,
    slug: `child-${id}`,
    referencedCollectionId: id * 10,
  } as unknown as AnyContentModel;
}

/** A mixed collection: two of its own images plus one child-collection reference. */
function makeMixedCollection(): CollectionModel {
  return {
    id: 42,
    slug: 'mixed',
    title: 'Mixed',
    content: [ownImage(1), ownImage(2), childRef(90)],
    locations: [],
  } as unknown as CollectionModel;
}

function renderCoverSelection(childCollectionImages: ContentImageModel[]) {
  const setError = jest.fn();
  const hook = renderHook(() =>
    useCoverImageSelection({
      collection: makeMixedCollection(),
      childCollectionImages,
      setCurrentState: jest.fn(),
      setOperationLoading: jest.fn(),
      setError,
    })
  );
  return { hook, setError };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdateCollection.mockResolvedValue(null);
});

describe('useCoverImageSelection — union cover pool (D3)', () => {
  it("accepts one of the collection's OWN images even though it also has a child ref", async () => {
    const { hook, setError } = renderCoverSelection([ownImage(500)]);

    await act(async () => {
      await hook.result.current.handleCoverImageClick(2);
    });

    // NB the success path calls setError(null) to clear stale errors, so assert that no ERROR
    // string was surfaced rather than that setError went untouched.
    expect(setError).not.toHaveBeenCalledWith(expect.any(String));
    await waitFor(() =>
      expect(mockUpdateCollection).toHaveBeenCalledWith(42, { id: 42, coverImageId: 2 })
    );
  });

  it('accepts a CHILD collection image on the same collection', async () => {
    const { hook, setError } = renderCoverSelection([ownImage(500)]);

    await act(async () => {
      await hook.result.current.handleCoverImageClick(500);
    });

    // NB the success path calls setError(null) to clear stale errors, so assert that no ERROR
    // string was surfaced rather than that setError went untouched.
    expect(setError).not.toHaveBeenCalledWith(expect.any(String));
    await waitFor(() =>
      expect(mockUpdateCollection).toHaveBeenCalledWith(42, { id: 42, coverImageId: 500 })
    );
  });

  it('still rejects an id that is in neither pool', async () => {
    const { hook, setError } = renderCoverSelection([ownImage(500)]);

    await act(async () => {
      await hook.result.current.handleCoverImageClick(9999);
    });

    expect(setError).toHaveBeenCalledWith('Invalid cover image selection. Please try again.');
    expect(mockUpdateCollection).not.toHaveBeenCalled();
  });
});
