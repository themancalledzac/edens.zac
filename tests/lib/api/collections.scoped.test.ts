import { getScopedAllCollections } from '@/app/lib/api/collections';
import * as core from '@/app/lib/api/core';

jest.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

jest.mock('@/app/lib/api/core', () => {
  const actual = jest.requireActual('@/app/lib/api/core');
  return { ...actual, fetchReadApi: jest.fn() };
});

const mockFetchReadApi = core.fetchReadApi as jest.MockedFunction<typeof core.fetchReadApi>;

describe('getScopedAllCollections', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches the synthetic all-collections slug with cache: no-store', async () => {
    mockFetchReadApi.mockResolvedValue({ id: 1, slug: 'all-collections' });
    await getScopedAllCollections();
    expect(mockFetchReadApi).toHaveBeenCalledWith('/collections/all-collections?page=0&size=500', {
      cache: 'no-store',
    });
  });

  it('throws notFound when the backend returns null', async () => {
    mockFetchReadApi.mockResolvedValue(null);
    await expect(getScopedAllCollections()).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
