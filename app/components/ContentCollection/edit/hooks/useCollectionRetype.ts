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
 * Drag-and-drop collection retype. Optimistically re-buckets the dragged collection
 * in `allCollections`, then persists via PUT and reconciles the bucket against the
 * type the backend actually stored. Reverts on failure. Single-flight per
 * collection — a second drag while the PUT is in-flight is ignored. The PUT response
 * describes the dragged collection, not the current page's collection, and is never
 * written into `currentState`.
 *
 * Reconciliation is load-bearing: the wire body carries only the `isClient`/`isBlog`
 * booleans derived from `type` (see `withoutLegacyType`), which cannot express
 * PORTFOLIO/ART_GALLERY/PARENT. Dropping onto one of those buckets leaves the
 * collection where it was, and the UI must say so rather than show a move that
 * vanishes on reload.
 */
export function useCollectionRetype({ setAllCollections, setError }: UseCollectionRetypeParams) {
  const inFlightRef = useRef<Set<number>>(new Set());

  const handleChangeType = useCallback(
    async (collection: CollectionListModel, targetType: CollectionType) => {
      const previousType = collection.type;
      if (previousType === targetType) return;
      if (inFlightRef.current.has(collection.id)) return;

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
          return;
        }
        const persistedType = response.collection.type;
        if (persistedType !== targetType) {
          setType(persistedType);
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
