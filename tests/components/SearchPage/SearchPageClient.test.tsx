/**
 * Tests for the public search surface.
 *
 * The two empty states are the point of most of this file. "Nothing to search" and "nothing
 * matches" are the same blank screen to a viewer who is told the same sentence, and they call for
 * opposite reactions — wait for the backend, or widen the filters. Anything that collapses them
 * back into one message should fail here.
 *
 * `FilterToolbar` is deliberately NOT mocked. The wiring this component owns is which dimensions
 * it hands the toolbar, and a mocked toolbar would assert that wiring against itself.
 */

import { render, screen } from '@testing-library/react';

import SearchPageClient from '@/app/components/SearchPage/SearchPageClient';
import { type ContentImageModel } from '@/app/types/Content';
import { type ContentFilterCriteria } from '@/app/utils/contentFilter';
import { createImageContent } from '@/tests/fixtures/contentFixtures';

const mockSyncToUrl = jest.fn();
let mockInitialCriteria: ContentFilterCriteria = {};

jest.mock('@/app/hooks/useFilterUrlState', () => ({
  useFilterUrlState: () => ({
    initialCriteria: mockInitialCriteria,
    syncToUrl: mockSyncToUrl,
  }),
}));

// The content pipeline renders next/image through a layout engine that jsdom cannot measure.
// Stub it down to a count so the assertions here stay about which branch rendered.
jest.mock('@/app/components/Content/ContentBlockWithFullScreen', () => ({
  __esModule: true,
  default: ({ content }: { content: unknown[] }) => (
    <div data-testid="content-blocks">{content.length}</div>
  ),
}));

const tagged = (id: number, tag: string): ContentImageModel =>
  createImageContent(id, {
    tags: [{ id, name: tag, slug: tag }],
    captureDate: '2026-07-20',
  });

beforeEach(() => {
  mockInitialCriteria = {};
  mockSyncToUrl.mockClear();
});

describe('SearchPageClient', () => {
  it('renders the search heading', () => {
    render(<SearchPageClient images={[tagged(1, 'alpine')]} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Search');
  });

  it('counts the images that survive the current filters, not the corpus', () => {
    mockInitialCriteria = { tags: ['alpine'] };
    render(<SearchPageClient images={[tagged(1, 'alpine'), tagged(2, 'coastal')]} />);

    expect(screen.getByText('1 photo')).toBeInTheDocument();
  });

  it('says there is nothing to search when the backend returned no images', () => {
    render(<SearchPageClient images={[]} />);

    expect(screen.getByText('There are no photos to search yet.')).toBeInTheDocument();
    expect(screen.queryByText('No photos match the current filters.')).not.toBeInTheDocument();
  });

  it('says nothing matches when filters exclude every image', () => {
    mockInitialCriteria = { tags: ['nonexistent'] };
    render(<SearchPageClient images={[tagged(1, 'alpine'), tagged(2, 'coastal')]} />);

    expect(screen.getByText('No photos match the current filters.')).toBeInTheDocument();
    expect(screen.queryByText('There are no photos to search yet.')).not.toBeInTheDocument();
  });

  it('renders content blocks when images survive the filters', () => {
    render(<SearchPageClient images={[tagged(1, 'alpine'), tagged(2, 'coastal')]} />);

    expect(screen.getByTestId('content-blocks')).toBeInTheDocument();
    expect(screen.queryByText('No photos match the current filters.')).not.toBeInTheDocument();
  });

  it('applies filters deep-linked through the URL', () => {
    mockInitialCriteria = { tags: ['alpine'] };
    render(<SearchPageClient images={[tagged(1, 'alpine'), tagged(2, 'coastal')]} />);

    expect(screen.getByTestId('content-blocks')).toHaveTextContent('1');
  });

  it('surfaces a dimension whose values differ between images', () => {
    render(<SearchPageClient images={[tagged(1, 'alpine'), tagged(2, 'coastal')]} />);

    expect(screen.getByText('Tags')).toBeInTheDocument();
  });

  it('hides a dimension that cannot narrow anything', () => {
    render(<SearchPageClient images={[tagged(1, 'alpine'), tagged(2, 'alpine')]} />);

    expect(screen.queryByText('Tags')).not.toBeInTheDocument();
  });
});
