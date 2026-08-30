/**
 * Tests for app/[slug]/page.tsx generateMetadata — SEO suppression for
 * password-protected collections. The cover image is private until the password
 * is verified, and meta tags are crawlable without auth, so suppression is keyed
 * on `isPasswordProtected` alone: protected means private regardless of kind, and
 * a payload missing the kind booleans must still be suppressed.
 */

import { generateMetadata } from '@/app/[slug]/page';
import { getCollectionBySlug } from '@/app/lib/api/collections';
import { type CollectionModel } from '@/app/types/Collection';
import { CollectionVisibility } from '@/app/types/CollectionVisibility';
import { logger } from '@/app/utils/logger';

jest.mock('@/app/lib/api/collections', () => ({
  getCollectionBySlug: jest.fn(),
}));

jest.mock('@/app/components/ContentCollection/CollectionPageWrapper', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

const mockGetCollectionBySlug = getCollectionBySlug as jest.MockedFunction<
  typeof getCollectionBySlug
>;

function makeCollection(overrides: Partial<CollectionModel> = {}): CollectionModel {
  return {
    id: 1,
    slug: 'smith-wedding',
    title: 'Smith Wedding',
    isClient: true,
    isBlog: false,
    locations: [],
    visibility: CollectionVisibility.LISTED,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    coverImage: {
      id: 10,
      contentType: 'IMAGE',
      orderIndex: 0,
      imageUrl: 'https://example.com/secret-cover.jpg',
      visible: true,
      locations: [],
    },
    ...overrides,
  };
}

async function metadataFor(overrides: Partial<CollectionModel> = {}) {
  mockGetCollectionBySlug.mockResolvedValue(makeCollection(overrides));
  return generateMetadata({
    params: Promise.resolve({ slug: 'smith-wedding' }),
    searchParams: Promise.resolve({}),
  });
}

describe('generateMetadata — protected-collection suppression', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('suppresses the OG image and title for a protected client gallery', async () => {
    const metadata = await metadataFor({ isClient: true, isPasswordProtected: true });

    expect(metadata.title).toBe('Smith Wedding — Private Gallery');
    expect(metadata.description).toBe('Private gallery — password required.');
    expect(metadata.openGraph?.images).toEqual([]);
  });

  it('keeps the OG image for an unprotected client gallery', async () => {
    const metadata = await metadataFor({ isClient: true, isPasswordProtected: false });

    expect(metadata.title).toBe('Smith Wedding');
    expect(metadata.openGraph?.images).toEqual([{ url: 'https://example.com/secret-cover.jpg' }]);
  });

  it('suppresses the OG image for a protected NON-client collection', async () => {
    const metadata = await metadataFor({ isClient: false, isPasswordProtected: true });

    expect(metadata.title).toBe('Smith Wedding — Private Gallery');
    expect(metadata.openGraph?.images).toEqual([]);
  });

  it('suppresses (and warns) when a protected payload carries no kind booleans', async () => {
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {});

    const metadata = await metadataFor({
      isClient: undefined,
      isBlog: undefined,
      isPasswordProtected: true,
    });

    expect(metadata.openGraph?.images).toEqual([]);
    expect(metadata.title).toBe('Smith Wedding — Private Gallery');
    expect(warn).toHaveBeenCalledWith(
      'slug-page',
      expect.stringContaining('missing isClient/isBlog'),
      expect.objectContaining({ slug: 'smith-wedding' })
    );

    warn.mockRestore();
  });

  it('keeps the OG image when the kind booleans are absent but the collection is unprotected', async () => {
    const metadata = await metadataFor({
      isClient: undefined,
      isBlog: undefined,
      isPasswordProtected: false,
    });

    expect(metadata.openGraph?.images).toEqual([{ url: 'https://example.com/secret-cover.jpg' }]);
  });
});
