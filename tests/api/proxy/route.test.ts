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

import { GET, POST } from '@/app/api/proxy/[...path]/route';

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

describe('Vercel BFF proxy /api/proxy/[...path] — write-method origin allowance', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = {
      ...ORIGINAL_ENV,
      INTERNAL_API_SECRET: 'test-secret',
      API_URL: 'http://backend.test',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      NODE_ENV: 'development',
    };
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response('{"ok":true}', { status: 200 }));
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.restoreAllMocks();
  });

  async function postFrom(origin: string): Promise<number> {
    const req = new NextRequest('http://localhost:3000/api/proxy/api/read/messages', {
      method: 'POST',
      body: JSON.stringify({ msg: 'hi' }),
      headers: {
        'content-type': 'application/json',
        origin,
      },
    });
    const res = await POST(req, {
      params: Promise.resolve({ path: ['api', 'read', 'messages'] }),
    } as never);
    return res.status;
  }

  it('allows a private RFC1918 IPv4 origin on a dev port in development', async () => {
    expect(await postFrom('http://192.168.68.60:3000')).toBe(200);
  });

  it('allows an mDNS .local hostname origin on a dev port in development', async () => {
    expect(await postFrom('http://zacs-mbp.local:3000')).toBe(200);
  });

  it('rejects a public IPv4 origin with 403 even in development', async () => {
    expect(await postFrom('http://203.0.113.7:3000')).toBe(403);
  });

  it('rejects an arbitrary public hostname origin with 403', async () => {
    expect(await postFrom('http://evil.com:3000')).toBe(403);
  });

  it('rejects https LAN origins — the dev allowance is http only', async () => {
    expect(await postFrom('https://192.168.68.60:3000')).toBe(403);
  });

  it('rejects LAN origins outside development NODE_ENV', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      INTERNAL_API_SECRET: 'test-secret',
      API_URL: 'http://backend.test',
      NEXT_PUBLIC_APP_URL: 'https://example.com',
      NODE_ENV: 'production',
    };
    expect(await postFrom('http://192.168.68.60:3000')).toBe(403);
  });
});

describe('Vercel BFF proxy /api/proxy/[...path] — anonymous admin API refusal (prod)', () => {
  const ORIGINAL_ENV = process.env;

  function setProd() {
    process.env = {
      ...ORIGINAL_ENV,
      INTERNAL_API_SECRET: 'test-secret',
      API_URL: 'http://backend.test',
      NEXT_PUBLIC_APP_URL: 'https://example.com',
      NODE_ENV: 'production',
    };
  }

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.restoreAllMocks();
  });

  it('rejects an anonymous admin GET with 401 and does NOT forward', async () => {
    setProd();
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('{"ok":true}', { status: 200 }));

    const req = new NextRequest('https://example.com/api/proxy/api/admin/users', {
      method: 'GET',
    });
    const res = await GET(req, {
      params: Promise.resolve({ path: ['api', 'admin', 'users'] }),
    } as never);

    expect(res.status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('forwards an admin GET when the ezac_session cookie is present', async () => {
    setProd();
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('{"ok":true}', { status: 200 }));

    const req = new NextRequest('https://example.com/api/proxy/api/admin/users', {
      method: 'GET',
      headers: { cookie: 'ezac_session=abc123' },
    });
    const res = await GET(req, {
      params: Promise.resolve({ path: ['api', 'admin', 'users'] }),
    } as never);

    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    // The forwarded request carries the session cookie through to the backend.
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Headers).get('cookie')).toBe('ezac_session=abc123');
  });

  it('does NOT gate a non-admin (read) path — anonymous read forwards', async () => {
    setProd();
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('{"ok":true}', { status: 200 }));

    const req = new NextRequest('https://example.com/api/proxy/api/read/collections', {
      method: 'GET',
    });
    const res = await GET(req, {
      params: Promise.resolve({ path: ['api', 'read', 'collections'] }),
    } as never);

    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('does NOT gate api/dev/** admin-adjacent paths', async () => {
    setProd();
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('{"ok":true}', { status: 200 }));

    const req = new NextRequest('https://example.com/api/proxy/api/dev/seed', {
      method: 'GET',
    });
    const res = await GET(req, {
      params: Promise.resolve({ path: ['api', 'dev', 'seed'] }),
    } as never);

    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('does NOT gate admin paths in development (localhost admin has no login)', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      INTERNAL_API_SECRET: 'test-secret',
      API_URL: 'http://backend.test',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      NODE_ENV: 'development',
    };
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('{"ok":true}', { status: 200 }));

    const req = new NextRequest('http://localhost:3000/api/proxy/api/admin/users', {
      method: 'GET',
    });
    const res = await GET(req, {
      params: Promise.resolve({ path: ['api', 'admin', 'users'] }),
    } as never);

    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe('Vercel BFF proxy /api/proxy/[...path] — real-IP header sanitization', () => {
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

  async function forwardWith(headers: Record<string, string>): Promise<RequestInit> {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('{"ok":true}', { status: 200 }));
    const req = new NextRequest('http://localhost:3000/api/proxy/api/read/collections', {
      method: 'GET',
      headers,
    });
    await GET(req, {
      params: Promise.resolve({ path: ['api', 'read', 'collections'] }),
    } as never);
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    return init;
  }

  it('does NOT forward a spoofed inbound x-real-ip as X-Real-IP', async () => {
    const init = await forwardWith({ 'x-real-ip': '6.6.6.6' });
    // x-real-ip is client-controllable and no longer a source; without a trusted
    // header there is no X-Real-IP to forward.
    expect((init.headers as Headers).get('x-real-ip')).toBeNull();
  });

  it('forwards the LAST hop of x-forwarded-for as X-Real-IP (CloudFront-appended client IP)', async () => {
    const init = await forwardWith({ 'x-forwarded-for': '10.0.0.1, 203.0.113.9' });
    expect((init.headers as Headers).get('x-real-ip')).toBe('203.0.113.9');
  });

  it('prefers x-vercel-forwarded-for first hop when present', async () => {
    const init = await forwardWith({
      'x-vercel-forwarded-for': '198.51.100.7, 10.0.0.1',
      'x-forwarded-for': '10.0.0.1, 203.0.113.9',
    });
    expect((init.headers as Headers).get('x-real-ip')).toBe('198.51.100.7');
  });

  it('does not forward a non-IP-shaped last hop', async () => {
    const init = await forwardWith({ 'x-forwarded-for': 'not-an-ip' });
    expect((init.headers as Headers).get('x-real-ip')).toBeNull();
  });
});
