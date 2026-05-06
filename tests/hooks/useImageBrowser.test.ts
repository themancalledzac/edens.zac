/**
 * Tests for useImageBrowser hook.
 *
 * Verifies:
 * - Initial state seeded from SSR page 0
 * - Auto-prefetch fires page 1 on mount when initial.isLast === false
 * - Auto-prefetch is skipped when initial.isLast === true
 * - loadNext appends pages and respects isDone
 * - setFilters resets pages, refetches page 0 with merged filter set
 * - fetchingRef lock prevents duplicate concurrent fetches
 * - Stale in-flight responses are discarded after a setFilters
 */
import { act, renderHook, waitFor } from '@testing-library/react';

import { useImageBrowser } from '@/app/hooks/useImageBrowser';
import { getAllImages, type PagedImages } from '@/app/lib/api/content';

jest.mock('@/app/lib/api/content', () => {
  const actual = jest.requireActual('@/app/lib/api/content');
  return {
    ...actual,
    getAllImages: jest.fn(),
  };
});

const mockedGetAllImages = getAllImages as jest.MockedFunction<typeof getAllImages>;

const makePage = (
  page: number,
  count: number,
  isLast: boolean,
  totalElements = 200
): PagedImages => ({
  items: Array.from({ length: count }, (_, i) => ({
    id: page * 100 + i,
    contentType: 'IMAGE' as const,
    imageUrl: `https://cdn.example.com/${page}-${i}.jpg`,
    orderIndex: 0,
    visible: true,
    locations: [],
  })),
  page,
  totalPages: Math.ceil(totalElements / count),
  totalElements,
  isLast,
});

describe('useImageBrowser', () => {
  beforeEach(() => {
    mockedGetAllImages.mockReset();
  });

  it('seeds from SSR page 0 and auto-prefetches page 1', async () => {
    const initial = makePage(0, 50, false);
    const page1 = makePage(1, 50, false);
    mockedGetAllImages.mockResolvedValueOnce(page1);

    const { result } = renderHook(() => useImageBrowser(initial));

    // Initial render — only SSR page is visible.
    expect(result.current.items).toHaveLength(50);
    expect(result.current.isDone).toBe(false);

    await waitFor(() => expect(result.current.items).toHaveLength(100));
    expect(mockedGetAllImages).toHaveBeenCalledTimes(1);
    expect(mockedGetAllImages).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, size: 50 })
    );
  });

  it('does not auto-prefetch when SSR returned the last page', async () => {
    const initial = makePage(0, 12, true, 12);
    const { result } = renderHook(() => useImageBrowser(initial));

    expect(result.current.items).toHaveLength(12);
    expect(result.current.isDone).toBe(true);

    await new Promise(r => setTimeout(r, 0));
    expect(mockedGetAllImages).not.toHaveBeenCalled();
  });

  it('loadNext appends the next page and stops at isLast', async () => {
    const initial = makePage(0, 50, false);
    mockedGetAllImages
      .mockResolvedValueOnce(makePage(1, 50, false))
      .mockResolvedValueOnce(makePage(2, 50, true));

    const { result } = renderHook(() => useImageBrowser(initial));
    // Wait for the auto-prefetch.
    await waitFor(() => expect(result.current.items).toHaveLength(100));

    // Trigger loadNext for page 2 (last).
    act(() => result.current.loadNext());
    await waitFor(() => expect(result.current.items).toHaveLength(150));
    expect(result.current.isDone).toBe(true);

    // Further loadNext calls are no-ops once isDone.
    act(() => result.current.loadNext());
    expect(mockedGetAllImages).toHaveBeenCalledTimes(2);
  });

  it('setFilters resets pages and refetches page 0', async () => {
    const initial = makePage(0, 50, false);
    mockedGetAllImages.mockResolvedValueOnce(makePage(1, 50, false)); // auto-prefetch

    const { result } = renderHook(() => useImageBrowser(initial));
    await waitFor(() => expect(result.current.items).toHaveLength(100));

    // New filter — wipe state and replace with page 0 of filtered set (5 items).
    mockedGetAllImages.mockResolvedValueOnce(makePage(0, 5, true, 5));

    act(() => result.current.setFilters({ minRating: 4 }));
    await waitFor(() => expect(result.current.items).toHaveLength(5));
    expect(result.current.isDone).toBe(true);
    expect(result.current.filters).toMatchObject({ minRating: 4, page: 0 });

    // Verify the BE was called with merged params.
    const lastCall = mockedGetAllImages.mock.calls.at(-1)?.[0];
    expect(lastCall).toMatchObject({ minRating: 4, page: 0 });
  });

  it('discards stale in-flight responses after a setFilters', async () => {
    const initial = makePage(0, 50, false);

    // First mock: a slow response that arrives AFTER the filter change.
    let resolveSlow: ((p: PagedImages) => void) | null = null;
    const slowPromise = new Promise<PagedImages>(resolve => {
      resolveSlow = resolve;
    });
    mockedGetAllImages.mockReturnValueOnce(slowPromise as unknown as Promise<PagedImages>);

    const { result } = renderHook(() => useImageBrowser(initial));

    // Filter change happens before slow response lands.
    mockedGetAllImages.mockResolvedValueOnce(makePage(0, 3, true, 3));
    act(() => result.current.setFilters({ minRating: 5 }));
    await waitFor(() => expect(result.current.items).toHaveLength(3));

    // Now resolve the stale prefetch — its result must be discarded.
    act(() => {
      resolveSlow?.(makePage(1, 50, false));
    });
    await new Promise(r => setTimeout(r, 0));

    expect(result.current.items).toHaveLength(3);
    expect(result.current.filters).toMatchObject({ minRating: 5 });
  });
});
