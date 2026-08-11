import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { logger } from '@/app/utils/logger';

/**
 * Storage key prefix, versioned so a payload-shape change can orphan old entries by bumping it
 * rather than migrating them.
 */
const STORAGE_PREFIX = 'adminPanel:v1:';

/**
 * Session-lifetime cache. This layer, not localStorage, is what makes a re-pack remount costless:
 * a panel that unmounts and remounts (the hub re-packs whenever a panel collapses, and React can
 * never preserve a component that moves between parent rows) re-seeds synchronously from here in
 * its `useState` initializer. It is also the only layer the initializer may read — on the server
 * and during first hydration it is empty on both sides, so server and client HTML agree.
 * localStorage would not: it is populated on the client and absent on the server, so reading it
 * during the initial render is a hydration mismatch by construction. It waits for the mount
 * effect instead.
 */
const memoryCache = new Map<string, unknown>();

/**
 * The serialized form of each cached value, kept alongside it so a background revalidation can
 * answer "did anything change?" with a string compare instead of a deep walk. Entries move in
 * lockstep with {@link memoryCache}.
 */
const serializedCache = new Map<string, string>();

function readStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, serialized: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, serialized);
  } catch {
    /* quota/private-mode failures degrade to memory-only caching */
  }
}

function removeStorage(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_PREFIX + key);
  } catch {
    /* nothing to degrade to */
  }
}

/**
 * Drop cached panel data — every key, or one. For tests, and for logout wiring: cached admin
 * lists must not outlive the admin session that fetched them.
 */
export function clearCachedPanelData(key?: string): void {
  if (key === undefined) {
    for (const k of memoryCache.keys()) removeStorage(k);
    memoryCache.clear();
    serializedCache.clear();
    return;
  }
  memoryCache.delete(key);
  serializedCache.delete(key);
  removeStorage(key);
}

export interface CachedPanelData<T> {
  /** The cached-or-fetched payload; `null` only before the first successful load ever. */
  data: T | null;
  /** True only while loading with nothing cached to show. A warm panel never reports loading. */
  loading: boolean;
  /** Set only when a load failed AND there is no cached data to show instead. */
  loadError: string | null;
  /**
   * Re-fetch. Silent when cached data is showing (stale-while-revalidate); a foreground load
   * with error reporting when there is nothing to show — which makes it directly usable as the
   * error branch's Retry handler.
   */
  refresh: () => Promise<void>;
  /**
   * Write-through setter for optimistic mutations, shaped as a state dispatcher so existing
   * hooks like `useMessageDelete` keep their setter contract. Writing through matters: a delete
   * that only touched component state would resurrect from stale cache on the next remount.
   */
  setData: Dispatch<SetStateAction<T | null>>;
}

/**
 * Cached client data for an admin hub panel: render instantly from cache, revalidate in the
 * background, update only when the payload actually changed.
 *
 * Two layers back it. A module-level Map survives remounts within the session — the admin hub
 * re-packs (and therefore remounts panels) whenever one collapses, and this layer is what keeps a
 * panel's list painted straight through that. localStorage under `adminPanel:v1:` survives full
 * page loads, so a returning admin sees lists immediately while a background fetch reconciles.
 *
 * An unchanged fetch sets no state at all — payloads are compared serialized, so `data` keeps
 * reference identity and downstream memos don't recompute. A failed background revalidation with
 * cached data showing is logged, never surfaced; the error branch is reserved for "nothing to
 * show", where the caller's existing failed-vs-empty distinction still applies.
 *
 * `key` is part of the cache identity: variants (`users:people` vs `users:base`) cache
 * independently, and a key switch re-seeds from the new key's cache before revalidating. A fetch
 * that resolves after its key was switched away is dropped.
 *
 * @param key - Cache identity for this payload, including any fetch-shaping variant
 * @param fetcher - Loads the payload; may close over props (kept fresh via ref, never re-triggers)
 * @param errorMessage - User-facing message for a foreground load failure
 */
export function useCachedPanelData<T>(
  key: string,
  fetcher: () => Promise<T>,
  errorMessage: string
): CachedPanelData<T> {
  const [data, setDataState] = useState<T | null>(
    () => (memoryCache.get(key) as T | undefined) ?? null
  );
  const [loading, setLoading] = useState(data === null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const keyRef = useRef(key);
  keyRef.current = key;

  const [seededKey, setSeededKey] = useState(key);
  if (key !== seededKey) {
    setSeededKey(key);
    const cached = (memoryCache.get(key) as T | undefined) ?? null;
    setDataState(cached);
    setLoading(cached === null);
    setLoadError(null);
  }

  const commit = useCallback((forKey: string, value: T, serialized: string) => {
    memoryCache.set(forKey, value);
    serializedCache.set(forKey, serialized);
    writeStorage(forKey, serialized);
  }, []);

  const revalidate = useCallback(
    async (forKey: string, foreground: boolean) => {
      if (foreground) {
        setLoading(true);
        setLoadError(null);
      }
      try {
        const fresh = await fetcherRef.current();
        if (keyRef.current !== forKey) return;
        const serialized = JSON.stringify(fresh);
        if (serialized !== serializedCache.get(forKey)) {
          commit(forKey, fresh, serialized);
          setDataState(fresh);
        }
        setLoadError(null);
      } catch (error) {
        if (keyRef.current !== forKey) return;
        logger.error('useCachedPanelData', `Failed to load "${forKey}"`, error);
        if (foreground) setLoadError(errorMessage);
      } finally {
        if (keyRef.current === forKey) setLoading(false);
      }
    },
    [commit, errorMessage]
  );

  useEffect(() => {
    let seeded = memoryCache.has(key);
    if (!seeded) {
      const stored = readStorage(key);
      if (stored !== null) {
        try {
          const value = JSON.parse(stored) as T;
          memoryCache.set(key, value);
          serializedCache.set(key, stored);
          setDataState(value);
          setLoading(false);
          seeded = true;
        } catch {
          removeStorage(key);
        }
      }
    }
    void revalidate(key, !seeded);
  }, [key, revalidate]);

  const refresh = useCallback(
    () => revalidate(keyRef.current, memoryCache.get(keyRef.current) === undefined),
    [revalidate]
  );

  const setData = useCallback<Dispatch<SetStateAction<T | null>>>(
    action => {
      setDataState(previous => {
        const next =
          typeof action === 'function' ? (action as (p: T | null) => T | null)(previous) : action;
        if (next === null) {
          clearCachedPanelData(key);
        } else {
          commit(key, next, JSON.stringify(next));
        }
        return next;
      });
    },
    [commit, key]
  );

  return { data, loading, loadError, refresh, setData };
}
