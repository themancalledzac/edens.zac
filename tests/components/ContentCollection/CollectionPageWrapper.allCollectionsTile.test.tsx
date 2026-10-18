import CollectionPageWrapper from '@/app/components/ContentCollection/CollectionPageWrapper';
import * as collectionsApi from '@/app/lib/api/collections';
import { type CollectionModel } from '@/app/types/Collection';
import { CollectionVisibility } from '@/app/types/CollectionVisibility';
import * as tileModule from '@/app/utils/allCollectionsContentBlock';
import { ALL_COLLECTIONS_TILE_ID } from '@/app/utils/allCollectionsContentBlock';
import { ME_TILE_ID } from '@/app/utils/meContentBlock';

const mockMeServer = jest.fn();
const mockGetUserPage = jest.fn();
const mockListSavedImageIds = jest.fn(async () => [] as number[]);

jest.mock('@/app/utils/allCollectionsContentBlock', () => {
  const actual: typeof tileModule = jest.requireActual('@/app/utils/allCollectionsContentBlock');
  return {
    ...actual,
    shouldBuildAllCollectionsTile: jest.fn(actual.shouldBuildAllCollectionsTile),
    shouldFetchUserPage: jest.fn(actual.shouldFetchUserPage),
  };
});

jest.mock('@/app/lib/api/collections', () => ({
  getCollectionBySlug: jest.fn(),
  getScopedAllCollections: jest.fn(),
}));
jest.mock('@/app/lib/api/auth', () => ({ meServer: () => mockMeServer() }));
jest.mock('@/app/lib/api/selects', () => ({ listSelectIdsServer: jest.fn(async () => []) }));
jest.mock('@/app/lib/api/personal', () => ({
  getUserPage: () => mockGetUserPage(),
  listSavedImageIdsServer: () => mockListSavedImageIds(),
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

const mockGetCollectionBySlug = collectionsApi.getCollectionBySlug as jest.MockedFunction<
  typeof collectionsApi.getCollectionBySlug
>;
const mockGetScopedAllCollections = collectionsApi.getScopedAllCollections as jest.MockedFunction<
  typeof collectionsApi.getScopedAllCollections
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

const mockShouldBuildTile = tileModule.shouldBuildAllCollectionsTile as jest.Mock;
const mockShouldFetchUserPage = tileModule.shouldFetchUserPage as jest.Mock;

const SIGNED_IN = {
  email: 'a@b.com',
  isAdmin: false,
  mfaSatisfied: true,
  passkeyCount: 0,
  galleries: [],
};

const hasTile = (content: { id: number }[]) => content.some(b => b.id === ALL_COLLECTIONS_TILE_ID);

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => {
    resolve = r;
  });
  return { promise, resolve };
}

const actualTile: typeof tileModule = jest.requireActual('@/app/utils/allCollectionsContentBlock');

function restoreGuards() {
  mockShouldBuildTile.mockImplementation(actualTile.shouldBuildAllCollectionsTile);
  mockShouldFetchUserPage.mockImplementation(actualTile.shouldFetchUserPage);
}

const flush = () => new Promise<void>(r => setTimeout(r, 0));

describe('CollectionPageWrapper — All-Collections tile (public path)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListSavedImageIds.mockResolvedValue([]);
    restoreGuards();
  });

  it('A8: builds no All-Collections tile on the public home render for a signed-in viewer', async () => {
    mockMeServer.mockResolvedValue(SIGNED_IN);
    mockGetUserPage.mockResolvedValue(null);
    mockGetCollectionBySlug.mockResolvedValue(homeCollection());

    const element = await CollectionPageWrapper({ slug: 'home' });

    const content = element.props.collection.content;
    expect(hasTile(content)).toBe(false);
    expect(content).toHaveLength(3);
    expect(content[0].id).toBe(ME_TILE_ID);
  });

  it('A8: builds no All-Collections tile on the public home render for an anonymous viewer', async () => {
    mockMeServer.mockResolvedValue(null);
    mockGetCollectionBySlug.mockResolvedValue(homeCollection());

    const element = await CollectionPageWrapper({ slug: 'home' });

    const content = element.props.collection.content;
    expect(hasTile(content)).toBe(false);
    expect(content).toHaveLength(2);
  });

  it('A8: home ?manage=1 edit view still gets the tile, right after the Me tile', async () => {
    mockMeServer.mockResolvedValue(SIGNED_IN);
    mockGetUserPage.mockResolvedValue(null);
    mockGetCollectionBySlug.mockResolvedValue(homeCollection());

    const element = await CollectionPageWrapper({ slug: 'home', editMode: true });

    const content = element.props.collection.content;
    expect(content).toHaveLength(4);
    expect(content[0].id).toBe(ME_TILE_ID);
    expect(content[1].id).toBe(ALL_COLLECTIONS_TILE_ID);
    expect(content[1].slug).toBe('collections');
    expect(content[1].orderIndex).toBeLessThan(content[2].orderIndex);
  });

  it('A8: edit view for an anonymous viewer leads with the tile', async () => {
    mockMeServer.mockResolvedValue(null);
    mockGetCollectionBySlug.mockResolvedValue(homeCollection());

    const element = await CollectionPageWrapper({ slug: 'home', editMode: true });

    const content = element.props.collection.content;
    expect(content).toHaveLength(3);
    expect(content[0].id).toBe(ALL_COLLECTIONS_TILE_ID);
  });

  it('A8: does NOT inject the tile on non-home slugs, even in edit mode', async () => {
    mockMeServer.mockResolvedValue(null);
    mockGetCollectionBySlug.mockResolvedValue(homeCollection({ slug: 'portfolio' }));

    const element = await CollectionPageWrapper({ slug: 'portfolio', editMode: true });

    expect(hasTile(element.props.collection.content)).toBe(false);
  });

  it('uses the scoped no-store fetch for the all-collections slug', async () => {
    mockMeServer.mockResolvedValue(null);
    mockGetScopedAllCollections.mockResolvedValue(homeCollection({ slug: 'all-collections' }));

    await CollectionPageWrapper({ slug: 'all-collections' });

    expect(mockGetScopedAllCollections).toHaveBeenCalled();
    expect(mockGetCollectionBySlug).not.toHaveBeenCalled();
  });

  it('A10: the public-path guard is what keeps the tile out (main)', async () => {
    mockMeServer.mockResolvedValue(null);
    mockGetCollectionBySlug.mockResolvedValue(homeCollection());

    const element = await CollectionPageWrapper({ slug: 'home' });

    expect(mockShouldBuildTile).toHaveBeenCalled();
    expect(hasTile(element.props.collection.content)).toBe(false);
  });

  it('A10 twin: with the tile guard letting everything through, the public path builds the tile', async () => {
    mockShouldBuildTile.mockReturnValue(true);
    mockMeServer.mockResolvedValue(null);
    mockGetCollectionBySlug.mockResolvedValue(homeCollection());

    const element = await CollectionPageWrapper({ slug: 'home' });

    expect(hasTile(element.props.collection.content)).toBe(true);
  });
});

describe('CollectionPageWrapper — getUserPage gating', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListSavedImageIds.mockResolvedValue([]);
    restoreGuards();
  });

  it('A9: calls getUserPage once for home with a signed-in viewer', async () => {
    mockMeServer.mockResolvedValue(SIGNED_IN);
    mockGetUserPage.mockResolvedValue(null);
    mockGetCollectionBySlug.mockResolvedValue(homeCollection());

    await CollectionPageWrapper({ slug: 'home' });

    expect(mockGetUserPage).toHaveBeenCalledTimes(1);
  });

  it('A9: never calls getUserPage for an anonymous home viewer', async () => {
    mockMeServer.mockResolvedValue(null);
    mockGetCollectionBySlug.mockResolvedValue(homeCollection());

    await CollectionPageWrapper({ slug: 'home' });
    await CollectionPageWrapper({ slug: 'home', editMode: true });

    expect(mockGetUserPage).not.toHaveBeenCalled();
  });

  it('A9: never calls getUserPage for a non-home slug, even signed in', async () => {
    mockMeServer.mockResolvedValue(SIGNED_IN);
    mockGetCollectionBySlug.mockResolvedValue(homeCollection({ slug: 'portfolio' }));

    await CollectionPageWrapper({ slug: 'portfolio' });

    expect(mockGetUserPage).not.toHaveBeenCalled();
  });

  it('A9 twin: with the user-page guard open, an anonymous viewer triggers getUserPage', async () => {
    mockShouldFetchUserPage.mockReturnValue(true);
    mockGetUserPage.mockResolvedValue(null);
    mockMeServer.mockResolvedValue(null);
    mockGetCollectionBySlug.mockResolvedValue(homeCollection());

    await CollectionPageWrapper({ slug: 'home' });

    expect(mockGetUserPage).toHaveBeenCalled();
  });

  it('A9 twin: with the user-page guard open, a non-home slug triggers getUserPage', async () => {
    mockShouldFetchUserPage.mockReturnValue(true);
    mockGetUserPage.mockResolvedValue(null);
    mockMeServer.mockResolvedValue(SIGNED_IN);
    mockGetCollectionBySlug.mockResolvedValue(homeCollection({ slug: 'portfolio' }));

    await CollectionPageWrapper({ slug: 'portfolio' });

    expect(mockGetUserPage).toHaveBeenCalled();
  });
});

describe('CollectionPageWrapper — signed-in reads start in the first Promise.all', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListSavedImageIds.mockResolvedValue([]);
    restoreGuards();
  });

  it('A11b: getUserPage and listSavedImageIdsServer start while getCollectionBySlug is pending', async () => {
    const pending = deferred<CollectionModel>();
    mockMeServer.mockResolvedValue(SIGNED_IN);
    mockGetUserPage.mockResolvedValue(null);
    mockGetCollectionBySlug.mockReturnValue(pending.promise);

    const rendering = CollectionPageWrapper({ slug: 'home' });
    await flush();

    expect(mockGetCollectionBySlug).toHaveBeenCalled();
    expect(mockGetUserPage).toHaveBeenCalledTimes(1);
    expect(mockListSavedImageIds).toHaveBeenCalledTimes(1);

    pending.resolve(homeCollection());
    const element = await rendering;
    expect(element.props.collection.content[0].id).toBe(ME_TILE_ID);
  });

  it('A11b: only listSavedImageIdsServer starts early on a signed-in non-home slug', async () => {
    const pending = deferred<CollectionModel>();
    mockMeServer.mockResolvedValue(SIGNED_IN);
    mockGetCollectionBySlug.mockReturnValue(pending.promise);

    const rendering = CollectionPageWrapper({ slug: 'portfolio' });
    await flush();

    expect(mockListSavedImageIds).toHaveBeenCalledTimes(1);
    expect(mockGetUserPage).not.toHaveBeenCalled();

    pending.resolve(homeCollection({ slug: 'portfolio' }));
    await rendering;
  });

  it('A11b: nothing signed-in starts for an anonymous viewer while the fetch is pending', async () => {
    const pending = deferred<CollectionModel>();
    mockMeServer.mockResolvedValue(null);
    mockGetCollectionBySlug.mockReturnValue(pending.promise);

    const rendering = CollectionPageWrapper({ slug: 'home' });
    await flush();

    expect(mockGetUserPage).not.toHaveBeenCalled();
    expect(mockListSavedImageIds).not.toHaveBeenCalled();

    pending.resolve(homeCollection());
    await rendering;
  });

  it('A11b twin: with the user-page guard closed, getUserPage does not start while the fetch is pending', async () => {
    mockShouldFetchUserPage.mockReturnValue(false);
    const pending = deferred<CollectionModel>();
    mockMeServer.mockResolvedValue(SIGNED_IN);
    mockGetUserPage.mockResolvedValue(null);
    mockGetCollectionBySlug.mockReturnValue(pending.promise);

    const rendering = CollectionPageWrapper({ slug: 'home' });
    await flush();

    expect(mockGetUserPage).not.toHaveBeenCalled();

    pending.resolve(homeCollection());
    await rendering;
  });
});
