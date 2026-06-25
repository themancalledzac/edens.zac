/**
 * Pure capability helpers over the resolved principal. The single source of
 * "what can this viewer do here" for the Selects and Rating features. Admin is
 * all-access; a CLIENT's per-collection capabilities come from `me.galleries`
 * (the `gallery_access` rows surfaced by `/api/auth/me`).
 */
import { type GalleryAccessSummary, type MeResponse } from '@/app/types/Auth';

/** True when the principal exists and has the ADMIN role. */
export function isAdmin(me: MeResponse | null): boolean {
  return me?.role === 'ADMIN';
}

/** The gallery_access grant for a specific collection, or undefined. */
export function findGrant(
  me: MeResponse | null,
  collectionId: number
): GalleryAccessSummary | undefined {
  return me?.galleries.find(g => g.collectionId === collectionId);
}

/**
 * True when the viewer may act as a client of this collection: admin anywhere,
 * or a non-admin with any gallery_access grant for the collection.
 */
export function isClientOfCollection(me: MeResponse | null, collectionId: number): boolean {
  if (isAdmin(me)) return true;
  return findGrant(me, collectionId) !== undefined;
}
