/**
 * Edit-buffer lifecycle tests for useCollectionEdit.
 *
 * The buffer (`updateData`) reseeds at exactly three moments:
 *  1. collection IDENTITY change (covered in useCollectionEdit.test.tsx),
 *  2. the one-time seed → admin-DTO adoption when `currentState` first arrives,
 *  3. after a successful save (rebase on the response) and on Cancel/exit-to-browse (discard).
 *
 * These tests pin the bugs the policy fixes: stale relational diffs replaying on every save,
 * the remove+newValue "reversal resurrection", Save stuck dirty, Cancel not discarding, and
 * seed-divergence phantom diffs — plus the preserved property that background refreshes never
 * wipe typed-but-unsaved buffer edits.
 */

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
  type CollectionUpdateRequest,
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

const mockGetCollectionUpdateMetadata = getCollectionUpdateMetadata as jest.MockedFunction<
  typeof getCollectionUpdateMetadata
>;
const mockUpdateCollection = updateCollection as jest.MockedFunction<typeof updateCollection>;
const mockGetMetadata = getMetadata as jest.MockedFunction<typeof getMetadata>;
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
    id: 5,
    name: 'Child Collection',
    slug: 'child-collection',
    ...overrides,
  };
}

function makeCollection(overrides: Partial<CollectionModel> = {}): CollectionModel {
  return {
    id: 42,
    slug: 'smith-wedding',
    title: 'Smith Wedding',
    description: 'A description',
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

/** Response where child collection 5 is already saved (contained as a content block). */
function makeResponseWithChild(): CollectionUpdateResponseDTO {
  return makeResponse({
    content: [
      {
        id: 100,
        contentType: 'COLLECTION',
        orderIndex: 0,
        slug: 'child-collection',
        referencedCollectionId: 5,
      },
    ],
  });
}

function renderEdit(opts: { collection?: CollectionModel } = {}) {
  const collection = opts.collection ?? makeCollection();
  return renderHook(() => useCollectionEdit({ collection, slug: collection.slug, enabled: true }));
}

function payloadOfCall(index: number): CollectionUpdateRequest {
  const payload = mockUpdateCollection.mock.calls[index]?.[1];
  expect(payload).toBeDefined();
  return payload as CollectionUpdateRequest;
}

describe('useCollectionEdit — edit buffer lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorageGetFull.mockReturnValue(null);
    mockGetCollectionUpdateMetadata.mockImplementation(async () => makeResponse());
    mockUpdateCollection.mockResolvedValue(makeResponse());
    mockGetMetadata.mockResolvedValue(makeMetadata());
    (
      updateCollectionRating as jest.MockedFunction<typeof updateCollectionRating>
    ).mockResolvedValue();
  });

  describe('rebase on save', () => {
    it('does not replay a saved relational diff on the next save, and dirty clears after saving', async () => {
      mockUpdateCollection.mockResolvedValue(makeResponseWithChild());
      const { result } = renderEdit();
      await waitFor(() => expect(result.current.currentState).not.toBeNull());

      act(() => result.current.handleChildToggle(makeListModel({ id: 5 })));
      expect(result.current.isUpdateDirty).toBe(true);

      await act(async () => {
        await result.current.handleUpdate();
      });

      // First save sends the staged addition…
      expect(payloadOfCall(0).collections?.newValue?.map(c => c.collectionId)).toEqual([5]);
      // …after which the buffer is rebased on the response: clean, and child 5 reads as saved.
      expect(result.current.isUpdateDirty).toBe(false);
      expect(result.current.updateData.collections).toBeUndefined();
      expect(result.current.childIds.saved.has(5)).toBe(true);
      expect(result.current.childIds.pendingAdd.size).toBe(0);

      await act(async () => {
        await result.current.handleUpdate({ title: 'x' });
      });

      const secondPayload = payloadOfCall(1);
      expect(secondPayload.title).toBe('x');
      expect(secondPayload).not.toHaveProperty('collections');
    });

    it('removing a just-saved child sends remove WITHOUT newValue (no reversal resurrection)', async () => {
      mockUpdateCollection.mockResolvedValue(makeResponseWithChild());
      const { result } = renderEdit();
      await waitFor(() => expect(result.current.currentState).not.toBeNull());

      act(() => result.current.handleChildToggle(makeListModel({ id: 5 })));
      await act(async () => {
        await result.current.handleUpdate();
      });
      expect(result.current.childIds.saved.has(5)).toBe(true);

      // Reverse the addition: with the rebased buffer this stages a pure removal. (Before the
      // rebase the buffer still held newValue:[5], producing remove:[5] AND newValue:[5] — the
      // backend runs remove before add, so the child was silently re-added.)
      act(() => result.current.handleChildToggle(makeListModel({ id: 5 })));
      expect(result.current.childIds.pendingRemove.has(5)).toBe(true);

      await act(async () => {
        await result.current.handleUpdate();
      });

      const removalPayload = payloadOfCall(1);
      expect(removalPayload.collections?.remove).toEqual([5]);
      expect(removalPayload.collections?.newValue).toBeUndefined();
    });
  });

  describe('discard on Cancel (exit to browse)', () => {
    it('drops uncommitted sheet edits so they cannot ride along on a later inline commit', async () => {
      const { result } = renderEdit();
      await waitFor(() => expect(result.current.currentState).not.toBeNull());

      act(() => result.current.setUpdateField('visibility', CollectionVisibility.UNLISTED));
      expect(result.current.isUpdateDirty).toBe(true);

      act(() => result.current.exitToBrowse());

      expect(result.current.isUpdateDirty).toBe(false);
      expect(result.current.updateData.visibility).toBe(CollectionVisibility.LISTED);

      await act(async () => {
        await result.current.handleUpdate({ title: 'Inline Commit' });
      });

      const payload = payloadOfCall(0);
      expect(payload.title).toBe('Inline Commit');
      expect(payload).not.toHaveProperty('visibility');
    });
  });

  describe('seed → admin-DTO adoption', () => {
    it('adopts the admin DTO once, so seed divergence is neither dirty nor written back on save', async () => {
      const seed = makeCollection({ description: 'Stale public description' });
      mockGetCollectionUpdateMetadata.mockImplementation(async () =>
        makeResponse({ description: 'Fresh admin description' })
      );
      mockUpdateCollection.mockResolvedValue(
        makeResponse({ description: 'Fresh admin description', title: 'New Title' })
      );

      const { result } = renderEdit({ collection: seed });
      await waitFor(() => expect(result.current.currentState).not.toBeNull());

      expect(result.current.updateData.description).toBe('Fresh admin description');
      expect(result.current.isUpdateDirty).toBe(false);

      await act(async () => {
        await result.current.handleUpdate({ title: 'New Title' });
      });

      const payload = payloadOfCall(0);
      expect(payload.title).toBe('New Title');
      expect(payload).not.toHaveProperty('description');
    });

    it('does NOT wipe a typed-but-unsaved edit on a later background refresh for the same id', async () => {
      const { result } = renderEdit();
      await waitFor(() => expect(result.current.currentState).not.toBeNull());
      const adoptedState = result.current.currentState;

      act(() => result.current.setUpdateField('title', 'Typed but unsaved'));
      expect(result.current.isUpdateDirty).toBe(true);

      // Background refresh path (same id, fresh object): a metadata-save handler refetches the
      // admin DTO and replaces currentState.
      await act(async () => {
        await result.current.handleMetadataSaveSuccess({ updatedImages: [], newMetadata: {} });
      });

      expect(result.current.currentState).not.toBe(adoptedState);
      expect(result.current.updateData.title).toBe('Typed but unsaved');
      expect(result.current.isUpdateDirty).toBe(true);
    });
  });

  describe('staged People and gallery access survive unrelated saves', () => {
    const ADA = { id: 7, name: 'Ada Lovelace' };

    /**
     * Every DTO must carry its OWN `people`/`recipientEmails` arrays. The old effect keyed off
     * those array identities, so a refresh only wiped staged edits when the arrays were actually
     * present — leaving them `undefined` (as the bare fixture does) hides the bug entirely.
     */
    function mockFreshDtosWithArrays() {
      mockGetCollectionUpdateMetadata.mockImplementation(async () =>
        makeResponse({ people: [], recipientEmails: [] })
      );
      mockUpdateCollection.mockImplementation(async () =>
        makeResponse({ people: [], recipientEmails: [] })
      );
    }

    it('does NOT wipe a staged person when an inline title commit refreshes the DTO', async () => {
      mockFreshDtosWithArrays();
      const { result } = renderEdit();
      await waitFor(() => expect(result.current.currentState).not.toBeNull());

      act(() => result.current.setCollectionPeople([ADA]));
      expect(result.current.collectionPeople).toEqual([ADA]);

      await act(async () => {
        await result.current.handleUpdate({ title: 'New Title' });
      });

      expect(result.current.collectionPeople).toEqual([ADA]);
    });

    it('does NOT wipe staged gallery password and emails on a background refresh', async () => {
      mockFreshDtosWithArrays();
      const { result } = renderEdit();
      await waitFor(() => expect(result.current.currentState).not.toBeNull());

      act(() => result.current.setGalleryPassword('hunter2'));
      act(() => result.current.setGalleryEmail('client@example.com'));

      await act(async () => {
        await result.current.handleMetadataSaveSuccess({ updatedImages: [], newMetadata: {} });
      });

      expect(result.current.galleryPassword).toBe('hunter2');
      expect(result.current.galleryEmail).toBe('client@example.com');
    });

    it('DOES seed people and gallery access from the admin DTO on first arrival', async () => {
      mockGetCollectionUpdateMetadata.mockImplementation(async () =>
        makeResponse({
          people: [ADA],
          galleryPassword: 'from-server',
          recipientEmails: ['a@example.com', 'b@example.com'],
        })
      );

      const { result } = renderEdit();
      await waitFor(() => expect(result.current.currentState).not.toBeNull());

      expect(result.current.collectionPeople).toEqual([ADA]);
      expect(result.current.galleryPassword).toBe('from-server');
      expect(result.current.galleryEmail).toBe('a@example.com, b@example.com');
    });
  });
});

describe('update buffer — kind flags', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorageGetFull.mockReturnValue(null);
  });

  it('seeds isClient/isBlog from the collection so the kind checkboxes reflect storage', () => {
    const { result } = renderHook(() =>
      useCollectionEdit({
        collection: makeCollection({ isClient: true, isBlog: false }),
        slug: 'smith-wedding',
        enabled: false,
      })
    );
    expect(result.current.updateData.isClient).toBe(true);
    expect(result.current.updateData.isBlog).toBe(false);
  });

  it('seeds both false for an ordinary collection', () => {
    const { result } = renderHook(() =>
      useCollectionEdit({
        collection: makeCollection({ isClient: false, isBlog: false }),
        slug: 'smith-wedding',
        enabled: false,
      })
    );
    expect(result.current.updateData.isClient).toBe(false);
    expect(result.current.updateData.isBlog).toBe(false);
  });
});
