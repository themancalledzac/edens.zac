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
