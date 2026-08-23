/**
 * @jest-environment node
 *
 * Auth gate for POST /api/revalidate (D1).
 *
 * `proxy.ts` does not match `/api/*`, so this handler is the only thing standing between an
 * anonymous caller and an unbounded ISR cache purge. These tests pin the gate: local/dev stays
 * open (the repo's standing "localhost admin needs no login" rule), every other environment
 * requires an `ezac_session` cookie, and the revalidation itself must not run on a rejection.
 */

import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest } from 'next/server';

import { POST } from '@/app/api/revalidate/route';

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));

const mockRevalidateTag = revalidateTag as jest.MockedFunction<typeof revalidateTag>;
const mockRevalidatePath = revalidatePath as jest.MockedFunction<typeof revalidatePath>;

function makeRequest(body: unknown, cookie?: string) {
  return new NextRequest('http://localhost:3000/api/revalidate', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/revalidate — auth gate', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('non-local environments', () => {
    beforeEach(() => {
      process.env = { ...ORIGINAL_ENV, NODE_ENV: 'production', NEXT_PUBLIC_ENV: 'production' };
    });

    it('rejects an anonymous caller with 401', async () => {
      const res = await POST(makeRequest({ path: '/' }));

      expect(res.status).toBe(401);
      await expect(res.json()).resolves.toEqual({ error: 'Unauthorized' });
    });

    it('does NOT revalidate anything on a rejection', async () => {
      await POST(makeRequest({ path: '/', tags: ['collections-index'] }));

      expect(mockRevalidatePath).not.toHaveBeenCalled();
      expect(mockRevalidateTag).not.toHaveBeenCalled();
    });

    it('rejects when an unrelated cookie is present but ezac_session is not', async () => {
      const res = await POST(makeRequest({ path: '/' }, 'admin_token=abc; other=1'));

      expect(res.status).toBe(401);
    });

    it('rejects when ezac_session is present but empty', async () => {
      const res = await POST(makeRequest({ path: '/' }, 'ezac_session='));

      expect(res.status).toBe(401);
    });

    it('allows a caller carrying an ezac_session cookie', async () => {
      const res = await POST(makeRequest({ path: '/smith-wedding' }, 'ezac_session=abc123'));

      expect(res.status).toBe(200);
      expect(mockRevalidatePath).toHaveBeenCalledWith('/smith-wedding');
    });
  });

  describe('local/dev', () => {
    it('allows an anonymous caller in development', async () => {
      process.env = { ...ORIGINAL_ENV, NODE_ENV: 'development' };

      const res = await POST(makeRequest({ tag: 'collections-index' }));

      expect(res.status).toBe(200);
      expect(mockRevalidateTag).toHaveBeenCalledWith('collections-index', 'max');
    });

    it('allows an anonymous caller when NEXT_PUBLIC_ENV is local', async () => {
      process.env = { ...ORIGINAL_ENV, NODE_ENV: 'production', NEXT_PUBLIC_ENV: 'local' };

      const res = await POST(makeRequest({ tag: 'collections-index' }));

      expect(res.status).toBe(200);
    });
  });
});

describe('POST /api/revalidate — payload handling', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...ORIGINAL_ENV, NODE_ENV: 'development' };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('rejects a body carrying none of tag, tags, or path with 400', async () => {
    const res = await POST(makeRequest({}));

    expect(res.status).toBe(400);
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it('revalidates every string in tags and ignores non-string entries', async () => {
    const res = await POST(makeRequest({ tags: ['content-tags', 42, 'content-people'] }));

    expect(res.status).toBe(200);
    expect(mockRevalidateTag).toHaveBeenCalledTimes(2);
    expect(mockRevalidateTag).toHaveBeenCalledWith('content-tags', 'max');
    expect(mockRevalidateTag).toHaveBeenCalledWith('content-people', 'max');
  });

  it('revalidates tag and path together', async () => {
    const res = await POST(
      makeRequest({ tag: 'collection-smith-wedding', path: '/smith-wedding' })
    );

    expect(res.status).toBe(200);
    expect(mockRevalidateTag).toHaveBeenCalledWith('collection-smith-wedding', 'max');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/smith-wedding');
  });

  it('returns 500 when the body is not valid JSON', async () => {
    const req = new NextRequest('http://localhost:3000/api/revalidate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not json',
    });

    const res = await POST(req);

    expect(res.status).toBe(500);
  });
});
