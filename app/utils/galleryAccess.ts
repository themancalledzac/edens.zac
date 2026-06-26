/**
 * Pure capability helpers over the resolved principal + the admin (editMode) signal.
 * Admin is the perimeter, surfaced to the client tree as `editMode` (localhost ?manage=1) — a
 * logged-in user is never admin. A CLIENT's per-collection powers come from `me.galleries`
 * (the user_collection memberships surfaced by /api/auth/me).
 */
import { type GalleryMembership, type MeResponse } from '@/app/types/Auth';

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
