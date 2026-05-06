/**
 * @jest-environment node
 *
 * Tests for the Next.js middleware (proxy.ts).
 *
 * Covers the new admin hub redirect rules (local-only `/admin` + `/homePage`
 * passthrough; non-local redirects to `/`; localhost `/` → `/admin`) AND a
 * regression net for the existing `/cdn`, `/catalog`, and `/comments` rules.
 * The middleware previously had zero direct test coverage.
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

function makeRequest(pathname: string): NextRequest {
  return new NextRequest(`http://localhost:3000${pathname}`);
}

afterEach(() => {
  process.env = ORIGINAL_ENV;
});

describe('proxy middleware — admin hub redirects (localhost)', () => {
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

  it('passes /admin/foo through on localhost', () => {
    const res = proxy(makeRequest('/admin/foo'));
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });

  it('passes /homePage through on localhost', () => {
    const res = proxy(makeRequest('/homePage'));
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });
});

describe('proxy middleware — admin hub gating (non-local)', () => {
  beforeEach(() => setProd());

  it('redirects /admin → / in prod', () => {
    const res = proxy(makeRequest('/admin'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/');
  });

  it('redirects /admin/foo → / in prod', () => {
    const res = proxy(makeRequest('/admin/foo'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/');
  });

  it('redirects /homePage → / in prod', () => {
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

describe('proxy middleware — existing /comments admin gating (regression)', () => {
  it('passes /comments through on localhost', () => {
    setLocal();
    const res = proxy(makeRequest('/comments'));
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });

  it('returns 403 on /comments in prod when admin routes disabled', () => {
    setProd();
    process.env.ADMIN_ROUTES_ENABLED = 'false';
    const res = proxy(makeRequest('/comments'));
    expect(res.status).toBe(403);
  });

  it('returns 401 on /comments in prod when admin routes enabled but auth missing', () => {
    setProd();
    process.env.ADMIN_ROUTES_ENABLED = 'true';
    process.env.ADMIN_TOKEN = 'secret123';
    const res = proxy(makeRequest('/comments'));
    expect(res.status).toBe(401);
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
