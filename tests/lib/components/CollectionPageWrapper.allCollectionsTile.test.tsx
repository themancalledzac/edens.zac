import * as collectionsApi from '@/app/lib/api/collections';
import CollectionPageWrapper from '@/app/lib/components/CollectionPageWrapper';
import { type CollectionModel, CollectionType } from '@/app/types/Collection';
import { CollectionVisibility } from '@/app/types/CollectionVisibility';
import { ALL_COLLECTIONS_TILE_ID } from '@/app/utils/allCollectionsContentBlock';
import { ME_TILE_ID } from '@/app/utils/meContentBlock';

const mockMeServer = jest.fn();
const mockGetUserPage = jest.fn();

jest.mock('@/app/lib/api/collections', () => ({
  getCollectionBySlug: jest.fn(),
  getScopedAllCollections: jest.fn(),
}));
jest.mock('@/app/lib/api/auth', () => ({ meServer: () => mockMeServer() }));
jest.mock('@/app/lib/api/user', () => ({ getUserPage: () => mockGetUserPage() }));
jest.mock('@/app/lib/api/selects', () => ({ listSelectIdsServer: jest.fn(async () => []) }));
jest.mock('@/app/lib/api/personal', () => ({ listSavedImageIdsServer: jest.fn(async () => []) }));
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

const mockGetCollectionBySlug = collectionsApi.getCollectionBySlug as jest.MockedFunction<
  typeof collectionsApi.getCollectionBySlug
>;
const mockGetScopedAllCollections =
  collectionsApi.getScopedAllCollections as jest.MockedFunction<
    typeof collectionsApi.getScopedAllCollections
  >;

function homeCollection(overrides: Partial<CollectionModel> = {}): CollectionModel {
  return {
    id: 1,
    slug: 'home',
    title: 'Home',
    type: CollectionType.PORTFOLIO,
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

describe('CollectionPageWrapper — All-Collections tile injection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('injects the All-Collections tile at index 2, after the Me tile, for a logged-in viewer', async () => {
    mockMeServer.mockResolvedValue({
      email: 'a@b.com',
      isAdmin: false,
      mfaSatisfied: true,
      galleries: [],
    });
    mockGetUserPage.mockResolvedValue(null);
    mockGetCollectionBySlug.mockResolvedValue(homeCollection());

    const element = await CollectionPageWrapper({ slug: 'home' });

    const content = element.props.collection.content;
    expect(content).toHaveLength(4);
    expect(content[1].id).toBe(ME_TILE_ID);
    expect(content[2].id).toBe(ALL_COLLECTIONS_TILE_ID);
    expect(content[2].slug).toBe('all-collections');
  });

  it('injects the All-Collections tile at index 1 for an anonymous viewer (no Me tile)', async () => {
    mockMeServer.mockResolvedValue(null);
    mockGetCollectionBySlug.mockResolvedValue(homeCollection());

    const element = await CollectionPageWrapper({ slug: 'home' });

    const content = element.props.collection.content;
    expect(content).toHaveLength(3);
    expect(content[1].id).toBe(ALL_COLLECTIONS_TILE_ID);
    expect(content.some((b: { id: number }) => b.id === ME_TILE_ID)).toBe(false);
  });

  it('does NOT inject the tile on non-home slugs', async () => {
    mockMeServer.mockResolvedValue(null);
    mockGetCollectionBySlug.mockResolvedValue(homeCollection({ slug: 'portfolio' }));

    const element = await CollectionPageWrapper({ slug: 'portfolio' });

    const content = element.props.collection.content;
    expect(content.some((b: { id: number }) => b.id === ALL_COLLECTIONS_TILE_ID)).toBe(false);
  });

  it('uses the scoped no-store fetch for the all-collections slug', async () => {
    mockMeServer.mockResolvedValue(null);
    mockGetScopedAllCollections.mockResolvedValue(homeCollection({ slug: 'all-collections' }));

    await CollectionPageWrapper({ slug: 'all-collections' });

    expect(mockGetScopedAllCollections).toHaveBeenCalled();
    expect(mockGetCollectionBySlug).not.toHaveBeenCalled();
  });
});
