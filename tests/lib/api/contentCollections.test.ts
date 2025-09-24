import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Jest config is set up; use vi as compatible API (vitest shim available in next/jest env)

vi.mock('next/navigation', () => ({ notFound: vi.fn(() => { throw new Error('NOT_FOUND_THROW'); }) }));

import { collectionCacheTags, fetchCollectionBySlug, fetchCollections, fetchCollectionsByType } from '@/lib/api/contentCollections';

const originalEnv = process.env;

describe('lib/api/contentCollections (RSC friendly)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn();
    process.env = { ...originalEnv, NEXT_PUBLIC_API_URL: 'https://api.example.com' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('adds Next.js cache tags for index list', async () => {
    const data = [];
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(new Response(JSON.stringify(data), { status: 200, headers: { 'content-type': 'application/json' } }));

    await fetchCollections(0, 10);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [, init] = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init?.next).toEqual({ revalidate: 3600, tags: [collectionCacheTags.tagForIndex()] });
  });

  it('adds Next.js cache tags for slug fetch', async () => {
    const payload = { id: '1', slug: 'abc', title: 't', type: 'BLOG', page: { page:0, size:1, totalPages:1, totalBlocks:0 }, blocks: [] };
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } }));

    await fetchCollectionBySlug('abc', 0, 30);
    const [, init] = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init?.next?.tags).toEqual(['collection-abc']);
  });

  it('adds Next.js cache tags for type fetch', async () => {
    const data = [];
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(new Response(JSON.stringify(data), { status: 200, headers: { 'content-type': 'application/json' } }));

    await fetchCollectionsByType('BLOG', 0, 10);
    const [, init] = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init?.next?.tags).toEqual(['collections-type-BLOG']);
  });

  it('calls notFound() on 404s', async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(new Response('not found', { status: 404, headers: { 'content-type': 'text/plain' } }));

    await expect(fetchCollectionBySlug('missing')).rejects.toThrow('NOT_FOUND_THROW');
  });

  it('throws on non-JSON responses', async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(new Response('html', { status: 200, headers: { 'content-type': 'text/html' } }));

    await expect(fetchCollections()).rejects.toThrow('Unexpected non-JSON response');
  });
});
