/**
 * Tests for CollectionsPanel — the hub's collection list.
 *
 * Mocks `getMetadata`, which is the only API this panel reads. `next/navigation` is mocked for
 * `useRouter`, since a row's click-through goes through `router.push` rather than a link.
 *
 * The panel data cache is module-level and survives between tests in a file, so every case clears
 * it first — otherwise the second test paints the first one's list without ever calling the mock.
 */

import { render, screen, waitFor } from '@testing-library/react';

import CollectionsPanel from '@/app/components/CollectionsPanel/CollectionsPanel';
import { clearCachedPanelData } from '@/app/hooks/useCachedPanelData';
import * as collectionsApi from '@/app/lib/api/collections';
import { type CollectionListModel } from '@/app/types/Collection';

jest.mock('@/app/lib/api/collections', () => ({
  getMetadata: jest.fn(),
}));

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockGetMetadata = collectionsApi.getMetadata as jest.MockedFunction<
  typeof collectionsApi.getMetadata
>;

/**
 * Deliberately in the wrong order, and deliberately mixed: 'Bare' has neither a date nor a cover,
 * which is the shape every row has until the backend list projection deploys. 'Aspen' is dated
 * but older than 'Dolomites', so alphabetical order and date order disagree — a panel that sorted
 * by name would put Aspen first and pass a weaker fixture.
 */
const COLLECTIONS: CollectionListModel[] = [
  { id: 2, name: 'Bare', slug: 'bare' },
  { id: 3, name: 'Aspen', slug: 'aspen', collectionDate: '2026-01-15' },
  {
    id: 1,
    name: 'Dolomites',
    slug: 'dolomites',
    collectionDate: '2026-06-01',
    coverImageUrl: 'https://d123.cloudfront.net/dolomites.jpg',
  },
];

const rowNames = () =>
  screen.getAllByRole('listitem').map(row => row.querySelector('.name')?.textContent);

describe('CollectionsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearCachedPanelData();
    window.localStorage.clear();
    mockGetMetadata.mockResolvedValue({ collections: COLLECTIONS } as Awaited<
      ReturnType<typeof collectionsApi.getMetadata>
    >);
  });

  it('renders a row per collection', async () => {
    render(<CollectionsPanel />);

    expect(await screen.findByText('Dolomites')).toBeInTheDocument();
    expect(screen.getByText('Aspen')).toBeInTheDocument();
    expect(screen.getByText('Bare')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('sorts newest first, with undated collections last', async () => {
    render(<CollectionsPanel />);
    await screen.findByText('Dolomites');

    expect(rowNames()).toEqual(['Dolomites', 'Aspen', 'Bare']);
  });

  /**
   * Only the covered collection renders an <img>. The other two get the placeholder square, which
   * is what keeps their rows the same height instead of collapsing them — and until the backend
   * populates cover URLs, that is every row.
   */
  it('renders a placeholder square instead of an image when there is no cover', async () => {
    const { container } = render(<CollectionsPanel />);
    await screen.findByText('Dolomites');

    expect(container.querySelectorAll('img')).toHaveLength(1);
    expect(container.querySelectorAll('.coverPlaceholder')).toHaveLength(2);
  });

  it('opens the collection when its row is activated', async () => {
    render(<CollectionsPanel />);

    const row = await screen.findByRole('button', { name: 'Open collection Dolomites' });
    row.click();

    expect(mockPush).toHaveBeenCalledWith('/dolomites');
  });

  it('links the header to the full collections page, showing the count', async () => {
    render(<CollectionsPanel />);
    await screen.findByText('Dolomites');

    const viewAll = screen.getByRole('link', { name: /View all/ });
    expect(viewAll).toHaveAttribute('href', '/collections');
    expect(viewAll).toHaveTextContent('3 · View all');
  });

  it('shows the empty state when there are no collections', async () => {
    mockGetMetadata.mockResolvedValue({ collections: [] } as Awaited<
      ReturnType<typeof collectionsApi.getMetadata>
    >);
    render(<CollectionsPanel />);

    expect(await screen.findByText('No collections yet.')).toBeInTheDocument();
  });

  /**
   * A dead backend must never render as an empty list — that invites an admin to create a
   * duplicate of something that already exists. The failed branch carries a Retry instead.
   */
  it('reports a failed load rather than an empty list', async () => {
    mockGetMetadata.mockRejectedValue(new Error('backend down'));
    render(<CollectionsPanel />);

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.queryByText('No collections yet.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
