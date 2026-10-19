/**
 * Tests that an unknown tag slug answers 404: the page body must throw `notFound()` from the
 * cached tag list before any image search, so the status is settled ahead of the page's
 * `<Suspense>` boundary.
 */

import { isValidElement, type ReactElement, Suspense } from 'react';

import { getAllTags, searchImages } from '@/app/lib/api/content';
import { default as TagPageRoute } from '@/app/tag/[slug]/page';

jest.mock('@/app/lib/api/content', () => ({
  getAllTags: jest.fn(),
  searchImages: jest.fn(),
}));

jest.mock('@/app/components/ui/PageLoading/PageLoading', () => ({
  PageLoading: () => null,
}));

jest.mock('@/app/components/TaxonomyPage/TaxonomyPage', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

jest.mock('@/app/utils/ssrViewport', () => ({
  resolveSsrViewport: jest.fn(() => Promise.resolve()),
}));

const mockGetAllTags = getAllTags as jest.MockedFunction<typeof getAllTags>;
const mockSearchImages = searchImages as jest.MockedFunction<typeof searchImages>;

function pageFor(slug: string) {
  return TagPageRoute({ params: Promise.resolve({ slug }) });
}

describe('TagPageRoute — unknown tag status', () => {
  beforeEach(() => {
    mockGetAllTags.mockReset();
    mockSearchImages.mockReset();
  });

  it('throws notFound() when no tag matches the slug', async () => {
    mockGetAllTags.mockResolvedValue([{ id: 1, name: 'Street', slug: 'street' }]);

    await expect(pageFor('no-such-tag')).rejects.toMatchObject({
      digest: expect.stringContaining('NEXT_HTTP_ERROR_FALLBACK;404'),
    });
    expect(mockSearchImages).not.toHaveBeenCalled();
  });

  it('throws notFound() when the tag list is empty', async () => {
    mockGetAllTags.mockResolvedValue(null);

    await expect(pageFor('street')).rejects.toMatchObject({
      digest: expect.stringContaining('NEXT_HTTP_ERROR_FALLBACK;404'),
    });
  });

  it('wraps the image search in a Suspense boundary when the tag exists', async () => {
    mockGetAllTags.mockResolvedValue([{ id: 1, name: 'Street', slug: 'street' }]);
    mockSearchImages.mockResolvedValue([]);

    const page = await pageFor('street');
    expect(page.type).toBe(Suspense);
    expect(mockSearchImages).not.toHaveBeenCalled();

    const content = page.props.children as ReactElement<{ tagId: number; tagName: string }>;
    expect(isValidElement(content)).toBe(true);
    const Content = content.type as (props: {
      tagId: number;
      tagName: string;
    }) => Promise<ReactElement>;
    await expect(Content(content.props)).resolves.toBeTruthy();
    expect(mockSearchImages).toHaveBeenCalledWith({ tagIds: [1] });
  });
});
