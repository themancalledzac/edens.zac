/**
 * Pure capability helpers over the resolved principal + the admin (editMode) signal.
 * Admin is the perimeter, surfaced to the client tree as `editMode` (localhost ?manage=1) — a
 * logged-in user is never admin. A CLIENT's per-collection powers come from `me.galleries`
 * (the role_collection grants surfaced by /api/auth/me).
 */
import { type GalleryMembership, type MeResponse } from '@/app/types/Auth';
import { type CollectionModel } from '@/app/types/Collection';

/** The membership for a specific collection, or undefined. */
export function findMembership(
  me: MeResponse | null,
  collectionId: number
): GalleryMembership | undefined {
  return me?.galleries.find(g => g.collectionId === collectionId);
}

/**
 * True when the viewer may act as a client of this collection: admin (editMode) anywhere, or a
 * non-admin holding a CLIENT membership for the collection.
 */
export function isClientOfCollection(
  me: MeResponse | null,
  collectionId: number,
  editMode: boolean
): boolean {
  if (editMode) return true;
  return findMembership(me, collectionId)?.role === 'CLIENT';
}

/**
 * True when the viewer may download from this collection. Downloading is a *capability*, not a
 * collection *kind*: the backend authorizes downloads by role (a role_collection CLIENT grant on
 * ANY collection, surfaced by /api/auth/me) OR by a validated per-gallery password cookie, so the
 * UI mirrors both paths:
 *   - a logged-in CLIENT membership → downloads on any collection (e.g. a portfolio shared with a
 *     specific client), matching the admin "Client (download/tag)" grant;
 *   - an anonymous password-cookie client → has no `me` at all (`/api/auth/me` 401s without a
 *     session principal; the cookie plays no part), so the cookie is read indirectly: content
 *     present on a protected client gallery is by construction proof of a validated cookie,
 *     because the backend nulls `content` when the cookie fails to validate.
 * Deliberately narrower than Selects, which stay gated on the collection's `isClient` flag AND the
 * role.
 */
export function canDownloadCollection(
  me: MeResponse | null,
  collection:
    | Partial<Pick<CollectionModel, 'id' | 'isClient' | 'isPasswordProtected' | 'content'>>
    | null
    | undefined
): boolean {
  if (!collection) return false;
  if (
    collection.isClient === true &&
    collection.isPasswordProtected === true &&
    Array.isArray(collection.content)
  ) {
    return true;
  }
  return collection.id != null && isClientOfCollection(me, collection.id, false);
}
