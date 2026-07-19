/**
 * Pure capability helpers over the resolved principal + the admin (editMode) signal.
 * Admin is the perimeter, surfaced to the client tree as `editMode` (localhost ?manage=1) — a
 * logged-in user is never admin. A CLIENT's per-collection powers come from `me.galleries`
 * (the role_collection grants surfaced by /api/auth/me).
 */
import { type GalleryMembership, type MeResponse } from '@/app/types/Auth';
import { type CollectionModel, CollectionType } from '@/app/types/Collection';

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
 * collection *type*: the backend authorizes downloads by role (a role_collection CLIENT grant on
 * ANY collection, surfaced by /api/auth/me), so the UI must too. The union below keeps both paths
 * working:
 *   - `CLIENT_GALLERY` type → the existing anonymous password-cookie client (who has no `me`);
 *   - a logged-in CLIENT membership → downloads on any collection type (e.g. a PORTFOLIO shared
 *     with a specific client), matching the admin "Client (download/tag)" grant.
 * Deliberately narrower than Selects, which stay gated on CLIENT_GALLERY type AND role.
 */
export function canDownloadCollection(
  me: MeResponse | null,
  collection: Pick<CollectionModel, 'id' | 'type'> | null | undefined
): boolean {
  if (!collection) return false;
  if (collection.type === CollectionType.CLIENT_GALLERY) return true;
  return collection.id != null && isClientOfCollection(me, collection.id, false);
}
