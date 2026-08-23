/**
 * @jest-environment node
 *
 * Gates on POST /api/revalidate.
 *
 * `proxy.ts` does not match `/api/*`, so this handler is the only thing standing between a
 * hostile caller and an unbounded ISR cache purge. Two gates, pinned here:
 *
 * - Session (D1): local/dev stays open (the repo's standing "localhost admin needs no login"
 *   rule), every other environment requires an `ezac_session` cookie.
 * - Origin (D6): the request must carry an allowed `Origin` in EVERY environment, because the
 *   session cookie rides along on cross-site POSTs and so cannot stop CSRF on its own.
 *
 * Neither gate may let the revalidation itself run on a rejection.
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

/** The deployed app origin, mirrored into `NEXT_PUBLIC_APP_URL` by every describe below. */
const APP_ORIGIN = 'https://example.com';

/**
 * Builds a request carrying an allowed Origin by default, so cases about the session gate are
 * not silently answered by the Origin gate. Pass `origin: null` to omit the header entirely.
 */
function makeRequest(
  body: unknown,
  { cookie, origin = APP_ORIGIN }: { cookie?: string; origin?: string | null } = {}
) {
  return new NextRequest('http://localhost:3000/api/revalidate', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {}),
      ...(origin ? { origin } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/revalidate — auth gate', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...ORIGINAL_ENV, NEXT_PUBLIC_APP_URL: APP_ORIGIN };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('non-local environments', () => {
    beforeEach(() => {
      process.env = {
        ...ORIGINAL_ENV,
        NODE_ENV: 'production',
        NEXT_PUBLIC_ENV: 'production',
        NEXT_PUBLIC_APP_URL: APP_ORIGIN,
      };
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
      const res = await POST(makeRequest({ path: '/' }, { cookie: 'admin_token=abc; other=1' }));

      expect(res.status).toBe(401);
    });

    it('rejects when ezac_session is present but empty', async () => {
      const res = await POST(makeRequest({ path: '/' }, { cookie: 'ezac_session=' }));

      expect(res.status).toBe(401);
    });

    it('reports a missing session as 401, not 403, even when the Origin is also missing', async () => {
      const res = await POST(makeRequest({ path: '/' }, { origin: null }));

      expect(res.status).toBe(401);
    });

    it('allows a caller carrying an ezac_session cookie', async () => {
      const res = await POST(
        makeRequest({ path: '/smith-wedding' }, { cookie: 'ezac_session=abc123' })
      );

      expect(res.status).toBe(200);
      expect(mockRevalidatePath).toHaveBeenCalledWith('/smith-wedding');
    });
  });

  describe('local/dev', () => {
    it('allows an anonymous caller in development', async () => {
      process.env = {
        ...ORIGINAL_ENV,
        NODE_ENV: 'development',
        NEXT_PUBLIC_APP_URL: APP_ORIGIN,
      };

      const res = await POST(makeRequest({ tag: 'collections-index' }));

      expect(res.status).toBe(200);
      expect(mockRevalidateTag).toHaveBeenCalledWith('collections-index', 'max');
    });

    it('allows an anonymous caller when NEXT_PUBLIC_ENV is local', async () => {
      process.env = {
        ...ORIGINAL_ENV,
        NODE_ENV: 'production',
        NEXT_PUBLIC_ENV: 'local',
        NEXT_PUBLIC_APP_URL: APP_ORIGIN,
      };

      const res = await POST(makeRequest({ tag: 'collections-index' }));

      expect(res.status).toBe(200);
    });
  });
});

describe('POST /api/revalidate — Origin allowlist', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('production', () => {
    beforeEach(() => {
      process.env = {
        ...ORIGINAL_ENV,
        NODE_ENV: 'production',
        NEXT_PUBLIC_ENV: 'production',
        NEXT_PUBLIC_APP_URL: APP_ORIGIN,
      };
    });

    const session = { cookie: 'ezac_session=abc123' };

    it('allows the configured app origin', async () => {
      const res = await POST(makeRequest({ tag: 'collections-index' }, session));

      expect(res.status).toBe(200);
    });

    it('rejects a hostile cross-site origin with 403 despite a valid session', async () => {
      const res = await POST(
        makeRequest({ path: '/' }, { ...session, origin: 'https://evil.example' })
      );

      expect(res.status).toBe(403);
      await expect(res.json()).resolves.toEqual({ error: 'Forbidden' });
    });

    it('does NOT revalidate anything when the origin is rejected', async () => {
      await POST(
        makeRequest(
          { path: '/', tags: ['collections-index'] },
          { ...session, origin: 'https://evil.example' }
        )
      );

      expect(mockRevalidatePath).not.toHaveBeenCalled();
      expect(mockRevalidateTag).not.toHaveBeenCalled();
    });

    it('rejects a request with no Origin header at all', async () => {
      const res = await POST(makeRequest({ path: '/' }, { ...session, origin: null }));

      expect(res.status).toBe(403);
    });

    it('rejects the dev ports in production — the localhost allowance is development-only', async () => {
      const res = await POST(
        makeRequest({ path: '/' }, { ...session, origin: 'http://localhost:3000' })
      );

      expect(res.status).toBe(403);
    });

    it('rejects a LAN origin in production', async () => {
      const res = await POST(
        makeRequest({ path: '/' }, { ...session, origin: 'http://192.168.68.60:3000' })
      );

      expect(res.status).toBe(403);
    });
  });

  describe('development', () => {
    beforeEach(() => {
      process.env = {
        ...ORIGINAL_ENV,
        NODE_ENV: 'development',
        NEXT_PUBLIC_APP_URL: APP_ORIGIN,
      };
    });

    it('allows the local dev port', async () => {
      const res = await POST(
        makeRequest({ tag: 'collections-index' }, { origin: 'http://localhost:3000' })
      );

      expect(res.status).toBe(200);
    });

    it('allows a LAN origin on a dev port, for phone testing', async () => {
      const res = await POST(
        makeRequest({ tag: 'collections-index' }, { origin: 'http://192.168.68.60:3000' })
      );

      expect(res.status).toBe(200);
    });

    it('still rejects a hostile origin — local is exempt from login, not from CSRF', async () => {
      const res = await POST(makeRequest({ path: '/' }, { origin: 'https://evil.example' }));

      expect(res.status).toBe(403);
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
  });
});

describe('POST /api/revalidate — payload handling', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...ORIGINAL_ENV, NODE_ENV: 'development', NEXT_PUBLIC_APP_URL: APP_ORIGIN };
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
      headers: { 'content-type': 'application/json', origin: APP_ORIGIN },
      body: 'not json',
    });

    const res = await POST(req);

    expect(res.status).toBe(500);
  });
});
