/**
 * @jest-environment node
 *
 * Pins the one Next behavior `getCollectionBySlug` relies on for per-viewer safety: request headers
 * are hashed into the fetch cache key, so two viewers with different `Cookie` values cannot share a
 * cached response body. `getCollectionBySlug` opts into the data cache with `next.revalidate`, and
 * `fetchReadApi` forwards the inbound cookie server-side, so a header-blind cache key would serve
 * one viewer's unlocked gallery to another.
 *
 * A failure here means a Next upgrade changed the cache-key contract. Do not relax this test —
 * recheck `getCollectionBySlug` before it ships.
 */

import { IncrementalCache } from 'next/dist/server/lib/incremental-cache';

const URL_UNDER_TEST = 'https://api.example.com/api/read/collections/smith-wedding?page=0&size=500';

function cacheKey(init: RequestInit): Promise<string> {
  return IncrementalCache.prototype.generateCacheKey.call(
    { fetchCacheKeyPrefix: '' } as IncrementalCache,
    URL_UNDER_TEST,
    init
  );
}

describe('Next fetch cache key — request headers are part of the key', () => {
  it('exposes generateCacheKey on IncrementalCache.prototype', () => {
    expect(typeof IncrementalCache.prototype.generateCacheKey).toBe('function');
  });

  it('hashes a Cookie header into the key', async () => {
    const withCookie = await cacheKey({ headers: { cookie: 'gallery_access_smith-wedding=abc' } });
    const withoutCookie = await cacheKey({});

    expect(withCookie).not.toBe(withoutCookie);
  });

  it('gives two different cookie values two different keys', async () => {
    const viewerA = await cacheKey({ headers: { cookie: 'gallery_access_smith-wedding=abc' } });
    const viewerB = await cacheKey({ headers: { cookie: 'gallery_access_smith-wedding=xyz' } });

    expect(viewerA).not.toBe(viewerB);
  });

  it('gives one cookie value a stable key across calls', async () => {
    const first = await cacheKey({ headers: { cookie: 'gallery_access_smith-wedding=abc' } });
    const second = await cacheKey({ headers: { cookie: 'gallery_access_smith-wedding=abc' } });

    expect(first).toBe(second);
  });
});
