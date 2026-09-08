'use client';

import { type ComponentProps, useMemo } from 'react';

import CollectionPageClient from '@/app/components/ContentCollection/CollectionPageClient';
import { useFollows } from '@/app/components/Personal/FollowsContext';
import { type ToolbarSection } from '@/app/components/ui/FilterToolbar/FilterToolbar';
import { type TabKey } from '@/app/components/UserSpace/userSpaceData';
import { type AnyContentModel } from '@/app/types/Content';
import { isContentCollection } from '@/app/utils/contentTypeGuards';

/** Typed against {@link TabKey} so renaming the section breaks the build instead of the badge. */
const COLLECTIONS: TabKey = 'collections';

/**
 * Re-derive the Collections badge from the viewer's live follow state.
 *
 * The section counts every collection the viewer is associated with, by either route, so following
 * or unfollowing moves it — but only when the collection is not ALSO admin-granted, in which case
 * the association survives the unfollow and the number does not change. Recomputing the union from
 * the two id sets gets that right without special-casing anything.
 *
 * Ids, never tiles. A followed collection that was deleted, or that falls outside the 500-row
 * catalog page, is one this viewer is associated with and is counted here without being renderable
 * — the same thing the server count says. Counting rendered tiles instead would quietly change what
 * the number means.
 *
 * `undefined` stays `undefined`: a section whose read failed has no count, and an unknown number
 * reconciled against anything is still unknown. See {@link ToolbarSection.count}.
 */
export function reconcileCollectionsCount(
  sections: readonly ToolbarSection[] | undefined,
  grantedCollectionIds: readonly number[],
  clientFollowedIds: ReadonlySet<number> | undefined
): readonly ToolbarSection[] | undefined {
  if (sections === undefined || clientFollowedIds === undefined) return sections;

  const union = new Set<number>(grantedCollectionIds);
  for (const id of clientFollowedIds) union.add(id);

  return sections.map(section =>
    section.key === COLLECTIONS && section.count !== undefined
      ? { ...section, count: union.size }
      : section
  );
}

/**
 * Drop tiles the viewer has just unfollowed, leaving the ones an admin granted.
 *
 * The merged list is assembled server-side, so without this an unfollow leaves its tile on screen
 * until the next server render — on a `force-dynamic` page that is the next navigation. A tile
 * survives if it is admin-granted, because that association is not the viewer's to remove.
 *
 * Only ever SUBTRACTS. A collection the viewer follows from elsewhere on the page has no block in
 * this render to add, so it appears when the server next assembles the list.
 */
export function pruneUnfollowed(
  content: AnyContentModel[],
  grantedCollectionIds: readonly number[],
  clientFollowedIds: ReadonlySet<number> | undefined
): AnyContentModel[] {
  if (clientFollowedIds === undefined) return content;

  const granted = new Set(grantedCollectionIds);
  return content.filter(item => {
    if (!isContentCollection(item)) return true;
    const id = item.referencedCollectionId;
    return granted.has(id) || clientFollowedIds.has(id);
  });
}

export interface UserSpaceGridProps extends ComponentProps<typeof CollectionPageClient> {
  /** Collection ids an admin associated with this user — the half an unfollow cannot remove. */
  grantedCollectionIds: readonly number[];
}

/**
 * The client boundary between `/user`'s server-rendered Collections list and the viewer's live
 * follow state.
 *
 * `UserSpace` is a Server Component, so it can assemble the union of granted and followed
 * collections but cannot watch it change: following is a client-only optimistic update in
 * {@link FollowsProvider}, and nothing on that path re-renders the server. This sits directly below
 * the provider and reconciles the two things that go stale — the section badge and the tiles
 * themselves — then hands everything on to the shared collection stack unchanged.
 *
 * It also supplies the follow set that arms the toolbar's Following filter. That set is passed as a
 * plain prop rather than read through the provider deeper down, because the shared collection stack
 * renders whatever it is given and should not know what a follow is.
 *
 * With no provider mounted — admin and share mode, where none of the follow state on screen is the
 * viewer's — `useFollows()` is null, the server render passes through untouched, and the Following
 * filter is not offered at all.
 */
export function UserSpaceGrid({
  grantedCollectionIds,
  sections,
  collection,
  ...gridProps
}: UserSpaceGridProps) {
  const follows = useFollows();
  const followedIds = follows?.followedIds;

  const prunedCollection = useMemo(
    () => ({
      ...collection,
      content: pruneUnfollowed(collection.content ?? [], grantedCollectionIds, followedIds),
    }),
    [collection, grantedCollectionIds, followedIds]
  );

  return (
    <CollectionPageClient
      {...gridProps}
      collection={prunedCollection}
      sections={reconcileCollectionsCount(sections, grantedCollectionIds, followedIds)}
      followedCollectionIds={followedIds}
    />
  );
}

export default UserSpaceGrid;
