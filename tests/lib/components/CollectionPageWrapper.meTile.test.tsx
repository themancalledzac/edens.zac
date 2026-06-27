import CollectionPage from '@/app/components/ContentCollection/CollectionPage';
import * as collectionsApi from '@/app/lib/api/collections';
import CollectionPageWrapper from '@/app/lib/components/CollectionPageWrapper';
import { type CollectionModel, CollectionType } from '@/app/types/Collection';
import { CollectionVisibility } from '@/app/types/CollectionVisibility';
import { ME_TILE_ID } from '@/app/utils/meContentBlock';

const mockMeServer = jest.fn();
const mockGetUserPage = jest.fn();

jest.mock('@/app/lib/api/collections', () => ({ getCollectionBySlug: jest.fn() }));
jest.mock('@/app/lib/api/auth', () => ({ meServer: () => mockMeServer() }));
jest.mock('@/app/lib/api/user', () => ({ getUserPage: () => mockGetUserPage() }));
jest.mock('@/app/lib/api/selects', () => ({ listSelectIdsServer: jest.fn(async () => []) }));
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

describe('CollectionPageWrapper — Me tile injection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('injects the Me tile at index 1 of home content for a logged-in viewer', async () => {
    mockMeServer.mockResolvedValue({ email: 'a@b.com', mfaSatisfied: true, galleries: [] });
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
    expect(content[1].id).toBe(ME_TILE_ID);
    expect(content[1].slug).toBe('user');
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

  it('does NOT inject the Me tile on a non-home slug even when logged in', async () => {
    mockMeServer.mockResolvedValue({ email: 'a@b.com', mfaSatisfied: true, galleries: [] });
    mockGetCollectionBySlug.mockResolvedValue(homeCollection({ slug: 'portfolio' }));

    const element = await CollectionPageWrapper({ slug: 'portfolio' });

    const content = element.props.collection.content;
    expect(content.some((b: { id: number }) => b.id === ME_TILE_ID)).toBe(false);
    expect(mockGetUserPage).not.toHaveBeenCalled();
  });
});
