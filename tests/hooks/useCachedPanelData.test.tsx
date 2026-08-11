/**
 * Tests for useCachedPanelData — the two-layer (memory + localStorage) stale-while-revalidate
 * cache behind the admin hub panels.
 *
 * The module-level memory cache survives across tests in this file by design, so every test
 * clears it via `clearCachedPanelData()` in beforeEach. jsdom provides a real localStorage.
 */
import { act, renderHook, waitFor } from '@testing-library/react';

import { clearCachedPanelData, useCachedPanelData } from '@/app/hooks/useCachedPanelData';

jest.mock('@/app/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

const STORAGE_KEY = 'adminPanel:v1:widgets';

interface Widget {
  id: number;
  name: string;
}

describe('useCachedPanelData', () => {
  beforeEach(() => {
    clearCachedPanelData();
    window.localStorage.clear();
    jest.clearAllMocks();
  });

  it('cold start: loads in the foreground, then caches to memory and localStorage', async () => {
    const fetcher = jest.fn(async (): Promise<Widget[]> => [{ id: 1, name: 'a' }]);
    const { result } = renderHook(() => useCachedPanelData('widgets', fetcher, 'failed'));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([{ id: 1, name: 'a' }]);
    expect(result.current.loadError).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify([{ id: 1, name: 'a' }]));
  });

  it('remount: renders cached data immediately with no loading state', async () => {
    const fetcher = jest.fn(async (): Promise<Widget[]> => [{ id: 1, name: 'a' }]);
    const first = renderHook(() => useCachedPanelData('widgets', fetcher, 'failed'));
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    first.unmount();

    const second = renderHook(() => useCachedPanelData('widgets', fetcher, 'failed'));
    expect(second.result.current.loading).toBe(false);
    expect(second.result.current.data).toEqual([{ id: 1, name: 'a' }]);
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  });

  it('cold mount with localStorage seed: shows stored data without a loading state', async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([{ id: 7, name: 'stored' }]));
    const fetcher = jest.fn(async (): Promise<Widget[]> => [{ id: 7, name: 'stored' }]);
    const { result } = renderHook(() => useCachedPanelData('widgets', fetcher, 'failed'));

    await waitFor(() => expect(result.current.data).toEqual([{ id: 7, name: 'stored' }]));
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    expect(result.current.loading).toBe(false);
  });

  it('unchanged revalidation keeps reference identity (no re-render churn)', async () => {
    const fetcher = jest.fn(async (): Promise<Widget[]> => [{ id: 1, name: 'a' }]);
    const { result } = renderHook(() => useCachedPanelData('widgets', fetcher, 'failed'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const initial = result.current.data;

    await act(() => result.current.refresh());
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(result.current.data).toBe(initial);
  });

  it('changed revalidation updates state and both cache layers', async () => {
    let payload: Widget[] = [{ id: 1, name: 'a' }];
    const fetcher = jest.fn(async () => payload);
    const { result } = renderHook(() => useCachedPanelData('widgets', fetcher, 'failed'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    payload = [{ id: 2, name: 'b' }];
    await act(() => result.current.refresh());
    expect(result.current.data).toEqual([{ id: 2, name: 'b' }]);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify([{ id: 2, name: 'b' }]));
  });

  it('foreground failure sets loadError; empty and failed stay distinguishable', async () => {
    const fetcher = jest.fn(async (): Promise<Widget[]> => {
      throw new Error('backend down');
    });
    const { result } = renderHook(() => useCachedPanelData('widgets', fetcher, 'failed'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.loadError).toBe('failed');
    expect(result.current.data).toBeNull();
  });

  it('background failure with cached data keeps the data and reports no error', async () => {
    let fail = false;
    const fetcher = jest.fn(async (): Promise<Widget[]> => {
      if (fail) throw new Error('backend down');
      return [{ id: 1, name: 'a' }];
    });
    const { result } = renderHook(() => useCachedPanelData('widgets', fetcher, 'failed'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    fail = true;
    await act(() => result.current.refresh());
    expect(result.current.data).toEqual([{ id: 1, name: 'a' }]);
    expect(result.current.loadError).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('setData writes through to memory and localStorage (no resurrection on remount)', async () => {
    const fetcher = jest.fn(
      async (): Promise<Widget[]> => [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ]
    );
    const first = renderHook(() => useCachedPanelData('widgets', fetcher, 'failed'));
    await waitFor(() => expect(first.result.current.loading).toBe(false));

    act(() => {
      first.result.current.setData(previous => (previous ?? []).filter(w => w.id !== 1));
    });
    expect(first.result.current.data).toEqual([{ id: 2, name: 'b' }]);
    first.unmount();

    const second = renderHook(() => useCachedPanelData('widgets', fetcher, 'failed'));
    expect(second.result.current.data).toEqual([{ id: 2, name: 'b' }]);
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  });

  it('a key switch re-seeds from the new key and caches variants independently', async () => {
    const fetcher = jest.fn(
      async (key: string): Promise<Widget[]> => [{ id: key === 'widgets' ? 1 : 99, name: key }]
    );
    const { result, rerender } = renderHook(
      ({ cacheKey }: { cacheKey: string }) =>
        useCachedPanelData(cacheKey, () => fetcher(cacheKey), 'failed'),
      { initialProps: { cacheKey: 'widgets' } }
    );
    await waitFor(() => expect(result.current.data).toEqual([{ id: 1, name: 'widgets' }]));

    rerender({ cacheKey: 'widgets:variant' });
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.data).toEqual([{ id: 99, name: 'widgets:variant' }]));

    rerender({ cacheKey: 'widgets' });
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual([{ id: 1, name: 'widgets' }]);
  });

  it('tolerates corrupt localStorage by discarding it and fetching fresh', async () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json');
    const fetcher = jest.fn(async (): Promise<Widget[]> => [{ id: 1, name: 'a' }]);
    const { result } = renderHook(() => useCachedPanelData('widgets', fetcher, 'failed'));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.data).toEqual([{ id: 1, name: 'a' }]));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify([{ id: 1, name: 'a' }]));
  });

  it('clearCachedPanelData(key) drops one key from every layer', async () => {
    const fetcher = jest.fn(async (): Promise<Widget[]> => [{ id: 1, name: 'a' }]);
    const first = renderHook(() => useCachedPanelData('widgets', fetcher, 'failed'));
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    first.unmount();

    clearCachedPanelData('widgets');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();

    const second = renderHook(() => useCachedPanelData('widgets', fetcher, 'failed'));
    expect(second.result.current.loading).toBe(true);
    await waitFor(() => expect(second.result.current.loading).toBe(false));
  });
});
