/**
 * Capability gate for the per-user Selects feature. A thin, intention-revealing
 * wrapper over {@link isClientOfCollection}: any gallery_access grant (or admin)
 * may add/remove images from their personal Selects in a collection. Kept as a
 * named predicate so call sites read as `canSelect(me, id)` rather than leaking
 * the underlying access-helper semantics.
 */
import { type MeResponse } from '@/app/types/Auth';
import { isClientOfCollection } from '@/app/utils/galleryAccess';

/** True when the viewer may select images in this collection (admin or grant holder). */
export function canSelect(me: MeResponse | null, collectionId: number): boolean {
  return isClientOfCollection(me, collectionId);
}
