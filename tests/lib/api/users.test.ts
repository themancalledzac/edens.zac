/** @jest-environment node */
/**
 * Unit tests for users.ts
 *
 * Mocks fetch + core helpers to verify URL construction, request shape,
 * cache directives, and error-mapping for all three public functions.
 */

import { ApiError, getApiBaseUrl } from '@/app/lib/api/core';
import {
  acceptInvite,
  createUser,
  getInvitePreview,
  listUsers,
  regenerateInvite,
} from '@/app/lib/api/users';
import { type AcceptInviteRequest, type UserCreateRequest } from '@/app/types/User';

jest.mock('next/headers', () => ({ cookies: jest.fn() }));
jest.mock('@/app/utils/environment', () => ({ isLocalEnvironment: jest.fn() }));
jest.mock('@/app/lib/api/core', () => ({
  ...jest.requireActual('@/app/lib/api/core'),
  getApiBaseUrl: jest.fn(),
  getServerCookieHeader: jest.fn(),
  fetchAdminPostJsonApi: jest.fn(),
  fetchAdminGetApi: jest.fn(),
}));

global.fetch = jest.fn();

import * as core from '@/app/lib/api/core';

beforeEach(() => {
  jest.clearAllMocks();
  (getApiBaseUrl as jest.Mock).mockReturnValue('http://localhost:8080/api/auth');
});

// ---------------------------------------------------------------------------
// createUser
// ---------------------------------------------------------------------------

describe('createUser', () => {
  const req: UserCreateRequest = {
    email: 'client@example.com',
    displayName: 'Jane Client',
    role: 'CLIENT',
  };

  it('delegates to fetchAdminPostJsonApi with /users and the request body', async () => {
    const response = { userId: 42, inviteUrl: 'http://localhost:3000/invite/abc123' };
    (core.fetchAdminPostJsonApi as jest.Mock).mockResolvedValue(response);

    const result = await createUser(req);

    expect(core.fetchAdminPostJsonApi).toHaveBeenCalledWith('/users', req);
    expect(result).toEqual(response);
  });

  it('propagates ApiError thrown by fetchAdminPostJsonApi', async () => {
    (core.fetchAdminPostJsonApi as jest.Mock).mockRejectedValue(new ApiError('Conflict', 409));

    await expect(createUser(req)).rejects.toMatchObject({ name: 'ApiError', status: 409 });
  });
});

// ---------------------------------------------------------------------------
// getInvitePreview
// ---------------------------------------------------------------------------

describe('getInvitePreview', () => {
  it('fetches server-side with no-store and returns InvitePreview on 200', async () => {
    const preview = { email: 'client@example.com', displayName: 'Jane' };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(preview),
    });

    const result = await getInvitePreview('mytoken');

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/auth/invite/mytoken',
      expect.objectContaining({ cache: 'no-store' })
    );
    expect(result).toEqual(preview);
  });

  it('encodes special characters in the token', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ email: 'a@b.com', displayName: null }),
    });

    await getInvitePreview('tok/en?sp#ecial');

    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain(encodeURIComponent('tok/en?sp#ecial'));
  });

  it('returns null on 404 (invalid or expired token)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 });

    expect(await getInvitePreview('bad-token')).toBeNull();
  });

  it('returns null on 410 (used token)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 410 });

    expect(await getInvitePreview('used-token')).toBeNull();
  });

  it('returns null on any non-OK status', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });

    expect(await getInvitePreview('token')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// acceptInvite
// ---------------------------------------------------------------------------

describe('acceptInvite', () => {
  const body: AcceptInviteRequest = { displayName: 'Jane Client', password: 's3cr3t!' };

  it('POSTs to the BFF proxy with credentials, JSON body, and no-store on 204', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 204 });

    await expect(acceptInvite('mytoken', body)).resolves.toBeUndefined();

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/proxy/api/auth/invite/mytoken/accept',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
      })
    );
  });

  it('encodes special characters in the token', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 204 });

    await acceptInvite('tok/en', body);

    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain(encodeURIComponent('tok/en'));
  });

  it('throws ApiError on 401', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: jest.fn().mockResolvedValue({ message: 'Unauthorized' }),
    });

    await expect(acceptInvite('tok', body)).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
    });
  });

  it('throws ApiError on 410 (already used)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 410,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: jest.fn().mockResolvedValue({ message: 'Gone' }),
    });

    await expect(acceptInvite('tok', body)).rejects.toMatchObject({
      name: 'ApiError',
      status: 410,
    });
  });
});

// ---------------------------------------------------------------------------
// listUsers
// ---------------------------------------------------------------------------

describe('listUsers', () => {
  it('delegates to fetchAdminGetApi(/users) and returns the array', async () => {
    const users = [
      { id: 1, email: 'a@x.com', displayName: 'Alice', status: 'ACTIVE' },
      { id: 2, email: 'b@x.com', displayName: null, status: 'INVITED' },
    ];
    (core.fetchAdminGetApi as jest.Mock).mockResolvedValue(users);

    const result = await listUsers();

    expect(core.fetchAdminGetApi).toHaveBeenCalledWith('/users');
    expect(result).toEqual(users);
  });

  it('returns [] when the endpoint yields no body', async () => {
    (core.fetchAdminGetApi as jest.Mock).mockResolvedValue(null);

    expect(await listUsers()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// regenerateInvite
// ---------------------------------------------------------------------------

describe('regenerateInvite', () => {
  it('POSTs to /users/{id}/invite and returns the fresh link', async () => {
    const response = { userId: 5, inviteUrl: 'http://localhost:3000/invite/fresh' };
    (core.fetchAdminPostJsonApi as jest.Mock).mockResolvedValue(response);

    const result = await regenerateInvite(5);

    expect(core.fetchAdminPostJsonApi).toHaveBeenCalledWith('/users/5/invite', {});
    expect(result).toEqual(response);
  });

  it('propagates ApiError(404) for an unknown user', async () => {
    (core.fetchAdminPostJsonApi as jest.Mock).mockRejectedValue(new ApiError('Not Found', 404));

    await expect(regenerateInvite(999)).rejects.toMatchObject({ name: 'ApiError', status: 404 });
  });
});
