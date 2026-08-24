'use client';

import { type ComponentProps } from 'react';

import CollectionPageClient from '@/app/components/ContentCollection/CollectionPageClient';
import { useFollows } from '@/app/components/Personal/FollowsContext';
import { type ToolbarSection } from '@/app/components/ui/FilterToolbar/FilterToolbar';
import { type TabKey } from '@/app/components/UserSpace/userSpaceData';

/** Typed against {@link TabKey} so renaming the section breaks the build instead of the badge. */
const FOLLOWING: TabKey = 'following';

/**
 * Re-derive the Following section's badge from the viewer's live follow state.
 *
 * Server count PLUS a delta, never a recount. The count `loadUserSpace` renders is
 * `followedCollectionIds.length` — the id list the backend returned — deliberately not the number
 * of tiles the Following tab draws: a followed collection that was deleted, or that falls outside
 * the 500-row catalog page, counts without being renderable. Recomputing from anything the client
 * can see would quietly change what the number means. So the only thing added here is the
 * difference the provider has introduced since the server read.
 *
 * The delta is a set difference against the ids THIS render was built from, not a running tally,
 * which is what makes it self-correcting: once a server render includes a toggle the viewer
 * already made, that id is in both sets and contributes nothing.
 *
 * `undefined` stays `undefined` — a section whose read failed has no count, and an unknown number
 * plus one is still unknown. See {@link ToolbarSection.count}.
 */
export function reconcileFollowingCount(
  sections: readonly ToolbarSection[] | undefined,
  serverFollowedIds: readonly number[],
  clientFollowedIds: ReadonlySet<number> | undefined
): readonly ToolbarSection[] | undefined {
  if (sections === undefined || clientFollowedIds === undefined) return sections;

  const serverFollowed = new Set(serverFollowedIds);
  let delta = 0;
  for (const id of clientFollowedIds) {
    if (!serverFollowed.has(id)) delta += 1;
  }
  for (const id of serverFollowed) {
    if (!clientFollowedIds.has(id)) delta -= 1;
  }
  if (delta === 0) return sections;

  return sections.map(section =>
    section.key === FOLLOWING && section.count !== undefined
      ? { ...section, count: section.count + delta }
      : section
  );
}

export interface UserSpaceGridProps extends ComponentProps<typeof CollectionPageClient> {
  /** The followed ids the server-rendered Following count was computed from. */
  serverFollowedIds: readonly number[];
}

/**
 * The client boundary between `/user`'s server-rendered section chips and the viewer's live
 * follow state.
 *
 * `UserSpace` is a Server Component, so it can build the Following chip's count but cannot watch
 * the count change: unfollowing is a client-only optimistic update in {@link FollowsProvider}, and
 * nothing on that path re-renders the server. This sits directly below the provider and adjusts
 * the one number that goes stale, then hands the sections on to the shared collection stack
 * unchanged in every other respect.
 *
 * It lives here rather than in `CollectionPageClient` or `FilterToolbar` because "the Following
 * section counts follows" is a fact about the user space, not about collection pages in general —
 * the shared stack renders sections for whoever passes them and should not know what any one
 * section is backed by.
 *
 * With no provider mounted — admin and share mode, where none of the follow state on screen is the
 * viewer's — `useFollows()` is null and the server count passes through untouched.
 */
export function UserSpaceGrid({ serverFollowedIds, sections, ...gridProps }: UserSpaceGridProps) {
  const follows = useFollows();

  return (
    <CollectionPageClient
      {...gridProps}
      sections={reconcileFollowingCount(sections, serverFollowedIds, follows?.followedIds)}
    />
  );
}

export default UserSpaceGrid;
