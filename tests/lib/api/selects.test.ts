/**
 * Unit tests for the per-user Selects API module. Mirrors the fetch-mock idiom of
 * tests/lib/api/auth.test.ts: a global fetch mock, assert the proxy URL + RequestInit,
 * and verify ApiError propagation on non-OK responses.
 */

import { ApiError, fetchReadApi } from '@/app/lib/api/core';
import { addSelect, listSelectIdsServer, removeSelect } from '@/app/lib/api/selects';

// Keep ApiError (and the rest) real — the client-fetch specs assert on the real error class —
// while making the server reader `fetchReadApi` a controllable mock for the server-seed specs.
jest.mock('@/app/lib/api/core', () => ({
  ...jest.requireActual('@/app/lib/api/core'),
  fetchReadApi: jest.fn(),
}));

// Mocked so `listSelectIdsServer`'s failure path has somewhere to log; nothing here asserts on it.
jest.mock('@/app/utils/logger', () => ({
  logger: { debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const fetchReadApiMock = fetchReadApi as jest.Mock;

global.fetch = jest.fn();

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  (global.fetch as jest.Mock).mockReset();
});

describe('addSelect', () => {
  it('POSTs the body to the proxy and resolves on 201', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 201,
      headers: new Headers(),
    });

    await expect(addSelect(3, 42)).resolves.toBeUndefined();

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/proxy/api/read/user/selects',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionId: 3, contentId: 42 }),
        cache: 'no-store',
      })
    );
  });

  it('throws ApiError on a non-OK response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ message: 'forbidden' }),
    });

    await expect(addSelect(3, 42)).rejects.toMatchObject({ status: 403 });
  });
});

describe('removeSelect', () => {
  it('DELETEs by content id and resolves on 204', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 204,
      headers: new Headers(),
    });

    await expect(removeSelect(42)).resolves.toBeUndefined();

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/proxy/api/read/user/selects/42',
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

describe('listSelectIdsServer', () => {
  it('returns the ids from fetchReadApi', async () => {
    fetchReadApiMock.mockResolvedValueOnce([42, 43]);
    await expect(listSelectIdsServer(3)).resolves.toEqual([42, 43]);
  });

  it('returns [] when fetchReadApi returns null (204)', async () => {
    fetchReadApiMock.mockResolvedValueOnce(null);
    await expect(listSelectIdsServer(3)).resolves.toEqual([]);
  });

  it('returns [] when fetchReadApi throws (e.g. anonymous 401)', async () => {
    fetchReadApiMock.mockRejectedValueOnce(new ApiError('unauth', 401));
    await expect(listSelectIdsServer(3)).resolves.toEqual([]);
  });
});
