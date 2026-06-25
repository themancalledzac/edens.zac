/**
 * Unit tests for the per-user Selects API module. Mirrors the fetch-mock idiom of
 * tests/lib/api/auth.test.ts: a global fetch mock, assert the proxy URL + RequestInit,
 * and verify ApiError propagation on non-OK responses.
 */

import { ApiError } from '@/app/lib/api/core';
import { addSelect, listAllSelects, listSelectIds, removeSelect } from '@/app/lib/api/selects';
import { type SelectGroup } from '@/app/types/Selects';

global.fetch = jest.fn();

afterEach(() => {
  jest.restoreAllMocks();
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

describe('listSelectIds', () => {
  it('returns the parsed id array', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => [42, 43],
    });

    await expect(listSelectIds(3)).resolves.toEqual([42, 43]);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/proxy/api/read/user/selects?collectionId=3',
      expect.objectContaining({ method: 'GET', credentials: 'same-origin', cache: 'no-store' })
    );
  });
});

describe('listAllSelects', () => {
  it('returns the parsed groups', async () => {
    const groups: SelectGroup[] = [
      { collectionId: 3, contentIds: [42, 43] },
      { collectionId: 5, contentIds: [99] },
    ];
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => groups,
    });

    await expect(listAllSelects()).resolves.toEqual(groups);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/proxy/api/read/user/selects',
      expect.objectContaining({ method: 'GET', credentials: 'same-origin', cache: 'no-store' })
    );
  });
});

describe('module exports', () => {
  it('exposes ApiError for callers', () => {
    expect(ApiError).toBeDefined();
  });
});
