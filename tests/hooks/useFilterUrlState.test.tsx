/**
 * Tests for useFilterUrlState.
 *
 * Verifies the bridge between the gallery clients' local filter state and the
 * URL query string (via the tested parseFilterFromParams / serializeFilterToParams
 * helpers in contentFilter.ts):
 *  - initial criteria are parsed from the URL on first render
 *  - syncToUrl serializes criteria back via router.replace (no scroll, no history spam)
 *  - empty criteria produce a clean, bare pathname
 */
import { act, renderHook } from '@testing-library/react';

import { useFilterUrlState } from '@/app/hooks/useFilterUrlState';
import type { ContentFilterCriteria } from '@/app/utils/contentFilter';

const replaceMock = jest.fn();
let searchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: replaceMock, prefetch: jest.fn() }),
  usePathname: () => '/some-collection',
  useSearchParams: () => searchParams,
}));

/**
 * syncToUrl merges into the LIVE URL via window.location.search (so it preserves
 * params it doesn't own). Drive that in jsdom by setting the search string.
 */
function setLocationSearch(search: string): void {
  window.history.replaceState({}, '', `/some-collection${search}`);
}

describe('useFilterUrlState', () => {
  beforeEach(() => {
    replaceMock.mockClear();
    searchParams = new URLSearchParams();
    setLocationSearch('');
  });

  it('parses initial criteria from the URL', () => {
    searchParams = new URLSearchParams('rating=4&tag=mountains&people=alex');
    const { result } = renderHook(() => useFilterUrlState());
    expect(result.current.initialCriteria.minRating).toBe(4);
    expect(result.current.initialCriteria.tags).toEqual(['mountains']);
    expect(result.current.initialCriteria.people).toEqual(['alex']);
  });

  it('returns empty initial criteria when the URL has no filter params', () => {
    const { result } = renderHook(() => useFilterUrlState());
    expect(result.current.initialCriteria).toEqual({});
  });

  it('writes serialized criteria back via router.replace', () => {
    const { result } = renderHook(() => useFilterUrlState());
    const criteria: ContentFilterCriteria = { minRating: 5, tags: ['ocean'] };
    act(() => {
      result.current.syncToUrl(criteria);
    });
    expect(replaceMock).toHaveBeenCalledTimes(1);
    const [url, options] = replaceMock.mock.calls[0] as [string, { scroll: boolean }];
    expect(url).toContain('/some-collection');
    expect(url).toContain('rating=5');
    expect(url).toContain('tag=ocean');
    expect(options).toEqual({ scroll: false });
  });

  it('replaces with the bare pathname when criteria are empty', () => {
    const { result } = renderHook(() => useFilterUrlState());
    act(() => {
      result.current.syncToUrl({});
    });
    expect(replaceMock).toHaveBeenCalledWith('/some-collection', { scroll: false });
  });

  it('preserves a non-filter param (image) while writing and clearing filter keys', () => {
    // Live URL carries both a non-filter param (image) and a stale filter param (tag).
    setLocationSearch('?image=42&tag=stale');
    const { result } = renderHook(() => useFilterUrlState());
    act(() => {
      // New criteria set a different filter and drop the stale tag.
      result.current.syncToUrl({ minRating: 5 });
    });
    const [url] = replaceMock.mock.calls[0] as [string];
    const written = new URL(url, 'http://localhost').searchParams;
    // Non-filter param survives untouched.
    expect(written.get('image')).toBe('42');
    // New filter key is written.
    expect(written.get('rating')).toBe('5');
    // The removed filter key is cleared.
    expect(written.has('tag')).toBe(false);
  });

  it('keeps initialCriteria stable across re-renders even if the URL changes', () => {
    searchParams = new URLSearchParams('rating=3');
    const { result, rerender } = renderHook(() => useFilterUrlState());
    const first = result.current.initialCriteria;
    // Our own URL writes must not re-seed initial state mid-session.
    searchParams = new URLSearchParams('rating=5&tag=ocean');
    rerender();
    expect(result.current.initialCriteria).toBe(first);
    expect(result.current.initialCriteria.minRating).toBe(3);
  });
});
