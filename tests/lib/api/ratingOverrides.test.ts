/**
 * Tests for the per-user rating override client API (browser-side, same-origin proxy).
 */

import { ApiError } from '@/app/lib/api/core';
import { listRatingOverrides, upsertRatingOverride } from '@/app/lib/api/ratingOverrides';

global.fetch = jest.fn();
const fetchMock = global.fetch as jest.Mock;

describe('ratingOverrides client API', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('upsertRatingOverride PUTs the body to the read/user proxy and resolves on 204', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 204 });

    await expect(upsertRatingOverride(7, 42, 4)).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/proxy/api/read/user/ratings',
      expect.objectContaining({
        method: 'PUT',
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({ collectionId: 7, contentId: 42, rating: 4 }),
      })
    );
  });

  it('upsertRatingOverride throws ApiError on a non-OK response', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403, text: () => Promise.resolve('') });

    const err = await upsertRatingOverride(7, 42, 4).catch((error: unknown) => error);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 403 });
  });

  it('listRatingOverrides GETs by collection and returns a contentId->rating map', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve([
          { contentId: 42, rating: 4 },
          { contentId: 9, rating: 2 },
        ]),
    });

    const map = await listRatingOverrides(7);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/proxy/api/read/user/ratings?collectionId=7',
      expect.objectContaining({ method: 'GET', credentials: 'same-origin', cache: 'no-store' })
    );
    expect(map.get(42)).toBe(4);
    expect(map.get(9)).toBe(2);
  });

  it('listRatingOverrides returns an empty map on 401 (anon is data, not an error)', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401 });
    const map = await listRatingOverrides(7);
    expect(map.size).toBe(0);
  });
});
