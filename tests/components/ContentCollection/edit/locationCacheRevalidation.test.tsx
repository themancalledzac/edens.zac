/**
 * Location cache-tag revalidation (E12).
 *
 * `collections-location-${slug}` is registered by `getCollectionsByLocation` in
 * `lib/api/collections.ts`. Until E12 nothing revalidated it, so a location page kept listing a
 * collection that had moved away for up to `TIMING.revalidateCache`.
 *
 * Three properties are pinned here, because each one is a way to get this wrong:
 *  1. the union — a removal only shows up in the PREVIOUS set, so revalidating the post-save
 *     locations alone leaves the old location page stale;
 *  2. the slug source — a location added during an edit is `{ id: 0, name, slug: '' }` until the
 *     backend assigns a slug, so the tag must be built from the saved response, not the buffer;
 *  3. the wiring — `handleUpdate` is the only save path that carries location data, so the call
 *     has to be there rather than inside `revalidateCollectionCache`.
 *
 * `revalidateLocationCaches` runs for real against a mocked `fetch`; only its two sibling helpers
 * are stubbed. That way the hook tests assert the actual POST bodies rather than a spy call.
 */

import { act, renderHook, waitFor } from '@testing-library/react';

import { revalidateLocationCaches } from '@/app/components/ContentCollection/edit/collectionEditUtils';
import { useCollectionEdit } from '@/app/components/ContentCollection/edit/useCollectionEdit';
import {
  getCollectionUpdateMetadata,
  getMetadata,
  updateCollection,
} from '@/app/lib/api/collections';
import { collectionStorage } from '@/app/lib/storage/collectionStorage';
import {
  type CollectionModel,
  type CollectionUpdateResponseDTO,
  type GeneralMetadataDTO,
  type LocationModel,
} from '@/app/types/Collection';
import { CollectionVisibility } from '@/app/types/CollectionVisibility';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
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
    revalidateCollectionCache: jest.fn(() => Promise.resolve()),
    revalidateMetadataCache: jest.fn(() => Promise.resolve()),
  };
});

const mockGetCollectionUpdateMetadata = getCollectionUpdateMetadata as jest.MockedFunction<
  typeof getCollectionUpdateMetadata
>;
const mockGetMetadata = getMetadata as jest.MockedFunction<typeof getMetadata>;
const mockUpdateCollection = updateCollection as jest.MockedFunction<typeof updateCollection>;
const mockStorageGetFull = collectionStorage.getFull as jest.MockedFunction<
  typeof collectionStorage.getFull
>;

const SEATTLE: LocationModel = { id: 1, name: 'Seattle', slug: 'seattle' };
const PORTLAND: LocationModel = { id: 2, name: 'Portland', slug: 'portland' };
const BEND: LocationModel = { id: 3, name: 'Bend', slug: 'bend' };

function makeMetadata(): GeneralMetadataDTO {
  return {
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

/**
 * Installs a resolving `fetch` mock. Resolves a bare `{ ok: true }` rather than a real `Response`:
 * the jsdom test environment has no global `Response` constructor, so building one throws inside
 * the mock and only the first of several parallel POSTs is ever recorded.
 */
function mockFetchOk(): void {
  globalThis.fetch = jest.fn().mockResolvedValue({ ok: true });
}

interface RevalidateBody {
  tag?: string;
  tags?: string[];
}

/** Every cache tag POSTed to /api/revalidate so far, in call order. */
function postedTags(): string[] {
  const fetchMock = globalThis.fetch as jest.MockedFunction<typeof fetch>;
  return fetchMock.mock.calls
    .filter(([url]) => url === '/api/revalidate')
    .flatMap(([, init]) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as RevalidateBody;
      return body.tags ?? (body.tag === undefined ? [] : [body.tag]);
    });
}

function renderEdit(collection: CollectionModel) {
  return renderHook(() => useCollectionEdit({ collection, slug: collection.slug, enabled: true }));
}

describe('revalidateLocationCaches', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchOk();
  });

  it('revalidates the union of the previous and next locations, not just the next ones', async () => {
    await revalidateLocationCaches([SEATTLE], [PORTLAND]);

    expect(postedTags().sort()).toEqual([
      'collections-location-portland',
      'collections-location-seattle',
    ]);
  });

  it('posts one tag for a location present in both sets', async () => {
    await revalidateLocationCaches([SEATTLE, PORTLAND], [PORTLAND]);

    expect(postedTags().filter(tag => tag === 'collections-location-portland')).toHaveLength(1);
  });

  it('drops a location whose slug is empty, so no bare collections-location- tag is posted', async () => {
    await revalidateLocationCaches([], [{ id: 0, name: 'Tacoma', slug: '' }, PORTLAND]);

    expect(postedTags()).toEqual(['collections-location-portland']);
  });

  it('drops a location with no slug field at all', async () => {
    await revalidateLocationCaches([], [{ id: 7, name: 'Bend' }, PORTLAND]);

    expect(postedTags()).toEqual(['collections-location-portland']);
  });

  it('posts nothing when neither set has a usable slug', async () => {
    await revalidateLocationCaches([], [{ id: 0, name: 'Tacoma', slug: '' }]);

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('swallows a rejected fetch rather than failing the save that called it', async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new Error('network down'));

    await expect(revalidateLocationCaches([SEATTLE], [PORTLAND])).resolves.toBeUndefined();
  });
});

describe('useCollectionEdit — location cache revalidation on save', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchOk();
    mockStorageGetFull.mockReturnValue(null);
    mockGetMetadata.mockResolvedValue(makeMetadata());
    mockGetCollectionUpdateMetadata.mockResolvedValue(makeResponse({ locations: [SEATTLE] }));
    mockUpdateCollection.mockResolvedValue(makeResponse({ locations: [PORTLAND] }));
  });

  it('revalidates the location the collection left as well as the one it moved to', async () => {
    const { result } = renderEdit(makeCollection({ locations: [SEATTLE] }));
    await waitFor(() => expect(result.current.currentState).not.toBeNull());

    await act(async () => {
      await result.current.handleUpdate({ locations: { prev: [PORTLAND.id] } });
    });

    expect(postedTags()).toContain('collections-location-seattle');
    expect(postedTags()).toContain('collections-location-portland');
  });

  it('builds the tag from the saved response, so a location created during the edit still resolves', async () => {
    mockUpdateCollection.mockResolvedValue(
      makeResponse({ locations: [{ id: 9, name: 'Tacoma', slug: 'tacoma' }] })
    );
    const { result } = renderEdit(makeCollection({ locations: [] }));
    await waitFor(() => expect(result.current.currentState).not.toBeNull());

    await act(async () => {
      await result.current.handleUpdate({ locations: { newValue: ['Tacoma'] } });
    });

    expect(postedTags()).toContain('collections-location-tacoma');
    expect(postedTags()).not.toContain('collections-location-');
  });

  it('posts no location tag when the collection has never had a location', async () => {
    mockGetCollectionUpdateMetadata.mockResolvedValue(makeResponse({ locations: [] }));
    mockUpdateCollection.mockResolvedValue(makeResponse({ locations: [] }));
    const { result } = renderEdit(makeCollection({ locations: [] }));
    await waitFor(() => expect(result.current.currentState).not.toBeNull());

    await act(async () => {
      await result.current.handleUpdate({ title: 'Renamed' });
    });

    expect(postedTags()).toEqual([]);
  });

  it('chains across consecutive saves, using the last saved locations as the next previous set', async () => {
    const { result } = renderEdit(makeCollection({ locations: [SEATTLE] }));
    await waitFor(() => expect(result.current.currentState).not.toBeNull());

    mockUpdateCollection.mockResolvedValue(makeResponse({ locations: [PORTLAND] }));
    await act(async () => {
      await result.current.handleUpdate({ locations: { prev: [PORTLAND.id] } });
    });

    expect(postedTags().sort()).toEqual([
      'collections-location-portland',
      'collections-location-seattle',
    ]);

    mockFetchOk();
    mockUpdateCollection.mockResolvedValue(makeResponse({ locations: [BEND] }));
    await act(async () => {
      await result.current.handleUpdate({ locations: { prev: [BEND.id] } });
    });

    expect(postedTags().sort()).toEqual([
      'collections-location-bend',
      'collections-location-portland',
    ]);
  });

  it('does not revalidate location tags when the save fails', async () => {
    mockUpdateCollection.mockRejectedValue(new Error('Server error'));
    const { result } = renderEdit(makeCollection({ locations: [SEATTLE] }));
    await waitFor(() => expect(result.current.currentState).not.toBeNull());

    await act(async () => {
      await result.current.handleUpdate({ locations: { prev: [PORTLAND.id] } });
    });

    expect(postedTags()).toEqual([]);
    expect(result.current.error).toBeTruthy();
  });
});
