/**
 * Unit tests for the per-user "Your Space" API module (saves + follows). Mirrors the fetch-mock
 * idiom of tests/lib/api/selects.test.ts: a global fetch mock, assert the proxy URL + RequestInit,
 * and verify ApiError propagation on non-OK responses. Server readers use a mocked `fetchReadApi`.
 */

import { ApiError, fetchReadApi } from '@/app/lib/api/core';
import {
  addFollow,
  addSave,
  listFollowedCollectionIdsServer,
  listSavedImageIdsServer,
  removeFollow,
  removeSave,
} from '@/app/lib/api/personal';

// Keep ApiError real (client-fetch specs assert on the real error class) while making the server
// reader `fetchReadApi` a controllable mock for the server-seed specs.
jest.mock('@/app/lib/api/core', () => ({
  ...jest.requireActual('@/app/lib/api/core'),
  fetchReadApi: jest.fn(),
}));

const fetchReadApiMock = fetchReadApi as jest.Mock;

global.fetch = jest.fn();

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  (global.fetch as jest.Mock).mockReset();
});

describe('addSave', () => {
  it('POSTs the imageId to the proxy and resolves on 201', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 201,
      headers: new Headers(),
    });

    await expect(addSave(42)).resolves.toBeUndefined();

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/proxy/api/read/user/saves',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId: 42 }),
        cache: 'no-store',
      })
    );
  });

  it('throws ApiError on a non-OK response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ message: 'unauthorized' }),
    });

    await expect(addSave(42)).rejects.toMatchObject({ status: 401 });
  });
});

describe('removeSave', () => {
  it('DELETEs by image id and resolves on 204', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 204,
      headers: new Headers(),
    });

    await expect(removeSave(42)).resolves.toBeUndefined();

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/proxy/api/read/user/saves/42',
      expect.objectContaining({
        method: 'DELETE',
        credentials: 'same-origin',
        cache: 'no-store',
      })
    );
  });
});

describe('addFollow', () => {
  it('POSTs the collectionId to the proxy and resolves on 201', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 201,
      headers: new Headers(),
    });

    await expect(addFollow(7)).resolves.toBeUndefined();

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/proxy/api/read/user/follows',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionId: 7 }),
        cache: 'no-store',
      })
    );
  });
});

describe('removeFollow', () => {
  it('DELETEs by collection id and resolves on 204', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 204,
      headers: new Headers(),
    });

    await expect(removeFollow(7)).resolves.toBeUndefined();

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/proxy/api/read/user/follows/7',
      expect.objectContaining({
        method: 'DELETE',
        credentials: 'same-origin',
        cache: 'no-store',
      })
    );
  });
});

describe('module exports', () => {
  it('exposes ApiError for callers', () => {
    expect(ApiError).toBeDefined();
  });
});

describe('listSavedImageIdsServer', () => {
  it('returns the ids from fetchReadApi', async () => {
    fetchReadApiMock.mockResolvedValueOnce([42, 43]);
    await expect(listSavedImageIdsServer()).resolves.toEqual([42, 43]);
  });

  it('returns [] when fetchReadApi returns null (204)', async () => {
    fetchReadApiMock.mockResolvedValueOnce(null);
    await expect(listSavedImageIdsServer()).resolves.toEqual([]);
  });

  it('returns [] when fetchReadApi throws (e.g. anonymous 401)', async () => {
    fetchReadApiMock.mockRejectedValueOnce(new ApiError('unauth', 401));
    await expect(listSavedImageIdsServer()).resolves.toEqual([]);
  });
});

describe('listFollowedCollectionIdsServer', () => {
  it('returns the ids from fetchReadApi', async () => {
    fetchReadApiMock.mockResolvedValueOnce([3, 5]);
    await expect(listFollowedCollectionIdsServer()).resolves.toEqual([3, 5]);
  });

  it('returns [] when fetchReadApi returns null', async () => {
    fetchReadApiMock.mockResolvedValueOnce(null);
    await expect(listFollowedCollectionIdsServer()).resolves.toEqual([]);
  });

  it('returns [] when fetchReadApi throws (anonymous 401)', async () => {
    fetchReadApiMock.mockRejectedValueOnce(new ApiError('unauth', 401));
    await expect(listFollowedCollectionIdsServer()).resolves.toEqual([]);
  });
});
