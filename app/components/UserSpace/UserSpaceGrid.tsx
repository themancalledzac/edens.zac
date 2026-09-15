'use client';

import { useSearchParams } from 'next/navigation';
import { type ReactNode, useCallback, useMemo } from 'react';

import { AdminHubClient } from '@/app/(admin)/admin/AdminHubClient';
import { type AdminHub } from '@/app/(admin)/admin/loadAdminHub';
import CollectionPageClient from '@/app/components/ContentCollection/CollectionPageClient';
import { useFollows } from '@/app/components/Personal/FollowsContext';
import { FormError } from '@/app/components/ui/Field/FormError';
import { type ToolbarExtra } from '@/app/components/ui/FilterToolbar/chipWeights';
import { type ToolbarSection } from '@/app/components/ui/FilterToolbar/FilterToolbar';
import { EmptyState } from '@/app/components/ui/StatusText/EmptyState';
import {
  resolveSpaceKey,
  resolveTabKey,
  type SpaceKey,
  type TabKey,
  type UserSpaceSection,
} from '@/app/components/UserSpace/userSpaceData';
import { type MeResponse } from '@/app/types/Auth';
import { type CollectionModel } from '@/app/types/Collection';
import { type AnyContentModel } from '@/app/types/Content';
import { isContentCollection } from '@/app/utils/contentTypeGuards';
import { type SsrViewport } from '@/app/utils/ssrViewport';

import styles from './UserSpace.module.scss';

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

export interface UserSpaceGridProps {
  /**
   * Invariant: the backend's `UserPageAssembler` builds this collection with no `id`, `isClient` or
   * `isPasswordProtected` (it is assembled, not a `collection` row). That absence is what keeps the
   * client-gallery affordances inside `CollectionPageClient` switched off — `canDownloadCollection`
   * short-circuits on the missing id and `selectsEnabled` on the missing `isClient`. Do not
   * synthesize an id onto this collection to satisfy the `CollectionModel` type; doing so would arm
   * the download and Selects UI on a page that has no gallery to grant.
   */
  collection: CollectionModel;
  sections: Record<TabKey, UserSpaceSection>;
  /** Which section chips to offer, in order. See {@link UserSpaceData.visibleKeys}. */
  visibleKeys: readonly [TabKey, ...TabKey[]];
  /** Collection ids an admin associated with this user — the half an unfollow cannot remove. */
  grantedCollectionIds: readonly number[];
  initialSavedImageIds: number[];
  /** Path the section chips link to; `?tab=` is appended. */
  basePath: string;
  me: MeResponse | null;
  ssrViewport: SsrViewport | null;
  railExtras?: ReactNode;
  toolbarExtras?: readonly ToolbarExtra[];
  /** The admin hub to render as the `admin` section. Only `/admin` passes it. */
  adminHub?: AdminHub;
}

/**
 * Picks the active section straight off the URL, renders it through the shared collection stack,
 * and switches sections client-side with no server round trip.
 *
 * `?tab=` still drives the choice — shareable, bookmarkable, walkable with the back button — but it
 * is read here via `useSearchParams()` instead of resolved server-side, because every section's
 * content already arrived in `sections` (see `loadUserSpace`). A chip click calls
 * {@link onSectionSelect} instead of letting its `Link` navigate; that pushes the new URL with
 * `window.history.pushState`, which Next's router picks up without an RSC fetch, and
 * `useSearchParams()` re-renders this component with the new value.
 *
 * `requestedKey` is clamped to {@link visibleKeys}: a share link only offers Collections and
 * Images, and a hand-edited `?tab=saved` on one must not render a section the page does not list as
 * a chip.
 *
 * Not keyed on the active section, deliberately: `CollectionPageClient` stays mounted across a
 * switch, only its `collection`/`sections`/`activeSectionKey` props change. Remounting collapsed the
 * document to the header's height for a frame, which clamps `scrollY` and throws the viewer toward
 * the top on every chip they click.
 *
 * On `/admin` an Admin section leads the segmented chip; it renders the hub's packed panels and
 * tiles beneath the shared header instead of a grid (`content: []`, which also hides the density
 * control), so the hub's layout code is untouched. A section whose read failed renders `FormError`
 * instead of `EmptyState` — the latter is a claim that there is nothing here, which is false after
 * a failed read — checked ahead of the empty state and dropping its chip's count for the same
 * reason (see {@link UserSpaceSection.unavailableLabel}).
 *
 * Reconciles the Collections badge and tile list against the viewer's LIVE follow state: `UserSpace`
 * is a Server Component that can assemble the union of granted and followed collections but cannot
 * watch it change, since following is a client-only optimistic update in `FollowsProvider`. With no
 * provider mounted (admin and share mode), `useFollows()` is null and the server render passes
 * through untouched.
 */
export function UserSpaceGrid({
  collection,
  sections,
  visibleKeys,
  grantedCollectionIds,
  initialSavedImageIds,
  basePath,
  me,
  ssrViewport,
  railExtras = null,
  toolbarExtras,
  adminHub,
}: UserSpaceGridProps) {
  const follows = useFollows();
  const followedIds = follows?.followedIds;

  const searchParams = useSearchParams();
  const requestedKey: SpaceKey = adminHub
    ? resolveSpaceKey(searchParams.get('tab') ?? undefined)
    : resolveTabKey(searchParams.get('tab') ?? undefined);
  const activeKey: SpaceKey =
    requestedKey === 'admin' || visibleKeys.includes(requestedKey) ? requestedKey : visibleKeys[0];
  const active = activeKey === 'admin' ? null : sections[activeKey];

  const onSectionSelect = useCallback((_key: string, href: string) => {
    window.history.pushState({}, '', href);
  }, []);

  const toolbarSections: ToolbarSection[] = [
    ...(adminHub ? [{ key: 'admin', label: 'Admin', href: `${basePath}?tab=admin` }] : []),
    ...visibleKeys.map(key => {
      const section = sections[key];
      return {
        key,
        label: section.label,
        count: section.unavailableLabel === undefined ? section.count : undefined,
        href: `${basePath}?tab=${key}`,
      };
    }),
  ];

  const sectionCollection = useMemo<CollectionModel>(
    () => ({
      ...collection,
      content: pruneUnfollowed(active?.content ?? [], grantedCollectionIds, followedIds),
    }),
    [collection, active, grantedCollectionIds, followedIds]
  );

  return (
    <>
      <CollectionPageClient
        collection={sectionCollection}
        serverContentWidth={ssrViewport?.contentWidth}
        serverViewportHeight={ssrViewport?.viewportHeight}
        serverIsMobile={ssrViewport?.isMobile}
        me={me}
        initialSavedImageIds={initialSavedImageIds}
        sections={reconcileCollectionsCount(toolbarSections, grantedCollectionIds, followedIds)}
        activeSectionKey={activeKey}
        onSectionSelect={onSectionSelect}
        railExtras={railExtras}
        toolbarExtras={toolbarExtras}
        followedCollectionIds={followedIds}
      />

      {active === null && adminHub && (
        <AdminHubClient
          content={adminHub.content}
          seed={adminHub.seed}
          mobileChunkSize={1}
          serverContentWidth={ssrViewport?.contentWidth}
          serverViewportHeight={ssrViewport?.viewportHeight}
          serverIsMobile={ssrViewport?.isMobile}
        />
      )}

      {active !== null &&
        (active.unavailableLabel === undefined ? (
          active.content.length === 0 && (
            <EmptyState className={styles.empty}>{active.emptyLabel}</EmptyState>
          )
        ) : (
          <div className={styles.empty}>
            <FormError>{active.unavailableLabel}</FormError>
          </div>
        ))}
    </>
  );
}

export default UserSpaceGrid;
