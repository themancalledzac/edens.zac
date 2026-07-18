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
  getAdminUser,
  getInvitePreview,
  getMergePreview,
  getUserPageById,
  listUsers,
  mergeUser,
  regenerateInvite,
  updateUser,
} from '@/app/lib/api/users';
import {
  type AcceptInviteRequest,
  type UserCreateRequest,
  type UserUpdateRequest,
} from '@/app/types/User';

jest.mock('next/headers', () => ({ cookies: jest.fn() }));
jest.mock('@/app/utils/environment', () => ({ isLocalEnvironment: jest.fn() }));
jest.mock('@/app/lib/api/core', () => ({
  ...jest.requireActual('@/app/lib/api/core'),
  getApiBaseUrl: jest.fn(),
  getServerCookieHeader: jest.fn(),
  fetchAdminPostJsonApi: jest.fn(),
  fetchAdminGetApi: jest.fn(),
  fetchAdminPatchJsonApi: jest.fn(),
  fetchAdminPutJsonApi: jest.fn(),
  fetchAdminDeleteApi: jest.fn(),
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

// ---------------------------------------------------------------------------
// getAdminUser
// ---------------------------------------------------------------------------

describe('getAdminUser', () => {
  it('delegates to fetchAdminGetApi(/users/{id}) and returns the summary', async () => {
    const summary = { id: 5, email: 'e@x.com', displayName: 'Eve', status: 'ACTIVE' };
    (core.fetchAdminGetApi as jest.Mock).mockResolvedValue(summary);

    const result = await getAdminUser(5);

    expect(core.fetchAdminGetApi).toHaveBeenCalledWith('/users/5');
    expect(result).toEqual(summary);
  });

  it('returns null when the user is not found (empty body)', async () => {
    (core.fetchAdminGetApi as jest.Mock).mockResolvedValue(null);

    expect(await getAdminUser(404)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// updateUser
// ---------------------------------------------------------------------------

describe('updateUser', () => {
  const body: UserUpdateRequest = { displayName: 'Kenneth', status: 'ACTIVE' };

  it('PATCHes via fetchAdminPatchJsonApi(/users/{id}) and returns the refreshed summary', async () => {
    const summary = { id: 8, email: 'ken@x.com', displayName: 'Kenneth', status: 'ACTIVE' };
    (core.fetchAdminPatchJsonApi as jest.Mock).mockResolvedValue(summary);

    const result = await updateUser(8, body);

    expect(core.fetchAdminPatchJsonApi).toHaveBeenCalledWith('/users/8', body);
    expect(result).toEqual(summary);
  });

  it('throws ApiError(500) when PATCH yields an empty body', async () => {
    (core.fetchAdminPatchJsonApi as jest.Mock).mockResolvedValue(null);

    await expect(updateUser(8, body)).rejects.toMatchObject({ name: 'ApiError', status: 500 });
  });

  it('propagates ApiError(404) for an unknown user', async () => {
    (core.fetchAdminPatchJsonApi as jest.Mock).mockRejectedValue(new ApiError('Not Found', 404));

    await expect(updateUser(999, body)).rejects.toMatchObject({ name: 'ApiError', status: 404 });
  });
});

// ---------------------------------------------------------------------------
// getUserPageById
// ---------------------------------------------------------------------------

describe('getUserPageById', () => {
  it('delegates to fetchAdminGetApi(/users/{id}/page) and returns the collection model', async () => {
    const page = { id: 99, title: "Jane's Gallery", slug: 'jane' };
    (core.fetchAdminGetApi as jest.Mock).mockResolvedValue(page);

    const result = await getUserPageById(5);

    expect(core.fetchAdminGetApi).toHaveBeenCalledWith('/users/5/page');
    expect(result).toEqual(page);
  });

  it('returns null when the user has no galleries (empty body)', async () => {
    (core.fetchAdminGetApi as jest.Mock).mockResolvedValue(null);

    expect(await getUserPageById(5)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// listUsers includePeople
// ---------------------------------------------------------------------------

describe('listUsers includePeople', () => {
  it('requests ?includePeople=true when asked', async () => {
    (core.fetchAdminGetApi as jest.Mock).mockResolvedValue([]);
    await listUsers({ includePeople: true });
    expect(core.fetchAdminGetApi).toHaveBeenCalledWith('/users?includePeople=true');
  });
  it('requests plain /users by default', async () => {
    (core.fetchAdminGetApi as jest.Mock).mockResolvedValue([]);
    await listUsers();
    expect(core.fetchAdminGetApi).toHaveBeenCalledWith('/users');
  });
});

// ---------------------------------------------------------------------------
// getMergePreview
// ---------------------------------------------------------------------------

describe('getMergePreview', () => {
  it('GETs the preview with the targetId query', async () => {
    const preview = { sourceId: 2, targetId: 1, imageTagCount: 3 };
    (core.fetchAdminGetApi as jest.Mock).mockResolvedValue(preview);
    const result = await getMergePreview(2, 1);
    expect(core.fetchAdminGetApi).toHaveBeenCalledWith('/users/2/merge-preview?targetId=1');
    expect(result).toEqual(preview);
  });
});

// ---------------------------------------------------------------------------
// mergeUser
// ---------------------------------------------------------------------------

describe('mergeUser', () => {
  it('POSTs sourceId to the target merge endpoint', async () => {
    const res = { movedImageTags: 2, movedCollections: 1, duplicatesCollapsed: 0 };
    (core.fetchAdminPostJsonApi as jest.Mock).mockResolvedValue(res);
    const result = await mergeUser(1, 2);
    expect(core.fetchAdminPostJsonApi).toHaveBeenCalledWith('/users/1/merge', { sourceId: 2 });
    expect(result).toEqual(res);
  });
  it('propagates ApiError(409) for an illegal merge', async () => {
    (core.fetchAdminPostJsonApi as jest.Mock).mockRejectedValue(new ApiError('Conflict', 409));
    await expect(mergeUser(1, 2)).rejects.toMatchObject({ name: 'ApiError', status: 409 });
  });
});
