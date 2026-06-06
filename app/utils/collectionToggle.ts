/**
 * Shared, pure collection-toggle engine.
 *
 * Extracted from the admin/manage page so both the collection side (children +
 * siblings + parents in ManageClient) and the image side (collection membership in
 * the metadata editor) can drive the exact same `prev`/`newValue`/`remove` toggle
 * logic. Keep this file engine-only — no React, no component imports — so it stays
 * trivially unit-testable.
 */

import {
  type ChildCollection,
  type CollectionListModel,
  type CollectionUpdate,
} from '@/app/types/Collection';

/**
 * Toggle one collection within a `prev`/`newValue`/`remove` association — the shared
 * engine behind both the collection-side pickers (children / siblings / parents in
 * ManageClient) and the image-side collection picker (via a thin adapter).
 *
 * Pure and exhaustive over the four transitions:
 * - add a not-yet-saved collection  → appended to `newValue`
 * - un-add a pending addition        → removed from `newValue`
 * - remove a saved collection        → appended to `remove`
 * - un-remove a pending removal       → removed from `remove`
 *
 * `buildEntry` lets each caller shape its `newValue` rows: child rows carry
 * `visible`/`orderIndex`; sibling/parent rows carry only `{ collectionId, name }`.
 * Returns `undefined` when no pending changes remain, so the key drops out of the
 * payload.
 */
export function toggleRelation(
  current: CollectionUpdate | undefined,
  toggled: CollectionListModel,
  originalIds: Set<number>,
  buildEntry: (collection: CollectionListModel, index: number) => ChildCollection
): CollectionUpdate | undefined {
  const currentRemove = new Set(current?.remove ?? []);
  const currentNewValue = current?.newValue ?? [];
  const isSaved = originalIds.has(toggled.id);

  let newRemove: number[];
  if (!isSaved) {
    newRemove = [...currentRemove];
  } else if (currentRemove.has(toggled.id)) {
    newRemove = [...currentRemove].filter(id => id !== toggled.id);
  } else {
    newRemove = [...currentRemove, toggled.id];
  }

  let newNewValue: ChildCollection[];
  if (isSaved) {
    newNewValue = [...currentNewValue];
  } else if (currentNewValue.some(c => c.collectionId === toggled.id)) {
    newNewValue = currentNewValue.filter(c => c.collectionId !== toggled.id);
  } else {
    newNewValue = [...currentNewValue, buildEntry(toggled, currentNewValue.length)];
  }

  const hasChanges = newRemove.length > 0 || newNewValue.length > 0;
  if (!hasChanges) {
    return undefined;
  }
  return {
    ...current,
    remove: newRemove.length > 0 ? newRemove : undefined,
    newValue: newNewValue.length > 0 ? newNewValue : undefined,
  };
}
