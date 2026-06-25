'use client';

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';

import { addSelect, removeSelect } from '@/app/lib/api/selects';
import { logger } from '@/app/utils/logger';

/**
 * Per-collection Selects state for the CURRENT viewer. Owns the Set of selected image ids,
 * seeded server-side from the viewer's persisted selects, and exposes an optimistic `toggle`
 * that updates the Set immediately and rolls back if the persist call fails.
 *
 * Deliberately distinct from `ClientGalleryDownloadContext` (the ephemeral download cart): this
 * persists a user's favorites and is named `Selects`/`useSelects` to avoid any collision.
 */
export interface SelectsContextValue {
  /** The collection these selects belong to. */
  collectionId: number;
  /** Image ids the viewer has selected in this collection. */
  selectedIds: ReadonlySet<number>;
  /** True if the image is currently in the viewer's selects. */
  isSelected: (contentId: number) => boolean;
  /** Optimistically add/remove the image; persists and rolls back on failure. */
  toggle: (contentId: number) => void;
}

const SelectsContext = createContext<SelectsContextValue | null>(null);

export function SelectsProvider({
  collectionId,
  initialSelectedIds,
  onChange,
  children,
}: {
  collectionId: number;
  initialSelectedIds: number[];
  /**
   * Optional notifier fired with the next id list after every optimistic update (toggle + rollback).
   * Lets an owner (CollectionPageClient) mirror the Set to drive the pinned "Your Selects" prepend
   * without re-querying. Kept optional so consumers/tests that don't pin selections stay simple.
   */
  onChange?: (ids: number[]) => void;
  children: ReactNode;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set(initialSelectedIds));

  const isSelected = useCallback((contentId: number) => selectedIds.has(contentId), [selectedIds]);

  const toggle = useCallback(
    (contentId: number) => {
      const wasSelected = selectedIds.has(contentId);

      // Optimistic update.
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (wasSelected) {
          next.delete(contentId);
        } else {
          next.add(contentId);
        }
        onChange?.([...next]);
        return next;
      });

      const persist = wasSelected ? removeSelect(contentId) : addSelect(collectionId, contentId);
      persist.catch((error: unknown) => {
        // Roll back to the pre-toggle membership for this id.
        setSelectedIds(prev => {
          const next = new Set(prev);
          if (wasSelected) {
            next.add(contentId);
          } else {
            next.delete(contentId);
          }
          onChange?.([...next]);
          return next;
        });
        logger.error('SelectsContext', 'toggle failed; rolled back', error, {
          collectionId,
          contentId,
          wasSelected,
        });
      });
    },
    [collectionId, selectedIds, onChange]
  );

  const value = useMemo<SelectsContextValue>(
    () => ({ collectionId, selectedIds, isSelected, toggle }),
    [collectionId, selectedIds, isSelected, toggle]
  );

  return <SelectsContext value={value}>{children}</SelectsContext>;
}

/** The current collection's Selects state, or null when rendered outside a provider. */
export function useSelects(): SelectsContextValue | null {
  return useContext(SelectsContext);
}
