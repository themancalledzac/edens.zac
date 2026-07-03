'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

import { addSave, removeSave } from '@/app/lib/api/personal';
import { logger } from '@/app/utils/logger';

/**
 * Cross-collection "saves" (bookmarks) state for the CURRENT viewer. Owns the Set of saved image
 * ids, seeded server-side from the viewer's global saves, and exposes an optimistic `toggle` that
 * updates the Set immediately and rolls back if the persist call fails.
 *
 * Mirrors `SelectsContext` but is DISTINCT: saves are not scoped to a collection (no `collectionId`)
 * and are available to any logged-in user, not just gallery clients.
 */
export interface SavesContextValue {
  /** Image ids the viewer has saved. */
  savedIds: ReadonlySet<number>;
  /** True if the image is currently saved. */
  isSaved: (imageId: number) => boolean;
  /** Optimistically add/remove the save; persists and rolls back on failure. */
  toggle: (imageId: number) => void;
}

const SavesContext = createContext<SavesContextValue | null>(null);

export function SavesProvider({
  initialSavedIds,
  children,
}: {
  initialSavedIds: number[];
  children: ReactNode;
}) {
  const [savedIds, setSavedIds] = useState<Set<number>>(() => new Set(initialSavedIds));

  // Ref mirror of the saved Set, the synchronous source of truth for `toggle`'s add/remove
  // decision. React runs functional state updaters lazily at flush time, so reading membership from
  // a closed-over Set (or from inside setSavedIds) can't inform the persist/rollback direction that
  // must be chosen on the same synchronous tick. A ref always holds the latest value, so two rapid
  // clicks before a re-render each observe the other's result and stay consistent.
  const savedIdsRef = useRef(savedIds);

  // Write the new Set to the ref and state together so they never drift.
  const commit = useCallback((next: Set<number>) => {
    savedIdsRef.current = next;
    setSavedIds(next);
  }, []);

  const isSaved = useCallback((imageId: number) => savedIds.has(imageId), [savedIds]);

  const toggle = useCallback(
    (imageId: number) => {
      const wasSaved = savedIdsRef.current.has(imageId);

      // Optimistic update off the current (ref) membership.
      const optimistic = new Set(savedIdsRef.current);
      if (wasSaved) {
        optimistic.delete(imageId);
      } else {
        optimistic.add(imageId);
      }
      commit(optimistic);

      const persist = wasSaved ? removeSave(imageId) : addSave(imageId);
      persist.catch((error: unknown) => {
        // Roll back just this id off the latest membership (other in-flight toggles are preserved).
        const rolledBack = new Set(savedIdsRef.current);
        if (wasSaved) {
          rolledBack.add(imageId);
        } else {
          rolledBack.delete(imageId);
        }
        commit(rolledBack);
        logger.error('SavesContext', 'toggle failed; rolled back', error, { imageId, wasSaved });
      });
    },
    [commit]
  );

  const value = useMemo<SavesContextValue>(
    () => ({ savedIds, isSaved, toggle }),
    [savedIds, isSaved, toggle]
  );

  return <SavesContext value={value}>{children}</SavesContext>;
}

/** The viewer's saves state, or null when rendered outside a provider. */
export function useSaves(): SavesContextValue | null {
  return useContext(SavesContext);
}
