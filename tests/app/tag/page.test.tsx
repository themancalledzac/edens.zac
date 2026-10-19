/**
 * Route tests for `/tag/[slug]`: the tag name reaches the h1, an unknown slug or an empty/null tag
 * list is a 404, and the SSR viewport is threaded into TaxonomyPage.
 */

import { render, screen } from '@testing-library/react';
import { type ReactElement } from 'react';

import TaxonomyPage from '@/app/components/TaxonomyPage/TaxonomyPage';
import { getAllTags, searchImages } from '@/app/lib/api/content';
import TagPageRoute from '@/app/tag/[slug]/page';
import { resolveSsrViewport } from '@/app/utils/ssrViewport';

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

jest.mock('@/app/lib/api/auth', () => ({
  meServer: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('@/app/lib/api/content', () => ({
  getAllTags: jest.fn(),
  searchImages: jest.fn(),
}));

jest.mock('@/app/utils/ssrViewport', () => ({
  resolveSsrViewport: jest.fn(),
}));

const contentBlockProps = jest.fn();

jest.mock('@/app/components/Content/ContentBlockWithFullScreen', () => ({
  __esModule: true,
  default: (props: unknown) => {
    contentBlockProps(props);
    return null;
  },
}));

jest.mock('@/app/components/SiteHeader/SiteHeader', () => ({
  __esModule: true,
  default: () => null,
  SiteHeader: () => null,
}));

jest.mock('@/app/components/ui/BottomNav/BottomNav', () => ({
  __esModule: true,
  default: () => null,
  BottomNav: () => null,
}));

const mockGetAllTags = getAllTags as jest.Mock;
const mockSearchImages = searchImages as jest.Mock;
const mockResolveSsrViewport = resolveSsrViewport as jest.Mock;

const renderRoute = async (slug: string) => {
  const boundary = await TagPageRoute({ params: Promise.resolve({ slug }) });
  const content = boundary.props.children as ReactElement<Record<string, unknown>>;
  const Content = content.type as (props: Record<string, unknown>) => Promise<ReactElement>;
  const element = (await Content(content.props)) as ReactElement<
    Parameters<typeof TaxonomyPage>[0]
  >;
  return render(await TaxonomyPage(element.props));
};

const viewport = { contentWidth: 900, viewportHeight: 700, isMobile: false };

const image = {
  id: 1,
  contentType: 'IMAGE',
  orderIndex: 1,
  imageUrl: 'https://cdn/1.jpg',
  locations: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockResolveSsrViewport.mockResolvedValue(viewport);
  mockSearchImages.mockResolvedValue([image]);
});

describe('TagPageRoute', () => {
  it('renders the tag name as the h1', async () => {
    mockGetAllTags.mockResolvedValue([{ id: 7, name: 'alpine', slug: 'alpine' }]);
    await renderRoute('alpine');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('alpine');
  });

  it('returns 404 when no tag matches the slug', async () => {
    mockGetAllTags.mockResolvedValue([{ id: 7, name: 'alpine', slug: 'alpine' }]);
    await expect(TagPageRoute({ params: Promise.resolve({ slug: 'film' }) })).rejects.toThrow(
      'NEXT_NOT_FOUND'
    );
    expect(mockSearchImages).not.toHaveBeenCalled();
  });

  it.each([[[]], [null]])('returns 404 when the tag list is %p', async tags => {
    mockGetAllTags.mockResolvedValue(tags);
    await expect(TagPageRoute({ params: Promise.resolve({ slug: 'alpine' }) })).rejects.toThrow(
      'NEXT_NOT_FOUND'
    );
  });

  it('threads the SSR viewport into the content block', async () => {
    mockGetAllTags.mockResolvedValue([{ id: 7, name: 'alpine', slug: 'alpine' }]);
    await renderRoute('alpine');
    expect(contentBlockProps).toHaveBeenCalledWith(
      expect.objectContaining({
        ssrViewport: { contentWidth: 900, viewportHeight: 700, isMobile: false },
      })
    );
  });
});
