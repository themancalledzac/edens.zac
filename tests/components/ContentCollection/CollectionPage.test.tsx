/**
 * Tests for CollectionPage.
 *
 * The single-collection page shows its title only as a visual overlay deep in
 * the content tree, so it must still carry exactly ONE real (visually-hidden)
 * <h1> for SEO + screen-reader orientation. These tests pin that contract.
 */

import { render, screen } from '@testing-library/react';

import CollectionPage from '@/app/components/ContentCollection/CollectionPage';
import { type CollectionModel, CollectionType } from '@/app/types/Collection';
import { CollectionVisibility } from '@/app/types/CollectionVisibility';

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

function makeCollection(overrides: Partial<CollectionModel> = {}): CollectionModel {
  return {
    id: 1,
    slug: 'paris-2025',
    title: 'Paris 2025',
    type: CollectionType.BLOG,
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

  it('renders a Home › {current} breadcrumb with no via param (current crumb is not a link)', () => {
    render(<CollectionPage collection={makeCollection()} />);

    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    // The current collection is plain text, not a link.
    expect(screen.queryByRole('link', { name: 'Paris 2025' })).not.toBeInTheDocument();
    // Breadcrumb crumbs are spans/links — they must not add a second <h1>.
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('renders Home › {via} › {current} when a via param is present', () => {
    render(
      <CollectionPage
        collection={makeCollection({ title: 'Dolomites Film' })}
        via="dolomites-2025"
      />
    );

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Dolomites 2025' })).toHaveAttribute(
      'href',
      '/dolomites-2025'
    );
    expect(screen.queryByRole('link', { name: 'Dolomites Film' })).not.toBeInTheDocument();
  });
});
