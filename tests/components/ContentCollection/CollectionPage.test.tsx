/**
 * Tests for CollectionPage.
 *
 * The single-collection page shows its title only as a visual overlay deep in
 * the content tree, so it must still carry exactly ONE real (visually-hidden)
 * <h1> for SEO + screen-reader orientation. These tests pin that contract.
 */

import { render, screen } from '@testing-library/react';

import ContentBlockWithFullScreen from '@/app/components/Content/ContentBlockWithFullScreen';
import CollectionPage from '@/app/components/ContentCollection/CollectionPage';
import { collectionPublicLabel } from '@/app/components/ui/Badge/Badge';
import { type CollectionModel } from '@/app/types/Collection';
import { CollectionVisibility } from '@/app/types/CollectionVisibility';
import { type ContentParallaxImageModel } from '@/app/types/Content';
import { logger } from '@/app/utils/logger';

// SiteHeader transitively pulls next/cache (via MenuDropdown -> clearCacheAction)
// and cannot run under jsdom. Stub it; the page's own <h1> is what we assert.
jest.mock('@/app/components/SiteHeader/SiteHeader', () => ({
  __esModule: true,
  default: () => null,
  SiteHeader: () => null,
}));

// The client body renders the heavy content/layout pipeline (fullscreen viewer,
// filters, observers). Stub it so the test isolates the page heading.
jest.mock('@/app/components/ContentCollection/CollectionPageClient', () => ({
  __esModule: true,
  default: () => null,
}));

// The array branch feeds converted parallax cards into the full content grid;
// stub it and capture props so the cover-strip test can inspect the converted
// blocks without mounting the layout engine.
jest.mock('@/app/components/Content/ContentBlockWithFullScreen', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

const mockContentBlock = ContentBlockWithFullScreen as unknown as jest.Mock;

function makeCollection(overrides: Partial<CollectionModel> = {}): CollectionModel {
  return {
    id: 1,
    slug: 'paris-2025',
    title: 'Paris 2025',
    isClient: false,
    isBlog: true,
    locations: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    visibility: CollectionVisibility.LISTED,
    content: [],
    ...overrides,
  };
}

describe('CollectionPage (single collection)', () => {
  it('renders exactly one <h1> with the collection title', () => {
    render(<CollectionPage collection={makeCollection()} />);

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('Paris 2025');
  });

  it('falls back to the slug when the title is blank', () => {
    render(<CollectionPage collection={makeCollection({ title: '   ', slug: 'fallback-slug' })} />);

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('fallback-slug');
  });

  it('falls back to "Untitled" when both title and slug are blank', () => {
    render(<CollectionPage collection={makeCollection({ title: '', slug: '' })} />);

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Untitled');
    expect(heading.textContent?.trim()).not.toBe('');
  });
});

describe('CollectionPage (collection array) — protected-cover stripping', () => {
  beforeEach(() => {
    mockContentBlock.mockClear();
  });

  const coverImage = {
    id: 10,
    contentType: 'IMAGE' as const,
    orderIndex: 0,
    imageUrl: 'https://example.com/secret-cover.jpg',
    imageWidth: 1600,
    imageHeight: 1200,
    visible: true,
    locations: [],
  };

  function renderedBlocks(): ContentParallaxImageModel[] {
    expect(mockContentBlock).toHaveBeenCalledTimes(1);
    return mockContentBlock.mock.calls[0][0].content as ContentParallaxImageModel[];
  }

  it('strips the cover image from a password-protected client gallery card', () => {
    render(
      <CollectionPage
        collection={[
          makeCollection({
            isBlog: false,
            isClient: true,
            isPasswordProtected: true,
            coverImage,
          }),
        ]}
      />
    );

    expect(renderedBlocks()[0]?.imageUrl).toBe('');
  });

  it('strips the cover image from a protected NON-client collection (kind-agnostic)', () => {
    render(
      <CollectionPage
        collection={[
          makeCollection({ isBlog: false, isClient: false, isPasswordProtected: true, coverImage }),
        ]}
      />
    );

    expect(renderedBlocks()[0]?.imageUrl).toBe('');
  });

  it('strips (and warns) when a protected payload carries no kind booleans', () => {
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {});

    render(
      <CollectionPage
        collection={[
          makeCollection({
            isBlog: undefined,
            isClient: undefined,
            isPasswordProtected: true,
            coverImage,
          }),
        ]}
      />
    );

    expect(renderedBlocks()[0]?.imageUrl).toBe('');
    expect(warn).toHaveBeenCalledWith(
      'CollectionPage',
      expect.stringContaining('missing isClient/isBlog'),
      expect.objectContaining({ slug: 'paris-2025' })
    );

    warn.mockRestore();
  });

  it('keeps the cover image for an unprotected client gallery', () => {
    render(
      <CollectionPage
        collection={[
          makeCollection({ isBlog: false, isClient: true, isPasswordProtected: false, coverImage }),
        ]}
      />
    );

    expect(renderedBlocks()[0]?.imageUrl).toBe('https://example.com/secret-cover.jpg');
  });

  it('keeps the cover for a protected client gallery when showProtectedCovers opts in (admin)', () => {
    render(
      <CollectionPage
        collection={[
          makeCollection({ isBlog: false, isClient: true, isPasswordProtected: true, coverImage }),
        ]}
        showProtectedCovers
      />
    );

    expect(renderedBlocks()[0]?.imageUrl).toBe('https://example.com/secret-cover.jpg');
  });
});

describe('CollectionPage (collection array) — badge carry-through', () => {
  beforeEach(() => {
    mockContentBlock.mockClear();
  });

  function renderedBlocks(): ContentParallaxImageModel[] {
    expect(mockContentBlock).toHaveBeenCalledTimes(1);
    return mockContentBlock.mock.calls[0][0].content as ContentParallaxImageModel[];
  }

  it('labels blogs "Story" and leaves other collections unbadged', () => {
    render(
      <CollectionPage
        collection={[makeCollection({ isBlog: true }), makeCollection({ id: 2, isBlog: false })]}
      />
    );

    const blocks = renderedBlocks();
    expect(collectionPublicLabel(blocks[0] ?? {})).toBe('Story');
    expect(collectionPublicLabel(blocks[1] ?? {})).toBeNull();
  });

  it('does not carry CollectionModel.tags (only synthetic list payloads ever set them)', () => {
    render(
      <CollectionPage
        collection={[makeCollection({ isBlog: false, tags: ['Landscape', 'Art Gallery'] })]}
      />
    );

    const block = renderedBlocks()[0];
    expect(block?.tags).toBeUndefined();
    expect(collectionPublicLabel(block ?? {})).toBeNull();
  });
});

/**
 * CollectionPage builds its own container/main/header instead of using PageShell, so a skip link
 * that lived only in PageShell missed the home page and every collection page — most of the site.
 * Both of this component's branches must carry it.
 */
describe('CollectionPage — skip link', () => {
  const target = () => document.getElementById('main-content');

  it('renders the skip link and its target on the single-collection branch', () => {
    render(<CollectionPage collection={makeCollection({ id: 1, slug: 'dolomites' })} />);

    const link = screen.getByRole('link', { name: /skip to main content/i });
    expect(link).toHaveAttribute('href', '#main-content');
    expect(target()).toBeInTheDocument();
    expect(target()).toHaveAttribute('tabindex', '-1');
  });

  it('renders them on the collection-array branch too', () => {
    render(<CollectionPage collection={[makeCollection({ id: 1, slug: 'dolomites' })]} />);

    expect(screen.getByRole('link', { name: /skip to main content/i })).toBeInTheDocument();
    expect(target()).toHaveAttribute('tabindex', '-1');
  });

  /**
   * The link must precede <main>, and the target must sit INSIDE it wrapping only the content.
   * Sequential focus navigation resumes from the focused element's own subtree, so a target that
   * wrapped <main> would put the header straight back in the tab order and skip nothing.
   */
  it('places the link before main and the target inside it', () => {
    const { container } = render(
      <CollectionPage collection={makeCollection({ id: 1, slug: 'dolomites' })} />
    );

    const link = screen.getByRole('link', { name: /skip to main content/i });
    const main = container.querySelector('main');

    expect(main).not.toBeNull();
    expect(
      link.compareDocumentPosition(main as Node) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(main).toContainElement(target());
    expect(target()).not.toContainElement(main as HTMLElement);
  });
});
