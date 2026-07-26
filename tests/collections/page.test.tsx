import '@testing-library/jest-dom';

import { render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';

import { type CollectionModel } from '@/app/types/Collection';
import { createCollectionContent } from '@/tests/fixtures/contentFixtures';

jest.mock('@/app/lib/api/collections', () => ({
  getScopedAllCollections: jest.fn(),
}));

jest.mock('@/app/hooks/useParallax', () => ({
  useParallax: () => ({ current: null }),
}));

// PageShell pulls in SiteHeader -> MenuDropdown (a 'use client' tree with
// next/navigation hooks). The page's own contract is the headings + tiles, so
// render PageShell as a transparent passthrough.
jest.mock('@/app/components/ui/PageShell/PageShell', () => ({
  __esModule: true,
  PageShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import CollectionsPage from '@/app/collections/page';
import { getScopedAllCollections } from '@/app/lib/api/collections';

const mockGetScopedAllCollections = getScopedAllCollections as jest.MockedFunction<
  typeof getScopedAllCollections
>;

/** Wrap COLLECTION content blocks in a synthetic all-collections parent shell. */
function makeParent(content: unknown[]): CollectionModel {
  return { content } as unknown as CollectionModel;
}

describe('CollectionsPage', () => {
  beforeEach(() => {
    mockGetScopedAllCollections.mockReset();
  });

  it('renders a year heading and a tile per collection, grouped newest-first', async () => {
    mockGetScopedAllCollections.mockResolvedValue(
      makeParent([
        createCollectionContent(1, {
          title: 'Dolomites',
          slug: 'dolomites',
          collectionDate: '2026-06-01',
        }),
        createCollectionContent(2, {
          title: 'Patagonia',
          slug: 'patagonia',
          collectionDate: '2025-02-01',
        }),
      ])
    );

    render(await CollectionsPage());

    const headings = screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent);
    expect(headings).toEqual(['2026', '2025']);

    expect(screen.getByRole('link', { name: /Dolomites/ })).toHaveAttribute('href', '/dolomites');
    expect(screen.getByRole('link', { name: /Patagonia/ })).toHaveAttribute('href', '/patagonia');
  });

  it('renders a formatted date range label on a multi-day collection', async () => {
    mockGetScopedAllCollections.mockResolvedValue(
      makeParent([
        createCollectionContent(1, {
          title: 'Road Trip',
          slug: 'road-trip',
          collectionDate: '2026-03-03',
          collectionEndDate: '2026-03-07',
        }),
      ])
    );

    render(await CollectionsPage());

    expect(screen.getByText('Mar 3–7, 2026')).toBeInTheDocument();
  });

  it('groups undated collections under an Undated heading, last', async () => {
    mockGetScopedAllCollections.mockResolvedValue(
      makeParent([
        createCollectionContent(1, {
          title: 'Dated One',
          slug: 'dated-one',
          collectionDate: '2026-01-01',
        }),
        createCollectionContent(2, {
          title: 'Mystery',
          slug: 'mystery',
          collectionDate: undefined,
        }),
      ])
    );

    render(await CollectionsPage());

    const headings = screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent);
    expect(headings).toEqual(['2026', 'Undated']);
    expect(screen.getByRole('link', { name: /Mystery/ })).toBeInTheDocument();
  });

  it('excludes the home slug from the showcase', async () => {
    mockGetScopedAllCollections.mockResolvedValue(
      makeParent([
        createCollectionContent(1, { title: 'Home', slug: 'home', collectionDate: '2026-01-01' }),
        createCollectionContent(2, {
          title: 'Keep',
          slug: 'keep',
          collectionDate: '2026-02-01',
        }),
      ])
    );

    render(await CollectionsPage());

    expect(screen.queryByRole('link', { name: /Home/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Keep/ })).toBeInTheDocument();
  });

  it('renders a fallback message when the fetch fails', async () => {
    mockGetScopedAllCollections.mockRejectedValue(new Error('upstream down'));

    render(await CollectionsPage());

    expect(screen.getByText(/unable to load collections/i)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders a friendly empty state when there are no collections', async () => {
    mockGetScopedAllCollections.mockResolvedValue(makeParent([]));

    render(await CollectionsPage());

    expect(screen.getByText(/no collections yet/i)).toBeInTheDocument();
  });
});
