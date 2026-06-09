'use client';

import { useMemo } from 'react';

/**
 * Derive the `(savedIds, pendingAddIds, pendingRemoveIds)` triple that
 * `CollectionListSelector` consumes to paint each row's checkbox state.
 *
 * This is the single source for the feeder pattern that previously appeared, byte-for-byte, in
 * three places: the image-collection picker (`useMetadataState`) and the child + sibling + parent
 * pickers in the collection edit sheet. Centralizing it locks the contract the picker depends on.
 *
 * Inputs are the discrete `prev`/`newValue`/`remove` shape the collection editor already stores:
 * - `originalIds` — the saved (already-persisted) membership IDs.
 * - `pendingAdds` — items staged to be added (typically a `newValue` array). Any whose id is
 *   already saved is ignored, so callers can pass a raw membership array without pre-filtering.
 * - `pendingRemoves` — saved IDs staged for removal (a `remove` array).
 *
 * @returns Three `Set<number>`s: `savedIds`, `pendingAddIds`, `pendingRemoveIds`.
 */
export function useToggleTriple<T>(
  originalIds: number[],
  pendingAdds: T[] | undefined,
  pendingRemoves: number[] | undefined,
  getId: (item: T) => number
): { savedIds: Set<number>; pendingAddIds: Set<number>; pendingRemoveIds: Set<number> } {
  const savedIds = useMemo(() => new Set(originalIds), [originalIds]);

  // `getId` is a pure projection (callers pass an inline arrow like `c => c.collectionId`); its
  // result depends only on `pendingAdds`, so it is intentionally not a dependency here.
  const pendingAddIds = useMemo(() => {
    const ids = new Set<number>();
    for (const item of pendingAdds ?? []) {
      const id = getId(item);
      if (!savedIds.has(id)) ids.add(id);
    }
    return ids;
  }, [pendingAdds, savedIds]);

  const pendingRemoveIds = useMemo(() => new Set(pendingRemoves ?? []), [pendingRemoves]);

  return { savedIds, pendingAddIds, pendingRemoveIds };
}
