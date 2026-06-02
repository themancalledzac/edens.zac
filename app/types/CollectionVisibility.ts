/**
 * Collection-level visibility enum. Mirrors the backend `CollectionVisibility`.
 *
 * NOTE: the per-membership and per-content `visible: boolean` fields
 * (ChildCollection.visible, ContentImageModel.collections[].visible,
 * Content.visible) are SEPARATE — they map to different DB columns and keep
 * their boolean semantics.
 */
export enum CollectionVisibility {
  LISTED = 'LISTED',
  UNLISTED = 'UNLISTED',
  HIDDEN = 'HIDDEN',
}

export const COLLECTION_VISIBILITY_LABELS: Record<CollectionVisibility, string> = {
  [CollectionVisibility.LISTED]: 'Listed',
  [CollectionVisibility.UNLISTED]: 'Unlisted',
  [CollectionVisibility.HIDDEN]: 'Hidden (dev only)',
};

export const COLLECTION_VISIBILITY_DESCRIPTIONS: Record<CollectionVisibility, string> = {
  [CollectionVisibility.LISTED]:
    'Appears in list views, searchable, allowed as a visible child collection.',
  [CollectionVisibility.UNLISTED]:
    'Direct slug access only. Still requires a password if one is set.',
  [CollectionVisibility.HIDDEN]: 'Visible only in local dev. Returns 404 in production.',
};
