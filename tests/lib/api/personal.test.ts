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
  listSavedImagesServer,
  removeFollow,
  removeSave,
} from '@/app/lib/api/personal';
import { type ContentImageModel } from '@/app/types/Content';
import { logger } from '@/app/utils/logger';

// Keep ApiError real (client-fetch specs assert on the real error class) while making the server
// reader `fetchReadApi` a controllable mock for the server-seed specs.
jest.mock('@/app/lib/api/core', () => ({
  ...jest.requireActual('@/app/lib/api/core'),
  fetchReadApi: jest.fn(),
}));

// The fail-soft readers log non-401 failures via the project logger (silenced in the test env),
// so assert on the mocked logger.warn rather than a bare console.warn.
jest.mock('@/app/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const fetchReadApiMock = fetchReadApi as jest.Mock;
const warnMock = logger.warn as jest.Mock;

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

/**
 * This one keeps the bare-array contract on purpose: it seeds the SavesProvider, and an unseeded
 * heart renders unlit — indistinguishable from "not saved", so no false claim is made and there is
 * nothing for a caller to do with a failure flag.
 */
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
    expect(warnMock).not.toHaveBeenCalled();
  });

  it('still logs a non-401 failure even though it reports no flag', async () => {
    // Discarding the flag is not the same as discarding the failure: the log is the only thing
    // this path wants from the error, which is why it calls the logger directly rather than
    // building a FailSoftRead to throw away.
    fetchReadApiMock.mockRejectedValueOnce(new ApiError('boom', 500));

    await expect(listSavedImageIdsServer()).resolves.toEqual([]);
    expect(warnMock).toHaveBeenCalledWith(
      'personal',
      expect.stringContaining('saved image ids'),
      expect.objectContaining({ error: expect.any(ApiError) })
    );
  });
});

/**
 * The two reads that BACK VISIBLE COPY report failure instead of resolving to `[]`. `[]` reaches
 * `/user` as "You have not saved any images yet." — a claim about data nobody managed to read, and
 * the owner-side twin of the defect already fixed on the admin path.
 */
describe('listSavedImagesServer', () => {
  const image = (id: number): ContentImageModel =>
    ({
      id,
      contentType: 'IMAGE',
      imageUrl: `https://cdn.example.com/${id}.jpg`,
    }) as ContentImageModel;

  it('returns the images from fetchReadApi as a loaded read', async () => {
    const images = [image(42), image(43)];
    fetchReadApiMock.mockResolvedValueOnce(images);
    await expect(listSavedImagesServer()).resolves.toEqual({ ok: true, items: images });
    expect(fetchReadApiMock).toHaveBeenCalledWith('/user/saves/images');
  });

  it('reports a genuine empty as loaded when fetchReadApi returns null (204)', async () => {
    fetchReadApiMock.mockResolvedValueOnce(null);
    await expect(listSavedImagesServer()).resolves.toEqual({ ok: true, items: [] });
  });

  it('reports a 401 as unavailable — a lapsed session is not proof of an empty set', async () => {
    fetchReadApiMock.mockRejectedValueOnce(new ApiError('unauth', 401));
    await expect(listSavedImagesServer()).resolves.toEqual({ ok: false });
  });

  it('does not warn on a 401, which is expected rather than broken', async () => {
    fetchReadApiMock.mockRejectedValueOnce(new ApiError('unauth', 401));
    await listSavedImagesServer();
    expect(warnMock).not.toHaveBeenCalled();
  });

  it('reports unavailable on a non-401 failure (e.g. stale-backend 404)', async () => {
    fetchReadApiMock.mockRejectedValueOnce(new ApiError('not found', 404));
    await expect(listSavedImagesServer()).resolves.toEqual({ ok: false });
  });

  it('logs the non-401 failure rather than swallowing it', async () => {
    fetchReadApiMock.mockRejectedValueOnce(new ApiError('not found', 404));
    await listSavedImagesServer();
    expect(warnMock).toHaveBeenCalledWith(
      'personal',
      expect.stringContaining('status 404'),
      expect.objectContaining({ error: expect.any(ApiError) })
    );
  });

  it('reports unavailable and logs when the failure is not an ApiError at all', async () => {
    fetchReadApiMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    await expect(listSavedImagesServer()).resolves.toEqual({ ok: false });
    expect(warnMock).toHaveBeenCalledWith(
      'personal',
      expect.stringContaining('status unknown'),
      expect.objectContaining({ error: expect.any(TypeError) })
    );
  });

  it('carries no items on the failure arm, so a caller cannot flatten it to an empty list', async () => {
    // The compiler is the real enforcement — `read.items` does not exist until `read.ok` has been
    // checked — but the runtime shape has to agree, or a `toEqual` elsewhere would pass on a
    // failure that still smuggles an empty array through as an answer.
    fetchReadApiMock.mockRejectedValueOnce(new ApiError('boom', 500));

    await expect(listSavedImagesServer()).resolves.not.toHaveProperty('items');
  });
});

describe('listFollowedCollectionIdsServer', () => {
  it('returns the ids from fetchReadApi as a loaded read', async () => {
    fetchReadApiMock.mockResolvedValueOnce([3, 5]);
    await expect(listFollowedCollectionIdsServer()).resolves.toEqual({ ok: true, items: [3, 5] });
  });

  it('reports a genuine empty as loaded when fetchReadApi returns null', async () => {
    fetchReadApiMock.mockResolvedValueOnce(null);
    await expect(listFollowedCollectionIdsServer()).resolves.toEqual({ ok: true, items: [] });
  });

  it('reports unavailable on a 401', async () => {
    fetchReadApiMock.mockRejectedValueOnce(new ApiError('unauth', 401));
    await expect(listFollowedCollectionIdsServer()).resolves.toEqual({ ok: false });
  });

  it('reports unavailable and logs on a 500', async () => {
    fetchReadApiMock.mockRejectedValueOnce(new ApiError('boom', 500));
    await expect(listFollowedCollectionIdsServer()).resolves.toEqual({ ok: false });
    expect(warnMock).toHaveBeenCalledWith(
      'personal',
      expect.stringContaining('status 500'),
      expect.objectContaining({ error: expect.any(ApiError) })
    );
  });
});
