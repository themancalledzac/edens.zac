import { type ReactNode } from 'react';

import { FollowsProvider } from '@/app/components/Personal/FollowsContext';
import { FormError } from '@/app/components/ui/Field/FormError';
import { type ToolbarSection } from '@/app/components/ui/FilterToolbar/FilterToolbar';
import { EmptyState } from '@/app/components/ui/StatusText/EmptyState';
import { type TabKey, type UserSpaceData } from '@/app/components/UserSpace/userSpaceData';
import { UserSpaceGrid } from '@/app/components/UserSpace/UserSpaceGrid';
import { type MeResponse } from '@/app/types/Auth';
import { type CollectionModel } from '@/app/types/Collection';
import { type SsrViewport } from '@/app/utils/ssrViewport';

import styles from './UserSpace.module.scss';

export interface UserSpaceProps {
  data: UserSpaceData;
  activeKey: TabKey;
  /** Path the section chips link to; `?tab=` is appended. `/user` or `/admin/users/{id}`. */
  basePath: string;
  /**
   * The principal to render the collection stack for, or `null` to render it as an observer.
   *
   * `/user` passes the signed-in principal. `/admin/users/[id]` passes `null` — see the component
   * docblock; this is the single switch that disarms every personal-action control.
   */
  me: MeResponse | null;
  ssrViewport: SsrViewport | null;
  /**
   * Page-level content for the header rail, beside the cover image. This is where the things that
   * are *about* the space go — `/user`'s Account and Admin cards, the admin view's role
   * membership — rather than in a slab below the grid.
   */
  railExtras?: ReactNode;
}

/**
 * The four-section "user space" view, shared by `/user` (own space) and `/admin/users/[id]`
 * (an admin looking at someone else's).
 *
 * Each section renders through `CollectionPageClient` — the same component every collection page
 * uses — by handing it the user's synthetic collection with the selected section's blocks as its
 * content. The collection header, filter toolbar, density control, save hearts and grid therefore
 * come from the shared stack rather than a bespoke variant of it.
 *
 * The section switcher is not a component of its own: the four sections are passed to that same
 * stack as `sections`, and render as navigating chips at the head of the shared filter bar. They
 * stay `?tab=` links rather than joining `FilterState` because each section's blocks come from a
 * different server read, and because the choice should stay shareable and back-button-walkable.
 * Their presence is also what makes the bar render here at all — a user space has no facet
 * dimensions of its own — which is how it picks up the photo-size control and the rest of the bar.
 *
 * No section passes a `chunkSize`, so each starts at `LAYOUT.defaultChunkSize` — the density an
 * ordinary collection page opens at, and the value the bar's Medium photo-size tier selects.
 *
 * ## Why admin mode passes `me={null}`
 *
 * The personal-action controls in the collection stack gate on the presence of a principal, NOT on
 * whether that principal owns what is being rendered:
 *
 * - `SaveHeart` returns null unless `useMe()` is truthy, and `CollectionPageClient` mounts
 *   `SavesProvider` on the same condition. Its writes go to `POST /api/read/user/saves`, which the
 *   backend binds to the SESSION — so an admin clicking a heart on someone else's page would
 *   silently bookmark that image onto their OWN space.
 * - `FollowButton` has the same shape via `FollowsProvider`, writing the admin's follows.
 * - `showCoverUpdateShortcut` in `CollectionContentRenderer` gates on `me?.isAdmin`, so it is
 *   hidden for an ordinary owner but would appear here — routing to `manageHref('user')`, which
 *   404s, because the synthetic collection has no backing row.
 *
 * Passing `me={null}` (and not mounting `FollowsProvider`) turns all three off at once, and is
 * accurate rather than a workaround: in admin mode the viewer genuinely is an observer of this
 * space, and none of the personal state on screen is theirs to mutate. Admin editing of a user
 * happens through the surfaces around this view — `UserForm` for the profile, and drilling into a
 * collection tile for its contents — not through in-place controls here.
 *
 * ## A section whose read failed is not an empty section
 *
 * `EmptyState`'s own docblock forbids using it for a failed read: it tells the viewer there is
 * nothing here, which is a claim about the data, and after an error that claim is false. So a
 * section carrying `unavailableLabel` renders that instead, through `FormError` — checked ahead of
 * the empty state, the same ordering and the same component `UserForm` uses for its unknown role
 * membership. It is styled distinctly (danger, `role="alert"`) rather than reusing the muted empty
 * text, so a dead backend cannot read as "this user has saved nothing".
 *
 * Its section chip drops its count for the same reason — a `0` badge is the same claim in
 * miniature, and it would sit beside a body that has just said the number is unknown. `count` on
 * {@link ToolbarSection} is optional precisely so an unknown count can be left unsaid.
 *
 * ## Why the grid goes through UserSpaceGrid
 *
 * The Following chip's count is server-rendered from the followed-id list, while unfollowing is a
 * client-only optimistic update in `FollowsProvider`. This is a Server Component and cannot watch
 * that change, so the grid renders through {@link UserSpaceGrid}, a thin client component below the
 * provider that adds the difference between the ids this render was built from and the provider's
 * live set. Without it the chip keeps the pre-unfollow number until the next server render. The
 * count still comes from the id list; nothing recounts the rendered tiles.
 *
 * Invariant: the backend's `UserPageAssembler` builds this collection with no `id`,
 * `isClient` or `isPasswordProtected` (it is assembled, not a `collection` row). That absence is
 * what keeps the client-gallery affordances inside `CollectionPageClient` switched off —
 * `canDownloadCollection` short-circuits on the missing id and `selectsEnabled` on the missing
 * `isClient`. Do not synthesize an id onto this collection to satisfy the `CollectionModel` type;
 * doing so would arm the download and Selects UI on a page that has no gallery to grant.
 */
export function UserSpace({
  data,
  activeKey,
  basePath,
  me,
  ssrViewport,
  railExtras = null,
}: UserSpaceProps) {
  const { collection, sections, followedCollectionIds, savedImageIds, visibleKeys } = data;
  const active = sections[activeKey];

  // From the data, not TAB_KEYS: a share recipient is offered Collections and Images only, since
  // Saved and Following are the owner's private bookmarks and are absent from their view.
  const toolbarSections: ToolbarSection[] = visibleKeys.map(key => {
    const section = sections[key];
    return {
      key,
      label: section.label,
      count: section.unavailableLabel === undefined ? section.count : undefined,
      href: `${basePath}?tab=${key}`,
    };
  });

  // Same collection (so the header row, slug and display mode are unchanged section to section),
  // swapping only which blocks the grid renders.
  const sectionCollection: CollectionModel = { ...collection, content: active.content };

  // Deliberately NOT keyed on `activeKey`. Remounting per section collapsed the document height
  // for a frame mid-swap, which made the browser clamp scroll position and threw the viewer toward
  // the top on every section switch. `CollectionPageClient` resets its own per-section state off
  // `activeSectionKey` instead — see the `renderedSectionKey` block there.
  const grid = (
    <UserSpaceGrid
      collection={sectionCollection}
      serverContentWidth={ssrViewport?.contentWidth}
      serverViewportHeight={ssrViewport?.viewportHeight}
      serverIsMobile={ssrViewport?.isMobile}
      me={me}
      initialSavedImageIds={savedImageIds}
      sections={toolbarSections}
      activeSectionKey={activeKey}
      railExtras={railExtras}
      serverFollowedIds={followedCollectionIds}
    />
  );

  return (
    <>
      {me ? (
        <FollowsProvider initialFollowedIds={followedCollectionIds}>{grid}</FollowsProvider>
      ) : (
        grid
      )}

      {active.unavailableLabel === undefined ? (
        active.content.length === 0 && (
          <EmptyState className={styles.empty}>{active.emptyLabel}</EmptyState>
        )
      ) : (
        <div className={styles.empty}>
          <FormError>{active.unavailableLabel}</FormError>
        </div>
      )}
    </>
  );
}

export default UserSpace;
