import { type ReactNode } from 'react';

import { AdminHubClient } from '@/app/(admin)/admin/AdminHubClient';
import { type AdminHub } from '@/app/(admin)/admin/loadAdminHub';
import { FollowsProvider } from '@/app/components/Personal/FollowsContext';
import { type ToolbarExtra } from '@/app/components/ui/FilterToolbar/chipWeights';
import { type UserSpaceData } from '@/app/components/UserSpace/userSpaceData';
import { UserSpaceGrid } from '@/app/components/UserSpace/UserSpaceGrid';
import { type MeResponse } from '@/app/types/Auth';
import { type SsrViewport } from '@/app/utils/ssrViewport';

export interface UserSpaceProps {
  data: UserSpaceData;
  /** Path the section chips link to; `?tab=` is appended. `/user`, `/admin`, `/admin/users/{id}` or `/s/{token}`. */
  basePath: string;
  /**
   * The principal to render the collection stack for, or `null` to render it as an observer.
   *
   * `/user` passes the signed-in principal. `/admin/users/[id]` and `/s/[token]` pass `null` — this
   * is the single switch that disarms every personal-action control.
   */
  me: MeResponse | null;
  ssrViewport: SsrViewport | null;
  /**
   * Page-level content for the header rail, beside the cover image. This is where the things that
   * are *about* the space go — the admin view's role membership — rather than in a slab below the
   * grid.
   */
  railExtras?: ReactNode;
  /** Page-level chips for the bar's upper tier. `/user` and `/admin` pass Share, Contact, Face / Touch ID. */
  toolbarExtras?: readonly ToolbarExtra[];
  /** The admin hub to render as the `admin` section. Only `/admin` passes it. */
  adminHub?: AdminHub;
}

/**
 * The three-section "user space" view, shared by `/user`, `/admin` (own space), `/admin/users/[id]`
 * (an admin looking at someone else's) and `/s/[token]` (a share-link recipient).
 *
 * Every section and which one is on screen render through {@link UserSpaceGrid} — a client
 * component that reads the active section straight off the URL, so a chip click swaps sections in
 * place with no server round trip. This component builds the Admin hub node (kept server-side so
 * `(admin)`-route JS never reaches `/user` or `/s/[token]`'s bundle) and otherwise just decides
 * whether a `FollowsProvider` is mounted, forwarding the rest of `data` untouched.
 *
 * ## Why admin and share mode pass `me={null}`
 *
 * The personal-action controls in the collection stack gate on the presence of a principal, NOT on
 * whether that principal owns what is being rendered:
 *
 * - `SaveHeart` returns null unless `useMe()` is truthy, and `CollectionPageClient` mounts
 *   `SavesProvider` on the same condition. Its writes go to `POST /api/read/user/saves`, which the
 *   backend binds to the SESSION — so an admin clicking a heart on someone else's page would
 *   silently bookmark that image onto their OWN space.
 * - `FollowButton` has the same shape via `FollowsProvider`, writing the admin's follows.
 * - `showCoverUpdateShortcut` in `CollectionContentRenderer` gates on `me?.isAdmin` and on the
 *   slug not being shadowed, so it never appears on a synthetic collection.
 *
 * Passing `me={null}` (and not mounting `FollowsProvider`) turns all three off at once, and is
 * accurate rather than a workaround: in these modes the viewer genuinely is an observer of this
 * space, and none of the personal state on screen is theirs to mutate.
 */
export function UserSpace({
  data,
  basePath,
  me,
  ssrViewport,
  railExtras = null,
  toolbarExtras,
  adminHub,
}: UserSpaceProps) {
  const {
    collection,
    sections,
    followedCollectionIds,
    savedImageIds,
    grantedCollectionIds,
    visibleKeys,
  } = data;

  const adminHubNode = adminHub ? (
    <AdminHubClient
      content={adminHub.content}
      seed={adminHub.seed}
      mobileChunkSize={1}
      serverContentWidth={ssrViewport?.contentWidth}
      serverViewportHeight={ssrViewport?.viewportHeight}
      serverIsMobile={ssrViewport?.isMobile}
    />
  ) : undefined;

  const grid = (
    <UserSpaceGrid
      collection={collection}
      sections={sections}
      visibleKeys={visibleKeys}
      grantedCollectionIds={grantedCollectionIds}
      initialSavedImageIds={savedImageIds}
      basePath={basePath}
      me={me}
      ssrViewport={ssrViewport}
      railExtras={railExtras}
      toolbarExtras={toolbarExtras}
      adminHub={adminHubNode}
    />
  );

  return me ? (
    <FollowsProvider initialFollowedIds={followedCollectionIds}>{grid}</FollowsProvider>
  ) : (
    grid
  );
}

export default UserSpace;
