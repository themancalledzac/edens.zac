/**
 * @jest-environment node
 *
 * Tests for the Next.js middleware (proxy.ts).
 *
 * Covers the admin hub / dev-console rules (local-only `/homePage` passthrough;
 * localhost `/` → `/admin`), the `/cdn` + `/catalog` rules, and the (admin)
 * route-group session gate: in non-local environments every (admin) route
 * requires an `ezac_session` cookie or redirects to `/login`; local passes
 * through.
 */

import { NextRequest } from 'next/server';

import { proxy } from '@/proxy';

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
    '/collection/some-slug/edit',
    '/explore',
    '/explore/foo',
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
    '/collection/some-slug/edit',
    '/explore',
  ];

  it.each(adminRoutes)('passes %s through on localhost (no session needed)', pathname => {
    const res = proxy(makeRequest(pathname));
    expect(res.headers.get('x-middleware-next')).toBe('1');
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
