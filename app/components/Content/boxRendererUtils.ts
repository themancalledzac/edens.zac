/**
 * Pure helpers for {@link BoxRenderer} — kept out of the component so the recursive JSX stays a thin
 * prop-plumbing pass and the reorder-flag derivation is unit-testable in isolation.
 */

import { type ReorderMove } from '@/app/(admin)/collection/manage/[[...slug]]/manageUtils';

/** The reorder-mode state available to a single rendered content item. */
export interface ReorderState {
  isReorderMode?: boolean;
  pickedUpImageId?: number | null;
  reorderMoves?: ReorderMove[];
  reorderDisplayOrder?: number[];
}

/** Per-item reorder flags consumed by the content renderer's reorder overlay. */
export interface ReorderFlags {
  isPickedUp: boolean;
  hasMoved: boolean;
  isFirstInOrder: boolean;
  isLastInOrder: boolean;
}

/**
 * Derive the reorder flags for one content item from the current reorder state. Outside reorder mode
 * an item is never picked up or moved. Position flags fall back to "last" when the id is absent from
 * `reorderDisplayOrder` or the order is empty (orderIndex -1 === length 0 - 1).
 */
export function computeReorderFlags(contentId: number, state: ReorderState): ReorderFlags {
  const { isReorderMode, pickedUpImageId, reorderMoves, reorderDisplayOrder } = state;
  const orderIndex = reorderDisplayOrder?.indexOf(contentId) ?? -1;
  return {
    isPickedUp: !!isReorderMode && pickedUpImageId === contentId,
    hasMoved: !!isReorderMode && (reorderMoves?.some(m => m.imageId === contentId) ?? false),
    isFirstInOrder: orderIndex === 0,
    isLastInOrder: orderIndex === (reorderDisplayOrder?.length ?? 0) - 1,
  };
}
