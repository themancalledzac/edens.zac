/**
 * Pins today's LocationPageClient behaviour ahead of its refactor: URL seeding, URL syncing on
 * every filter change, the Location-only retention of non-image blocks, the collections row above
 * the toolbar, the three surfaced dimensions, and the filtered-to-zero empty state.
 * `FilterToolbar` is not mocked; the content grid and the collections row are stubbed.
 */

import { fireEvent, render, screen } from '@testing-library/react';

import LocationPageClient from '@/app/components/LocationPage/LocationPageClient';
import { type ContentImageModel, type ViewableContent } from '@/app/types/Content';
import { INITIAL_FILTER_STATE } from '@/app/types/GalleryFilter';
import { buildLocationCriteria, type ContentFilterCriteria } from '@/app/utils/contentFilter';
import {
  createCollectionModel,
  createGifContent,
  createImageContent,
} from '@/tests/fixtures/contentFixtures';

const mockSyncToUrl = jest.fn();
let mockInitialCriteria: ContentFilterCriteria = {};

jest.mock('@/app/hooks/useFilterUrlState', () => ({
  useFilterUrlState: () => ({
    initialCriteria: mockInitialCriteria,
    syncToUrl: mockSyncToUrl,
  }),
}));

/** Exposes the content handed to the grid as a JSON list of content types plus the block count. */
jest.mock('@/app/components/Content/ContentBlockWithFullScreen', () => ({
  __esModule: true,
  default: ({
    content,
    ssrViewport,
  }: {
    content: unknown[];
    ssrViewport?: { contentWidth: number; viewportHeight: number; isMobile: boolean };
  }) => (
    <div
      data-testid="content-blocks"
      data-count={content.length}
      data-width={ssrViewport?.contentWidth}
      data-height={ssrViewport?.viewportHeight}
      data-mobile={String(ssrViewport?.isMobile)}
    >
      {JSON.stringify(content)}
    </div>
  ),
}));

jest.mock('@/app/components/LocationPage/LocationCollections', () => ({
  __esModule: true,
  default: ({ collections }: { collections: unknown[] }) => (
    <div data-testid="location-collections">{collections.length}</div>
  ),
}));

const shot = (id: number, overrides: Partial<ContentImageModel> = {}): ContentImageModel =>
  createImageContent(id, {
    captureDate: '2026-07-20',
    tags: [{ id, name: `tag-${id}`, slug: `tag-${id}` }],
    people: [{ id, name: `person-${id}` }],
    ...overrides,
  });

const images = (): ViewableContent[] => [
  shot(1, { rating: 5, isFilm: true, filmType: 'Kodak Portra 400' }),
  shot(2, { rating: 2, isFilm: true, filmType: 'Kodak Tri-X 400' }),
  shot(3, { rating: 1, isFilm: false }),
];

const renderPage = (content: ViewableContent[] = images()) =>
  render(<LocationPageClient images={content} collections={[createCollectionModel(1)]} />);

const lastSyncedCriteria = () => mockSyncToUrl.mock.calls.at(-1)?.[0];

beforeEach(() => {
  mockInitialCriteria = {};
  mockSyncToUrl.mockClear();
});

describe('LocationPageClient — URL seeding', () => {
  it('seeds tags from initialCriteria', () => {
    mockInitialCriteria = { tags: ['tag-1'] };
    renderPage();
    expect(screen.getByTestId('content-blocks')).toHaveAttribute('data-count', '1');
    expect(screen.getByTestId('content-blocks')).toHaveTextContent('image-1.jpg');
  });

  it('seeds people from initialCriteria', () => {
    mockInitialCriteria = { people: ['person-2'] };
    renderPage();
    expect(screen.getByTestId('content-blocks')).toHaveTextContent('image-2.jpg');
    expect(screen.getByTestId('content-blocks')).not.toHaveTextContent('image-1.jpg');
  });

  it('seeds film types from initialCriteria', () => {
    mockInitialCriteria = { isFilm: true, filmTypes: ['Kodak Tri-X 400'] };
    renderPage();
    expect(screen.getByTestId('content-blocks')).toHaveTextContent('image-2.jpg');
    expect(screen.getByTestId('content-blocks')).not.toHaveTextContent('image-1.jpg');
  });

  it('seeds highly rated from a minRating of 4 or more', () => {
    mockInitialCriteria = { minRating: 4 };
    renderPage();
    expect(screen.getByTestId('content-blocks')).toHaveAttribute('data-count', '1');
    expect(screen.getByRole('button', { name: /^Highly Rated/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('does not seed highly rated from a minRating below 4', () => {
    mockInitialCriteria = { minRating: 3 };
    renderPage();
    expect(screen.getByRole('button', { name: /^Highly Rated/ })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('seeds the film filter from isFilm', () => {
    mockInitialCriteria = { isFilm: false };
    renderPage();
    expect(screen.getByTestId('content-blocks')).toHaveTextContent('image-3.jpg');
    expect(screen.getByTestId('content-blocks')).toHaveAttribute('data-count', '1');
    expect(screen.getByRole('button', { name: /^Digital/ })).toBeInTheDocument();
  });
});

describe('LocationPageClient — URL syncing', () => {
  it('syncs buildLocationCriteria of the next state when Highly Rated toggles', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^Highly Rated/ }));
    expect(lastSyncedCriteria()).toEqual(
      buildLocationCriteria({
        ...INITIAL_FILTER_STATE,
        highlyRatedOnly: true,
      })
    );
    expect(lastSyncedCriteria()).toEqual({ minRating: 4 });
  });

  it('syncs the film filter when the film toggle cycles', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^Film/ }));
    expect(lastSyncedCriteria()).toEqual({ isFilm: true });
  });

  it('syncs a tag selected from the Tags dropdown', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^Tags/ }));
    fireEvent.click(screen.getByRole('button', { name: /^tag-2/ }));
    expect(lastSyncedCriteria()).toEqual({ tags: ['tag-2'] });
  });

  it('keeps seeded criteria in the next state it syncs', () => {
    mockInitialCriteria = { tags: ['tag-1'] };
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^Highly Rated/ }));
    expect(lastSyncedCriteria()).toEqual({ minRating: 4, tags: ['tag-1'] });
  });

  it('does not sync on first render', () => {
    renderPage();
    expect(mockSyncToUrl).not.toHaveBeenCalled();
  });
});

describe('LocationPageClient — Location-only behaviour', () => {
  it('keeps non-image blocks in the content handed to the grid', () => {
    renderPage([...images(), createGifContent(10)]);
    const handed = JSON.parse(screen.getByTestId('content-blocks').textContent ?? '[]');
    expect(JSON.stringify(handed)).toContain('GIF');
    expect(JSON.stringify(handed)).toContain('IMAGE');
  });

  it('renders the collections row before the toolbar in document order', () => {
    renderPage();
    const row = screen.getByTestId('location-collections');
    const toolbarChip = screen.getByRole('button', { name: /^Highly Rated/ });
    expect(
      row.compareDocumentPosition(toolbarChip) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});

describe('LocationPageClient — dimensions', () => {
  const rich = (): ViewableContent[] => [
    shot(3, { isFilm: false }),
    ...[1, 2].map(id =>
      shot(id, {
        isFilm: true,
        filmType: `Stock ${id}`,
        camera: { id, name: `Camera ${id}` },
        lens: { id, name: `Lens ${id}` },
        locations: [{ id, name: `Place ${id}`, slug: `place-${id}` }],
      })
    ),
  ];

  it('surfaces Tags and People but not camera, lens, location or collection', () => {
    renderPage(rich());
    expect(screen.getByRole('button', { name: /^Tags/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^People/ })).toBeInTheDocument();
    for (const hidden of [/^Camera/, /^Lens/, /^Location/, /^Collection/]) {
      expect(screen.queryByRole('button', { name: hidden })).not.toBeInTheDocument();
    }
  });

  it('surfaces Film stock only once the film filter is on', () => {
    renderPage(rich());
    expect(screen.queryByRole('button', { name: /^Film stock/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Film/ }));
    expect(screen.getByRole('button', { name: /^Film stock/ })).toBeInTheDocument();
  });
});

describe('LocationPageClient — empty state', () => {
  it('says no images match when filters exclude everything', () => {
    mockInitialCriteria = { tags: ['nonexistent'] };
    renderPage();
    expect(screen.getByText('No images match the current filters.')).toBeInTheDocument();
    expect(screen.queryByTestId('content-blocks')).not.toBeInTheDocument();
  });

  it('still renders the collections row and toolbar when filtered to zero', () => {
    mockInitialCriteria = { tags: ['nonexistent'] };
    renderPage();
    expect(screen.getByTestId('location-collections')).toBeInTheDocument();
  });
});

describe('LocationPageClient — clear filters', () => {
  it('clears every filter from the filtered-to-zero empty state', () => {
    mockInitialCriteria = { tags: ['nonexistent'] };
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(lastSyncedCriteria()).toEqual({});
  });
});

describe('LocationPageClient — ssrViewport', () => {
  it('passes the ssrViewport fields to the content grid', () => {
    render(
      <LocationPageClient
        images={images()}
        collections={[createCollectionModel(1)]}
        ssrViewport={{ contentWidth: 1234, viewportHeight: 777, isMobile: true }}
      />
    );
    const grid = screen.getByTestId('content-blocks');
    expect(grid).toHaveAttribute('data-width', '1234');
    expect(grid).toHaveAttribute('data-height', '777');
    expect(grid).toHaveAttribute('data-mobile', 'true');
  });
});
