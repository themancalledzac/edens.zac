/**
 * A10: home rendered through CollectionPageClient with the public `filterVisible: true` pass must
 * not surface the /collections tile for an anonymous viewer.
 */
import '@testing-library/jest-dom';

import { render, screen } from '@testing-library/react';

import CollectionPageClient from '@/app/components/ContentCollection/CollectionPageClient';
import CollectionPageWrapper from '@/app/components/ContentCollection/CollectionPageWrapper';
import * as collectionsApi from '@/app/lib/api/collections';
import { type CollectionModel } from '@/app/types/Collection';
import { CollectionVisibility } from '@/app/types/CollectionVisibility';
import { type AnyContentModel } from '@/app/types/Content';
import { buildAllCollectionsContentBlock } from '@/app/utils/allCollectionsContentBlock';

jest.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn(), revalidateTag: jest.fn() }));
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: () =>
    function DynamicStub() {
      return null;
    },
}));
jest.mock('@/app/lib/api/collections', () => ({ getCollectionBySlug: jest.fn() }));
jest.mock('@/app/lib/api/auth', () => ({ meServer: jest.fn(async () => null) }));
jest.mock('@/app/lib/api/selects', () => ({ listSelectIdsServer: jest.fn(async () => []) }));
jest.mock('@/app/lib/api/personal', () => ({
  getUserPage: jest.fn(async () => null),
  listSavedImageIdsServer: jest.fn(async () => []),
}));
jest.mock('@/app/utils/ssrViewport', () => ({
  resolveSsrViewport: jest.fn(async () => ({
    contentWidth: 1274,
    viewportHeight: 800,
    isMobile: false,
  })),
}));
jest.mock('@/app/components/Content/ContentBlockWithFullScreen', () => ({
  __esModule: true,
  default: ({ content }: { content: { id: number; slug?: string }[] }) => (
    <div data-testid="grid">
      {content.map(block => (
        <a key={block.id} data-testid="tile" href={`/${block.slug ?? ''}`}>
          {block.id}
        </a>
      ))}
    </div>
  ),
}));

const mockGetCollectionBySlug = collectionsApi.getCollectionBySlug as jest.MockedFunction<
  typeof collectionsApi.getCollectionBySlug
>;

function image(id: number): AnyContentModel {
  return {
    id,
    contentType: 'IMAGE',
    orderIndex: id,
    slug: `photo-${id}`,
    imageUrl: `https://cdn.example/photo-${id}.jpg`,
    imageWidth: 1600,
    imageHeight: 1067,
    locations: [],
  } as unknown as AnyContentModel;
}

function home(content: AnyContentModel[]): CollectionModel {
  return {
    id: 1,
    slug: 'home',
    title: 'Home',
    isClient: false,
    isBlog: false,
    displayMode: 'ORDERED',
    rowsWide: 4,
    locations: [],
    visibility: CollectionVisibility.LISTED,
    isPasswordProtected: false,
    content,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  } as unknown as CollectionModel;
}

describe('CollectionPageClient — All Collections tile on anonymous home (A10)', () => {
  it('renders no /collections tile link from the wrapper output for an anonymous viewer', async () => {
    mockGetCollectionBySlug.mockResolvedValue(home([image(10), image(11)]));

    const element = await CollectionPageWrapper({ slug: 'home' });
    render(<CollectionPageClient {...element.props} />);

    const hrefs = screen.getAllByTestId('tile').map(a => a.getAttribute('href'));
    expect(hrefs).toEqual(['/photo-10', '/photo-11']);
    expect(hrefs).not.toContain('/collections');
  });

  it('keeps the tile out of a home collection that carries it, with filterVisible true', () => {
    render(
      <CollectionPageClient
        collection={home([buildAllCollectionsContentBlock(), image(10), image(11)])}
        me={null}
      />
    );

    const hrefs = screen.getAllByTestId('tile').map(a => a.getAttribute('href'));
    expect(hrefs).not.toContain('/collections');
    expect(hrefs).toHaveLength(2);
  });
});
