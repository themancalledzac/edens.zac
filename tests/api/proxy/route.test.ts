/**
 * @jest-environment node
 *
 * Regression test for the BFF proxy's Set-Cookie forwarding (FE-N6).
 *
 * The Headers constructor combines repeated headers into a single comma-joined value,
 * which corrupts cookies whose Expires attribute contains commas. The proxy explicitly
 * re-emits each Set-Cookie via getSetCookie() + append. This test pins that behavior so
 * a regression doesn't silently break the gallery_access_<slug> auth cookie.
 */

import { NextRequest } from 'next/server';

import { POST } from '@/app/api/proxy/[...path]/route';

describe('Vercel BFF proxy /api/proxy/[...path] — Set-Cookie forwarding', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = {
      ...ORIGINAL_ENV,
      INTERNAL_API_SECRET: 'test-secret',
      API_URL: 'http://backend.test',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      NODE_ENV: 'development',
    };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.restoreAllMocks();
  });

  it('forwards multiple Set-Cookie headers verbatim, preserving Expires commas', async () => {
    const cookieA =
      'gallery_access_foo=tokenA; HttpOnly; Secure; SameSite=Strict; Path=/; ' +
      'Expires=Wed, 01 Jan 2025 00:00:00 GMT';
    const cookieB =
      'gallery_access_bar=tokenB; HttpOnly; Secure; SameSite=Strict; Path=/; ' +
      'Expires=Thu, 02 Jan 2025 00:00:00 GMT';

    const responseHeaders = new Headers([['content-type', 'application/json']]);
    responseHeaders.append('set-cookie', cookieA);
    responseHeaders.append('set-cookie', cookieB);

    const mockFetch = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        new Response('{"hasAccess":true}', { status: 200, headers: responseHeaders })
      );

    const req = new NextRequest('http://localhost:3000/api/proxy/api/read/collections/foo/access', {
      method: 'POST',
      body: JSON.stringify({ password: 'x' }),
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost:3000',
      },
    });

    const res = await POST(req, {
      params: Promise.resolve({ path: ['api', 'read', 'collections', 'foo', 'access'] }),
    } as never);

    const setCookies = res.headers.getSetCookie();
    expect(setCookies).toContain(cookieA);
    expect(setCookies).toContain(cookieB);
    expect(setCookies).toHaveLength(2);

    // Pin that security attributes are preserved verbatim on the first cookie.
    // A future refactor swapping getSetCookie() for manual header iteration
    // must not silently drop these attributes.
    expect(setCookies[0]).toMatch(/httponly/i);
    expect(setCookies[0]).toMatch(/secure/i);
    expect(setCookies[0]).toMatch(/samesite=strict/i);
    expect(setCookies[0]).toMatch(/path=\//i);

    mockFetch.mockRestore();
  });
});

describe('Vercel BFF proxy /api/proxy/[...path] — payload size limits', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = {
      ...ORIGINAL_ENV,
      INTERNAL_API_SECRET: 'test-secret',
      API_URL: 'http://backend.test',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      NODE_ENV: 'development',
    };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.restoreAllMocks();
  });

  it('rejects JSON payloads larger than 16 KB with 413', async () => {
    const oversize = 'x'.repeat(16 * 1024 + 1);
    const req = new NextRequest('http://localhost:3000/api/proxy/api/read/messages', {
      method: 'POST',
      body: JSON.stringify({ msg: oversize }),
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost:3000',
      },
    });

    const res = await POST(req, {
      params: Promise.resolve({ path: ['api', 'read', 'messages'] }),
    } as never);

    expect(res.status).toBe(413);
  });

  it('allows multipart uploads up to 25 MB', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('{"ok":true}', { status: 200 }));

    // 1 MB multipart body — well over the 16 KB JSON cap, well under the 25 MB multipart cap.
    const body = new Uint8Array(1024 * 1024);
    const req = new NextRequest('http://localhost:3000/api/proxy/api/admin/content/images/1', {
      method: 'POST',
      body,
      headers: {
        'content-type': 'multipart/form-data; boundary=----test',
        origin: 'http://localhost:3000',
      },
    });

    const res = await POST(req, {
      params: Promise.resolve({ path: ['api', 'admin', 'content', 'images', '1'] }),
    } as never);

    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('rejects multipart payloads larger than 25 MB with 413', async () => {
    // 25 MB + 1 byte
    const body = new Uint8Array(25 * 1024 * 1024 + 1);
    const req = new NextRequest('http://localhost:3000/api/proxy/api/admin/content/images/1', {
      method: 'POST',
      body,
      headers: {
        'content-type': 'multipart/form-data; boundary=----test',
        origin: 'http://localhost:3000',
      },
    });

    const res = await POST(req, {
      params: Promise.resolve({ path: ['api', 'admin', 'content', 'images', '1'] }),
    } as never);

    expect(res.status).toBe(413);
  });

  it('enforces cap against actual buffered body size when Content-Length is missing', async () => {
    // Construct a request where the underlying body is large but the
    // Content-Length header is absent — the proxy must still reject it.
    const oversize = 'x'.repeat(16 * 1024 + 1);
    const req = new NextRequest('http://localhost:3000/api/proxy/api/read/messages', {
      method: 'POST',
      body: oversize,
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost:3000',
      },
    });
    // Force the declared length to 0 so the early-reject path is bypassed.
    req.headers.set('content-length', '0');

    const res = await POST(req, {
      params: Promise.resolve({ path: ['api', 'read', 'messages'] }),
    } as never);

    expect(res.status).toBe(413);
  });
});
