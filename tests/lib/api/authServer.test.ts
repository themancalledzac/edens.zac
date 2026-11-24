/** @jest-environment node */
/**
 * Unit tests for the server-only `meServer` in auth.ts. Runs in the node environment so
 * `typeof window` is `'undefined'`, which jsdom 26 no longer lets a test fake.
 */

import { meServer } from '@/app/lib/api/auth';
import { getApiBaseUrl, getServerCookieHeader } from '@/app/lib/api/core';
import { isLocalEnvironment } from '@/app/utils/environment';

jest.mock('next/headers', () => ({ cookies: jest.fn() }));
jest.mock('@/app/utils/environment', () => ({ isLocalEnvironment: jest.fn() }));
jest.mock('@/app/lib/api/core', () => ({
  ...jest.requireActual('@/app/lib/api/core'),
  getApiBaseUrl: jest.fn(),
  getServerCookieHeader: jest.fn(),
}));

global.fetch = jest.fn();

describe('meServer', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock) = jest.fn();
    jest.clearAllMocks();
    (getApiBaseUrl as jest.Mock).mockReturnValue('http://localhost:8080/api/auth');
    (isLocalEnvironment as jest.Mock).mockReturnValue(true);
  });

  it('forwards the server cookie header and returns MeResponse on 200', async () => {
    (getServerCookieHeader as jest.Mock).mockResolvedValue('ezac_session=abc');
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        email: 'c@x.com',
        isAdmin: false,
        mfaSatisfied: true,
        passkeyCount: 0,
        galleries: [],
      }),
    });

    const result = await meServer();

    expect(result?.email).toBe('c@x.com');
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('http://localhost:8080/api/auth/me');
    expect(init.headers.Cookie).toBe('ezac_session=abc');
  });

  it('returns null on 401', async () => {
    (getServerCookieHeader as jest.Mock).mockResolvedValue(null);
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 401 });

    expect(await meServer()).toBeNull();
  });
});

describe('meServer — outside a local environment (A3)', () => {
  const originalApiUrl = process.env.API_URL;
  const originalSecret = process.env.INTERNAL_API_SECRET;
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  beforeEach(() => {
    (global.fetch as jest.Mock) = jest.fn();
    jest.clearAllMocks();
    (isLocalEnvironment as jest.Mock).mockReturnValue(false);
    process.env.API_URL = 'https://backend.internal/';
    process.env.INTERNAL_API_SECRET = 'sec-' + 'x'.repeat(8);
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
    (getServerCookieHeader as jest.Mock).mockResolvedValue('ezac_session=abc');
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ email: 'c@x.com' }),
    });
  });

  afterEach(() => {
    const restore = (key: string, value: string | undefined) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    };
    restore('API_URL', originalApiUrl);
    restore('INTERNAL_API_SECRET', originalSecret);
    restore('NEXT_PUBLIC_APP_URL', originalAppUrl);
  });

  it('A3: calls the backend directly with X-Internal-Secret and keeps the Cookie', async () => {
    await meServer();

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://backend.internal/api/auth/me');
    expect(url).not.toContain('/api/proxy');
    expect(init.headers['X-Internal-Secret']).toBe('sec-xxxxxxxx');
    expect(init.headers.Cookie).toBe('ezac_session=abc');
  });

  it('A3: still sends the secret when there is no cookie', async () => {
    (getServerCookieHeader as jest.Mock).mockResolvedValue(null);

    await meServer();

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(init.headers['X-Internal-Secret']).toBe('sec-xxxxxxxx');
    expect(init.headers.Cookie).toBeUndefined();
  });

  it('twin A3: with the local check letting everything through, no secret is sent', async () => {
    (isLocalEnvironment as jest.Mock).mockReturnValue(true);

    await meServer();

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('http://localhost:8080/api/auth/me');
    expect(init.headers['X-Internal-Secret']).toBeUndefined();
  });
});
