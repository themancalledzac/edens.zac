import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { type AdminMessageView } from '@/app/lib/api/messages';
import { type RoleSummary } from '@/app/types/Role';
import { type AdminUserSummary } from '@/app/types/User';
import { logger } from '@/app/utils/logger';

/**
 * Storage key prefix, versioned so a payload-shape change can orphan old entries by bumping it
 * rather than migrating them.
 */
const STORAGE_PREFIX = 'adminPanel:v1:';

/** What the messages panel caches: the sorted page plus the unpaged total behind it. */
export interface AdminMessagesPayload {
  messages: AdminMessageView[];
  total: number;
}

/**
 * Every cache key the admin hub uses, mapped to the payload stored under it.
 *
 * The keys are a closed set on purpose. A cache keyed by free-form strings has to hand its value
 * back as `unknown` and let each caller assert what it is, which makes two panels that pick the
 * same key a silent type collision — one panel's payload handed to the other, no error anywhere.
 * Naming the keys here makes the value type follow from the key, so the collision becomes a
 * compile error and every read comes back already typed. Two assertions survive, both contained
 * and both on the write side, where the caller has already proved the type: {@link writeMemory}
 * and {@link parseStored}.
 *
 * `users:base` and `users:people` are the same payload under two keys because the users panel's
 * "show tag-only people" toggle reshapes the fetch: the two variants cache independently so
 * flipping the toggle back paints from cache instead of refetching.
 */
export interface PanelCacheSchema {
  'users:base': AdminUserSummary[];
  'users:people': AdminUserSummary[];
  messages: AdminMessagesPayload;
  roles: RoleSummary[];
}

/** A key of {@link PanelCacheSchema} — the only thing this cache accepts as an identity. */
export type PanelCacheKey = keyof PanelCacheSchema;

/**
 * A cached payload and its serialized form, stored together so they cannot drift. The string is
 * kept so a background revalidation can answer "did anything change?" with a compare instead of a
 * deep walk, and it is the exact text written to localStorage.
 */
interface CacheEntry<K extends PanelCacheKey> {
  value: PanelCacheSchema[K];
  serialized: string;
}

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
const memoryCache: { [K in PanelCacheKey]?: CacheEntry<K> } = {};

/**
 * Store an entry under its key.
 *
 * Reading this cache is fully typed — `memoryCache[key]` resolves to `CacheEntry<K>` — and reading
 * is the direction that matters, since that is where a mistyped payload would flow on into a panel
 * unnoticed. Writing through a generic key is the one step TypeScript cannot check: it widens the
 * target to the intersection of every key's entry type, which no single entry can satisfy. So the
 * assertion lives here alone, behind a signature that has already proved `entry` belongs to `key`.
 */
function writeMemory<K extends PanelCacheKey>(key: K, entry: CacheEntry<K>): void {
  (memoryCache as Record<PanelCacheKey, CacheEntry<K>>)[key] = entry;
}

/**
 * Per-key write counter. Every fetch reads it when it starts and again when it lands, and a fetch
 * whose number moved on while it was in the air is dropped rather than committed.
 *
 * This is what keeps an optimistic delete deleted. The panels mutate locally and write through
 * (`setData`), and a background revalidation is running for most of that window — the hub starts
 * one on every collapse toggle. Without this the fetch lands holding the pre-delete list, sees a
 * payload that differs from the cache, and "helpfully" restores the row the admin just removed,
 * in state and in localStorage. An `AbortController` cannot cover it: there is no request to
 * abort, the newer truth is local.
 */
const generations = new Map<PanelCacheKey, number>();

function bumpGeneration(key: PanelCacheKey): number {
  const next = (generations.get(key) ?? 0) + 1;
  generations.set(key, next);
  return next;
}

function isCurrentGeneration(key: PanelCacheKey, generation: number): boolean {
  return generations.get(key) === generation;
}

function readStorage(key: PanelCacheKey): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + key);
  } catch {
    return null;
  }
}

function writeStorage(key: PanelCacheKey, serialized: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, serialized);
  } catch {
    /* quota/private-mode failures degrade to memory-only caching */
  }
}

function removeStorage(key: PanelCacheKey): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_PREFIX + key);
  } catch {
    /* nothing to degrade to */
  }
}

/**
 * Turn a stored string back into its payload. `JSON.parse` returns text-shaped data with no type
 * to speak of, so this is the one place the cache has to assert a shape rather than derive it —
 * the boundary where untyped storage becomes a typed payload. Malformed text throws, and the
 * caller discards the entry.
 */
function parseStored<K extends PanelCacheKey>(stored: string): PanelCacheSchema[K] {
  return JSON.parse(stored) as PanelCacheSchema[K];
}

/**
 * Remove every `adminPanel:v1:` entry, whatever wrote it. Enumerating storage rather than the
 * memory cache is the point: on a fresh page load the memory cache is empty, so a clear driven by
 * it would leave last session's admin emails and message bodies sitting in localStorage. Collect
 * first, delete second — removing during the index walk shifts the entries still to come.
 */
function clearAllStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    const doomed: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const storageKey = window.localStorage.key(i);
      if (storageKey !== null && storageKey.startsWith(STORAGE_PREFIX)) doomed.push(storageKey);
    }
    for (const storageKey of doomed) window.localStorage.removeItem(storageKey);
  } catch {
    /* nothing to degrade to */
  }
}

/**
 * Drop cached panel data — every key, or one.
 *
 * Called on logout (see `MenuDropdown`): these caches hold the admin user list with everyone's
 * email address and the full text of every contact message, and none of that may outlive the
 * session that fetched it, least of all on a shared browser. Also used by tests to isolate the
 * module-level cache between cases.
 *
 * Clearing bumps the generation of every key that has ever fetched, so a request still in the air
 * cannot land afterwards and re-populate what was just cleared.
 */
export function clearCachedPanelData(key?: PanelCacheKey): void {
  if (key === undefined) {
    for (const cached of Object.keys(memoryCache) as PanelCacheKey[]) delete memoryCache[cached];
    for (const known of generations.keys()) bumpGeneration(known);
    clearAllStorage();
    return;
  }
  delete memoryCache[key];
  bumpGeneration(key);
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
   * True when the last load failed. Read it alongside `loadError`, which covers the case where
   * there is nothing to show: when cached data IS showing, this is the only signal that what is on
   * screen could not be confirmed. Without it a dead backend leaves the panel presenting last
   * session's list as current indefinitely, across reloads, in silence.
   */
  revalidationFailed: boolean;
  /**
   * Re-fetch. Silent by default when cached data is showing (stale-while-revalidate) and a
   * foreground load with error reporting when there is nothing to show — which makes the bare call
   * directly usable as the error branch's Retry handler.
   *
   * Pass `{ foreground: true }` after a mutation. A create or a merge that succeeded against the
   * backend but whose list refresh then failed must not look like it worked: forcing foreground
   * routes that failure to `loadError`, which is the branch that carries a Retry.
   */
  refresh: (options?: { foreground?: boolean }) => Promise<void>;
  /**
   * Write-through setter for optimistic mutations, shaped as a state dispatcher so existing
   * hooks like `useMessageDelete` keep their setter contract. Writing through matters: a delete
   * that only touched component state would resurrect from stale cache on the next remount.
   *
   * A write is the newest truth for its key, so it supersedes any fetch in flight (see
   * {@link generations}) and clears `loading` — the superseded fetch no longer owns that flag, and
   * nothing else would come along to lower it.
   */
  setData: Dispatch<SetStateAction<T | null>>;
}

/**
 * Cached client data for an admin hub panel: render instantly from cache, revalidate in the
 * background, update only when the payload actually changed.
 *
 * Two layers back it. A module-level store survives remounts within the session — the admin hub
 * re-packs (and therefore remounts panels) whenever one collapses, and this layer is what keeps a
 * panel's list painted straight through that. localStorage under `adminPanel:v1:` survives full
 * page loads, so a returning admin sees lists immediately while a background fetch reconciles.
 *
 * An unchanged fetch sets no state at all — payloads are compared serialized, so `data` keeps
 * reference identity and downstream memos don't recompute. A failed background revalidation with
 * cached data showing keeps the data up and reports `revalidationFailed` rather than `loadError`;
 * the error branch is reserved for "nothing to show", where the caller's existing failed-vs-empty
 * distinction still applies.
 *
 * `key` is part of the cache identity: variants (`users:people` vs `users:base`) cache
 * independently, and a key switch re-seeds from the new key's cache before revalidating. A fetch
 * is dropped when it resolves after its key was switched away, and equally when a local write or
 * another fetch has moved that key on since it started.
 *
 * @param key - Cache identity for this payload, including any fetch-shaping variant
 * @param fetcher - Loads the payload; may close over props (kept fresh via ref, never re-triggers)
 * @param errorMessage - User-facing message for a foreground load failure
 */
export function useCachedPanelData<K extends PanelCacheKey>(
  key: K,
  fetcher: () => Promise<PanelCacheSchema[K]>,
  errorMessage: string
): CachedPanelData<PanelCacheSchema[K]> {
  const [data, setDataState] = useState<PanelCacheSchema[K] | null>(
    () => memoryCache[key]?.value ?? null
  );
  const [loading, setLoading] = useState(data === null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [revalidationFailed, setRevalidationFailed] = useState(false);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const keyRef = useRef(key);
  keyRef.current = key;

  /**
   * The generation of the newest fetch THIS hook instance started. `loading` is instance state, so
   * it has to be owned by instance bookkeeping: the module-wide generation also moves when a local
   * write supersedes a fetch, and a fetch that lost the right to commit its payload can still be
   * the last one this instance is waiting on — leaving the flag raised forever if the shared
   * counter were the arbiter of lowering it.
   */
  const latestFetchRef = useRef(0);

  const [seededKey, setSeededKey] = useState<PanelCacheKey>(key);
  if (key !== seededKey) {
    setSeededKey(key);
    const cached = memoryCache[key]?.value ?? null;
    setDataState(cached);
    setLoading(cached === null);
    setLoadError(null);
    setRevalidationFailed(false);
  }

  const commit = useCallback((forKey: K, value: PanelCacheSchema[K], serialized: string) => {
    writeMemory(forKey, { value, serialized });
    writeStorage(forKey, serialized);
  }, []);

  const revalidate = useCallback(
    async (forKey: K, foreground: boolean) => {
      const generation = bumpGeneration(forKey);
      latestFetchRef.current = generation;
      if (foreground) {
        setLoading(true);
        setLoadError(null);
      }
      try {
        const fresh = await fetcherRef.current();
        if (keyRef.current !== forKey || !isCurrentGeneration(forKey, generation)) return;
        const serialized = JSON.stringify(fresh);
        if (serialized !== memoryCache[forKey]?.serialized) {
          commit(forKey, fresh, serialized);
          setDataState(fresh);
        }
        setLoadError(null);
        setRevalidationFailed(false);
      } catch (error) {
        if (keyRef.current !== forKey || !isCurrentGeneration(forKey, generation)) return;
        logger.error('useCachedPanelData', `Failed to load "${forKey}"`, error);
        setRevalidationFailed(true);
        if (foreground) setLoadError(errorMessage);
      } finally {
        if (keyRef.current === forKey && latestFetchRef.current === generation) setLoading(false);
      }
    },
    [commit, errorMessage]
  );

  useEffect(() => {
    let seeded = memoryCache[key] !== undefined;
    if (!seeded) {
      const stored = readStorage(key);
      if (stored !== null) {
        try {
          const value = parseStored<K>(stored);
          writeMemory(key, { value, serialized: stored });
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
    (options?: { foreground?: boolean }) =>
      revalidate(keyRef.current, options?.foreground ?? memoryCache[keyRef.current] === undefined),
    [revalidate]
  );

  const setData = useCallback<Dispatch<SetStateAction<PanelCacheSchema[K] | null>>>(
    action => {
      setDataState(previous => {
        const next =
          typeof action === 'function'
            ? (action as (p: PanelCacheSchema[K] | null) => PanelCacheSchema[K] | null)(previous)
            : action;
        if (next === null) {
          clearCachedPanelData(key);
        } else {
          commit(key, next, JSON.stringify(next));
          bumpGeneration(key);
        }
        return next;
      });
      setLoading(false);
    },
    [commit, key]
  );

  return { data, loading, loadError, revalidationFailed, refresh, setData };
}
