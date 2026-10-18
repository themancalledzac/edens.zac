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
import CollectionPageClient from '@/app/components/ContentCollection/CollectionPageClient';
import SiteHeader from '@/app/components/SiteHeader/SiteHeader';
import { collectionPublicLabel } from '@/app/components/ui/Badge/Badge';
import { type CollectionModel } from '@/app/types/Collection';
import { CollectionVisibility } from '@/app/types/CollectionVisibility';
import { type ContentParallaxImageModel } from '@/app/types/Content';
import { logger } from '@/app/utils/logger';

/**
 * SiteHeader transitively pulls next/cache (via MenuDropdown -> clearCacheAction) and cannot run
 * under jsdom. Stub it; the page's own <h1> is what we assert.
 */
jest.mock('@/app/components/SiteHeader/SiteHeader', () => ({
  __esModule: true,
  default: jest.fn(() => null),
  SiteHeader: jest.fn(() => null),
}));

/**
 * The client body renders the heavy content/layout pipeline (fullscreen viewer, filters,
 * observers). Stub it, capturing props, so the tests isolate the page heading and the row budgets
 * handed down.
 */
jest.mock('@/app/components/ContentCollection/CollectionPageClient', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

/**
 * The array branch feeds converted parallax cards into the full content grid; stub it and capture
 * props so the cover-strip test can inspect the converted blocks without mounting the layout engine.
 */
jest.mock('@/app/components/Content/ContentBlockWithFullScreen', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

const mockContentBlock = ContentBlockWithFullScreen as unknown as jest.Mock;
const mockHeader = SiteHeader as unknown as jest.Mock;
const mockClient = CollectionPageClient as unknown as jest.Mock;

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

describe('CollectionPage — row budgets', () => {
  beforeEach(() => {
    mockClient.mockClear();
    mockContentBlock.mockClear();
  });

  it('forwards chunkSize and a pinned mobileChunkSize to the client on the single branch', () => {
    render(<CollectionPage collection={makeCollection()} chunkSize={2} mobileChunkSize={2} />);

    expect(mockClient).toHaveBeenCalledTimes(1);
    expect(mockClient.mock.calls[0][0]).toMatchObject({ chunkSize: 2, mobileChunkSize: 2 });
  });

  it('forwards them to the grid on the array branch', () => {
    render(<CollectionPage collection={[makeCollection()]} chunkSize={2} mobileChunkSize={2} />);

    expect(mockContentBlock.mock.calls[0][0]).toMatchObject({ chunkSize: 2, mobileChunkSize: 2 });
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
 * CollectionPage builds its own container/main/header instead of using PageShell, so it supplies
 * the skip link's landing zone itself on BOTH branches. The link half is rendered once from the
 * root layout, above the route's Suspense boundary — see tests/app/skipLink.layout.test.tsx, which
 * pins that stream order and composes the two halves.
 */
describe('CollectionPage — skip target', () => {
  const target = () => document.getElementById('main-content');

  it('renders the target on the single-collection branch', () => {
    render(<CollectionPage collection={makeCollection({ id: 1, slug: 'dolomites' })} />);

    expect(target()).toBeInTheDocument();
    expect(target()).toHaveAttribute('tabindex', '-1');
  });

  it('renders it on the collection-array branch too', () => {
    render(<CollectionPage collection={[makeCollection({ id: 1, slug: 'dolomites' })]} />);

    expect(target()).toHaveAttribute('tabindex', '-1');
  });

  /**
   * The target must sit INSIDE <main> wrapping only the content. Sequential focus navigation
   * resumes from the focused element's own subtree, so a target that wrapped <main> would put the
   * header straight back in the tab order and skip nothing.
   */
  it('nests the target inside main rather than around it', () => {
    const { container } = render(
      <CollectionPage collection={makeCollection({ id: 1, slug: 'dolomites' })} />
    );

    const main = container.querySelector('main');

    expect(main).not.toBeNull();
    expect(main).toContainElement(target());
    expect(target()).not.toContainElement(main as HTMLElement);
  });

  it.each([
    ['single-collection', () => makeCollection({ id: 1, slug: 'dolomites' })],
    ['collection-array', () => [makeCollection({ id: 1, slug: 'dolomites' })]],
  ])('renders no skip link of its own on the %s branch', (_name, build) => {
    render(<CollectionPage collection={build()} />);
    expect(screen.queryByRole('link', { name: /skip to main content/i })).not.toBeInTheDocument();
  });
});

/**
 * A16 / A15: both branches hand the server-resolved `me` to SiteHeader unchanged. An omitted `me`
 * must stay undefined (menu fetches on first open); only an explicit null means anonymous.
 */
describe('CollectionPage — me forwarding to SiteHeader', () => {
  beforeEach(() => {
    mockHeader.mockClear();
    mockClient.mockClear();
  });

  const signedIn = { id: 7, email: 'a@example.com' } as unknown as Parameters<
    typeof CollectionPage
  >[0]['me'];

  const branches: Array<[string, () => CollectionModel | CollectionModel[]]> = [
    ['single-collection', () => makeCollection()],
    ['collection-array', () => [makeCollection()]],
  ];

  it.each(branches)('A16: forwards a signed-in me on the %s branch', (_n, build) => {
    render(<CollectionPage collection={build()} me={signedIn} />);
    expect(mockHeader.mock.calls[0][0].me).toBe(signedIn);
  });

  it.each(branches)('A16: forwards null (anonymous) as null on the %s branch', (_n, build) => {
    render(<CollectionPage collection={build()} me={null} />);
    expect(mockHeader.mock.calls[0][0].me).toBeNull();
  });

  it.each(branches)(
    'A16b: an omitted me reaches SiteHeader as undefined on the %s branch',
    (_n, build) => {
      render(<CollectionPage collection={build()} />);
      expect(mockHeader.mock.calls[0][0].me).toBeUndefined();
    }
  );

  it('A15: the client body still receives null when me is omitted', () => {
    render(<CollectionPage collection={makeCollection()} />);
    expect(mockClient.mock.calls[0][0].me).toBeNull();
  });
});

/**
 * `backHref` renders a "← Admin" link as the first element inside the skip target on both
 * branches, and nothing extra when unset.
 */
describe('CollectionPage — back link', () => {
  const builds: [string, () => CollectionModel | CollectionModel[]][] = [
    ['single-collection', () => makeCollection({ id: 1, slug: 'dolomites' })],
    ['collection-array', () => [makeCollection({ id: 1, slug: 'dolomites' })]],
  ];

  it.each(builds)('renders no link when backHref is unset on the %s branch', (_name, build) => {
    render(<CollectionPage collection={build()} />);
    expect(document.getElementById('main-content')!.querySelector('a')).toBeNull();
  });

  it.each(builds)(
    'renders "← Admin" first inside the skip target on the %s branch',
    (_name, build) => {
      render(<CollectionPage collection={build()} backHref="/admin" />);
      const link = screen.getByRole('link', { name: 'Admin' });
      expect(link).toHaveAttribute('href', '/admin');
      expect(link).toHaveTextContent('← Admin');
      expect(link.querySelector('span')).toHaveAttribute('aria-hidden', 'true');
      expect(document.getElementById('main-content')!.firstElementChild).toBe(link);
    }
  );

  it.each(builds)('uses backLabel on the %s branch', (_name, build) => {
    render(<CollectionPage collection={build()} backHref="/admin" backLabel="Users" />);
    expect(screen.getByRole('link', { name: 'Users' })).toHaveTextContent('← Users');
  });
});

/**
 * The footer renders once per page, after <main> as its sibling inside the container, on both
 * branches, and `withFooter={false}` removes it.
 */
describe('CollectionPage — footer', () => {
  const builds: [string, () => CollectionModel | CollectionModel[]][] = [
    ['single-collection', () => makeCollection({ id: 1, slug: 'dolomites' })],
    ['collection-array', () => [makeCollection({ id: 1, slug: 'dolomites' })]],
  ];

  it.each(builds)('renders one footer after <main> on the %s branch', (_name, build) => {
    const { container } = render(<CollectionPage collection={build()} />);
    const footers = container.querySelectorAll('footer');
    expect(footers).toHaveLength(1);
    const main = container.querySelector('main')!;
    expect(footers[0]!.parentElement).toBe(main.parentElement);
    expect(main.nextElementSibling).toBe(footers[0]);
  });

  it.each(builds)('renders no footer when withFooter is false on the %s branch', (_name, build) => {
    const { container } = render(<CollectionPage collection={build()} withFooter={false} />);
    expect(container.querySelector('footer')).toBeNull();
  });
});

/**
 * F1: the page owns exactly one h1. Without a `header` it is the visually-hidden one; with a
 * `header` the page renders none of its own and the header (a CollectionHeader) supplies it.
 */
describe('CollectionPage — header prop', () => {
  const headerNode = (
    <header data-testid="custom-header">
      <h1>All Images</h1>
    </header>
  );

  it('F1: renders the visually-hidden h1 and no header when no header is passed', () => {
    render(<CollectionPage collection={makeCollection()} />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.queryByTestId('custom-header')).toBeNull();
  });

  it("F1: renders exactly one h1, the header's own, when a header is passed", () => {
    render(<CollectionPage collection={makeCollection()} header={headerNode} />);
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('All Images');
    expect(screen.queryByText('Paris 2025')).toBeNull();
  });

  it('renders the header after the back link and before the client body', () => {
    render(<CollectionPage collection={makeCollection()} backHref="/admin" header={headerNode} />);
    const target = document.getElementById('main-content')!;
    const link = screen.getByRole('link', { name: 'Admin' });
    expect(target.firstElementChild).toBe(link);
    expect(link.nextElementSibling).toBe(screen.getByTestId('custom-header'));
  });
});
