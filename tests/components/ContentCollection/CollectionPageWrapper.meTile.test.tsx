import CollectionPage from '@/app/components/ContentCollection/CollectionPage';
import CollectionPageWrapper from '@/app/components/ContentCollection/CollectionPageWrapper';
import { LAYOUT } from '@/app/constants';
import * as collectionsApi from '@/app/lib/api/collections';
import { type CollectionModel } from '@/app/types/Collection';
import { CollectionVisibility } from '@/app/types/CollectionVisibility';
import { ME_TILE_ID } from '@/app/utils/meContentBlock';
import { resolveSsrViewport } from '@/app/utils/ssrViewport';

const mockMeServer = jest.fn();
const mockGetUserPage = jest.fn();

jest.mock('@/app/lib/api/collections', () => ({ getCollectionBySlug: jest.fn() }));
jest.mock('@/app/lib/api/auth', () => ({ meServer: () => mockMeServer() }));
jest.mock('@/app/lib/api/selects', () => ({ listSelectIdsServer: jest.fn(async () => []) }));
jest.mock('@/app/lib/api/personal', () => ({
  getUserPage: () => mockGetUserPage(),
  listSavedImageIdsServer: jest.fn(async () => []),
}));
jest.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn(), revalidateTag: jest.fn() }));
jest.mock('@/app/utils/ssrViewport', () => ({
  resolveSsrViewport: jest.fn(async () => ({
    contentWidth: 1274,
    viewportHeight: 800,
    isMobile: false,
  })),
}));

const mockResolveSsrViewport = resolveSsrViewport as jest.MockedFunction<typeof resolveSsrViewport>;

const mockGetCollectionBySlug = collectionsApi.getCollectionBySlug as jest.MockedFunction<
  typeof collectionsApi.getCollectionBySlug
>;

function homeCollection(overrides: Partial<CollectionModel> = {}): CollectionModel {
  return {
    id: 1,
    slug: 'home',
    title: 'Home',
    isClient: false,
    isBlog: false,
    locations: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    visibility: CollectionVisibility.LISTED,
    isPasswordProtected: false,
    content: [
      { id: 10, contentType: 'IMAGE', orderIndex: 0, slug: 'alpha' },
      { id: 11, contentType: 'IMAGE', orderIndex: 1, slug: 'beta' },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any,
    ...overrides,
  };
}

describe('CollectionPageWrapper — Me tile injection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('injects the Me tile as the FIRST home tile for a logged-in viewer', async () => {
    mockMeServer.mockResolvedValue({
      email: 'a@b.com',
      isAdmin: false,
      mfaSatisfied: true,
      passkeyCount: 0,
      galleries: [],
    });
    mockGetUserPage.mockResolvedValue({
      ...homeCollection(),
      coverImage: {
        id: 7,
        contentType: 'IMAGE',
        orderIndex: 0,
        imageUrl: 'https://cdn/x.jpg',
        imageWidth: 1600,
        imageHeight: 1000,
        locations: [],
      },
    });
    mockGetCollectionBySlug.mockResolvedValue(homeCollection());

    const element = await CollectionPageWrapper({ slug: 'home' });

    expect(element.type).toBe(CollectionPage);
    const content = element.props.collection.content;
    expect(content).toHaveLength(3);
    expect(content[0].id).toBe(ME_TILE_ID);
    expect(content[0].slug).toBe('user');
    expect(content[0].orderIndex).toBeLessThan(content[1].orderIndex);
    expect(element.props.mobileChunkSize).toBe(LAYOUT.homeMobileChunkSize);
  });

  it('injects a placeholder Me tile when getUserPage() returns null for a logged-in viewer', async () => {
    mockMeServer.mockResolvedValue({
      email: 'a@b.com',
      isAdmin: false,
      mfaSatisfied: true,
      passkeyCount: 0,
      galleries: [],
    });
    mockGetUserPage.mockResolvedValue(null);
    mockGetCollectionBySlug.mockResolvedValue(homeCollection());

    const element = await CollectionPageWrapper({ slug: 'home' });

    const content = element.props.collection.content;
    expect(content).toHaveLength(3);
    expect(content[0].id).toBe(ME_TILE_ID);
    expect(content[0].imageUrl).toBe('');
  });

  it('does NOT inject the Me tile for an anonymous home viewer', async () => {
    mockMeServer.mockResolvedValue(null);
    mockGetCollectionBySlug.mockResolvedValue(homeCollection());

    const element = await CollectionPageWrapper({ slug: 'home' });

    const content = element.props.collection.content;
    expect(content).toHaveLength(2);
    expect(content.some((b: { id: number }) => b.id === ME_TILE_ID)).toBe(false);
    expect(mockGetUserPage).not.toHaveBeenCalled();
  });

  it('omits the Me tile and skips getUserPage() on a phone request', async () => {
    mockMeServer.mockResolvedValue({
      email: 'a@b.com',
      isAdmin: false,
      mfaSatisfied: true,
      passkeyCount: 0,
      galleries: [],
    });
    mockGetUserPage.mockResolvedValue(null);
    mockGetCollectionBySlug.mockResolvedValue(homeCollection());
    mockResolveSsrViewport.mockResolvedValueOnce({
      contentWidth: 390,
      viewportHeight: 800,
      isMobile: true,
    });

    const element = await CollectionPageWrapper({ slug: 'home' });

    const content = element.props.collection.content;
    expect(content).toHaveLength(2);
    expect(content.some((b: { id: number }) => b.id === ME_TILE_ID)).toBe(false);
    expect(mockGetUserPage).not.toHaveBeenCalled();
  });

  it('keeps the Me tile first and fetches getUserPage() on a desktop request', async () => {
    mockMeServer.mockResolvedValue({
      email: 'a@b.com',
      isAdmin: false,
      mfaSatisfied: true,
      passkeyCount: 0,
      galleries: [],
    });
    mockGetUserPage.mockResolvedValue(null);
    mockGetCollectionBySlug.mockResolvedValue(homeCollection());

    const element = await CollectionPageWrapper({ slug: 'home' });

    const content = element.props.collection.content;
    expect(content[0].id).toBe(ME_TILE_ID);
    expect(mockGetUserPage).toHaveBeenCalledTimes(1);
  });

  it('does NOT inject the Me tile on a non-home slug even when logged in', async () => {
    mockMeServer.mockResolvedValue({
      email: 'a@b.com',
      isAdmin: false,
      mfaSatisfied: true,
      passkeyCount: 0,
      galleries: [],
    });
    mockGetCollectionBySlug.mockResolvedValue(homeCollection({ slug: 'portfolio' }));

    const element = await CollectionPageWrapper({ slug: 'portfolio' });

    const content = element.props.collection.content;
    expect(content.some((b: { id: number }) => b.id === ME_TILE_ID)).toBe(false);
    expect(mockGetUserPage).not.toHaveBeenCalled();
    expect(element.props.mobileChunkSize).toBeUndefined();
  });
});
