/**
 * Tests for CollectionPageWrapper's CLIENT_GALLERY routing logic.
 *
 * Pins the FE-H6 invariant structurally: a locked CLIENT_GALLERY (no
 * authenticated cookie → backend returned `content: null`) routes to
 * `<ClientGalleryGate>`, never wrapping `<CollectionPage>` as children.
 * An authenticated CLIENT_GALLERY (cookie validated → `content` is an array,
 * possibly empty) routes directly to `<CollectionPage>`. This test exists
 * because the prior implementation initialised the gate's state from
 * `isPasswordProtected`, which is a gallery property and stays true even
 * after authentication — that bug forced authenticated viewers to re-enter
 * their password on every reload.
 */

import ClientGalleryGate from '@/app/components/ClientGalleryGate/ClientGalleryGate';
import CollectionPage from '@/app/components/ContentCollection/CollectionPage';
import * as collectionsApi from '@/app/lib/api/collections';
import { ApiError } from '@/app/lib/api/core';
import CollectionPageWrapper from '@/app/lib/components/CollectionPageWrapper';
import { type CollectionModel, CollectionType } from '@/app/types/Collection';

jest.mock('@/app/lib/api/collections', () => ({
  getCollectionBySlug: jest.fn(),
}));

const notFoundMock = jest.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});
jest.mock('next/navigation', () => ({
  notFound: () => notFoundMock(),
}));

const mockGetCollectionBySlug = collectionsApi.getCollectionBySlug as jest.MockedFunction<
  typeof collectionsApi.getCollectionBySlug
>;

function makeCollection(overrides: Partial<CollectionModel> = {}): CollectionModel {
  return {
    id: 1,
    slug: 'smith-wedding',
    title: 'Smith Wedding',
    type: CollectionType.CLIENT_GALLERY,
    locations: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    visible: true,
    isPasswordProtected: true,
    ...overrides,
  };
}

describe('CollectionPageWrapper — CLIENT_GALLERY routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('routes a locked CLIENT_GALLERY (content === undefined) to <ClientGalleryGate>', async () => {
    mockGetCollectionBySlug.mockResolvedValue(makeCollection({ content: undefined }));

    const element = await CollectionPageWrapper({ slug: 'smith-wedding' });

    expect(element.type).toBe(ClientGalleryGate);
    expect(element.props.collection.slug).toBe('smith-wedding');
    // Critical: the gate is rendered standalone — <CollectionPage> is never
    // passed as children, so its RSC payload (cover image, image grid)
    // doesn't leak to a locked viewer.
    expect(element.props.children).toBeUndefined();
  });

  it('routes an authenticated CLIENT_GALLERY (content is an array) to <CollectionPage>, NOT the gate', async () => {
    mockGetCollectionBySlug.mockResolvedValue(
      makeCollection({
        isPasswordProtected: true,
        content: [
          { id: 1, contentType: 'IMAGE', orderIndex: 0 },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ] as any,
      })
    );

    const element = await CollectionPageWrapper({ slug: 'smith-wedding' });

    expect(element.type).toBe(CollectionPage);
    expect(element.type).not.toBe(ClientGalleryGate);
  });

  it('routes an empty-but-authenticated CLIENT_GALLERY (content === []) to <CollectionPage>', async () => {
    mockGetCollectionBySlug.mockResolvedValue(
      makeCollection({
        isPasswordProtected: true,
        content: [],
      })
    );

    const element = await CollectionPageWrapper({ slug: 'smith-wedding' });

    expect(element.type).toBe(CollectionPage);
  });

  it('routes a non-protected CLIENT_GALLERY directly to <CollectionPage>', async () => {
    mockGetCollectionBySlug.mockResolvedValue(
      makeCollection({
        isPasswordProtected: false,
        content: undefined,
      })
    );

    const element = await CollectionPageWrapper({ slug: 'smith-wedding' });

    expect(element.type).toBe(CollectionPage);
  });

  it('routes a non-CLIENT_GALLERY collection directly to <CollectionPage>', async () => {
    mockGetCollectionBySlug.mockResolvedValue(
      makeCollection({
        type: CollectionType.PORTFOLIO,
        isPasswordProtected: false,
      })
    );

    const element = await CollectionPageWrapper({ slug: 'portfolio-2026' });

    expect(element.type).toBe(CollectionPage);
  });

  it('calls notFound() when the slug is empty', async () => {
    await expect(CollectionPageWrapper({ slug: '' })).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFoundMock).toHaveBeenCalled();
  });

  it('calls notFound() when getCollectionBySlug throws ApiError 404', async () => {
    mockGetCollectionBySlug.mockRejectedValue(new ApiError('Not found', 404));

    await expect(CollectionPageWrapper({ slug: 'missing' })).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFoundMock).toHaveBeenCalled();
  });
});
