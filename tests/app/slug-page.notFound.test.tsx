/**
 * Tests that an unknown collection slug answers 404: the `notFound()` thrown by
 * `getCollectionBySlug` on a backend 404 must propagate out of `generateMetadata`, while a
 * transient failure must still fall back to the 'Not Found' title.
 */

import { notFound } from 'next/navigation';

import { default as CollectionPage, generateMetadata } from '@/app/[slug]/page';
import { getCollectionBySlug } from '@/app/lib/api/collections';
import { logger } from '@/app/utils/logger';

jest.mock('@/app/lib/api/collections', () => ({
  getCollectionBySlug: jest.fn(),
}));

jest.mock('@/app/components/ui/PageLoading/PageLoading', () => ({
  PageLoading: () => null,
}));

jest.mock('@/app/components/ContentCollection/CollectionPageWrapper', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

const mockGetCollectionBySlug = getCollectionBySlug as jest.MockedFunction<
  typeof getCollectionBySlug
>;

function pageFor(slug: string, manage?: string) {
  return CollectionPage({
    params: Promise.resolve({ slug }),
    searchParams: Promise.resolve(manage === undefined ? {} : { manage }),
  });
}

function metadataFor(slug: string) {
  return generateMetadata({
    params: Promise.resolve({ slug }),
    searchParams: Promise.resolve({}),
  });
}

describe('generateMetadata — unknown slug status', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('propagates notFound() from a backend 404', async () => {
    mockGetCollectionBySlug.mockImplementation(() => notFound());

    await expect(metadataFor('no-such-collection')).rejects.toMatchObject({
      digest: expect.stringContaining('NEXT_HTTP_ERROR_FALLBACK;404'),
    });
  });

  it('logs and falls back to the Not Found title on a 5xx error', async () => {
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {});
    mockGetCollectionBySlug.mockRejectedValue(new Error('backend 503'));

    await expect(metadataFor('film')).resolves.toEqual({ title: 'Not Found' });
    expect(warn).toHaveBeenCalled();
  });

  it('falls back to the Not Found title on a network error', async () => {
    jest.spyOn(logger, 'warn').mockImplementation(() => {});
    mockGetCollectionBySlug.mockRejectedValue(new TypeError('fetch failed'));

    await expect(metadataFor('film')).resolves.toEqual({ title: 'Not Found' });
  });
});

describe('CollectionPage — unknown slug status before the loading boundary', () => {
  beforeEach(() => {
    mockGetCollectionBySlug.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('propagates notFound() from the cached collection read', async () => {
    mockGetCollectionBySlug.mockImplementation(() => notFound());

    await expect(pageFor('no-such-collection')).rejects.toMatchObject({
      digest: expect.stringContaining('NEXT_HTTP_ERROR_FALLBACK;404'),
    });
    expect(mockGetCollectionBySlug).toHaveBeenCalledWith('no-such-collection', 0, 500);
  });

  it('renders the page when the read fails transiently', async () => {
    jest.spyOn(logger, 'warn').mockImplementation(() => {});
    mockGetCollectionBySlug.mockRejectedValue(new Error('backend 503'));

    await expect(pageFor('film')).resolves.toBeTruthy();
  });

  it('renders the page when the collection exists', async () => {
    mockGetCollectionBySlug.mockResolvedValue(
      {} as Awaited<ReturnType<typeof getCollectionBySlug>>
    );

    await expect(pageFor('film')).resolves.toBeTruthy();
    expect(mockGetCollectionBySlug).toHaveBeenCalledTimes(1);
  });
});
