/**
 * Integration tests for AllImagesClient.
 *
 * Verifies the wiring between the useImageBrowser hook, the sentinel observer,
 * and the rendered grid. The hook itself is exercised in
 * tests/hooks/useImageBrowser.test.ts; here we mock it to keep the assertions
 * focused on this component's responsibilities.
 *
 * The component renders via the standard CollectionPage pipeline (same layout
 * as every other collection page), so visual structure is delegated and not
 * asserted here.
 */
import { fireEvent, render, screen } from '@testing-library/react';

import AllImagesClient from '@/app/components/Admin/AllImagesClient';
import { useInViewport } from '@/app/hooks/inViewport';
import { useImageBrowser } from '@/app/hooks/useImageBrowser';
import { type PagedImages } from '@/app/lib/api/content';

// CollectionPage has heavy downstream rendering (full BoxTree pipeline). Stub
// it for these focused integration tests.
jest.mock('@/app/components/ContentCollection/CollectionPage', () => ({
  __esModule: true,
  default: ({ collection }: { collection: { content: unknown[] } }) => (
    <div data-testid="collection-page">Items: {collection.content.length}</div>
  ),
}));

jest.mock('@/app/hooks/useImageBrowser', () => ({
  __esModule: true,
  useImageBrowser: jest.fn(),
}));

jest.mock('@/app/hooks/inViewport', () => ({
  __esModule: true,
  useInViewport: jest.fn(),
}));

const mockUseImageBrowser = useImageBrowser as jest.MockedFunction<typeof useImageBrowser>;
const mockUseInViewport = useInViewport as jest.MockedFunction<typeof useInViewport>;

const initial: PagedImages = {
  items: [
    {
      id: 1,
      contentType: 'IMAGE',
      imageUrl: 'https://cdn.example.com/1.jpg',
      orderIndex: 0,
      visible: true,
      locations: [],
    },
  ],
  page: 0,
  totalPages: 4,
  totalElements: 200,
  isLast: false,
};

const baseHookResult = {
  items: initial.items,
  filters: { page: 0, size: 50 },
  setFilters: jest.fn(),
  loadNext: jest.fn(),
  isLoading: false,
  isDone: false,
  error: null,
};

describe('AllImagesClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseInViewport.mockReturnValue({ isVisible: false, intersectionRatio: 0 });
    mockUseImageBrowser.mockReturnValue(baseHookResult);
  });

  it('renders the standard collection grid with initial items', () => {
    render(<AllImagesClient initial={initial} />);
    expect(screen.getByTestId('collection-page')).toHaveTextContent('Items: 1');
  });

  it('calls loadNext when the sentinel becomes visible and not done/loading', () => {
    const loadNext = jest.fn();
    mockUseImageBrowser.mockReturnValue({ ...baseHookResult, loadNext });
    mockUseInViewport.mockReturnValue({ isVisible: true, intersectionRatio: 1 });

    render(<AllImagesClient initial={initial} />);
    expect(loadNext).toHaveBeenCalled();
  });

  it('does not call loadNext while isLoading', () => {
    const loadNext = jest.fn();
    mockUseImageBrowser.mockReturnValue({ ...baseHookResult, loadNext, isLoading: true });
    mockUseInViewport.mockReturnValue({ isVisible: true, intersectionRatio: 1 });

    render(<AllImagesClient initial={initial} />);
    expect(loadNext).not.toHaveBeenCalled();
  });

  it('does not call loadNext when isDone', () => {
    const loadNext = jest.fn();
    mockUseImageBrowser.mockReturnValue({ ...baseHookResult, loadNext, isDone: true });
    mockUseInViewport.mockReturnValue({ isVisible: true, intersectionRatio: 1 });

    render(<AllImagesClient initial={initial} />);
    expect(loadNext).not.toHaveBeenCalled();
  });

  it('renders nothing extra when isDone (clean stop)', () => {
    mockUseImageBrowser.mockReturnValue({ ...baseHookResult, isDone: true });
    render(<AllImagesClient initial={initial} />);
    expect(screen.queryByText(/loading more/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an inline retry button on error', () => {
    const loadNext = jest.fn();
    mockUseImageBrowser.mockReturnValue({
      ...baseHookResult,
      loadNext,
      error: new Error('boom'),
    });

    render(<AllImagesClient initial={initial} />);
    const retry = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retry);
    expect(loadNext).toHaveBeenCalled();
  });
});
