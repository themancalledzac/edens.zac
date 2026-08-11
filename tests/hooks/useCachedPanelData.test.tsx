/**
 * Tests for useCachedPanelData — the two-layer (memory + localStorage) stale-while-revalidate
 * cache behind the admin hub panels.
 *
 * The module-level memory cache survives across tests in this file by design, so every test
 * clears it via `clearCachedPanelData()` in beforeEach. jsdom provides a real localStorage.
 *
 * Keys are the real ones (`roles`, `users:base`, `users:people`) because the cache only accepts
 * keys from `PanelCacheSchema` — a fixture key would not type-check, which is the schema working.
 */
import { act, render, renderHook, waitFor } from '@testing-library/react';
import { type Dispatch, type SetStateAction, useState } from 'react';

import { clearCachedPanelData, useCachedPanelData } from '@/app/hooks/useCachedPanelData';
import { type RoleSummary } from '@/app/types/Role';
import { type AdminUserSummary } from '@/app/types/User';

jest.mock('@/app/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

const ROLES_KEY = 'adminPanel:v1:roles';

/**
 * A promise the test resolves by hand, for holding a fetch in flight while something else happens.
 */
function deferred<V>(): { promise: Promise<V>; resolve: (value: V) => void } {
  let settle: (value: V) => void = () => {};
  const promise = new Promise<V>(resolve => {
    settle = resolve;
  });
  return { promise, resolve: (value: V) => settle(value) };
}

interface HarnessApi {
  data: RoleSummary[] | null;
  setData: Dispatch<SetStateAction<RoleSummary[] | null>>;
  /** Dispatches an unrelated state update, leaving the fiber with pending work. */
  dirty: () => void;
}

/**
 * A component that can dirty its own fiber before writing to the cache.
 *
 * React only runs a state updater eagerly, at dispatch, while the fiber has no pending work.
 * Every real delete path dispatches something else first — `setDeletingId`, a cleared error — so
 * the updater and everything inside it are deferred to the render pass. `renderHook` alone never
 * exercises that ordering, because its fiber is clean when the test calls `setData`.
 */
function DirtyFiberHarness({
  fetcher,
  api,
}: {
  fetcher: () => Promise<RoleSummary[]>;
  api: { current: HarnessApi | null };
}) {
  const [, setTick] = useState(0);
  const panel = useCachedPanelData('roles', fetcher, 'failed');
  api.current = {
    data: panel.data,
    setData: panel.setData,
    dirty: () => setTick(tick => tick + 1),
  };
  return null;
}

function user(id: number, displayName: string): AdminUserSummary {
  return {
    id,
    email: `${displayName}@example.com`,
    displayName,
    status: 'ACTIVE',
    description: null,
  };
}

describe('useCachedPanelData', () => {
  beforeEach(() => {
    clearCachedPanelData();
    window.localStorage.clear();
    jest.clearAllMocks();
  });

  it('cold start: loads in the foreground, then caches to memory and localStorage', async () => {
    const fetcher = jest.fn(async (): Promise<RoleSummary[]> => [{ id: 1, name: 'a' }]);
    const { result } = renderHook(() => useCachedPanelData('roles', fetcher, 'failed'));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([{ id: 1, name: 'a' }]);
    expect(result.current.loadError).toBeNull();
    expect(result.current.revalidationFailed).toBe(false);
    expect(window.localStorage.getItem(ROLES_KEY)).toBe(JSON.stringify([{ id: 1, name: 'a' }]));
  });

  it('remount: renders cached data immediately with no loading state', async () => {
    const fetcher = jest.fn(async (): Promise<RoleSummary[]> => [{ id: 1, name: 'a' }]);
    const first = renderHook(() => useCachedPanelData('roles', fetcher, 'failed'));
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    first.unmount();

    const second = renderHook(() => useCachedPanelData('roles', fetcher, 'failed'));
    expect(second.result.current.loading).toBe(false);
    expect(second.result.current.data).toEqual([{ id: 1, name: 'a' }]);
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  });

  it('a collapse → expand round trip keeps the list, with no loading state at any point', async () => {
    const fetcher = jest.fn(async (): Promise<RoleSummary[]> => [{ id: 1, name: 'a' }]);
    const expanded = renderHook(() => useCachedPanelData('roles', fetcher, 'failed'));
    await waitFor(() => expect(expanded.result.current.loading).toBe(false));
    expanded.unmount();

    const inFlight = deferred<RoleSummary[]>();
    const slow = jest.fn(() => inFlight.promise);
    const collapsed = renderHook(() => useCachedPanelData('roles', slow, 'failed'));

    expect(collapsed.result.current.loading).toBe(false);
    expect(collapsed.result.current.data).toEqual([{ id: 1, name: 'a' }]);
    await waitFor(() => expect(slow).toHaveBeenCalledTimes(1));
    expect(collapsed.result.current.loading).toBe(false);

    await act(async () => {
      inFlight.resolve([{ id: 1, name: 'a' }]);
      await inFlight.promise;
    });

    expect(collapsed.result.current.loading).toBe(false);
    expect(collapsed.result.current.data).toEqual([{ id: 1, name: 'a' }]);
  });

  it('cold mount with localStorage seed: shows stored data without a loading state', async () => {
    window.localStorage.setItem(ROLES_KEY, JSON.stringify([{ id: 7, name: 'stored' }]));
    const fetcher = jest.fn(async (): Promise<RoleSummary[]> => [{ id: 7, name: 'stored' }]);
    const { result } = renderHook(() => useCachedPanelData('roles', fetcher, 'failed'));

    await waitFor(() => expect(result.current.data).toEqual([{ id: 7, name: 'stored' }]));
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    expect(result.current.loading).toBe(false);
  });

  it('unchanged revalidation keeps reference identity (no re-render churn)', async () => {
    const fetcher = jest.fn(async (): Promise<RoleSummary[]> => [{ id: 1, name: 'a' }]);
    const { result } = renderHook(() => useCachedPanelData('roles', fetcher, 'failed'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const initial = result.current.data;

    await act(() => result.current.refresh());
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(result.current.data).toBe(initial);
  });

  it('changed revalidation updates state and both cache layers', async () => {
    let payload: RoleSummary[] = [{ id: 1, name: 'a' }];
    const fetcher = jest.fn(async () => payload);
    const { result } = renderHook(() => useCachedPanelData('roles', fetcher, 'failed'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    payload = [{ id: 2, name: 'b' }];
    await act(() => result.current.refresh());
    expect(result.current.data).toEqual([{ id: 2, name: 'b' }]);
    expect(window.localStorage.getItem(ROLES_KEY)).toBe(JSON.stringify([{ id: 2, name: 'b' }]));
  });

  it('foreground failure sets loadError; empty and failed stay distinguishable', async () => {
    const fetcher = jest.fn(async (): Promise<RoleSummary[]> => {
      throw new Error('backend down');
    });
    const { result } = renderHook(() => useCachedPanelData('roles', fetcher, 'failed'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.loadError).toBe('failed');
    expect(result.current.data).toBeNull();
  });

  it('background failure keeps the data, reports no error, and flags revalidationFailed', async () => {
    let fail = false;
    const fetcher = jest.fn(async (): Promise<RoleSummary[]> => {
      if (fail) throw new Error('backend down');
      return [{ id: 1, name: 'a' }];
    });
    const { result } = renderHook(() => useCachedPanelData('roles', fetcher, 'failed'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    fail = true;
    await act(() => result.current.refresh());
    expect(result.current.data).toEqual([{ id: 1, name: 'a' }]);
    expect(result.current.loadError).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.revalidationFailed).toBe(true);

    fail = false;
    await act(() => result.current.refresh());
    expect(result.current.revalidationFailed).toBe(false);
  });

  it('a post-mutation refresh surfaces its failure even with cached data showing', async () => {
    let fail = false;
    const fetcher = jest.fn(async (): Promise<RoleSummary[]> => {
      if (fail) throw new Error('backend down');
      return [{ id: 1, name: 'a' }];
    });
    const { result } = renderHook(() => useCachedPanelData('roles', fetcher, 'failed'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    fail = true;
    await act(() => result.current.refresh({ reportErrors: true }));
    expect(result.current.loadError).toBe('failed');
    expect(result.current.loading).toBe(false);
  });

  /**
   * The panels build their body inside `if (!loading)`, so entering the loading state blanks a
   * list the admin is reading. A post-mutation refresh has no business doing that to a list that
   * is still correct — it reports failures, it does not announce itself.
   */
  it('a post-mutation refresh reconciles without blanking a correct list', async () => {
    const warm = jest.fn(async (): Promise<RoleSummary[]> => [{ id: 1, name: 'a' }]);
    const inFlight = deferred<RoleSummary[]>();
    const { result, rerender } = renderHook(
      ({ fetcher }: { fetcher: () => Promise<RoleSummary[]> }) =>
        useCachedPanelData('roles', fetcher, 'failed'),
      { initialProps: { fetcher: warm as () => Promise<RoleSummary[]> } }
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    rerender({ fetcher: () => inFlight.promise });
    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.refresh({ reportErrors: true });
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual([{ id: 1, name: 'a' }]);

    await act(async () => {
      inFlight.resolve([
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ]);
      await pending;
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual([
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
    ]);
  });

  /**
   * After a post-mutation refresh fails, `loadError` is set with a WARM cache — a combination the
   * bare `refresh()` behind every Retry button had no case for. Deriving the loading decision from
   * cache warmth alone left Retry neither entering the loading state nor clearing the error, so
   * the button looked dead and the panel sat on its error branch.
   */
  it('Retry still loads loudly after a post-mutation failure left the cache warm', async () => {
    let fail = true;
    const retryFetcher = jest.fn(async (): Promise<RoleSummary[]> => {
      if (fail) throw new Error('backend down');
      return [{ id: 9, name: 'fresh' }];
    });
    const warm = jest.fn(async (): Promise<RoleSummary[]> => [{ id: 1, name: 'a' }]);
    const { result, rerender } = renderHook(
      ({ fetcher }: { fetcher: () => Promise<RoleSummary[]> }) =>
        useCachedPanelData('roles', fetcher, 'failed'),
      { initialProps: { fetcher: warm as () => Promise<RoleSummary[]> } }
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    rerender({ fetcher: retryFetcher });
    await act(() => result.current.refresh({ reportErrors: true }));
    expect(result.current.loadError).toBe('failed');

    fail = false;
    let retry: Promise<void> = Promise.resolve();
    act(() => {
      retry = result.current.refresh();
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.loadError).toBeNull();

    await act(() => retry);
    expect(result.current.data).toEqual([{ id: 9, name: 'fresh' }]);
    expect(result.current.loadError).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('setData writes through to memory and localStorage (no resurrection on remount)', async () => {
    const fetcher = jest.fn(
      async (): Promise<RoleSummary[]> => [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ]
    );
    const first = renderHook(() => useCachedPanelData('roles', fetcher, 'failed'));
    await waitFor(() => expect(first.result.current.loading).toBe(false));

    act(() => {
      first.result.current.setData(previous => (previous ?? []).filter(r => r.id !== 1));
    });
    expect(first.result.current.data).toEqual([{ id: 2, name: 'b' }]);
    first.unmount();

    const second = renderHook(() => useCachedPanelData('roles', fetcher, 'failed'));
    expect(second.result.current.data).toEqual([{ id: 2, name: 'b' }]);
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  });

  it('a mutation that lands mid-fetch survives the in-flight fetch resolving', async () => {
    const warm = jest.fn(
      async (): Promise<RoleSummary[]> => [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ]
    );
    const first = renderHook(() => useCachedPanelData('roles', warm, 'failed'));
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    first.unmount();

    const inFlight = deferred<RoleSummary[]>();
    const slow = jest.fn(() => inFlight.promise);
    const second = renderHook(() => useCachedPanelData('roles', slow, 'failed'));
    await waitFor(() => expect(slow).toHaveBeenCalledTimes(1));

    act(() => {
      second.result.current.setData(previous => (previous ?? []).filter(r => r.id !== 1));
    });
    expect(second.result.current.data).toEqual([{ id: 2, name: 'b' }]);

    await act(async () => {
      inFlight.resolve([
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ]);
      await inFlight.promise;
    });

    expect(second.result.current.data).toEqual([{ id: 2, name: 'b' }]);
    expect(window.localStorage.getItem(ROLES_KEY)).toBe(JSON.stringify([{ id: 2, name: 'b' }]));
  });

  /**
   * The same resurrection, but through the ordering a real panel actually takes. A delete
   * dispatches `setDeletingId` first, so `setData`'s updater — and any guard inside it — is
   * deferred to the render pass, and the fetch lands in the window between the two.
   *
   * The landing payload differs from the cached one (another admin added a role), which is what
   * makes the deferred case bite: with a payload identical to the cache the fetch commits nothing
   * and the ordering is harmless, so a same-payload test would pass either way. Here the fetch
   * commits, and the mutation's own commit then runs during the render pass — leaving state
   * holding the resurrected row while localStorage holds the filtered list, a split that survives
   * the reload it takes to notice.
   */
  it('guards a mutation whose updater is deferred by other pending state', async () => {
    const warm = jest.fn(
      async (): Promise<RoleSummary[]> => [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ]
    );
    const first = renderHook(() => useCachedPanelData('roles', warm, 'failed'));
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    first.unmount();

    const inFlight = deferred<RoleSummary[]>();
    const api: { current: HarnessApi | null } = { current: null };
    render(<DirtyFiberHarness fetcher={() => inFlight.promise} api={api} />);
    await waitFor(() => expect(api.current?.data).toHaveLength(2));

    await act(async () => {
      inFlight.resolve([
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
        { id: 3, name: 'c' },
      ]);
      api.current?.dirty();
      api.current?.setData(previous => (previous ?? []).filter(role => role.id !== 1));
    });

    expect(api.current?.data).toEqual([{ id: 2, name: 'b' }]);
    expect(window.localStorage.getItem(ROLES_KEY)).toBe(JSON.stringify([{ id: 2, name: 'b' }]));
  });

  it('a superseded fetch cannot commit over the fetch that replaced it', async () => {
    const slowFirst = deferred<RoleSummary[]>();
    const fetchers = [
      jest.fn(() => slowFirst.promise),
      jest.fn(async (): Promise<RoleSummary[]> => [{ id: 2, name: 'newer' }]),
    ];
    let call = 0;
    const fetcher = jest.fn(() => {
      const next = fetchers[call] ?? fetchers[1];
      call += 1;
      return (next as () => Promise<RoleSummary[]>)();
    });

    const { result } = renderHook(() => useCachedPanelData('roles', fetcher, 'failed'));
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

    await act(() => result.current.refresh());
    expect(result.current.data).toEqual([{ id: 2, name: 'newer' }]);

    await act(async () => {
      slowFirst.resolve([{ id: 1, name: 'stale' }]);
      await slowFirst.promise;
    });

    expect(result.current.data).toEqual([{ id: 2, name: 'newer' }]);
  });

  it('a key switch re-seeds from the new key and caches variants independently', async () => {
    const fetcher = jest.fn(
      async (key: string): Promise<AdminUserSummary[]> => [
        key === 'users:base' ? user(1, 'base') : user(99, 'people'),
      ]
    );
    const initialProps: { cacheKey: 'users:base' | 'users:people' } = { cacheKey: 'users:base' };
    const { result, rerender } = renderHook(
      ({ cacheKey }: { cacheKey: 'users:base' | 'users:people' }) =>
        useCachedPanelData(cacheKey, () => fetcher(cacheKey), 'failed'),
      { initialProps }
    );
    await waitFor(() => expect(result.current.data).toEqual([user(1, 'base')]));

    rerender({ cacheKey: 'users:people' });
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.data).toEqual([user(99, 'people')]));

    rerender({ cacheKey: 'users:base' });
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual([user(1, 'base')]);
  });

  it('tolerates corrupt localStorage by discarding it and fetching fresh', async () => {
    window.localStorage.setItem(ROLES_KEY, '{not json');
    const fetcher = jest.fn(async (): Promise<RoleSummary[]> => [{ id: 1, name: 'a' }]);
    const { result } = renderHook(() => useCachedPanelData('roles', fetcher, 'failed'));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.data).toEqual([{ id: 1, name: 'a' }]));
    expect(window.localStorage.getItem(ROLES_KEY)).toBe(JSON.stringify([{ id: 1, name: 'a' }]));
  });

  it('clearCachedPanelData() drops prefixed storage keys the memory cache never saw', () => {
    window.localStorage.setItem('adminPanel:v1:users:people', JSON.stringify([{ id: 3 }]));
    window.localStorage.setItem('unrelated', 'keep me');

    clearCachedPanelData();

    expect(window.localStorage.getItem('adminPanel:v1:users:people')).toBeNull();
    expect(window.localStorage.getItem('unrelated')).toBe('keep me');
  });

  it('clearCachedPanelData(key) drops one key from every layer', async () => {
    const fetcher = jest.fn(async (): Promise<RoleSummary[]> => [{ id: 1, name: 'a' }]);
    const first = renderHook(() => useCachedPanelData('roles', fetcher, 'failed'));
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    first.unmount();

    clearCachedPanelData('roles');
    expect(window.localStorage.getItem(ROLES_KEY)).toBeNull();

    const second = renderHook(() => useCachedPanelData('roles', fetcher, 'failed'));
    expect(second.result.current.loading).toBe(true);
    await waitFor(() => expect(second.result.current.loading).toBe(false));
  });
});
