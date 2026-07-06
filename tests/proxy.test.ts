/**
 * @jest-environment node
 *
 * Tests for the Next.js middleware (proxy.ts).
 *
 * Covers the admin hub / dev-console rules (local-only `/homePage` passthrough;
 * localhost `/` → `/admin`), the `/cdn` + `/catalog` rules, and the (admin)
 * route-group session gate: in non-local environments every (admin) route
 * requires an `ezac_session` cookie or redirects to `/login`; local passes
 * through. Also pins the public perimeter: `/explore` stays anonymous (0203 F4
 * regression fix) and the never-routed `/collection/:slug/edit` gate stays dead.
 */

import { NextRequest } from 'next/server';

import { config, proxy } from '@/proxy';

const ORIGINAL_ENV = process.env;

function setLocal() {
  process.env = { ...ORIGINAL_ENV, NODE_ENV: 'development', NEXT_PUBLIC_ENV: 'local' };
}

function setProd() {
  process.env = { ...ORIGINAL_ENV, NODE_ENV: 'production', NEXT_PUBLIC_ENV: 'production' };
}

function makeRequest(pathname: string, opts: { session?: boolean } = {}): NextRequest {
  const headers = opts.session ? { cookie: 'ezac_session=abc123' } : undefined;
  return new NextRequest(`http://localhost:3000${pathname}`, headers ? { headers } : undefined);
}

afterEach(() => {
  process.env = ORIGINAL_ENV;
});

describe('proxy middleware — dev-console rules (localhost)', () => {
  beforeEach(() => setLocal());

  it('redirects / → /admin on localhost', () => {
    const res = proxy(makeRequest('/'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/admin');
  });

  it('passes /admin through on localhost', () => {
    const res = proxy(makeRequest('/admin'));
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });

  it('passes /admin/users/1 through on localhost', () => {
    const res = proxy(makeRequest('/admin/users/1'));
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });

  it('passes /homePage through on localhost', () => {
    const res = proxy(makeRequest('/homePage'));
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });
});

describe('proxy middleware — /homePage + / (non-local)', () => {
  beforeEach(() => setProd());

  it('redirects /homePage → / in prod (local-only escape hatch)', () => {
    const res = proxy(makeRequest('/homePage'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/');
  });

  it('does NOT redirect / on prod (passthrough)', () => {
    const res = proxy(makeRequest('/'));
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });
});

describe('proxy middleware — existing /cdn rule (regression)', () => {
  it('passes /cdn/foo through on localhost', () => {
    setLocal();
    const res = proxy(makeRequest('/cdn/foo'));
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });

  it('redirects /cdn/foo → / in prod', () => {
    setProd();
    const res = proxy(makeRequest('/cdn/foo'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/');
  });
});

describe('proxy middleware — existing /catalog rule (regression)', () => {
  it('redirects /catalog/foo → /collection/foo (308) when feature flag is on', () => {
    setLocal();
    process.env.COLLECTION_REDIRECTS_ENABLED = 'true';
    const res = proxy(makeRequest('/catalog/foo'));
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe('http://localhost:3000/collection/foo');
  });

  it('does NOT redirect /catalog/create even when feature flag is on', () => {
    setLocal();
    process.env.COLLECTION_REDIRECTS_ENABLED = 'true';
    const res = proxy(makeRequest('/catalog/create'));
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });

  it('does NOT redirect /catalog/foo when feature flag is off', () => {
    setLocal();
    delete process.env.COLLECTION_REDIRECTS_ENABLED;
    const res = proxy(makeRequest('/catalog/foo'));
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });
});

describe('proxy middleware — (admin) group session gate (non-local)', () => {
  beforeEach(() => setProd());

  // The whole (admin) App Router group is gated. Each of these routes, when hit
  // anonymously in prod, must redirect to /login; with an ezac_session cookie it
  // passes through (the backend then validates the session + enforces isAdmin).
  const adminRoutes = [
    '/admin',
    '/admin/users/1',
    '/all-collections',
    '/all-collections/foo',
    '/all-images',
    '/all-images/foo',
    '/comments',
    '/comments/foo',
    '/metadata',
    '/metadata/foo',
    '/collection/manage',
    '/collection/manage/foo',
  ];

  it.each(adminRoutes)('redirects %s → /login when no ezac_session', pathname => {
    const res = proxy(makeRequest(pathname));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/login');
  });

  it.each(adminRoutes)('passes %s through when ezac_session is present', pathname => {
    const res = proxy(makeRequest(pathname, { session: true }));
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });
});

describe('proxy middleware — (admin) group passthrough (localhost)', () => {
  beforeEach(() => setLocal());

  const adminRoutes = [
    '/admin',
    '/all-collections',
    '/all-images',
    '/comments',
    '/metadata',
    '/collection/manage',
  ];

  it.each(adminRoutes)('passes %s through on localhost (no session needed)', pathname => {
    const res = proxy(makeRequest(pathname));
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });
});

describe('proxy middleware — public routes stay public (non-local)', () => {
  beforeEach(() => setProd());

  // /explore is the deliberately public taxonomy directory (f9cd9c1, chapter 001).
  // 0203 F4 (9df92d8) regression-gated it behind the ezac_session presence check;
  // these tests pin the fix: anonymous prod traffic must pass through.
  it.each(['/explore', '/explore/foo'])('passes %s through anonymously in prod', pathname => {
    const res = proxy(makeRequest(pathname));
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });

  // /collection/[slug]/edit has never existed as a route — in-place editing is
  // /[slug]?manage=1 (manageHref). The middleware must not gate a path the app
  // 404s anyway.
  it('passes /collection/some-slug/edit through anonymously in prod (dead gate removed)', () => {
    const res = proxy(makeRequest('/collection/some-slug/edit'));
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });
});

describe('proxy middleware — config.matcher', () => {
  it('does not match public /explore or the dead /collection/:slug/edit entry', () => {
    expect(config.matcher).not.toContain('/explore');
    expect(config.matcher).not.toContain('/explore/:path*');
    expect(config.matcher).not.toContain('/collection/:slug/edit');
  });

  it('still matches the (admin) group surfaces', () => {
    const gated = [
      '/admin',
      '/admin/:path*',
      '/collection/manage',
      '/collection/manage/:path*',
      '/comments',
      '/metadata',
      '/all-collections',
      '/all-images',
    ];
    for (const entry of gated) {
      expect(config.matcher).toContain(entry);
    }
  });
});

describe('proxy middleware — non-matching paths', () => {
  it('passes unrelated paths through on localhost', () => {
    setLocal();
    const res = proxy(makeRequest('/some/random/path'));
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });

  it('passes unrelated paths through in prod', () => {
    setProd();
    const res = proxy(makeRequest('/some/random/path'));
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });
});
