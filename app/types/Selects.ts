/**
 * Per-user Selects types. A "Select" is an image a viewer has added to their personal
 * shortlist within a collection; it is duplicated (pinned at the top of the owner's view
 * + listed on their `/user` page) rather than moved. Distinct from the ephemeral download
 * "select mode" cart (see `ClientGalleryDownloadContext`).
 */

/** One collection's worth of a viewer's selected image ids. Mirrors backend `UserSelectGroup`. */
export interface SelectGroup {
  collectionId: number;
  contentIds: number[];
}

/**
 * Local marker key stamped onto a SHALLOW CLONE of a selected image when it is prepended to a
 * collection's blocks as part of the "Your Selects" region. Intentionally NOT added to the shared
 * `Content`/`ContentImageModel` model — it lives only on the clone, so de-dupe/layout on the
 * originals stays `id`-based and the marker never leaks into persisted data.
 */
export const PINNED_SELECT = '__pinnedSelect' as const;

/** A model that may carry the local {@link PINNED_SELECT} marker (only pinned clones do). */
export type MaybePinned<T> = T & { [PINNED_SELECT]?: true };
