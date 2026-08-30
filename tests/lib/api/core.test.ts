/**
 * Unit tests for core.ts
 * Tests API utilities including error handling and fetch functions
 */

import {
  ApiError,
  clientFetch,
  clientFetchJson,
  fetchAdminDeleteApi,
  fetchAdminGetApi,
  fetchAdminPatchJsonApi,
  fetchAdminPostJsonApi,
  fetchAdminPutJsonApi,
  fetchEditPatchJsonApi,
  fetchEditPostJsonApi,
  fetchReadApi,
  getApiBaseUrl,
  getServerCookieHeader,
  throwFromResponse,
} from '@/app/lib/api/core';
import { isLocalEnvironment } from '@/app/utils/environment';
import { logger } from '@/app/utils/logger';

// Mock fetch globally
global.fetch = jest.fn();

// Mock environment
jest.mock('@/app/utils/environment', () => ({
  isLocalEnvironment: jest.fn(() => true),
}));

// Mock next/headers for getServerCookieHeader tests
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

describe('handleApiError (tested via public API functions)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Response error handling', () => {
    it('should extract error message from response JSON', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: jest.fn().mockResolvedValue({ message: 'Custom error message' }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await expect(fetchAdminPostJsonApi('/test', {})).rejects.toThrow(ApiError);
      await expect(fetchAdminPostJsonApi('/test', {})).rejects.toThrow('Custom error message');
    });

    it('should use default error message when response JSON has no message', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: jest.fn().mockResolvedValue({}),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await expect(fetchAdminPostJsonApi('/test', {})).rejects.toThrow(ApiError);
      await expect(fetchAdminPostJsonApi('/test', {})).rejects.toThrow('API error: 404 Not Found');
    });

    it('should handle response with invalid JSON', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await expect(fetchAdminPostJsonApi('/test', {})).rejects.toThrow(ApiError);
      await expect(fetchAdminPostJsonApi('/test', {})).rejects.toThrow(
        'API error: 500 Internal Server Error'
      );
    });

    it('should preserve status code in ApiError', async () => {
      const mockResponse = {
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: jest.fn().mockResolvedValue({ message: 'Access denied' }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await expect(fetchAdminPostJsonApi('/test', {})).rejects.toBeInstanceOf(ApiError);
      await expect(fetchAdminPostJsonApi('/test', {})).rejects.toHaveProperty('status', 403);
    });
  });

  describe('Catch block error handling', () => {
    it('should convert Error to ApiError with status 500', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(fetchAdminPostJsonApi('/test', {})).rejects.toThrow(ApiError);
      await expect(fetchAdminPostJsonApi('/test', {})).rejects.toThrow('Network error');
      await expect(fetchAdminPostJsonApi('/test', {})).rejects.toHaveProperty('status', 500);
    });

    it('should re-throw ApiError without modification', async () => {
      const apiError = new ApiError('Already an ApiError', 400);
      (global.fetch as jest.Mock).mockRejectedValue(apiError);

      await expect(fetchAdminPostJsonApi('/test', {})).rejects.toThrow(apiError);
      await expect(fetchAdminPostJsonApi('/test', {})).rejects.toThrow('Already an ApiError');
    });

    it('should handle unknown error types', async () => {
      (global.fetch as jest.Mock).mockRejectedValue('String error');

      await expect(fetchAdminPostJsonApi('/test', {})).rejects.toThrow(ApiError);
      await expect(fetchAdminPostJsonApi('/test', {})).rejects.toThrow('Unknown error occurred');
      await expect(fetchAdminPostJsonApi('/test', {})).rejects.toHaveProperty('status', 500);
    });
  });
});

describe('fetchBase (tested via public API functions)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('admin endpoint functions', () => {
    it('should use admin endpoint for fetchAdminPostJsonApi', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await fetchAdminPostJsonApi('/test', { data: 'test' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should use admin endpoint for fetchAdminPutJsonApi', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await fetchAdminPutJsonApi('/test', { data: 'test' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin'),
        expect.objectContaining({
          method: 'PUT',
        })
      );
    });

    it('should use admin endpoint for fetchAdminPatchJsonApi', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await fetchAdminPatchJsonApi('/test', { data: 'test' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin'),
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });

    it('should use admin endpoint for fetchAdminDeleteApi', async () => {
      const mockResponse = {
        ok: true,
        status: 204,
        json: jest.fn().mockResolvedValue(null),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await fetchAdminDeleteApi('/test');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('edit endpoint functions', () => {
    it('should use edit endpoint for fetchEditPostJsonApi', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await fetchEditPostJsonApi('/test', { data: 'test' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/edit'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should use edit endpoint for fetchEditPatchJsonApi', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await fetchEditPatchJsonApi('/test', { data: 'test' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/edit'),
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });
  });

  describe('response handling', () => {
    it('should return parsed JSON for successful responses', async () => {
      const mockData = { id: 1, name: 'Test' };
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockData),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await fetchAdminPostJsonApi('/test', {});
      expect(result).toEqual(mockData);
    });

    it('should return null for 204 No Content responses', async () => {
      const mockResponse = {
        ok: true,
        status: 204,
        json: jest.fn(),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await fetchAdminPostJsonApi('/test', {});
      expect(result).toBeNull();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(fetchAdminPostJsonApi('/test', {})).rejects.toThrow(ApiError);
      await expect(fetchAdminPostJsonApi('/test', {})).rejects.toThrow('Network error');
    });
  });

  describe('fetchAdminGetApi', () => {
    it('should use admin endpoint for GET requests', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ data: 'test' }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await fetchAdminGetApi('/test');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin'),
        expect.objectContaining({ headers: {} })
      );
    });

    it('sends no Content-Type on a bodyless GET', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ data: 'test' }),
      });

      await fetchAdminGetApi('/test');

      const [, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(init.headers).not.toHaveProperty('Content-Type');
    });

    it('should forward custom headers, adding none of its own', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ data: 'test' }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await fetchAdminGetApi('/test', {
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: { 'X-Custom-Header': 'custom-value' },
        })
      );
    });

    it('should handle 204 No Content responses', async () => {
      const mockResponse = {
        ok: true,
        status: 204,
        json: jest.fn(),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await fetchAdminGetApi('/test');
      expect(result).toBeNull();
    });
  });

  /**
   * `fetchReadApi` had no direct coverage here before E2 folded it onto the shared skeleton.
   * These pin the two things the fold could have got wrong: the channel it resolves to, and the
   * fact that it no longer sets a Content-Type on a bodyless GET.
   */
  describe('fetchReadApi', () => {
    it('resolves to the read channel', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ data: 'test' }),
      });

      await fetchReadApi('/test');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/read'),
        expect.objectContaining({ headers: {} })
      );
    });

    it('sends no Content-Type on a bodyless GET', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ data: 'test' }),
      });

      await fetchReadApi('/test');

      const [, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(init.headers).not.toHaveProperty('Content-Type');
    });

    it('converts a non-OK response into an ApiError carrying the status', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: jest.fn().mockResolvedValue({ message: 'Collection not found' }),
      });

      await expect(fetchReadApi('/test')).rejects.toThrow('Collection not found');
      await expect(fetchReadApi('/test')).rejects.toHaveProperty('status', 404);
    });

    it('returns null for a 204', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 204,
        json: jest.fn(),
      });

      await expect(fetchReadApi('/test')).resolves.toBeNull();
    });
  });
});

describe('getApiBaseUrl — dev routes browser calls through the same-origin proxy', () => {
  const originalWindow = global.window;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(global, 'window', { value: originalWindow, writable: true });
  });

  /**
   * Simulates any browser — e.g. a phone on the LAN at <lan-ip>:3000. The exact hostname must
   * NOT matter: the call is same-origin and the Next server proxies it to the backend, so no
   * device ever talks to the backend directly.
   */
  it('routes browser reads through the relative /api/proxy path (reachable from any LAN device, no CORS)', async () => {
    Object.defineProperty(global, 'window', {
      value: { location: { hostname: '192.168.68.60' } },
      writable: true,
    });

    const mockResponse = {
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ data: 'ok' }),
    };
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const { fetchReadApi: fetchRead } = await import('@/app/lib/api/core');
    await fetchRead('/collections');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/proxy\/api\/read\//),
      expect.any(Object)
    );
  });

  it('routes browser edit calls through the relative /api/proxy path', async () => {
    Object.defineProperty(global, 'window', {
      value: { location: { hostname: '192.168.68.60' } },
      writable: true,
    });

    const mockResponse = {
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ data: 'ok' }),
    };
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const { fetchEditPostJsonApi: fetchEditPost } = await import('@/app/lib/api/core');
    await fetchEditPost('/collections/5/reorder', {});

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/proxy\/api\/edit\//),
      expect.any(Object)
    );
  });

  /** No window → server runtime. The Next server reaches the dev backend on localhost directly. */
  it('calls the backend directly on localhost for server-side (RSC) reads', async () => {
    Object.defineProperty(global, 'window', { value: undefined, writable: true });

    const mockResponse = {
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ data: 'ok' }),
    };
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const { fetchReadApi: fetchRead2 } = await import('@/app/lib/api/core');
    await fetchRead2('/collections');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/^http:\/\/localhost:8080\/api\/read\//),
      expect.any(Object)
    );
  });
});

/**
 * The production server-side arm of `getApiBaseUrl`, which is the only one that reads
 * `NEXT_PUBLIC_APP_URL`. It used to interpolate the env var raw, so a trailing slash — a
 * difference with no meaning anywhere else — produced `https://host//api/proxy/...` on every
 * server-side fetch. D8 normalized the same env var for the Origin allowlist and left this
 * consumer; D10 points both at the one `configuredAppOrigin()` so they cannot disagree.
 *
 * `isLocalEnvironment` is mocked true for the rest of this file, so these cases flip it and put
 * it back rather than relying on suite order.
 */
describe('getApiBaseUrl — production server-side normalizes NEXT_PUBLIC_APP_URL', () => {
  const originalWindow = global.window;
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  beforeEach(() => {
    jest.clearAllMocks();
    (isLocalEnvironment as jest.Mock).mockReturnValue(false);
    Object.defineProperty(global, 'window', { value: undefined, writable: true });
  });

  afterEach(() => {
    (isLocalEnvironment as jest.Mock).mockReturnValue(true);
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
    Object.defineProperty(global, 'window', { value: originalWindow, writable: true });
  });

  it('builds a single-slash URL from a clean app URL', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://zacedens.com';

    expect(getApiBaseUrl('read')).toBe('https://zacedens.com/api/proxy/api/read');
  });

  /** The defect D10 was filed for: `https://zacedens.com//api/proxy/api/read` before the fix. */
  it('drops a trailing slash instead of emitting a doubled one', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://zacedens.com/';

    expect(getApiBaseUrl('read')).toBe('https://zacedens.com/api/proxy/api/read');
    expect(getApiBaseUrl('read')).not.toContain('com//');
  });

  /**
   * `configuredAppOrigin()` reduces to a bare origin, so a value someone pasted with a path on
   * it cannot bury `/api/proxy` underneath that path.
   */
  it('reduces a value carrying a path to its bare origin', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://zacedens.com/gallery';

    expect(getApiBaseUrl('admin')).toBe('https://zacedens.com/api/proxy/api/admin');
  });

  /**
   * Unset stays a relative URL, which Node `fetch` rejects at the call site. Pinned as the known
   * behaviour rather than as a good one — a deploy that never set its own URL is broken either
   * way, and this records which failure it gets.
   */
  it('yields a relative URL when the env var is unset', () => {
    delete process.env.NEXT_PUBLIC_APP_URL;

    expect(getApiBaseUrl('read')).toBe('/api/proxy/api/read');
  });

  /** Local/dev is unaffected: it never reaches the env var at all. */
  it('still goes straight to the local backend when local', () => {
    (isLocalEnvironment as jest.Mock).mockReturnValue(true);
    process.env.NEXT_PUBLIC_APP_URL = 'https://zacedens.com/';

    expect(getApiBaseUrl('read')).toBe('http://localhost:8080/api/read');
  });
});

describe('getServerCookieHeader', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nextHeaders = require('next/headers') as { cookies: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(global, 'window', { value: undefined, writable: true });
  });

  it('returns a Cookie header string when cookies exist', async () => {
    nextHeaders.cookies.mockResolvedValue({
      getAll: () => [
        { name: 'gallery_access_foo', value: 'tokenA' },
        { name: 'gallery_access_bar', value: 'tokenB' },
      ],
    });

    const result = await getServerCookieHeader();
    expect(result).toBe('gallery_access_foo=tokenA; gallery_access_bar=tokenB');
  });

  it('returns null when the cookie store is empty', async () => {
    nextHeaders.cookies.mockResolvedValue({
      getAll: () => [],
    });

    const result = await getServerCookieHeader();
    expect(result).toBeNull();
  });

  it('returns null silently when the "called outside a request scope" error is thrown', async () => {
    nextHeaders.cookies.mockRejectedValue(
      new Error('cookies() was called outside a request scope.')
    );
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await getServerCookieHeader();
    expect(result).toBeNull();
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('returns null silently when called from generateStaticParams (build-time)', async () => {
    nextHeaders.cookies.mockRejectedValue(
      new Error(
        'Route /[slug] used `cookies()` inside `generateStaticParams`. This is not supported because `generateStaticParams` runs at build time without an HTTP request.'
      )
    );
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await getServerCookieHeader();
    expect(result).toBeNull();
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('returns null and calls logger.warn when an unexpected error is thrown', async () => {
    nextHeaders.cookies.mockRejectedValue(new Error('Unexpected internal failure'));
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});

    const result = await getServerCookieHeader();
    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});

describe('admin fetchers forward the server session cookie (SSR)', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nextHeaders = require('next/headers') as { cookies: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(global, 'window', { value: undefined, writable: true });
    nextHeaders.cookies.mockResolvedValue({
      getAll: () => [{ name: 'ezac_session', value: 'sess-token' }],
    });
  });

  it('attaches the Cookie header on fetchAdminGetApi', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ data: 'ok' }),
    });

    await fetchAdminGetApi('/users');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin'),
      expect.objectContaining({
        headers: { Cookie: 'ezac_session=sess-token' },
      })
    );
  });

  it('attaches the Cookie header on an admin write fetcher (fetchAdminPostJsonApi)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ data: 'ok' }),
    });

    await fetchAdminPostJsonApi('/users', { name: 'x' });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Cookie: 'ezac_session=sess-token',
        }),
      })
    );
  });

  it('attaches the Cookie header on fetchReadApi (gallery_access_<slug> on RSC re-fetches)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ data: 'ok' }),
    });

    await fetchReadApi('/collections/some-gallery');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/read'),
      expect.objectContaining({
        headers: { Cookie: 'ezac_session=sess-token' },
      })
    );
  });

  it('omits the Cookie header when the cookie store is empty', async () => {
    nextHeaders.cookies.mockResolvedValue({ getAll: () => [] });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ data: 'ok' }),
    });

    await fetchAdminGetApi('/users');

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(init.headers).not.toHaveProperty('Cookie');
  });
});

/**
 * `throwFromResponse` moved into core.ts in E2, having been byte-identical in auth.ts,
 * personal.ts, share.ts and selects.ts. It had no direct tests in any of them — these pin the
 * contract now that one copy serves four modules, and make the two deliberate divergences in
 * collections.ts and users.ts visible as differences rather than drift.
 */
describe('throwFromResponse', () => {
  const respond = (status: number, contentType: string, payload: unknown) =>
    ({
      status,
      headers: new Headers({ 'content-type': contentType }),
      json: jest.fn().mockResolvedValue(payload),
      text: jest.fn().mockResolvedValue(payload),
    }) as unknown as Response;

  /**
   * Callers branch on status, not copy — ShareCard's `mapError` turns 401/403/409/429 into four
   * different sentences, so a dropped status silently collapses them into one.
   */
  it('carries the response status onto the ApiError', async () => {
    await expect(throwFromResponse(respond(409, 'application/json', {}))).rejects.toMatchObject({
      name: 'ApiError',
      status: 409,
    });
  });

  it('prefers a plain-text body verbatim', async () => {
    await expect(throwFromResponse(respond(400, 'text/plain', 'plain words'))).rejects.toThrow(
      'plain words'
    );
  });

  it("uses a JSON body's message field", async () => {
    await expect(
      throwFromResponse(respond(400, 'application/json', { message: 'from the backend' }))
    ).rejects.toThrow('from the backend');
  });

  /** This is the branch users.ts deliberately does NOT share — see users.test.ts. */
  it('falls back to the whole JSON body when there is no message field', async () => {
    await expect(
      throwFromResponse(respond(400, 'application/json', { error: 'no message key' }))
    ).rejects.toThrow(JSON.stringify({ error: 'no message key' }));
  });

  /** A malformed error body must not replace the error; the status still has to survive. */
  it('falls back to the status when the body cannot be parsed', async () => {
    const res = {
      status: 500,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: jest.fn().mockRejectedValue(new Error('bad json')),
    } as unknown as Response;

    await expect(throwFromResponse(res)).rejects.toThrow('API error: 500');
    await expect(throwFromResponse(res)).rejects.toMatchObject({ status: 500 });
  });
});

/**
 * `clientFetch` / `clientFetchJson` replaced 17 hand-written copies of the same skeleton in E2.
 * These pin the four defaults it exists to apply, because a silently dropped `credentials` or
 * `cache` would not fail any existing suite — it would just log the user out, or serve them a
 * stale answer, in the browser.
 */
describe('clientFetch', () => {
  const ok = () =>
    ({ ok: true, status: 200, json: jest.fn().mockResolvedValue({ v: 1 }) }) as unknown as Response;

  beforeEach(() => jest.clearAllMocks());

  it('sends the session cookie and never caches', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(ok());

    await clientFetch('/api/proxy/thing');

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(init.credentials).toBe('same-origin');
    expect(init.cache).toBe('no-store');
  });

  it('serializes json and sets the content type, only when there is a body', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(ok());

    await clientFetch('/api/proxy/thing', { method: 'POST', json: { a: 1 } });
    const [, withBody] = (global.fetch as jest.Mock).mock.calls[0];
    expect(withBody.body).toBe(JSON.stringify({ a: 1 }));
    expect(withBody.headers).toMatchObject({ 'Content-Type': 'application/json' });

    (global.fetch as jest.Mock).mockClear();
    await clientFetch('/api/proxy/thing', { method: 'DELETE' });
    const [, noBody] = (global.fetch as jest.Mock).mock.calls[0];
    expect(noBody.body).toBeUndefined();
    expect(noBody.headers).toBeUndefined();
  });

  it('lets a caller override a default', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(ok());

    await clientFetch('/api/proxy/thing', { cache: 'force-cache' });

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(init.cache).toBe('force-cache');
  });

  it('throws ApiError carrying the status on a non-OK response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: jest.fn().mockResolvedValue({ message: 'nope' }),
    });

    await expect(clientFetch('/api/proxy/thing')).rejects.toMatchObject({
      name: 'ApiError',
      status: 403,
    });
  });

  /**
   * 204-returning mutations are the majority of the converted call sites; parsing them would
   * throw on an empty body.
   */
  it('does not read the body of a successful response', async () => {
    const res = ok();
    (global.fetch as jest.Mock).mockResolvedValue(res);

    await clientFetch('/api/proxy/thing', { method: 'DELETE' });

    expect(res.json).not.toHaveBeenCalled();
  });
});

describe('clientFetchJson', () => {
  it('returns the parsed body', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ token: 'tok-1' }),
    });

    await expect(clientFetchJson<{ token: string }>('/api/proxy/thing')).resolves.toEqual({
      token: 'tok-1',
    });
  });
});
