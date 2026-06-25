/**
 * @jest-environment node
 *
 * Tests for the server-side rating-override seed. Mocks the cookie/base-url helpers from core
 * (keeping the real ApiError) and stubs global.fetch.
 */

import { getApiBaseUrl, getServerCookieHeader } from '@/app/lib/api/core';
import { listRatingOverridesServer } from '@/app/lib/api/ratingOverridesServer';

jest.mock('@/app/lib/api/core', () => ({
  ...jest.requireActual('@/app/lib/api/core'),
  getServerCookieHeader: jest.fn(),
  getApiBaseUrl: jest.fn(),
}));

const mockCookie = getServerCookieHeader as jest.MockedFunction<typeof getServerCookieHeader>;
const mockBaseUrl = getApiBaseUrl as jest.MockedFunction<typeof getApiBaseUrl>;

describe('listRatingOverridesServer', () => {
  beforeEach(() => {
    mockCookie.mockResolvedValue('ezac_session=abc');
    mockBaseUrl.mockImplementation((t: string) => `http://localhost:8080/api/${t}`);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('returns a contentId->rating map on 200 and forwards the session cookie', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([{ contentId: 5, rating: 3 }]),
    } as Response);

    const map = await listRatingOverridesServer(7);

    expect(map.get(5)).toBe(3);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('http://localhost:8080/api/read/user/ratings?collectionId=7');
    expect((init as RequestInit & { headers: Record<string, string> }).headers.Cookie).toBe(
      'ezac_session=abc'
    );
  });

  it('returns an empty map on 401 (anonymous viewer)', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 401 } as Response);
    const map = await listRatingOverridesServer(7);
    expect(map.size).toBe(0);
  });
});
