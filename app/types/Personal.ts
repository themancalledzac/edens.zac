/**
 * Per-user "Your Space" types — saved images (bookmarks) and followed collections.
 *
 * A "save" is any image a logged-in user has bookmarked; unlike a Select it is cross-collection
 * and available to ANY logged-in viewer (not just gallery clients). A "follow" is a collection a
 * user tracks. Both backend endpoints return bare id arrays, so the types stay thin. Distinct from
 * the per-gallery Selects stack (see `app/types/Selects.ts`).
 */

/** Ids of images the current user has saved, newest-first. Mirrors backend `GET /user/saves`. */
export type SavedImageIds = number[];

/** Ids of collections the current user follows. Mirrors backend `GET /user/follows`. */
export type FollowedCollectionIds = number[];
