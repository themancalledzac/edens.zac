import { act, renderHook } from '@testing-library/react';

import { useCollectionRetype } from '@/app/components/ContentCollection/edit/hooks/useCollectionRetype';
import { updateCollection } from '@/app/lib/api/collections';
import { type CollectionListModel, CollectionType } from '@/app/types/Collection';

jest.mock('@/app/lib/api/collections', () => ({ updateCollection: jest.fn() }));
const mockUpdateCollection = updateCollection as jest.MockedFunction<typeof updateCollection>;

const dragged: CollectionListModel = {
  id: 7,
  name: 'Hidden Lake',
  slug: 'hidden-lake',
  type: 'BLOG',
};

function setup() {
  let collections: CollectionListModel[] = [dragged];
  const setAllCollections = jest.fn((updater: unknown) => {
    collections =
      typeof updater === 'function'
        ? (updater as (prev: CollectionListModel[]) => CollectionListModel[])(collections)
        : (updater as CollectionListModel[]);
  });
  const setError = jest.fn();
  const { result } = renderHook(() =>
    useCollectionRetype({
      setAllCollections: setAllCollections as never,
      setError,
    })
  );
  return { result, setAllCollections, setError, getCollections: () => collections };
}

describe('useCollectionRetype', () => {
  beforeEach(() => jest.clearAllMocks());

  it('optimistically moves the collection then PUTs the new type', async () => {
    mockUpdateCollection.mockResolvedValue({ collection: { id: 7 } } as never);
    const { result, getCollections } = setup();

    await act(async () => {
      await result.current.handleChangeType(dragged, CollectionType.PORTFOLIO);
    });

    expect(getCollections()).toEqual([{ ...dragged, type: 'PORTFOLIO' }]);
    expect(mockUpdateCollection).toHaveBeenCalledWith(7, { id: 7, type: 'PORTFOLIO' });
  });

  it('reverts and sets an error when the PUT returns null', async () => {
    mockUpdateCollection.mockResolvedValue(null);
    const { result, getCollections, setError } = setup();

    await act(async () => {
      await result.current.handleChangeType(dragged, CollectionType.PORTFOLIO);
    });

    expect(getCollections()).toEqual([dragged]); // reverted to BLOG
    expect(setError).toHaveBeenLastCalledWith('Failed to move "Hidden Lake" to Portfolio');
  });

  it('reverts and sets an error when the PUT throws', async () => {
    mockUpdateCollection.mockRejectedValue(new Error('network'));
    const { result, getCollections, setError } = setup();

    await act(async () => {
      await result.current.handleChangeType(dragged, CollectionType.PORTFOLIO);
    });

    expect(getCollections()).toEqual([dragged]);
    expect(setError).toHaveBeenCalled();
  });

  it('is a no-op (no PUT, no state change) when dropped on its current type', async () => {
    const { result, setAllCollections } = setup();

    await act(async () => {
      await result.current.handleChangeType(dragged, CollectionType.BLOG);
    });

    expect(mockUpdateCollection).not.toHaveBeenCalled();
    expect(setAllCollections).not.toHaveBeenCalled();
  });

  it('ignores a second retype of the same collection while one is in flight (single-flight)', async () => {
    let resolveFirst: (value: unknown) => void = () => {};
    mockUpdateCollection.mockImplementationOnce(
      () => new Promise(resolve => (resolveFirst = resolve)) as never
    );
    const { result } = setup();

    await act(async () => {
      // Start the first retype but leave its PUT pending.
      const first = result.current.handleChangeType(dragged, CollectionType.PORTFOLIO);
      // A second drag on the same collection while the first is pending must be dropped.
      await result.current.handleChangeType(dragged, CollectionType.ART_GALLERY);
      resolveFirst({ collection: { id: 7 } });
      await first;
    });

    expect(mockUpdateCollection).toHaveBeenCalledTimes(1);
    expect(mockUpdateCollection).toHaveBeenCalledWith(7, { id: 7, type: 'PORTFOLIO' });
  });
});
