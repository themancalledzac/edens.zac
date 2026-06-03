/**
 * Shared image-selection helpers.
 *
 * Multi-select toggling used by both the admin/manage bulk-edit flow and the public
 * client-gallery "Select" download flow. Kept as a pure function so it can be unit-tested in
 * isolation and reused across both feature areas.
 */

/**
 * Toggle one image id in/out of a selection array.
 * Returns a NEW array (never mutates the input) so it is safe to drive React state.
 *
 * @param imageId - id of the image being toggled
 * @param currentSelectedIds - current selection
 * @returns new selection with `imageId` added (if absent) or removed (if present)
 */
export function toggleImageSelection(imageId: number, currentSelectedIds: number[]): number[] {
  if (currentSelectedIds.includes(imageId)) {
    return currentSelectedIds.filter(id => id !== imageId);
  }
  return [...currentSelectedIds, imageId];
}
