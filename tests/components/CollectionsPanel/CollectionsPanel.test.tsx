/**
 * Tests for CollectionsPanel — the hub's collection list.
 *
 * Mocks `getMetadata`, which is the only API this panel reads. `next/navigation` is mocked for
 * `useRouter`, since a row's click-through goes through `router.push` rather than a link.
 *
 * The panel data cache is module-level and survives between tests in a file, so every case clears
 * it first — otherwise the second test paints the first one's list without ever calling the mock.
 */

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { AdminPanelSeedProvider } from '@/app/components/AdminPanel/AdminPanelSeedContext';
import CollectionsPanel from '@/app/components/CollectionsPanel/CollectionsPanel';
import { clearCachedPanelData } from '@/app/hooks/useCachedPanelData';
import * as collectionsApi from '@/app/lib/api/collections';
import { type CollectionListModel, type GeneralMetadataDTO } from '@/app/types/Collection';

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

/**
 * A metadata payload carrying nothing but the collection list. The endpoint returns tags, people,
 * cameras and the rest too; this panel reads none of them, so they stay empty rather than being
 * filled with fixtures no assertion looks at.
 */
const metadataWith = (collections: CollectionListModel[]): GeneralMetadataDTO => ({
  tags: [],
  people: [],
  locations: [],
  cameras: [],
  lenses: [],
  filmTypes: [],
  filmFormats: [],
  collections,
});

const rowNames = () =>
  screen.getAllByRole('listitem').map(row => row.querySelector('.name')?.textContent);

describe('CollectionsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearCachedPanelData();
    window.localStorage.clear();
    mockGetMetadata.mockResolvedValue(metadataWith(COLLECTIONS));
  });

  it('sorts newest first, with undated collections last', async () => {
    render(<CollectionsPanel />);
    await screen.findByText('Dolomites');

    expect(rowNames()).toEqual(['Dolomites', 'Aspen', 'Bare']);
  });

  /**
   * The ISO date the backend sends is not what a row shows. Asserting the formatted output rather
   * than mocking `formatLongDate` is what makes this catch a change of format: a row that printed
   * '2026-06-01' would read as a bug report, and nothing else in this file would notice.
   */
  it('renders each date in long form, and nothing at all for an undated collection', async () => {
    render(<CollectionsPanel />);
    await screen.findByText('Dolomites');

    expect(screen.getByText('June 1st, 2026')).toBeInTheDocument();
    expect(screen.getByText('January 15th, 2026')).toBeInTheDocument();
    expect(screen.queryByText('2026-06-01')).not.toBeInTheDocument();
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

  /**
   * `slug` is optional on CollectionListModel, and a collection without one has nowhere to go.
   * `ListRow` renders a plain div in place of its button when `onActivate` is absent, so the row
   * has to carry no button at all — a button that pushed `/undefined` would be worse than a row
   * that does nothing.
   */
  it('renders a slugless collection as a plain row that cannot be opened', async () => {
    mockGetMetadata.mockResolvedValue(metadataWith([{ id: 9, name: 'Unslugged' }]));
    render(<CollectionsPanel />);
    await screen.findByText('Unslugged');

    const row = screen.getByRole('listitem');
    expect(within(row).queryByRole('button')).not.toBeInTheDocument();

    fireEvent.click(row);

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('links the header to the full collections page, showing the count', async () => {
    render(<CollectionsPanel />);
    await screen.findByText('Dolomites');

    const viewAll = screen.getByRole('link', { name: /View all/ });
    expect(viewAll).toHaveAttribute('href', '/collections');
    expect(viewAll).toHaveTextContent('3 · View all');
  });

  /**
   * The hub fetches this list server-side to size the panel, and passes it down as the cache seed.
   * "Painted on the first commit" is the assertion that distinguishes a seed from a fast fetch:
   * nothing awaited here, so a list on screen cannot have come from `getMetadata`. The
   * revalidation behind it still runs — a seed is a warm start, not a replacement for reconciling.
   */
  it('paints the server seed synchronously and revalidates behind it', async () => {
    mockGetMetadata.mockResolvedValue(
      metadataWith([...COLLECTIONS, { id: 4, name: 'Zion', slug: 'zion', collectionDate: null }])
    );
    render(
      <AdminPanelSeedProvider value={{ collections: COLLECTIONS }}>
        <CollectionsPanel />
      </AdminPanelSeedProvider>
    );

    expect(screen.getByText('Dolomites')).toBeInTheDocument();
    expect(screen.queryByText('Loading collections…')).not.toBeInTheDocument();
    expect(screen.queryByText('Zion')).not.toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('Zion')).toBeInTheDocument());
    expect(mockGetMetadata).toHaveBeenCalledTimes(1);
  });

  /**
   * A warm cache turns a dead backend into a silent one: the list paints from localStorage, the
   * background revalidation fails, and nothing on screen says the collections are last session's.
   * The notice is the only thing standing between "cached" and "current".
   */
  it('says the list is cached when a background refresh fails', async () => {
    const warm = render(<CollectionsPanel />);
    await screen.findByText('Dolomites');
    warm.unmount();

    mockGetMetadata.mockRejectedValueOnce(new Error('backend down'));
    render(<CollectionsPanel />);

    await waitFor(() => expect(screen.getByText(/showing cached data/i)).toBeInTheDocument());
    expect(screen.getByText('Dolomites')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the empty state when there are no collections', async () => {
    mockGetMetadata.mockResolvedValue(metadataWith([]));
    render(<CollectionsPanel />);

    expect(await screen.findByText('No collections yet.')).toBeInTheDocument();
  });

  /**
   * The live region has to predate the text it announces, so the panel renders it outside the body
   * branch. Node identity across the transition is what proves it was not inserted mid-flight.
   */
  it('announces the in-flight read through one region that outlives the load', async () => {
    let resolveMetadata!: (metadata: GeneralMetadataDTO) => void;
    mockGetMetadata.mockImplementation(
      () =>
        new Promise<GeneralMetadataDTO>(resolve => {
          resolveMetadata = resolve;
        })
    );

    render(<CollectionsPanel />);

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Loading collections…');
    expect(status).toHaveAttribute('aria-live', 'polite');

    resolveMetadata(metadataWith([]));
    await waitFor(() => expect(screen.getByText('No collections yet.')).toBeInTheDocument());

    expect(screen.getByRole('status')).toBe(status);
    expect(status).toBeEmptyDOMElement();
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

  it('retries the read from the failure branch and renders the list on success', async () => {
    mockGetMetadata.mockRejectedValueOnce(new Error('backend down'));
    render(<CollectionsPanel />);

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(mockGetMetadata).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(screen.getByText('Dolomites')).toBeInTheDocument());
    expect(mockGetMetadata).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
