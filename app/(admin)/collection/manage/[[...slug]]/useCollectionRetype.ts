'use client';

import { type Dispatch, type SetStateAction, useCallback, useRef } from 'react';

import { updateCollection } from '@/app/lib/api/collections';
import { type CollectionListModel, type CollectionType } from '@/app/types/Collection';
import { handleApiError } from '@/app/utils/apiUtils';
import { humanizeConstantCase } from '@/app/utils/stringUtils';

interface UseCollectionRetypeParams {
  setAllCollections: Dispatch<SetStateAction<CollectionListModel[]>>;
  setError: Dispatch<SetStateAction<string | null>>;
}

/**
 * Drag-and-drop collection retype. Optimistically moves the dragged collection to
 * its new type in `allCollections` (which re-buckets it in the manage-page
 * accordion), then persists via PUT /api/admin/collections/{id}. On any
 * non-success the optimistic move is reverted and an error is surfaced.
 *
 * The PUT response describes the DRAGGED collection (not the manage-page
 * collection being edited), so it is intentionally ignored beyond success/failure
 * — it must never be written into `currentState`.
 *
 * A retype for a given collection is single-flight: while its PUT is in flight,
 * a second drag on the SAME collection is ignored, so a fast double-drag can't
 * revert to a stale `previousType` after the first request settles.
 */
export function useCollectionRetype({ setAllCollections, setError }: UseCollectionRetypeParams) {
  // Collection ids with a retype request currently in flight.
  const inFlightRef = useRef<Set<number>>(new Set());

  const handleChangeType = useCallback(
    async (collection: CollectionListModel, targetType: CollectionType) => {
      const previousType = collection.type;
      if (previousType === targetType) return; // no-op: already this type
      if (inFlightRef.current.has(collection.id)) return; // a retype for this collection is pending

      const setType = (type: CollectionType | string | undefined) =>
        setAllCollections(prev => prev.map(c => (c.id === collection.id ? { ...c, type } : c)));

      inFlightRef.current.add(collection.id);
      setType(targetType); // optimistic move
      setError(null);

      const failureMessage = `Failed to move "${collection.name}" to ${humanizeConstantCase(targetType)}`;
      try {
        const response = await updateCollection(collection.id, {
          id: collection.id,
          type: targetType,
        });
        if (response === null) {
          setType(previousType);
          setError(failureMessage);
        }
      } catch (error) {
        setType(previousType);
        setError(handleApiError(error, failureMessage));
      } finally {
        inFlightRef.current.delete(collection.id);
      }
    },
    [setAllCollections, setError]
  );

  return { handleChangeType };
}
