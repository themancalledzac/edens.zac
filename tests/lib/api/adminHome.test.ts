import { getAdminHomeTiles } from '@/app/lib/api/adminHome';
import * as core from '@/app/lib/api/core';

jest.mock('@/app/lib/api/core', () => {
  const actual = jest.requireActual('@/app/lib/api/core');
  return {
    ...actual,
    fetchAdminGetApi: jest.fn(),
  };
});

const mockFetchAdmin = core.fetchAdminGetApi as jest.MockedFunction<typeof core.fetchAdminGetApi>;

describe('getAdminHomeTiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls /admin-home/tiles via the admin GET helper with no-store cache', async () => {
    mockFetchAdmin.mockResolvedValue([]);
    await getAdminHomeTiles();
    expect(mockFetchAdmin).toHaveBeenCalledWith('/admin-home/tiles', { cache: 'no-store' });
  });

  it('returns the parsed tiles array on success', async () => {
    const fixture = [
      { tileKey: 'home', coverImageUrl: 'https://cf.example/home.jpg', displayOrder: 0 },
      { tileKey: 'all-images', coverImageUrl: null, displayOrder: 2 },
    ];
    mockFetchAdmin.mockResolvedValue(fixture);
    await expect(getAdminHomeTiles()).resolves.toEqual(fixture);
  });

  it('returns an empty array when the API yields null (e.g. 204 No Content)', async () => {
    mockFetchAdmin.mockResolvedValue(null);
    await expect(getAdminHomeTiles()).resolves.toEqual([]);
  });

  it('propagates ApiError from the fetcher', async () => {
    const apiError = new core.ApiError('not found', 404);
    mockFetchAdmin.mockRejectedValue(apiError);
    await expect(getAdminHomeTiles()).rejects.toBe(apiError);
  });
});
