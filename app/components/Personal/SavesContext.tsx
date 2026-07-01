'use client';

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';

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

  const isSaved = useCallback((imageId: number) => savedIds.has(imageId), [savedIds]);

  const toggle = useCallback(
    (imageId: number) => {
      const wasSaved = savedIds.has(imageId);

      // Optimistic update.
      setSavedIds(prev => {
        const next = new Set(prev);
        if (wasSaved) {
          next.delete(imageId);
        } else {
          next.add(imageId);
        }
        return next;
      });

      const persist = wasSaved ? removeSave(imageId) : addSave(imageId);
      persist.catch((error: unknown) => {
        // Roll back to the pre-toggle membership for this id.
        setSavedIds(prev => {
          const next = new Set(prev);
          if (wasSaved) {
            next.add(imageId);
          } else {
            next.delete(imageId);
          }
          return next;
        });
        logger.error('SavesContext', 'toggle failed; rolled back', error, { imageId, wasSaved });
      });
    },
    [savedIds]
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
