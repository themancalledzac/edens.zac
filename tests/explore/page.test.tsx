import '@testing-library/jest-dom';

import { render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';

jest.mock('@/app/lib/api/collections', () => ({
  getMetadata: jest.fn(),
}));

// PageShell pulls in SiteHeader -> MenuDropdown (a 'use client' tree with
// next/navigation hooks). The page's own contract is the headings + links, so
// render PageShell as a transparent passthrough.
jest.mock('@/app/components/ui/PageShell/PageShell', () => ({
  __esModule: true,
  PageShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import { ExploreDirectory } from '@/app/explore/ExploreDirectory';
import ExplorePage from '@/app/explore/page';
import { getMetadata } from '@/app/lib/api/collections';
import { makeMetadata } from '@/tests/fixtures/collectionEditFixtures';

const mockGetMetadata = getMetadata as jest.MockedFunction<typeof getMetadata>;

describe('ExploreDirectory', () => {
  beforeEach(() => {
    mockGetMetadata.mockReset();
  });

  it('renders a section heading and a NavLink per tag and location', async () => {
    mockGetMetadata.mockResolvedValue(
      makeMetadata({
        tags: [{ id: 1, name: 'Mountains', slug: 'mountains' }],
        locations: [{ id: 3, name: 'Patagonia', slug: 'patagonia' }],
      })
    );

    render(await ExploreDirectory());

    expect(screen.getByRole('heading', { name: 'Locations' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tags' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'People' })).not.toBeInTheDocument();

    // Tags target the /tag/[slug] taxonomy route, not a bare /[slug] — the latter resolves to the
    // collection route, so it 404s or opens an unrelated collection that happens to share the slug.
    expect(screen.getByRole('link', { name: 'Mountains' })).toHaveAttribute(
      'href',
      '/tag/mountains'
    );
    expect(screen.getByRole('link', { name: 'Patagonia' })).toHaveAttribute(
      'href',
      '/location/patagonia'
    );
  });

  it('renders a NavLink for every metadata entry', async () => {
    mockGetMetadata.mockResolvedValue(
      makeMetadata({
        tags: [
          { id: 1, name: 'Mountains', slug: 'mountains' },
          { id: 2, name: 'Rivers', slug: 'rivers' },
        ],
        locations: [
          { id: 4, name: 'Patagonia', slug: 'patagonia' },
          { id: 5, name: 'Dolomites', slug: 'dolomites' },
        ],
      })
    );

    render(await ExploreDirectory());

    // 2 tags + 2 locations = 4 directory links (People removed from the directory).
    expect(screen.getAllByRole('link')).toHaveLength(4);
  });

  it('omits locations that have no slug (no /location/undefined links)', async () => {
    mockGetMetadata.mockResolvedValue(
      makeMetadata({
        locations: [
          { id: 1, name: 'Patagonia', slug: 'patagonia' },
          { id: 2, name: 'Nowhere' },
        ],
      })
    );

    render(await ExploreDirectory());

    expect(screen.getByRole('link', { name: 'Patagonia' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Nowhere' })).not.toBeInTheDocument();
  });

  it('renders a fallback message when metadata fails to load', async () => {
    mockGetMetadata.mockResolvedValue(null);

    render(await ExploreDirectory());

    expect(screen.getByText(/unable to load/i)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders a friendly empty state when metadata has no entries', async () => {
    mockGetMetadata.mockResolvedValue(makeMetadata());

    render(await ExploreDirectory());

    expect(screen.getByText(/nothing to explore yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

/**
 * The route itself is synchronous — that is the point of the split. The heading is in the first
 * paint while the directory is still suspended, so a slow `getMetadata()` no longer holds the
 * whole response.
 */
describe('ExplorePage', () => {
  it('paints the heading while the directory is still suspended', () => {
    mockGetMetadata.mockResolvedValue(
      makeMetadata({ tags: [{ id: 1, name: 'Mountains', slug: 'mountains' }] })
    );

    render(<ExplorePage />);

    expect(screen.getByRole('heading', { name: 'Explore' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Tags' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Mountains' })).not.toBeInTheDocument();
  });
});
