/**
 * Rating control capability helpers + the rating-resolution transform.
 *
 * The layout engine reads each image's size from `item.rating` (via `getEffectiveRating` in
 * contentRatingUtils). So to change the EFFECTIVE rating without touching the layout engine we
 * substitute `item.rating` on a shallow clone of the content array right before
 * `processContentBlocks`. Admin edits write the canonical rating (everyone sees it); a `canTag`
 * client writes a per-user override (their view only). Precedence: live drag value > per-user
 * override > canonical.
 */
import { type GalleryAccessSummary, type MeResponse } from '@/app/types/Auth';
import { type AnyContentModel } from '@/app/types/Content';
import { isContentImage } from '@/app/utils/contentTypeGuards';
import { isAdmin } from '@/app/utils/galleryAccess';

/** True when the viewer edits the canonical rating (admins only). */
export function canEditCanonical(me: MeResponse | null): boolean {
  return isAdmin(me);
}

/**
 * True when the viewer may write a per-user override for this collection: a non-admin holding a
 * `gallery_access` grant whose `canTag` is true.
 */
export function canOverride(me: MeResponse | null, collectionId: number): boolean {
  if (isAdmin(me)) return false;
  const grant: GalleryAccessSummary | undefined = me?.galleries.find(
    g => g.collectionId === collectionId
  );
  return grant?.canTag === true;
}

/** True when the viewer may interact with the slider at all (canonical OR override). */
export function canEditRating(me: MeResponse | null, collectionId: number): boolean {
  return canEditCanonical(me) || canOverride(me, collectionId);
}

/** The in-progress drag, or null when no drag is active. */
export interface RatingDrag {
  contentId: number;
  value: number;
}

/**
 * Return a NEW array where each IMAGE's `rating` is resolved to `drag ?? override ?? canonical`.
 * Items are shallow-cloned so the input (and the underlying `collection.content`) is never mutated;
 * non-image content passes through by reference unchanged.
 */
export function resolveRatings(
  content: AnyContentModel[],
  overrides: Map<number, number>,
  drag: RatingDrag | null
): AnyContentModel[] {
  return content.map(item => {
    if (!isContentImage(item)) return item;
    const id = item.id;
    const resolved = drag?.contentId === id ? drag.value : (overrides.get(id) ?? item.rating ?? 0);
    if (resolved === (item.rating ?? 0)) return item;
    return { ...item, rating: resolved };
  });
}
