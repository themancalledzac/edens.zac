/**
 * Rating control capability helpers + the rating-resolution transform.
 *
 * The layout engine reads each image's size from `item.rating` (via `getEffectiveRating` in
 * contentRatingUtils). So to change the EFFECTIVE rating without touching the layout engine we
 * substitute `item.rating` on a shallow clone of the content array right before
 * `processContentBlocks`. Admin edits write the canonical rating (everyone sees it); a CLIENT
 * member writes a per-user override (their view only). Precedence: live drag value > per-user
 * override > canonical.
 */
import { type MeResponse } from '@/app/types/Auth';
import { type AnyContentModel } from '@/app/types/Content';
import { isContentImage } from '@/app/utils/contentTypeGuards';
import { isClientOfCollection } from '@/app/utils/galleryAccess';

/**
 * True when the viewer may write a per-user override for this collection: a non-admin holding a
 * CLIENT membership. (Admins edit the canonical rating directly via `editMode` — no wrapper.)
 */
export function canOverride(
  me: MeResponse | null,
  collectionId: number,
  editMode: boolean
): boolean {
  if (editMode) return false;
  return isClientOfCollection(me, collectionId, false);
}

/** True when the viewer may interact with the slider at all: canonical (editMode) OR a CLIENT override. */
export function canEditRating(
  me: MeResponse | null,
  collectionId: number,
  editMode: boolean
): boolean {
  return editMode || canOverride(me, collectionId, editMode);
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
