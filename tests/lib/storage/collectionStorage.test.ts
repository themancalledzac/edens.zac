/**
 * Characterization tests for `app/lib/storage/collectionStorage.ts` (B8).
 *
 * The module had no tests at all. E3 is queued to rewrite it — collapsing the
 * plain/full `get`/`set`/`clear` trios into one generic pair, dropping `update`
 * and `updateFull` as aliases of `set`/`setFull`, and deleting the
 * `cached.slug !== slug` guards. This suite pins today's behavior so that
 * rewrite has a safety net, including the parts E3 intends to delete.
 *
 * Three things it deliberately over-specifies:
 *
 * 1. Every assertion goes through a literal storage key string
 *    (`collection_cache_<slug>` / `collection_full_cache_<slug>`) rather than
 *    round-tripping through the module's own API. A round trip passes even when
 *    both sides agree on a wrong key; a literal does not.
 * 2. `update` and `updateFull` are exercised independently of `set` and
 *    `setFull` even though they are one-line delegations today. If the generic
 *    collapse wires an alias to the wrong pair, that is what catches it.
 * 3. The `cached.slug !== slug` guards get their own describe. They are
 *    unreachable through the module's own API with string slugs — see the
 *    reasoning in that block — but they are reachable from a foreign write to
 *    the same key, and removing them changes what `get` returns in that case.
 */

import { collectionStorage } from '@/app/lib/storage/collectionStorage';
import { type CollectionModel, type CollectionUpdateResponseDTO } from '@/app/types/Collection';
import { type ContentImageModel } from '@/app/types/Content';
import { logger } from '@/app/utils/logger';
import {
  createCollectionModel,
  createImageContent,
  createTextContent,
} from '@/tests/fixtures/contentFixtures';

const PLAIN_PREFIX = 'collection_cache_';
const FULL_PREFIX = 'collection_full_cache_';
const CACHE_DURATION_MS = 30 * 60 * 1000;
const NOW = 1_700_000_000_000;

interface StoredEnvelope {
  data: unknown;
  timestamp: number;
  slug: unknown;
}

/** `collectionStorage` viewed through a signature a plain-JS caller could reach. */
interface LooseCollectionStorage {
  set(slug: unknown, data: CollectionModel): void;
}

const looseStorage = collectionStorage as unknown as LooseCollectionStorage;

function storageKeys(): string[] {
  return Object.keys(sessionStorage).sort();
}

function readEnvelope(key: string): StoredEnvelope {
  const raw = sessionStorage.getItem(key);
  if (raw === null) throw new Error(`expected an entry at ${key}`);
  return JSON.parse(raw) as StoredEnvelope;
}

function writeRaw(key: string, payload: unknown): void {
  sessionStorage.setItem(key, JSON.stringify(payload));
}

function fullResponse(overrides: Partial<CollectionUpdateResponseDTO> = {}) {
  return {
    collection: createCollectionModel(7, { slug: 'wedding' }),
    hasChildren: true,
    childCollectionIds: [11, 12],
    ...overrides,
  } satisfies CollectionUpdateResponseDTO;
}

let nowSpy: jest.SpyInstance<number, []>;

beforeEach(() => {
  sessionStorage.clear();
  nowSpy = jest.spyOn(Date, 'now').mockReturnValue(NOW);
});

afterEach(() => {
  nowSpy.mockRestore();
  jest.restoreAllMocks();
});

describe('storage keys', () => {
  it('set writes exactly collection_cache_<slug>', () => {
    collectionStorage.set('wedding', createCollectionModel(7, { slug: 'wedding' }));

    expect(storageKeys()).toEqual(['collection_cache_wedding']);
  });

  it('setFull writes exactly collection_full_cache_<slug>', () => {
    collectionStorage.setFull('wedding', fullResponse());

    expect(storageKeys()).toEqual(['collection_full_cache_wedding']);
  });

  it('update writes exactly collection_cache_<slug> and nothing else', () => {
    collectionStorage.update('wedding', createCollectionModel(7, { slug: 'wedding' }));

    expect(storageKeys()).toEqual(['collection_cache_wedding']);
  });

  it('updateFull writes exactly collection_full_cache_<slug> and nothing else', () => {
    collectionStorage.updateFull('wedding', fullResponse());

    expect(storageKeys()).toEqual(['collection_full_cache_wedding']);
  });

  it('the two prefixes are distinct keys for the same slug', () => {
    collectionStorage.set('wedding', createCollectionModel(7, { slug: 'wedding' }));
    collectionStorage.setFull('wedding', fullResponse());

    expect(storageKeys()).toEqual(['collection_cache_wedding', 'collection_full_cache_wedding']);
  });

  it('the full prefix does not start with the plain prefix', () => {
    expect(FULL_PREFIX.startsWith(PLAIN_PREFIX)).toBe(false);
  });

  it('stores a { data, timestamp, slug } envelope, not the bare collection', () => {
    const collection = createCollectionModel(7, { slug: 'wedding' });

    collectionStorage.set('wedding', collection);

    expect(readEnvelope('collection_cache_wedding')).toEqual({
      data: collection,
      timestamp: NOW,
      slug: 'wedding',
    });
  });

  it('stores the same envelope shape for the full cache', () => {
    const response = fullResponse();

    collectionStorage.setFull('wedding', response);

    expect(readEnvelope('collection_full_cache_wedding')).toEqual({
      data: response,
      timestamp: NOW,
      slug: 'wedding',
    });
  });

  it('keys slugs verbatim, including hyphens and slashes', () => {
    collectionStorage.set('a-b/c_d', createCollectionModel(1, { slug: 'a-b/c_d' }));

    expect(sessionStorage.getItem('collection_cache_a-b/c_d')).not.toBeNull();
  });
});

describe('set and get', () => {
  it('returns the cached collection for the slug it was stored under', () => {
    const collection = createCollectionModel(7, { slug: 'wedding' });
    collectionStorage.set('wedding', collection);

    expect(collectionStorage.get('wedding')).toEqual(collection);
  });

  it('returns null for a slug that was never written', () => {
    expect(collectionStorage.get('never-set')).toBeNull();
  });

  it('keeps two slugs independent', () => {
    const wedding = createCollectionModel(7, { slug: 'wedding' });
    const portraits = createCollectionModel(8, { slug: 'portraits' });

    collectionStorage.set('wedding', wedding);
    collectionStorage.set('portraits', portraits);

    expect(collectionStorage.get('wedding')).toEqual(wedding);
    expect(collectionStorage.get('portraits')).toEqual(portraits);
  });

  it('get does not read the full cache', () => {
    collectionStorage.setFull('wedding', fullResponse());

    expect(collectionStorage.get('wedding')).toBeNull();
  });

  it('getFull does not read the plain cache', () => {
    collectionStorage.set('wedding', createCollectionModel(7, { slug: 'wedding' }));

    expect(collectionStorage.getFull('wedding')).toBeNull();
  });

  it('getFull returns the cached response for the slug it was stored under', () => {
    const response = fullResponse();
    collectionStorage.setFull('wedding', response);

    expect(collectionStorage.getFull('wedding')).toEqual(response);
  });

  it('getFull returns null for a slug that was never written', () => {
    expect(collectionStorage.getFull('never-set')).toBeNull();
  });

  it('set overwrites a previous entry for the same slug', () => {
    collectionStorage.set('wedding', createCollectionModel(7, { title: 'First' }));
    collectionStorage.set('wedding', createCollectionModel(7, { title: 'Second' }));

    expect(collectionStorage.get('wedding')?.title).toBe('Second');
    expect(storageKeys()).toEqual(['collection_cache_wedding']);
  });
});

describe('30-minute TTL', () => {
  it('returns an entry written 29:59.999 ago', () => {
    collectionStorage.set('wedding', createCollectionModel(7));
    nowSpy.mockReturnValue(NOW + CACHE_DURATION_MS - 1);

    expect(collectionStorage.get('wedding')).not.toBeNull();
  });

  it('treats an entry exactly 30:00.000 old as expired', () => {
    collectionStorage.set('wedding', createCollectionModel(7));
    nowSpy.mockReturnValue(NOW + CACHE_DURATION_MS);

    expect(collectionStorage.get('wedding')).toBeNull();
  });

  it('removes the expired plain entry rather than leaving it', () => {
    collectionStorage.set('wedding', createCollectionModel(7));
    nowSpy.mockReturnValue(NOW + CACHE_DURATION_MS);

    collectionStorage.get('wedding');

    expect(storageKeys()).toEqual([]);
  });

  it('applies the same 30-minute boundary to the full cache', () => {
    collectionStorage.setFull('wedding', fullResponse());

    nowSpy.mockReturnValue(NOW + CACHE_DURATION_MS - 1);
    expect(collectionStorage.getFull('wedding')).not.toBeNull();

    nowSpy.mockReturnValue(NOW + CACHE_DURATION_MS);
    expect(collectionStorage.getFull('wedding')).toBeNull();
  });

  it('removes the expired full entry rather than leaving it', () => {
    collectionStorage.setFull('wedding', fullResponse());
    nowSpy.mockReturnValue(NOW + CACHE_DURATION_MS);

    collectionStorage.getFull('wedding');

    expect(storageKeys()).toEqual([]);
  });

  it('expiring the plain entry leaves the full entry alone', () => {
    collectionStorage.set('wedding', createCollectionModel(7));
    collectionStorage.setFull('wedding', fullResponse());
    nowSpy.mockReturnValue(NOW + CACHE_DURATION_MS);

    collectionStorage.get('wedding');

    expect(storageKeys()).toEqual(['collection_full_cache_wedding']);
  });

  it('treats a future timestamp as valid because the age goes negative', () => {
    writeRaw('collection_cache_wedding', {
      data: createCollectionModel(7),
      timestamp: NOW + 60_000,
      slug: 'wedding',
    });

    expect(collectionStorage.get('wedding')).not.toBeNull();
  });
});

/**
 * `update` and `updateFull` delegate to `set` and `setFull` today. These tests
 * never touch `set`/`setFull`, so they stay meaningful if E3 collapses the
 * trios and re-implements the aliases directly.
 */
describe('update and updateFull, exercised on their own', () => {
  it('update writes an entry that get can read back', () => {
    const collection = createCollectionModel(7, { slug: 'wedding' });

    collectionStorage.update('wedding', collection);

    expect(collectionStorage.get('wedding')).toEqual(collection);
  });

  it('update writes the literal plain key with the full envelope', () => {
    const collection = createCollectionModel(7, { slug: 'wedding' });

    collectionStorage.update('wedding', collection);

    expect(readEnvelope('collection_cache_wedding')).toEqual({
      data: collection,
      timestamp: NOW,
      slug: 'wedding',
    });
  });

  it('update creates an entry when none exists', () => {
    collectionStorage.update('brand-new', createCollectionModel(9, { slug: 'brand-new' }));

    expect(sessionStorage.getItem('collection_cache_brand-new')).not.toBeNull();
  });

  it('update overwrites existing data and refreshes the timestamp', () => {
    collectionStorage.set('wedding', createCollectionModel(7, { title: 'Old' }));
    nowSpy.mockReturnValue(NOW + 10_000);

    collectionStorage.update('wedding', createCollectionModel(7, { title: 'New' }));

    const envelope = readEnvelope('collection_cache_wedding');
    expect(envelope.timestamp).toBe(NOW + 10_000);
    expect((envelope.data as CollectionModel).title).toBe('New');
  });

  it('update revives an entry that was about to expire', () => {
    collectionStorage.set('wedding', createCollectionModel(7));
    nowSpy.mockReturnValue(NOW + CACHE_DURATION_MS - 1);
    collectionStorage.update('wedding', createCollectionModel(7));

    nowSpy.mockReturnValue(NOW + CACHE_DURATION_MS + 1);

    expect(collectionStorage.get('wedding')).not.toBeNull();
  });

  it('update never touches the full cache', () => {
    collectionStorage.setFull('wedding', fullResponse());
    const before = sessionStorage.getItem('collection_full_cache_wedding');

    collectionStorage.update('wedding', createCollectionModel(7));

    expect(sessionStorage.getItem('collection_full_cache_wedding')).toBe(before);
  });

  it('updateFull writes an entry that getFull can read back', () => {
    const response = fullResponse();

    collectionStorage.updateFull('wedding', response);

    expect(collectionStorage.getFull('wedding')).toEqual(response);
  });

  it('updateFull writes the literal full key with the full envelope', () => {
    const response = fullResponse();

    collectionStorage.updateFull('wedding', response);

    expect(readEnvelope('collection_full_cache_wedding')).toEqual({
      data: response,
      timestamp: NOW,
      slug: 'wedding',
    });
  });

  it('updateFull never writes to the plain key', () => {
    collectionStorage.updateFull('wedding', fullResponse());

    expect(sessionStorage.getItem('collection_cache_wedding')).toBeNull();
    expect(collectionStorage.get('wedding')).toBeNull();
  });

  it('updateFull overwrites existing data and refreshes the timestamp', () => {
    collectionStorage.setFull('wedding', fullResponse({ hasChildren: false }));
    nowSpy.mockReturnValue(NOW + 10_000);

    collectionStorage.updateFull('wedding', fullResponse({ hasChildren: true }));

    const envelope = readEnvelope('collection_full_cache_wedding');
    expect(envelope.timestamp).toBe(NOW + 10_000);
    expect((envelope.data as CollectionUpdateResponseDTO).hasChildren).toBe(true);
  });

  it('updateFull creates an entry when none exists', () => {
    collectionStorage.updateFull('brand-new', fullResponse());

    expect(sessionStorage.getItem('collection_full_cache_brand-new')).not.toBeNull();
  });

  it('update and updateFull for the same slug coexist without clobbering', () => {
    collectionStorage.update('wedding', createCollectionModel(7, { title: 'Plain' }));
    collectionStorage.updateFull('wedding', fullResponse());

    expect(collectionStorage.get('wedding')?.title).toBe('Plain');
    expect(collectionStorage.getFull('wedding')?.hasChildren).toBe(true);
  });
});

describe('clear and clearFull', () => {
  it('clear removes only the plain key for that slug', () => {
    collectionStorage.set('wedding', createCollectionModel(7));
    collectionStorage.setFull('wedding', fullResponse());
    collectionStorage.set('portraits', createCollectionModel(8));

    collectionStorage.clear('wedding');

    expect(storageKeys()).toEqual(['collection_cache_portraits', 'collection_full_cache_wedding']);
  });

  it('clearFull removes only the full key for that slug', () => {
    collectionStorage.set('wedding', createCollectionModel(7));
    collectionStorage.setFull('wedding', fullResponse());
    collectionStorage.setFull('portraits', fullResponse());

    collectionStorage.clearFull('wedding');

    expect(storageKeys()).toEqual(['collection_cache_wedding', 'collection_full_cache_portraits']);
  });

  it('clear is a no-op for a slug that was never cached', () => {
    collectionStorage.set('wedding', createCollectionModel(7));

    collectionStorage.clear('portraits');

    expect(storageKeys()).toEqual(['collection_cache_wedding']);
  });

  it('clearFull is a no-op for a slug that was never cached', () => {
    collectionStorage.setFull('wedding', fullResponse());

    collectionStorage.clearFull('portraits');

    expect(storageKeys()).toEqual(['collection_full_cache_wedding']);
  });
});

describe('clearAll', () => {
  it('removes both prefixes across several slugs', () => {
    collectionStorage.set('wedding', createCollectionModel(7));
    collectionStorage.set('portraits', createCollectionModel(8));
    collectionStorage.setFull('wedding', fullResponse());
    collectionStorage.setFull('portraits', fullResponse());

    collectionStorage.clearAll();

    expect(storageKeys()).toEqual([]);
  });

  it('removes full-cache entries even when no plain entry exists', () => {
    collectionStorage.setFull('wedding', fullResponse());

    collectionStorage.clearAll();

    expect(storageKeys()).toEqual([]);
  });

  it('leaves unrelated sessionStorage keys untouched', () => {
    sessionStorage.setItem('auth_token', 'abc');
    sessionStorage.setItem('collection', 'not-a-cache-key');
    collectionStorage.set('wedding', createCollectionModel(7));
    collectionStorage.setFull('wedding', fullResponse());

    collectionStorage.clearAll();

    expect(storageKeys()).toEqual(['auth_token', 'collection']);
  });

  it('is a no-op on empty storage', () => {
    expect(() => collectionStorage.clearAll()).not.toThrow();
    expect(storageKeys()).toEqual([]);
  });
});

describe('updateImagesInCache', () => {
  function cachedWithContent(): CollectionModel {
    return createCollectionModel(7, {
      slug: 'wedding',
      content: [
        createImageContent(1, { title: 'One', visible: true }),
        createImageContent(2, { title: 'Two', visible: true }),
      ],
    });
  }

  it('replaces a matching IMAGE block by id', () => {
    collectionStorage.set('wedding', cachedWithContent());
    const updated: ContentImageModel = createImageContent(2, {
      title: 'Two edited',
      visible: false,
    });

    collectionStorage.updateImagesInCache('wedding', [updated]);

    expect(collectionStorage.get('wedding')?.content?.[1]).toEqual(updated);
  });

  it('leaves non-matching blocks byte-identical', () => {
    const cached = cachedWithContent();
    collectionStorage.set('wedding', cached);

    collectionStorage.updateImagesInCache('wedding', [createImageContent(2, { title: 'Edited' })]);

    expect(collectionStorage.get('wedding')?.content?.[0]).toEqual(cached.content?.[0]);
  });

  it('replaces wholesale rather than merging, so omitted fields disappear', () => {
    collectionStorage.set(
      'wedding',
      createCollectionModel(7, {
        content: [createImageContent(1, { title: 'Keep me', caption: 'Original caption' })],
      })
    );

    collectionStorage.updateImagesInCache('wedding', [createImageContent(1, { title: 'Keep me' })]);

    expect(collectionStorage.get('wedding')?.content?.[0]).not.toHaveProperty(
      'caption',
      'Original caption'
    );
  });

  it('ignores updated images whose id is not in the cached content', () => {
    const cached = cachedWithContent();
    collectionStorage.set('wedding', cached);

    collectionStorage.updateImagesInCache('wedding', [createImageContent(99, { title: 'Ghost' })]);

    expect(collectionStorage.get('wedding')?.content).toEqual(cached.content);
  });

  it('does not replace a non-IMAGE block whose id collides with an updated image', () => {
    const textBlock = createTextContent(1);
    collectionStorage.set('wedding', createCollectionModel(7, { content: [textBlock] }));

    collectionStorage.updateImagesInCache('wedding', [createImageContent(1, { title: 'Image 1' })]);

    expect(collectionStorage.get('wedding')?.content?.[0]).toEqual(textBlock);
  });

  it('preserves an empty content array', () => {
    collectionStorage.set('wedding', createCollectionModel(7, { content: [] }));

    collectionStorage.updateImagesInCache('wedding', [createImageContent(1)]);

    expect(collectionStorage.get('wedding')?.content).toEqual([]);
  });

  it('tolerates a cached collection with no content field', () => {
    collectionStorage.set('wedding', createCollectionModel(7, { content: undefined }));

    expect(() =>
      collectionStorage.updateImagesInCache('wedding', [createImageContent(1)])
    ).not.toThrow();
    expect(collectionStorage.get('wedding')?.content).toBeUndefined();
  });

  it('writes nothing when no cache exists for the slug', () => {
    collectionStorage.updateImagesInCache('never-cached', [createImageContent(1)]);

    expect(storageKeys()).toEqual([]);
  });

  it('does not warn about a cache miss outside a local environment', () => {
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {});

    collectionStorage.updateImagesInCache('never-cached', [createImageContent(1)]);

    expect(warn).not.toHaveBeenCalled();
  });

  it('warns about a cache miss in a local environment', () => {
    const original = process.env.NEXT_PUBLIC_ENV;
    process.env.NEXT_PUBLIC_ENV = 'local';
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {});

    collectionStorage.updateImagesInCache('never-cached', [createImageContent(1)]);

    expect(warn).toHaveBeenCalledWith('collectionStorage', 'No cache found for slug: never-cached');
    process.env.NEXT_PUBLIC_ENV = original;
  });

  it('does nothing when the cached entry has expired, and drops the entry', () => {
    collectionStorage.set('wedding', cachedWithContent());
    nowSpy.mockReturnValue(NOW + CACHE_DURATION_MS);

    collectionStorage.updateImagesInCache('wedding', [createImageContent(1, { title: 'Edited' })]);

    expect(storageKeys()).toEqual([]);
  });

  it('refreshes the cache timestamp as a side effect', () => {
    collectionStorage.set('wedding', cachedWithContent());
    nowSpy.mockReturnValue(NOW + 5000);

    collectionStorage.updateImagesInCache('wedding', [createImageContent(1, { title: 'Edited' })]);

    expect(readEnvelope('collection_cache_wedding').timestamp).toBe(NOW + 5000);
  });

  it('writes only to the plain key', () => {
    collectionStorage.set('wedding', cachedWithContent());

    collectionStorage.updateImagesInCache('wedding', [createImageContent(1, { title: 'Edited' })]);

    expect(storageKeys()).toEqual(['collection_cache_wedding']);
  });

  it('applies the last entry when the same id appears twice in the update list', () => {
    collectionStorage.set('wedding', cachedWithContent());

    collectionStorage.updateImagesInCache('wedding', [
      createImageContent(1, { title: 'First write' }),
      createImageContent(1, { title: 'Second write' }),
    ]);

    expect(collectionStorage.get('wedding')?.content?.[0]).toHaveProperty('title', 'Second write');
  });
});

/**
 * The board claims the `cached.slug !== slug` checks in `get` and `getFull` are
 * unreachable and E3 removes them.
 *
 * They are unreachable through the module's own API. `getStorageKey` is string
 * concatenation onto a fixed prefix, so it is injective: two different slugs can
 * never produce the same key, and `set(slug, …)` always writes `slug` into the
 * envelope stored at that slug's key. The plain and full prefixes cannot alias
 * each other either — `collection_full_cache_` does not start with
 * `collection_cache_`. Nothing else in `app/` writes these keys.
 *
 * They are reachable from outside the API: a foreign write to the same key
 * (devtools, an older key scheme still in the tab's sessionStorage, a future
 * module) or a plain-JS caller passing a non-string slug. In that case the guard
 * is what makes `get` evict and return null instead of returning the foreign
 * payload's `data`. These tests pin that difference.
 */
describe('the cached.slug !== slug guard', () => {
  it('never fires for any set/get pair through the module API', () => {
    const slugs = ['a', 'a-b', 'collection_cache_a', 'full_cache_x', '', '42', 'a/b'];

    for (const slug of slugs) {
      collectionStorage.set(slug, createCollectionModel(1, { slug }));
    }

    for (const slug of slugs) {
      expect(collectionStorage.get(slug)).not.toBeNull();
    }
  });

  it('never lets one slug read another slug entry', () => {
    collectionStorage.set('a', createCollectionModel(1, { title: 'A' }));
    collectionStorage.set('a-b', createCollectionModel(2, { title: 'AB' }));

    expect(collectionStorage.get('a')?.title).toBe('A');
    expect(collectionStorage.get('a-b')?.title).toBe('AB');
  });

  it('get evicts and returns null when a foreign payload names a different slug', () => {
    writeRaw('collection_cache_wedding', {
      data: createCollectionModel(7, { title: 'Foreign' }),
      timestamp: NOW,
      slug: 'portraits',
    });

    expect(collectionStorage.get('wedding')).toBeNull();
    expect(storageKeys()).toEqual([]);
  });

  it('get evicts and returns null when a foreign payload has no slug field', () => {
    writeRaw('collection_cache_wedding', {
      data: createCollectionModel(7, { title: 'Foreign' }),
      timestamp: NOW,
    });

    expect(collectionStorage.get('wedding')).toBeNull();
    expect(storageKeys()).toEqual([]);
  });

  it('getFull evicts and returns null when a foreign payload names a different slug', () => {
    writeRaw('collection_full_cache_wedding', {
      data: fullResponse(),
      timestamp: NOW,
      slug: 'portraits',
    });

    expect(collectionStorage.getFull('wedding')).toBeNull();
    expect(storageKeys()).toEqual([]);
  });

  it('getFull evicts and returns null when a foreign payload has no slug field', () => {
    writeRaw('collection_full_cache_wedding', { data: fullResponse(), timestamp: NOW });

    expect(collectionStorage.getFull('wedding')).toBeNull();
    expect(storageKeys()).toEqual([]);
  });

  it('fires when a plain-JS caller stores under a numeric slug and reads with a string', () => {
    looseStorage.set(42, createCollectionModel(7, { title: 'Numeric slug' }));
    expect(sessionStorage.getItem('collection_cache_42')).not.toBeNull();

    expect(collectionStorage.get('42')).toBeNull();
    expect(storageKeys()).toEqual([]);
  });

  it('checks the slug before the TTL, so a fresh mismatched entry is still evicted', () => {
    writeRaw('collection_cache_wedding', {
      data: createCollectionModel(7),
      timestamp: NOW,
      slug: 'portraits',
    });

    expect(collectionStorage.get('wedding')).toBeNull();
  });
});

describe('graceful degradation', () => {
  it('set swallows a quota error instead of throwing', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => collectionStorage.set('wedding', createCollectionModel(7))).not.toThrow();
  });

  it('setFull swallows a quota error instead of throwing', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => collectionStorage.setFull('wedding', fullResponse())).not.toThrow();
  });

  it('get returns null on malformed JSON and leaves the bad entry in place', () => {
    sessionStorage.setItem('collection_cache_wedding', 'not-json{');

    expect(collectionStorage.get('wedding')).toBeNull();
    expect(sessionStorage.getItem('collection_cache_wedding')).toBe('not-json{');
  });

  it('getFull returns null on malformed JSON and leaves the bad entry in place', () => {
    sessionStorage.setItem('collection_full_cache_wedding', 'not-json{');

    expect(collectionStorage.getFull('wedding')).toBeNull();
    expect(sessionStorage.getItem('collection_full_cache_wedding')).toBe('not-json{');
  });

  it('get returns null when reading throws', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(collectionStorage.get('wedding')).toBeNull();
  });

  it('getFull returns null when reading throws', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(collectionStorage.getFull('wedding')).toBeNull();
  });

  it('clear swallows a removal error', () => {
    jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(() => collectionStorage.clear('wedding')).not.toThrow();
  });

  it('clearFull swallows a removal error', () => {
    jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(() => collectionStorage.clearFull('wedding')).not.toThrow();
  });

  it('clearAll swallows a removal error', () => {
    collectionStorage.set('wedding', createCollectionModel(7));
    jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(() => collectionStorage.clearAll()).not.toThrow();
  });

  it('updateImagesInCache swallows a write error', () => {
    collectionStorage.set(
      'wedding',
      createCollectionModel(7, { content: [createImageContent(1)] })
    );
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() =>
      collectionStorage.updateImagesInCache('wedding', [createImageContent(1, { title: 'Edited' })])
    ).not.toThrow();
  });

  it('logs the write failure through logger.warn with the module tag', () => {
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {});
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    collectionStorage.set('wedding', createCollectionModel(7));

    expect(warn).toHaveBeenCalledWith(
      'collectionStorage',
      'set: failed to write cache for slug: wedding',
      expect.objectContaining({ error: expect.any(Error) })
    );
  });
});
