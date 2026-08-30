/**
 * Tests for CollectionPageWrapper's password-protection routing logic.
 *
 * Pins the FE-H6 invariant structurally: a locked collection (no authenticated
 * cookie → backend returned `content: null`) routes to `<ClientGalleryGate>`,
 * never wrapping `<CollectionPage>` as children. An authenticated one (cookie
 * validated → `content` is an array, possibly empty) routes directly to
 * `<CollectionPage>`. Routing keys on `isPasswordProtected` + `Array.isArray(content)`
 * alone — the collection's kind plays no part. This test exists because the prior
 * implementation initialised the gate's state from `isPasswordProtected`, which is a
 * gallery property and stays true even after authentication — that bug forced
 * authenticated viewers to re-enter their password on every reload.
 */

import ClientGalleryGate from '@/app/components/ClientGalleryGate/ClientGalleryGate';
import CollectionPage from '@/app/components/ContentCollection/CollectionPage';
import CollectionPageWrapper from '@/app/components/ContentCollection/CollectionPageWrapper';
import * as collectionsApi from '@/app/lib/api/collections';
import { ApiError } from '@/app/lib/api/core';
import { type CollectionModel } from '@/app/types/Collection';
import { CollectionVisibility } from '@/app/types/CollectionVisibility';
import { logger } from '@/app/utils/logger';

jest.mock('@/app/lib/api/collections', () => ({
  getCollectionBySlug: jest.fn(),
}));

// The wrapper resolves the principal (meServer) and server-seeds Selects (listSelectIdsServer);
// isolate both so these routing tests don't hit the network (either would otherwise throw `fetch is
// not defined` under jsdom). Anonymous principal is the routing default.
jest.mock('@/app/lib/api/auth', () => ({
  meServer: jest.fn(async () => null),
}));
jest.mock('@/app/lib/api/selects', () => ({
  listSelectIdsServer: jest.fn(async () => []),
}));
jest.mock('@/app/lib/api/personal', () => ({
  listSavedImageIdsServer: jest.fn(async () => []),
}));

const notFoundMock = jest.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});
jest.mock('next/navigation', () => ({
  notFound: () => notFoundMock(),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));
// SiteHeader → MenuDropdown → clearCache action → next/cache, which references
// Request/TextEncoder at module init and breaks under jsdom.
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));
jest.mock('@/app/utils/ssrViewport', () => ({
  resolveSsrViewport: jest.fn(async () => ({
    contentWidth: 1274,
    viewportHeight: 800,
    isMobile: false,
  })),
}));

const mockGetCollectionBySlug = collectionsApi.getCollectionBySlug as jest.MockedFunction<
  typeof collectionsApi.getCollectionBySlug
>;

function makeCollection(overrides: Partial<CollectionModel> = {}): CollectionModel {
  return {
    id: 1,
    slug: 'smith-wedding',
    title: 'Smith Wedding',
    isClient: true,
    isBlog: false,
    locations: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    visibility: CollectionVisibility.LISTED,
    isPasswordProtected: true,
    ...overrides,
  };
}

describe('CollectionPageWrapper — password-protection routing', () => {
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

  it('routes a non-client, non-protected collection directly to <CollectionPage>', async () => {
    mockGetCollectionBySlug.mockResolvedValue(
      makeCollection({
        isClient: false,
        isPasswordProtected: false,
      })
    );

    const element = await CollectionPageWrapper({ slug: 'portfolio-2026' });

    expect(element.type).toBe(CollectionPage);
  });

  it('gates a locked protected NON-client collection (new behavior: the gate keys on isPasswordProtected alone)', async () => {
    mockGetCollectionBySlug.mockResolvedValue(
      makeCollection({
        isClient: false,
        isPasswordProtected: true,
        content: undefined,
      })
    );

    const element = await CollectionPageWrapper({ slug: 'private-portfolio' });

    expect(element.type).toBe(ClientGalleryGate);
  });

  it('routes an authenticated protected collection with an empty array to <CollectionPage>', async () => {
    mockGetCollectionBySlug.mockResolvedValue(
      makeCollection({
        isClient: false,
        isPasswordProtected: true,
        content: [],
      })
    );

    const element = await CollectionPageWrapper({ slug: 'edens-family' });

    expect(element.type).toBe(CollectionPage);
  });

  it('bypasses the gate entirely in editMode (admins are never password-walled)', async () => {
    mockGetCollectionBySlug.mockResolvedValue(
      makeCollection({ isPasswordProtected: true, content: undefined })
    );

    const element = await CollectionPageWrapper({ slug: 'smith-wedding', editMode: true });

    expect(element.type).toBe(CollectionPage);
    expect(element.type).not.toBe(ClientGalleryGate);
    expect(element.props.editMode).toBe(true);
  });

  it('seeds Selects only for client galleries (isClient drives listSelectIdsServer)', async () => {
    const { listSelectIdsServer } = jest.requireMock('@/app/lib/api/selects') as {
      listSelectIdsServer: jest.Mock;
    };

    mockGetCollectionBySlug.mockResolvedValue(makeCollection({ isClient: true, content: [] }));
    await CollectionPageWrapper({ slug: 'smith-wedding' });
    expect(listSelectIdsServer).toHaveBeenCalledWith(1);

    listSelectIdsServer.mockClear();
    mockGetCollectionBySlug.mockResolvedValue(
      makeCollection({ isClient: false, isPasswordProtected: false, content: [] })
    );
    await CollectionPageWrapper({ slug: 'portfolio-2026' });
    expect(listSelectIdsServer).not.toHaveBeenCalled();
  });

  it('degrades to no Selects seed on a payload missing isClient, and warns when a grant exists', async () => {
    const { listSelectIdsServer } = jest.requireMock('@/app/lib/api/selects') as {
      listSelectIdsServer: jest.Mock;
    };
    const { meServer } = jest.requireMock('@/app/lib/api/auth') as { meServer: jest.Mock };
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {});

    // Stale payload: no kind booleans, but the viewer holds a CLIENT grant for it.
    meServer.mockResolvedValueOnce({
      email: 'client@example.com',
      isAdmin: false,
      mfaSatisfied: true,
      galleries: [{ collectionId: 1, role: 'CLIENT' }],
    });
    mockGetCollectionBySlug.mockResolvedValue(
      makeCollection({
        isClient: undefined as unknown as boolean,
        isPasswordProtected: false,
        content: [],
      })
    );

    await CollectionPageWrapper({ slug: 'smith-wedding' });

    expect(listSelectIdsServer).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      'CollectionPageWrapper',
      expect.stringContaining('missing isClient'),
      expect.objectContaining({ collectionId: 1 })
    );

    warn.mockRestore();
  });

  it('seeds saved image ids for ANY collection when a principal is present (unified render path)', async () => {
    const { meServer } = jest.requireMock('@/app/lib/api/auth') as { meServer: jest.Mock };
    const { listSavedImageIdsServer } = jest.requireMock('@/app/lib/api/personal') as {
      listSavedImageIdsServer: jest.Mock;
    };

    meServer.mockResolvedValueOnce({
      email: 'viewer@example.com',
      isAdmin: false,
      mfaSatisfied: true,
      galleries: [],
    });
    listSavedImageIdsServer.mockResolvedValueOnce([7, 9]);
    mockGetCollectionBySlug.mockResolvedValue(
      makeCollection({
        isClient: false,
        isPasswordProtected: false,
        content: [],
      })
    );

    const element = await CollectionPageWrapper({ slug: 'portfolio-2026' });

    expect(element.type).toBe(CollectionPage);
    expect(element.props.initialSavedImageIds).toEqual([7, 9]);

    listSavedImageIdsServer.mockClear();
    // Anonymous phase — pinned explicitly rather than relying on the module-level default.
    meServer.mockResolvedValueOnce(null);
    await CollectionPageWrapper({ slug: 'portfolio-2026' });
    expect(listSavedImageIdsServer).not.toHaveBeenCalled();
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
