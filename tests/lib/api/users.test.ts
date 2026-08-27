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
  listFollowedCollectionIdsByUserServer,
  listSavedImagesByUserServer,
  listUsers,
  mergeUser,
  regenerateInvite,
  updateUser,
  upgradeUser,
} from '@/app/lib/api/users';
import {
  type AcceptInviteRequest,
  type UserCreateRequest,
  type UserUpdateRequest,
} from '@/app/types/User';
import { logger } from '@/app/utils/logger';

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
    expect(result).toEqual({ status: 'ok', preview });
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

  it('reports invalid on 404 (token never existed or expired)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 });

    expect(await getInvitePreview('bad-token')).toEqual({ status: 'invalid' });
  });

  it('distinguishes 410 (already redeemed) from 404 so the page can redirect home', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 410 });

    expect(await getInvitePreview('used-token')).toEqual({ status: 'used' });
  });

  it('reports invalid on any other non-OK status', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });

    expect(await getInvitePreview('token')).toEqual({ status: 'invalid' });
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

  it('falls back to the status, not the JSON body, when the error object has no message', async () => {
    // acceptInvite's inline handler diverges from the shared throwFromResponse in core.ts on
    // exactly this branch: core stringifies the whole body, this returns `API error: <status>`.
    // Every other test here supplies a { message } object, so the divergent branch was never
    // reached. Pinned before E2 considers folding the two together.
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 409,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: jest.fn().mockResolvedValue({ code: 'ALREADY_ACCEPTED' }),
    });

    await expect(acceptInvite('tok', body)).rejects.toThrow('API error: 409');
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
// upgradeUser
// ---------------------------------------------------------------------------

describe('upgradeUser', () => {
  it('POSTs the email to /users/{id}/upgrade and returns the invite link', async () => {
    const response = { userId: 7, inviteUrl: 'http://localhost:3000/invite/upgraded' };
    (core.fetchAdminPostJsonApi as jest.Mock).mockResolvedValue(response);

    const result = await upgradeUser(7, 'person@example.com');

    expect(core.fetchAdminPostJsonApi).toHaveBeenCalledWith('/users/7/upgrade', {
      email: 'person@example.com',
    });
    expect(result).toEqual(response);
  });

  it('trims and lowercases the email so it matches what the backend persists', async () => {
    (core.fetchAdminPostJsonApi as jest.Mock).mockResolvedValue({ userId: 7, inviteUrl: 'u' });

    await upgradeUser(7, '  Person@Example.COM  ');

    expect(core.fetchAdminPostJsonApi).toHaveBeenCalledWith('/users/7/upgrade', {
      email: 'person@example.com',
    });
  });

  it('throws ApiError(500) when the POST yields an empty body', async () => {
    (core.fetchAdminPostJsonApi as jest.Mock).mockResolvedValue(null);

    await expect(upgradeUser(7, 'person@example.com')).rejects.toMatchObject({
      name: 'ApiError',
      status: 500,
    });
  });

  it('propagates ApiError(404) for an unknown id', async () => {
    (core.fetchAdminPostJsonApi as jest.Mock).mockRejectedValue(new ApiError('Not Found', 404));

    await expect(upgradeUser(999, 'x@y.com')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
    });
  });

  it('propagates ApiError(409) for a taken email or non-PERSON target', async () => {
    (core.fetchAdminPostJsonApi as jest.Mock).mockRejectedValue(new ApiError('Conflict', 409));

    await expect(upgradeUser(2, 'taken@y.com')).rejects.toMatchObject({
      name: 'ApiError',
      status: 409,
    });
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

  // The docblock used to promise `null` on 404. It does not — `fetchAdminGetApi` throws for every
  // non-OK status, and `loadUserSpace` relies on the throw to tell "no such page" from "backend
  // down". If this ever starts resolving, the empty state upstream silently becomes a lie again.
  it('throws rather than resolving null on a 404', async () => {
    (core.fetchAdminGetApi as jest.Mock).mockRejectedValue(new ApiError('Not Found', 404));

    await expect(getUserPageById(5)).rejects.toMatchObject({ name: 'ApiError', status: 404 });
  });

  it('throws on a backend outage', async () => {
    (core.fetchAdminGetApi as jest.Mock).mockRejectedValue(new ApiError('Server Error', 500));

    await expect(getUserPageById(5)).rejects.toMatchObject({ name: 'ApiError', status: 500 });
  });
});

// ---------------------------------------------------------------------------
// listSavedImagesByUserServer / listFollowedCollectionIdsByUserServer
//
// Both are fail-soft on purpose (their endpoints are not on the deployed backend yet), but a
// failure must stay DISTINGUISHABLE from a genuine empty: flattened to `[]`, the Saved section
// asserts "This user has not saved any images yet" during an outage. `ok` is that distinction.
//
// Because those endpoints are missing, the failure path is the CURRENT path on every render of
// /admin/users/[id] — so it logs at `warn`, matching the self-side twins in personal.ts. `error`
// for an expected outcome is how an error channel stops being read.
// ---------------------------------------------------------------------------

describe('listSavedImagesByUserServer', () => {
  it('reports ok with the images the endpoint returned', async () => {
    const images = [{ id: 1, contentType: 'IMAGE' }];
    (core.fetchAdminGetApi as jest.Mock).mockResolvedValue(images);

    const result = await listSavedImagesByUserServer(5);

    expect(core.fetchAdminGetApi).toHaveBeenCalledWith('/users/5/saves/images');
    expect(result).toEqual({ ok: true, items: images });
  });

  it('reports ok with an empty list for a genuinely empty read (empty body)', async () => {
    (core.fetchAdminGetApi as jest.Mock).mockResolvedValue(null);

    expect(await listSavedImagesByUserServer(5)).toEqual({ ok: true, items: [] });
  });

  it('reports NOT ok when the read fails, so the section cannot claim the user saved nothing', async () => {
    (core.fetchAdminGetApi as jest.Mock).mockRejectedValue(new ApiError('Not Found', 404));

    expect(await listSavedImagesByUserServer(5)).toEqual({ ok: false });
  });

  it('carries no items on the failure arm, so a caller cannot flatten it to an empty list', async () => {
    (core.fetchAdminGetApi as jest.Mock).mockRejectedValue(new ApiError('Not Found', 404));

    expect(await listSavedImagesByUserServer(5)).not.toHaveProperty('items');
  });

  it('logs the failure instead of swallowing it', async () => {
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
    (core.fetchAdminGetApi as jest.Mock).mockRejectedValue(new ApiError('Server Error', 500));

    await listSavedImagesByUserServer(5);

    expect(warnSpy).toHaveBeenCalledWith(
      'users',
      expect.stringContaining('saved images'),
      expect.objectContaining({ error: expect.any(ApiError), userId: 5 })
    );
    warnSpy.mockRestore();
  });

  it('logs a known-missing endpoint at warn, never error', async () => {
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
    (core.fetchAdminGetApi as jest.Mock).mockRejectedValue(new ApiError('Not Found', 404));

    await listSavedImagesByUserServer(5);

    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});

describe('listFollowedCollectionIdsByUserServer', () => {
  it('reports ok with the ids the endpoint returned', async () => {
    (core.fetchAdminGetApi as jest.Mock).mockResolvedValue([7, 9]);

    const result = await listFollowedCollectionIdsByUserServer(5);

    expect(core.fetchAdminGetApi).toHaveBeenCalledWith('/users/5/follows');
    expect(result).toEqual({ ok: true, items: [7, 9] });
  });

  it('reports ok with an empty list for a genuinely empty read (empty body)', async () => {
    (core.fetchAdminGetApi as jest.Mock).mockResolvedValue(null);

    expect(await listFollowedCollectionIdsByUserServer(5)).toEqual({ ok: true, items: [] });
  });

  it('reports NOT ok when the read fails, so the section cannot claim the user follows nothing', async () => {
    (core.fetchAdminGetApi as jest.Mock).mockRejectedValue(new ApiError('Not Found', 404));

    expect(await listFollowedCollectionIdsByUserServer(5)).toEqual({ ok: false });
  });

  it('logs the failure at warn, never error, and never swallows it', async () => {
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
    (core.fetchAdminGetApi as jest.Mock).mockRejectedValue(new ApiError('Server Error', 500));

    await listFollowedCollectionIdsByUserServer(5);

    expect(warnSpy).toHaveBeenCalledWith(
      'users',
      expect.stringContaining('follows'),
      expect.objectContaining({ error: expect.any(ApiError), userId: 5 })
    );
    expect(errorSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
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
