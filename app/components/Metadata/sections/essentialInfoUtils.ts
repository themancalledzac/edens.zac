/**
 * Pure helpers for {@link EssentialInfoSection} — the collection-visibility toggle on the image
 * metadata editor. Kept out of the component so the junction append-vs-update branching is
 * unit-testable in isolation and the JSX stays thin.
 */

import type { ChildCollection, CollectionListModel } from '@/app/types/Collection';

/**
 * Is the current collection's junction visible? Absent/undefined means "visible" — only an explicit
 * `false` hides it, matching the backend default. Returns `true` when there is no junction yet.
 */
export function isCurrentCollectionVisible(
  collections: ChildCollection[] | undefined,
  currentCollectionId: number | undefined
): boolean {
  return collections?.find(c => c.collectionId === currentCollectionId)?.visible !== false;
}

/**
 * Toggle the current collection's `visible` flag, returning the next junction array. Updates the
 * existing junction in place when the image is already in this collection's list, or appends a new
 * one (with the collection name looked up from `availableCollections` and a trailing `orderIndex`)
 * when it isn't.
 *
 * Returns the unchanged input array when `currentCollectionId` is null/undefined.
 */
export function toggleCollectionVisibility(
  collections: ChildCollection[] | undefined,
  currentCollectionId: number | undefined,
  checked: boolean,
  availableCollections: CollectionListModel[]
): ChildCollection[] {
  const currentCollections = collections || [];

  if (currentCollectionId == null) return currentCollections;

  const collectionIndex = currentCollections.findIndex(c => c.collectionId === currentCollectionId);

  if (collectionIndex >= 0) {
    return currentCollections.map((c, idx) =>
      idx === collectionIndex ? { ...c, visible: checked } : c
    );
  }

  const collectionName = availableCollections.find(c => c.id === currentCollectionId)?.name;
  return [
    ...currentCollections,
    {
      collectionId: currentCollectionId,
      name: collectionName,
      visible: checked,
      orderIndex: currentCollections.length,
    },
  ];
}
