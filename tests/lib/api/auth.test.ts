/**
 * Unit tests for auth.ts
 * Mirrors the fetch-mock idiom of tests/lib/api/collections.test.ts.
 */

import {
  AUTH_CHANGED_EVENT,
  login,
  loginWithPasskey,
  logout,
  me,
  meServer,
  registerPasskey,
} from '@/app/lib/api/auth';
import { ApiError, getApiBaseUrl, getServerCookieHeader } from '@/app/lib/api/core';
import { type MeResponse } from '@/app/types/Auth';

jest.mock('next/headers', () => ({ cookies: jest.fn() }));
jest.mock('@/app/utils/environment', () => ({ isLocalEnvironment: jest.fn() }));
jest.mock('@/app/lib/api/core', () => ({
  ...jest.requireActual('@/app/lib/api/core'),
  getApiBaseUrl: jest.fn(),
  getServerCookieHeader: jest.fn(),
}));

// Mock fetch globally
global.fetch = jest.fn();

// Mock navigator.credentials (jsdom does not implement WebAuthn).
const mockCredentialsCreate = jest.fn();
const mockCredentialsGet = jest.fn();
Object.defineProperty(global.navigator, 'credentials', {
  value: { create: mockCredentialsCreate, get: mockCredentialsGet },
  writable: true,
});

// Observe AUTH_CHANGED_EVENT dispatches. Registered once — jsdom's window is
// shared across this file and jest.clearAllMocks() resets call history per test.
const authChangedListener = jest.fn();
window.addEventListener(AUTH_CHANGED_EVENT, authChangedListener);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AUTH_CHANGED_EVENT', () => {
  it("is the 'auth-changed' contract string client listeners subscribe to", () => {
    expect(AUTH_CHANGED_EVENT).toBe('auth-changed');
  });
});

describe('login', () => {
  it('throws when email is missing', async () => {
    await expect(login('', 'pw')).rejects.toThrow('email is required');
  });

  it('throws when password is missing', async () => {
    await expect(login('admin@example.com', '')).rejects.toThrow('password is required');
  });

  it('POSTs through the BFF proxy with credentials and JSON body, resolves on 204', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 204,
      headers: new Headers(),
    });

    await expect(login('admin@example.com', 'super-secret')).resolves.toBeUndefined();

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/proxy/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@example.com', password: 'super-secret' }),
        cache: 'no-store',
      })
    );
  });

  it('dispatches auth-changed on a successful login', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 204,
      headers: new Headers(),
    });

    await login('admin@example.com', 'super-secret');

    expect(authChangedListener).toHaveBeenCalledTimes(1);
  });

  it('throws ApiError with status 401 on bad credentials', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: jest.fn().mockResolvedValue({ message: 'Unauthorized' }),
    });

    const caught = await login('admin@example.com', 'wrong').catch(error => error);
    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).status).toBe(401);
    expect(authChangedListener).not.toHaveBeenCalled();
  });

  it('throws ApiError with status 429 when rate-limited', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: jest.fn().mockResolvedValue({ message: 'Too Many Requests' }),
    });

    await expect(login('admin@example.com', 'pw')).rejects.toMatchObject({
      name: 'ApiError',
      status: 429,
    });
  });
});

describe('logout', () => {
  it('POSTs through the BFF proxy and resolves on 204', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 204,
      headers: new Headers(),
    });

    await expect(logout()).resolves.toBeUndefined();

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/proxy/api/auth/logout',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
      })
    );
  });

  it('dispatches auth-changed on a successful logout', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 204,
      headers: new Headers(),
    });

    await logout();

    expect(authChangedListener).toHaveBeenCalledTimes(1);
  });

  it('throws ApiError on a non-OK status and does not dispatch auth-changed', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: jest.fn().mockResolvedValue({ message: 'Server error' }),
    });

    await expect(logout()).rejects.toMatchObject({ name: 'ApiError', status: 500 });
    expect(authChangedListener).not.toHaveBeenCalled();
  });
});

describe('me', () => {
  const meBody: MeResponse = {
    email: 'admin@example.com',
    isAdmin: true,
    mfaSatisfied: true,
    galleries: [],
  };

  it('GETs through the BFF proxy and returns the parsed MeResponse on 200', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: jest.fn().mockResolvedValue(meBody),
    });

    const result = await me();

    expect(result).toEqual(meBody);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/proxy/api/auth/me',
      expect.objectContaining({
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
      })
    );
  });

  it('returns null on 401 (anonymous), not an error', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers(),
    });

    await expect(me()).resolves.toBeNull();
  });

  it('throws ApiError on a non-401 non-OK status', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: jest.fn().mockResolvedValue({ message: 'Server error' }),
    });

    await expect(me()).rejects.toMatchObject({ name: 'ApiError', status: 500 });
  });
});

import { __authTestInternals } from '@/app/lib/api/auth';

describe('base64url helpers', () => {
  const { base64urlToArrayBuffer, arrayBufferToBase64url } = __authTestInternals;

  it('round-trips arbitrary bytes through base64url without padding', () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 251, 252, 253, 254, 255]);
    const b64url = arrayBufferToBase64url(bytes.buffer);

    // base64url uses -/_ and strips '=' padding
    expect(b64url).not.toContain('+');
    expect(b64url).not.toContain('/');
    expect(b64url).not.toContain('=');

    const restored = new Uint8Array(base64urlToArrayBuffer(b64url));
    expect(Array.from(restored)).toEqual(Array.from(bytes));
  });

  it('decodes a known base64url string to the expected bytes', () => {
    // "Aa-_" base64url => bytes 0x01 0xAF 0xBF
    const restored = new Uint8Array(base64urlToArrayBuffer('Aa-_'));
    expect(Array.from(restored)).toEqual([0x01, 0xaf, 0xbf]);
  });

  it('encodes bytes that produce - and _ in base64url', () => {
    const bytes = new Uint8Array([0x01, 0xaf, 0xbf]);
    expect(arrayBufferToBase64url(bytes.buffer)).toBe('Aa-_');
  });
});

describe('registerPasskey', () => {
  it('runs the registration ceremony: start -> create -> finish', async () => {
    // start: backend creation options (binary fields are base64url)
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue({
          challenge: 'Aa-_', // bytes 0x01 0xAF 0xBF
          rp: { id: 'localhost', name: 'Zac Edens Photography' },
          user: { id: 'Aa-_', name: 'admin@example.com', displayName: 'Admin' },
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
          excludeCredentials: [{ type: 'public-key', id: 'Aa-_' }],
        }),
      })
      // finish: 204
      .mockResolvedValueOnce({ ok: true, status: 204, headers: new Headers() });

    // navigator.credentials.create returns a PublicKeyCredential-shaped object
    mockCredentialsCreate.mockResolvedValue({
      id: 'cred-id',
      rawId: new Uint8Array([0x01, 0xaf, 0xbf]).buffer,
      type: 'public-key',
      response: {
        clientDataJSON: new Uint8Array([0x01]).buffer,
        attestationObject: new Uint8Array([0xaf]).buffer,
      },
    });

    await expect(registerPasskey()).resolves.toBeUndefined();

    // start called
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      '/api/proxy/api/auth/webauthn/register/start',
      expect.objectContaining({ method: 'POST', credentials: 'same-origin', cache: 'no-store' })
    );

    // create() received decoded ArrayBuffers
    const createArg = mockCredentialsCreate.mock.calls[0][0];
    expect(createArg.publicKey.challenge).toBeInstanceOf(ArrayBuffer);
    expect(Array.from(new Uint8Array(createArg.publicKey.challenge))).toEqual([0x01, 0xaf, 0xbf]);
    expect(createArg.publicKey.user.id).toBeInstanceOf(ArrayBuffer);
    expect(createArg.publicKey.excludeCredentials[0].id).toBeInstanceOf(ArrayBuffer);

    // finish posted base64url-encoded attestation
    const finishCall = (global.fetch as jest.Mock).mock.calls[1];
    expect(finishCall[0]).toBe('/api/proxy/api/auth/webauthn/register/finish');
    const finishBody = JSON.parse(finishCall[1].body as string);
    expect(finishBody.id).toBe('cred-id');
    expect(finishBody.rawId).toBe('Aa-_');
    expect(finishBody.type).toBe('public-key');
    expect(finishBody.response.clientDataJSON).toBe('AQ'); // byte 0x01 -> base64url 'AQ'
    expect(finishBody.response.attestationObject).toBe('rw'); // byte 0xAF -> 'rw'
  });

  it('throws ApiError when start fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: jest.fn().mockResolvedValue({ message: 'Unauthorized' }),
    });

    await expect(registerPasskey()).rejects.toMatchObject({ name: 'ApiError', status: 401 });
    expect(mockCredentialsCreate).not.toHaveBeenCalled();
  });
});

describe('loginWithPasskey', () => {
  it('throws when email is missing', async () => {
    await expect(loginWithPasskey('')).rejects.toThrow('email is required');
  });

  it('runs the assertion ceremony: start -> get -> finish', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue({
          challenge: 'Aa-_',
          allowCredentials: [{ type: 'public-key', id: 'Aa-_' }],
          rpId: 'localhost',
          userVerification: 'required',
        }),
      })
      .mockResolvedValueOnce({ ok: true, status: 204, headers: new Headers() });

    mockCredentialsGet.mockResolvedValue({
      id: 'cred-id',
      rawId: new Uint8Array([0x01, 0xaf, 0xbf]).buffer,
      type: 'public-key',
      response: {
        clientDataJSON: new Uint8Array([0x01]).buffer,
        authenticatorData: new Uint8Array([0xaf]).buffer,
        signature: new Uint8Array([0xbf]).buffer,
        userHandle: new Uint8Array([0x01]).buffer,
      },
    });

    await expect(loginWithPasskey('admin@example.com')).resolves.toBeUndefined();

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      '/api/proxy/api/auth/webauthn/login/start',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@example.com' }),
        cache: 'no-store',
      })
    );

    const getArg = mockCredentialsGet.mock.calls[0][0];
    expect(getArg.publicKey.challenge).toBeInstanceOf(ArrayBuffer);
    expect(getArg.publicKey.allowCredentials[0].id).toBeInstanceOf(ArrayBuffer);

    const finishCall = (global.fetch as jest.Mock).mock.calls[1];
    expect(finishCall[0]).toBe('/api/proxy/api/auth/webauthn/login/finish');
    const finishBody = JSON.parse(finishCall[1].body as string);
    expect(finishBody.id).toBe('cred-id');
    expect(finishBody.rawId).toBe('Aa-_');
    expect(finishBody.response.authenticatorData).toBe('rw'); // 0xAF
    expect(finishBody.response.signature).toBe('vw'); // 0xBF
    expect(finishBody.response.userHandle).toBe('AQ'); // 0x01

    // Session established on finish 204 — the auth-changed contract fires once.
    expect(authChangedListener).toHaveBeenCalledTimes(1);
  });

  it('throws ApiError 429 when login/start is rate-limited', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 429,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: jest.fn().mockResolvedValue({ message: 'Too Many Requests' }),
    });

    await expect(loginWithPasskey('admin@example.com')).rejects.toMatchObject({
      name: 'ApiError',
      status: 429,
    });
    expect(mockCredentialsGet).not.toHaveBeenCalled();
    expect(authChangedListener).not.toHaveBeenCalled();
  });

  it('does not dispatch auth-changed when login/finish fails', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue({
          challenge: 'Aa-_',
          allowCredentials: [],
          rpId: 'localhost',
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue({ message: 'Unauthorized' }),
      });

    mockCredentialsGet.mockResolvedValue({
      id: 'cred-id',
      rawId: new Uint8Array([0x01]).buffer,
      type: 'public-key',
      response: {
        clientDataJSON: new Uint8Array([0x01]).buffer,
        authenticatorData: new Uint8Array([0xaf]).buffer,
        signature: new Uint8Array([0xbf]).buffer,
        userHandle: null,
      },
    });

    await expect(loginWithPasskey('admin@example.com')).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
    });
    expect(authChangedListener).not.toHaveBeenCalled();
  });

  it('omits userHandle from the finish body when the authenticator returns none', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue({
          challenge: 'Aa-_',
          allowCredentials: [],
          rpId: 'localhost',
        }),
      })
      .mockResolvedValueOnce({ ok: true, status: 204, headers: new Headers() });

    mockCredentialsGet.mockResolvedValue({
      id: 'cred-id',
      rawId: new Uint8Array([0x01]).buffer,
      type: 'public-key',
      response: {
        clientDataJSON: new Uint8Array([0x01]).buffer,
        authenticatorData: new Uint8Array([0xaf]).buffer,
        signature: new Uint8Array([0xbf]).buffer,
        userHandle: null,
      },
    });

    await loginWithPasskey('admin@example.com');

    const finishBody = JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body as string);
    expect(finishBody.response.userHandle).toBeNull();
  });
});

describe('meServer', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock) = jest.fn();
    jest.clearAllMocks();
    (getApiBaseUrl as jest.Mock).mockReturnValue('http://localhost:8080/api/auth');
  });

  it('forwards the server cookie header and returns MeResponse on 200', async () => {
    (getServerCookieHeader as jest.Mock).mockResolvedValue('ezac_session=abc');
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest
        .fn()
        .mockResolvedValue({ email: 'c@x.com', isAdmin: false, mfaSatisfied: true, galleries: [] }),
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
