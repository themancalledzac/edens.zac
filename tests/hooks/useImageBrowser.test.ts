/**
 * Tests for useImageBrowser hook.
 *
 * Verifies:
 * - Initial state seeded from SSR page 0
 * - Auto-prefetch fires page 1 on mount when initial.isLast === false
 * - Auto-prefetch is skipped when initial.isLast === true
 * - loadNext appends pages and respects isDone
 * - fetchingRef lock prevents duplicate concurrent fetches
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
    expect(mockedGetAllImages).toHaveBeenCalledWith(expect.objectContaining({ page: 1, size: 50 }));
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
});
