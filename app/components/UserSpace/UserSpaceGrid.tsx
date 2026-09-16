'use client';

import { useSearchParams } from 'next/navigation';
import { type ReactNode, useCallback, useMemo } from 'react';

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
   * Backend-assembled: no `id`, `isClient` or `isPasswordProtected`. Never synthesize these — a
   * synthesized `id` arms the download and Selects UI on a page with no gallery to grant.
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
  /** The Admin section's content, built as an element by `/admin`, the only page that passes it. */
  adminHub?: ReactNode;
}

/**
 * Picks the active section from `?tab=` (clamped to {@link visibleKeys}) and renders it through the
 * shared collection stack; a chip click pushes the new URL with `window.history.pushState` instead
 * of navigating, so `CollectionPageClient` (never keyed on the section) stays mounted and no server
 * round trip happens. It also reconciles the Collections badge and tile list against the viewer's
 * live follow state, which `UserSpace` — a Server Component — cannot watch change.
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

  const hasAdminHub = adminHub !== undefined;
  const searchParams = useSearchParams();
  const requestedKey: SpaceKey = hasAdminHub
    ? resolveSpaceKey(searchParams.get('tab') ?? undefined)
    : resolveTabKey(searchParams.get('tab') ?? undefined);
  const activeKey: SpaceKey =
    requestedKey === 'admin' || visibleKeys.includes(requestedKey) ? requestedKey : visibleKeys[0];
  const active = activeKey === 'admin' ? null : sections[activeKey];

  const onSectionSelect = useCallback((_key: string, href: string) => {
    window.history.pushState({}, '', href);
  }, []);

  const toolbarSections: ToolbarSection[] = [
    ...(hasAdminHub ? [{ key: 'admin', label: 'Admin', href: `${basePath}?tab=admin` }] : []),
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

      {active === null && adminHub}

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
