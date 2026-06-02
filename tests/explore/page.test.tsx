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

import ExplorePage from '@/app/explore/page';
import { getMetadata } from '@/app/lib/api/collections';

const mockGetMetadata = getMetadata as jest.MockedFunction<typeof getMetadata>;

const emptyMetadata = {
  tags: [],
  people: [],
  locations: [],
  cameras: [],
  lenses: [],
  filmTypes: [],
  filmFormats: [],
  collections: [],
};

describe('ExplorePage', () => {
  beforeEach(() => {
    mockGetMetadata.mockReset();
  });

  it('renders a section heading and a NavLink per tag, person, and location', async () => {
    mockGetMetadata.mockResolvedValue({
      ...emptyMetadata,
      tags: [{ id: 1, name: 'Mountains', slug: 'mountains' }],
      people: [{ id: 2, name: 'Jane Doe', slug: 'jane-doe' }],
      locations: [{ id: 3, name: 'Patagonia', slug: 'patagonia' }],
    });

    render(await ExplorePage());

    expect(screen.getByRole('heading', { name: 'Locations' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'People' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tags' })).toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Mountains' })).toHaveAttribute(
      'href',
      '/tag/mountains'
    );
    expect(screen.getByRole('link', { name: 'Jane Doe' })).toHaveAttribute(
      'href',
      '/people/jane-doe'
    );
    expect(screen.getByRole('link', { name: 'Patagonia' })).toHaveAttribute(
      'href',
      '/location/patagonia'
    );
  });

  it('renders a NavLink for every metadata entry', async () => {
    mockGetMetadata.mockResolvedValue({
      ...emptyMetadata,
      tags: [
        { id: 1, name: 'Mountains', slug: 'mountains' },
        { id: 2, name: 'Rivers', slug: 'rivers' },
      ],
      people: [{ id: 3, name: 'Jane Doe', slug: 'jane-doe' }],
      locations: [
        { id: 4, name: 'Patagonia', slug: 'patagonia' },
        { id: 5, name: 'Dolomites', slug: 'dolomites' },
      ],
    });

    render(await ExplorePage());

    // 2 tags + 1 person + 2 locations = 5 directory links.
    expect(screen.getAllByRole('link')).toHaveLength(5);
  });

  it('omits locations that have no slug (no /location/undefined links)', async () => {
    mockGetMetadata.mockResolvedValue({
      ...emptyMetadata,
      locations: [
        { id: 1, name: 'Patagonia', slug: 'patagonia' },
        { id: 2, name: 'Nowhere' },
      ],
    });

    render(await ExplorePage());

    expect(screen.getByRole('link', { name: 'Patagonia' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Nowhere' })).not.toBeInTheDocument();
  });

  it('renders a fallback message when metadata fails to load', async () => {
    mockGetMetadata.mockResolvedValue(null);

    render(await ExplorePage());

    expect(screen.getByText(/unable to load/i)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders a friendly empty state when metadata has no entries', async () => {
    mockGetMetadata.mockResolvedValue(emptyMetadata);

    render(await ExplorePage());

    expect(screen.getByText(/nothing to explore yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
