/**
 * Auth API — mirrors backend Phase F `/api/auth/*` endpoints through the BFF proxy.
 *
 * Every call is a raw `fetch` to `/api/proxy/api/auth/...` with
 * `credentials: 'same-origin'` (so the same-origin proxy response's `Set-Cookie`
 * is accepted/sent) and `cache: 'no-store'`. Mirrors the raw-fetch idiom of
 * `validateClientGalleryAccess` in `app/lib/api/collections.ts`. Non-OK responses
 * throw `ApiError` from `core.ts`; the sole exception is `me()`, which returns
 * `null` on 401 so "logged out" is data, not an error.
 */

import { ApiError } from '@/app/lib/api/core';
import { type MeResponse } from '@/app/types/Auth';

/**
 * Throw an `ApiError` carrying the backend message (or a status fallback) for a
 * non-OK response. Mirrors the error extraction in `validateClientGalleryAccess`.
 */
async function throwFromResponse(res: Response): Promise<never> {
  let detail: unknown;
  const contentType = res.headers.get('content-type') || '';
  try {
    detail = contentType.includes('application/json') ? await res.json() : await res.text();
  } catch {
    detail = '';
  }
  const message =
    typeof detail === 'string' && detail
      ? detail
      : (detail && typeof detail === 'object'
        ? ((detail as { message?: string }).message ?? JSON.stringify(detail))
        : `API error: ${res.status}`);
  throw new ApiError(message, res.status);
}

/**
 * Break-glass / bootstrap password login. POSTs `{email, password}` to
 * `/api/proxy/api/auth/login`. Resolves on `204` (the backend sets the
 * `ezac_session` cookie, forwarded by the proxy). Throws `ApiError(401)` on bad
 * credentials and `ApiError(429)` when rate-limited.
 */
export async function login(email: string, password: string): Promise<void> {
  if (!email) throw new Error('email is required');
  if (!password) throw new Error('password is required');
  const res = await fetch('/api/proxy/api/auth/login', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  });
  if (!res.ok) {
    await throwFromResponse(res);
  }
}

/**
 * Revoke the current session. POSTs to `/api/proxy/api/auth/logout`; the backend
 * returns `204` and clears the `ezac_session` cookie (forwarded by the proxy).
 * Throws `ApiError` on any non-OK status.
 */
export async function logout(): Promise<void> {
  const res = await fetch('/api/proxy/api/auth/logout', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
  });
  if (!res.ok) {
    await throwFromResponse(res);
  }
}

/**
 * Resolve the current principal. GETs `/api/proxy/api/auth/me`. Returns the
 * parsed `MeResponse` on `200`, `null` on `401` (anonymous — "logged out" is
 * data, not an error), and throws `ApiError` on any other non-OK status.
 */
export async function me(): Promise<MeResponse | null> {
  const res = await fetch('/api/proxy/api/auth/me', {
    method: 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
  });
  if (res.status === 401) return null;
  if (!res.ok) {
    await throwFromResponse(res);
  }
  return (await res.json()) as MeResponse;
}

/**
 * Decode a base64url string (no padding, `-`/`_` alphabet) into an `ArrayBuffer`.
 * WebAuthn ceremony JSON delivers all binary fields (challenge, user handle,
 * credential id, attestation/assertion blobs) as base64url.
 */
function base64urlToArrayBuffer(value: string): ArrayBuffer {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Encode an `ArrayBuffer` (or `ArrayBufferView`) into an unpadded base64url
 * string for posting WebAuthn results back to the `/webauthn/*` endpoints.
 */
function arrayBufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i] as number);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * The base64url-encoded creation options the backend returns from
 * `/webauthn/register/start`. Only the fields we decode to `ArrayBuffer` are
 * typed precisely; the rest pass through to `navigator.credentials.create`.
 */
interface CreationOptionsJSON {
  challenge: string;
  user: { id: string; name: string; displayName: string };
  excludeCredentials?: Array<{ id: string; type: string; transports?: AuthenticatorTransport[] }>;
  [key: string]: unknown;
}

/**
 * Register a passkey for the logged-in user (session required). Drives the
 * WebAuthn registration ceremony: fetch creation options, decode the base64url
 * binary fields to `ArrayBuffer`, call `navigator.credentials.create()`, encode
 * the attestation back to base64url, and POST it to `/webauthn/register/finish`.
 * Throws `ApiError` if either round-trip is non-OK.
 */
export async function registerPasskey(): Promise<void> {
  const startRes = await fetch('/api/proxy/api/auth/webauthn/register/start', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
  });
  if (!startRes.ok) {
    await throwFromResponse(startRes);
  }
  const options = (await startRes.json()) as CreationOptionsJSON;

  const publicKey: PublicKeyCredentialCreationOptions = {
    ...(options as unknown as PublicKeyCredentialCreationOptions),
    challenge: base64urlToArrayBuffer(options.challenge),
    user: {
      ...options.user,
      id: base64urlToArrayBuffer(options.user.id),
    },
    excludeCredentials: options.excludeCredentials?.map(cred => ({
      ...cred,
      id: base64urlToArrayBuffer(cred.id),
      type: 'public-key' as const,
    })),
  };

  const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential;
  const response = credential.response as AuthenticatorAttestationResponse;

  const finishBody = {
    id: credential.id,
    rawId: arrayBufferToBase64url(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: arrayBufferToBase64url(response.clientDataJSON),
      attestationObject: arrayBufferToBase64url(response.attestationObject),
    },
  };

  const finishRes = await fetch('/api/proxy/api/auth/webauthn/register/finish', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(finishBody),
    cache: 'no-store',
  });
  if (!finishRes.ok) {
    await throwFromResponse(finishRes);
  }
}

/**
 * The base64url-encoded request options the backend returns from
 * `/webauthn/login/start`. Only the binary fields we decode are typed precisely.
 */
interface RequestOptionsJSON {
  challenge: string;
  allowCredentials?: Array<{ id: string; type: string; transports?: AuthenticatorTransport[] }>;
  [key: string]: unknown;
}

/**
 * Log in with a passkey (public, no session required). Drives the WebAuthn
 * assertion ceremony: fetch request options for `email`, decode the base64url
 * binary fields, call `navigator.credentials.get()`, encode the assertion back
 * to base64url, and POST it to `/webauthn/login/finish` (the backend sets the
 * session cookie on `204`). Throws `ApiError` (e.g. `429`) on a non-OK round-trip.
 */
export async function loginWithPasskey(email: string): Promise<void> {
  if (!email) throw new Error('email is required');

  const startRes = await fetch('/api/proxy/api/auth/webauthn/login/start', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
    cache: 'no-store',
  });
  if (!startRes.ok) {
    await throwFromResponse(startRes);
  }
  const options = (await startRes.json()) as RequestOptionsJSON;

  const publicKey: PublicKeyCredentialRequestOptions = {
    ...(options as unknown as PublicKeyCredentialRequestOptions),
    challenge: base64urlToArrayBuffer(options.challenge),
    allowCredentials: options.allowCredentials?.map(cred => ({
      ...cred,
      id: base64urlToArrayBuffer(cred.id),
      type: 'public-key' as const,
    })),
  };

  const credential = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential;
  const response = credential.response as AuthenticatorAssertionResponse;

  const finishBody = {
    id: credential.id,
    rawId: arrayBufferToBase64url(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: arrayBufferToBase64url(response.clientDataJSON),
      authenticatorData: arrayBufferToBase64url(response.authenticatorData),
      signature: arrayBufferToBase64url(response.signature),
      userHandle: response.userHandle ? arrayBufferToBase64url(response.userHandle) : null,
    },
  };

  const finishRes = await fetch('/api/proxy/api/auth/webauthn/login/finish', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(finishBody),
    cache: 'no-store',
  });
  if (!finishRes.ok) {
    await throwFromResponse(finishRes);
  }
}

/**
 * Internal helpers exposed ONLY for unit tests (base64url round-trip). Not part
 * of the public auth API surface — do not import in application code.
 */
export const __authTestInternals = {
  base64urlToArrayBuffer,
  arrayBufferToBase64url,
};
