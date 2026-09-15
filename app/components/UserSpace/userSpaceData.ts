/**
 * Data layer for the "user space" page — the three-section view rendered at `/user` for the
 * signed-in user and at `/admin/users/[id]` for an admin looking at someone else's space.
 *
 * Both surfaces render the SAME sections from the SAME assembler output; only the reads differ.
 * `/api/read/user/**` binds every read to the session principal (self-only by construction), so
 * the admin variant goes through the id-parameterized `/api/admin/users/{id}/**` twins instead.
 * The backend serves both from one method — `UserPageAssembler.assembleForUser(userId)` — so the
 * Collections and Images sections are byte-identical between the two modes for a given user.
 */

import { getAllCollections } from '@/app/lib/api/collections';
import { ApiError } from '@/app/lib/api/core';
import {
  getUserPage,
  listFollowedCollectionIdsServer,
  listSavedImagesServer,
} from '@/app/lib/api/personal';
import { getCurrentShareView, getShareView, type ShareView } from '@/app/lib/api/share';
import {
  getUserPageById,
  listFollowedCollectionIdsByUserServer,
  listSavedImagesByUserServer,
} from '@/app/lib/api/users';
import { type CollectionModel } from '@/app/types/Collection';
import { type AnyContentModel, type ContentCollectionModel } from '@/app/types/Content';
import { type FailSoftRead } from '@/app/types/FailSoftRead';
import { isContentCollection, isContentImage, isGifContent } from '@/app/utils/contentTypeGuards';

export const TAB_KEYS = ['collections', 'images', 'saved'] as const;

export type TabKey = (typeof TAB_KEYS)[number];

const DEFAULT_TAB: TabKey = 'collections';

/**
 * The sections a share-link recipient is offered. Saved is the owner's private bookmark list and
 * is absent from the backend's recipient view by design; so is the follow state that the
 * Collections section's `following` filter reads, which is why a recipient is never offered it.
 */
export const SHARE_TAB_KEYS = ['collections', 'images'] as const satisfies readonly [
  TabKey,
  ...TabKey[],
];

/**
 * Whose space is being rendered.
 *
 * `self` is the signed-in user viewing their own space; `admin` is an admin observing another
 * user's; `share` is a link recipient looking at the owner's work. The distinction is not
 * cosmetic — it decides which reads run AND whether the personal action controls are armed. See
 * {@link UserSpace} for why the other two modes render them off.
 *
 * `share` carries the raw token on the first landing (the URL is the only place it exists) and
 * omits it afterwards, when the cookie identifies the link instead.
 */
export type UserSpaceMode =
  'self' | { mode: 'admin'; userId: number } | { mode: 'share'; token?: string };

/** Narrow an untrusted `?tab=` value to a known key, falling back to the default section. */
export function resolveTabKey(raw: string | string[] | undefined): TabKey {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return TAB_KEYS.includes(value as TabKey) ? (value as TabKey) : DEFAULT_TAB;
}

export type SpaceKey = TabKey | 'admin';

/** `?tab=` narrowing for a page that also hosts the admin hub: `admin` is valid and the default. */
export function resolveSpaceKey(raw: string | string[] | undefined): SpaceKey {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined || value === 'admin') return 'admin';
  return resolveTabKey(value);
}

/** Split the synthetic user collection's content into COLLECTION blocks and IMAGE/GIF blocks. */
export function splitUserContent(content: AnyContentModel[] | undefined): {
  collectionBlocks: AnyContentModel[];
  imageBlocks: AnyContentModel[];
} {
  const collectionBlocks: AnyContentModel[] = [];
  const imageBlocks: AnyContentModel[] = [];
  for (const block of content ?? []) {
    if (isContentCollection(block)) {
      collectionBlocks.push(block);
    } else if (isContentImage(block) || isGifContent(block)) {
      imageBlocks.push(block);
    }
  }
  return { collectionBlocks, imageBlocks };
}

/**
 * Wrap followed collections as COLLECTION content blocks so they flow through the same pipeline as
 * every other collection grid: `processContentBlocks` converts these to parallax cards via
 * `convertCollectionContentToParallax`, which carries `referencedCollectionId` through as the
 * card's `collectionId` — the id the follow toggle persists against.
 */
export function toCollectionBlocks(collections: CollectionModel[]): ContentCollectionModel[] {
  return collections.map((collection, index) => ({
    contentType: 'COLLECTION',
    id: collection.id,
    referencedCollectionId: collection.id,
    slug: collection.slug,
    title: collection.title,
    description: collection.description ?? null,
    coverImage: collection.coverImage ?? null,
    isClient: collection.isClient,
    isBlog: collection.isBlog,
    collectionDate: collection.collectionDate,
    orderIndex: index,
    visible: true,
  }));
}

/**
 * Merge the collections an admin associated with this user with the ones the user followed
 * themselves, into the single list the Collections section renders.
 *
 * Keyed on `referencedCollectionId`, never `id`. The two arrays come from different producers: a
 * block from `getUserPage()` carries the content-table row id in `id`, while `toCollectionBlocks`
 * sets `id` to the collection id. Keying on `id` therefore matches nothing across the two sides,
 * and owning a collection you also follow would render it twice — the exact duplicate this merge
 * exists to remove.
 *
 * Admin-granted blocks win a collision because they carry the page's own curated `orderIndex` and
 * whatever enrichment the assembler attached. `orderIndex` is then reassigned across the whole
 * result: the two sides number themselves independently from zero, so the merged list would
 * otherwise carry duplicate positions and sort nondeterministically.
 */
export function unionCollectionBlocks(
  granted: AnyContentModel[],
  followed: ContentCollectionModel[]
): AnyContentModel[] {
  const byCollectionId = new Map<number, AnyContentModel>();
  for (const block of granted) {
    if (isContentCollection(block)) byCollectionId.set(block.referencedCollectionId, block);
  }

  const merged: AnyContentModel[] = [...granted];
  for (const block of followed) {
    if (byCollectionId.has(block.referencedCollectionId)) continue;
    byCollectionId.set(block.referencedCollectionId, block);
    merged.push(block);
  }

  return merged.map((block, index) => ({ ...block, orderIndex: index }));
}

/**
 * How many distinct collections this user is associated with, by either route.
 *
 * Deliberately computed from the two ID sets rather than from {@link unionCollectionBlocks}'
 * output, because the badge must be right on every section while the catalog that hydrates the
 * followed half is only read on the Collections one. Both inputs are always available: the granted
 * blocks come from the page read, and the ids from the cheap follows read.
 *
 * Like the Following badge it replaces, this can exceed the number of tiles drawn — a followed
 * collection that was deleted, or that falls outside the 500-row catalog page, is still one this
 * user follows. The id list is what the backend says, which is the honest answer to "how many".
 */
export function countAssociatedCollections(
  granted: AnyContentModel[],
  followedCollectionIds: readonly number[]
): number {
  const ids = new Set<number>(followedCollectionIds);
  for (const block of granted) {
    if (isContentCollection(block)) ids.add(block.referencedCollectionId);
  }
  return ids.size;
}

export interface UserSpaceSection {
  label: string;
  /**
   * The blocks this section renders — populated ONLY for the active section.
   *
   * An inactive section is deliberately left empty rather than hydrated, because hydrating one
   * costs a read the viewer may never look at (see {@link loadUserSpace}). That makes
   * `content.length` meaningless for an inactive section, which is exactly why {@link count} is a
   * field of its own and not derived from this array.
   */
  content: AnyContentModel[];
  /**
   * How many items this section holds, known independently of whether {@link content} was
   * hydrated — this is what the section chip displays.
   *
   * Separate from `content.length` so a deferred section still reports a TRUE number instead of
   * the `0` it would otherwise derive from its un-hydrated array. `undefined` means genuinely
   * unknown (the read failed) and the chip then says nothing at all, which is the only honest
   * rendering of an unknown count — see the {@link UserSpace} docblock.
   */
  count?: number;
  /** Shown when the read succeeded and returned nothing. A claim about the data — must be true. */
  emptyLabel: string;
  /**
   * Set when one of this section's reads FAILED, in which case it replaces {@link emptyLabel}.
   *
   * Collections assembles from two reads and can fail partially — the granted half renders while
   * the followed half is missing — so its copy says the list may be incomplete rather than
   * claiming the whole section is unavailable. A section with one read says the flat thing.
   *
   * The two are one field apart rather than a `failed` boolean plus copy so an inconsistent state
   * is unrepresentable: there is no way to be unavailable without saying so, and no way to carry
   * failure copy for a section that loaded. Mirrors `rolesError` in `UserForm`.
   */
  unavailableLabel?: string;
}

export interface UserSpaceData {
  collection: CollectionModel;
  sections: Record<TabKey, UserSpaceSection>;
  /**
   * Ids the follow toggle seeds from, and the set the Collections section's `following` filter
   * narrows to. Empty in admin mode — nothing there is the admin's to follow — and empty when the
   * follows read failed, which is what withholds the filter rather than showing an empty one.
   */
  followedCollectionIds: number[];
  /**
   * Ids the save toggle seeds from. Empty in admin mode, for the same reason. Derived from the
   * saved-images read itself rather than a second ids-only fetch (single-fetch rule).
   */
  savedImageIds: number[];
  /**
   * Collection ids an ADMIN associated with this user — the half of the Collections list that an
   * unfollow cannot remove.
   *
   * Sent alongside the blocks because the client has to tell the two associations apart to
   * reconcile an unfollow, and a block does not say which route it came in by. Always populated,
   * in every mode: it describes the page, not the viewer.
   */
  grantedCollectionIds: number[];
  /**
   * Which section chips to offer, in order.
   *
   * All four for the owner and for an admin. A share recipient gets Collections and Images only:
   * Saved and Following are the owner's private bookmarks, which the backend deliberately keeps
   * out of the recipient view. Rendering them empty would be worse than omitting them — an empty
   * "Saved" tab reads as a claim that the owner has saved nothing, which is not what we know.
   */
  visibleKeys: readonly [TabKey, ...TabKey[]];
  /**
   * Whose work a recipient is looking at, for the share banner. Null outside share mode, and also
   * null for an owner who has never set a display name.
   */
  ownerName: string | null;
}

/**
 * Load the admin-side page for a target user, mapping ONLY a genuine 404 to `null`.
 *
 * `getUserPageById` throws `ApiError` for every non-OK status (see `fetchAdminGetApi`), so the
 * bare `.catch(() => null)` this replaces reported a 500, a timeout and a lapsed admin session as
 * "this user has no galleries yet" — a claim about the data, made from a state where nothing about
 * the data was known. Everything but a 404 now rethrows and lands on `app/(admin)/error.tsx`,
 * which offers a retry. Same narrowing as `getAdminUser` in the detail page.
 */
async function loadAdminUserPage(userId: number): Promise<CollectionModel | null> {
  try {
    return await getUserPageById(userId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/**
 * The recipient view behind a share link: the token on first landing, the cookie thereafter.
 *
 * Both arms already map a missing or reset link to null, so the caller's `null` -> 404 path
 * covers a dead link without this needing to distinguish the two.
 */
async function loadShareView(target: { mode: 'share'; token?: string }): Promise<ShareView | null> {
  return target.token ? await getShareView(target.token) : await getCurrentShareView();
}

/**
 * Load one user's space: every section's content, hydrated up front so the client can switch
 * between them with no further server round trip (see `UserSpaceGrid`).
 *
 * Returns `null` when the space itself genuinely does not exist (404 or an empty body), which the
 * caller turns into a 404 / empty state; any other read failure rejects so the error boundary
 * handles it.
 *
 * The collection catalog (`getAllCollections(0, 500)`, ~0.5s and ~57KB against the local backend)
 * is read whenever the target is not a share link: it turns the followed-id list into renderable
 * Collections blocks, and every mode that offers a Collections section needs it up front now that
 * the section is no longer selected server-side. A share recipient has no follow state, so the
 * followed half of their Collections list is always empty and the read is skipped outright. The
 * read still sits inside the `Promise.all` below, so it overlaps the page read rather than adding
 * to it.
 *
 * ## Fail-soft reads
 *
 * Saved and the follows list stay fail-soft, because their admin endpoints are not on the deployed
 * backend yet and a missing bookmark list should not take down the page. Both modes' reads come
 * back as {@link FailSoftRead} — the admin twins in `users.ts` and the session-bound reads in
 * `personal.ts` alike — and a failed one is threaded to its section as `unavailableLabel`, so the
 * section says the data is unavailable rather than asserting the user has none. The two modes
 * differ only in the PERSON of the copy, never in whether the truth gets told.
 *
 * A failed follows read is a PARTIAL failure of the Collections section rather than a total one:
 * the admin-granted half still renders, so the section keeps its content and says separately that
 * the list may be incomplete. It also leaves {@link UserSpaceData.followedCollectionIds} empty,
 * which is what withholds the `following` filter — a filter for a set nobody could read would
 * silently report every collection as unfollowed.
 *
 * A share recipient owns no bookmarks, so the saved/follows reads synthesize a fail-soft empty
 * rather than skip the fetch, keeping the shape uniform for the rest of the function; neither is
 * offered as a section in that mode (see {@link UserSpaceData.visibleKeys}).
 */
export async function loadUserSpace(target: UserSpaceMode): Promise<UserSpaceData | null> {
  const isSelf = target === 'self';
  const isShare = target !== 'self' && target.mode === 'share';

  const noBookmarks = Promise.resolve<FailSoftRead<never>>({ ok: true, items: [] });

  const [pageRead, saved, followed, catalog] = await Promise.all([
    isSelf
      ? getUserPage()
      : isShare
        ? loadShareView(target as { mode: 'share'; token?: string })
        : loadAdminUserPage((target as { mode: 'admin'; userId: number }).userId),
    isSelf
      ? listSavedImagesServer()
      : isShare
        ? noBookmarks
        : listSavedImagesByUserServer((target as { mode: 'admin'; userId: number }).userId),
    isSelf
      ? listFollowedCollectionIdsServer()
      : isShare
        ? noBookmarks
        : listFollowedCollectionIdsByUserServer(
            (target as { mode: 'admin'; userId: number }).userId
          ),
    !isShare ? getAllCollections(0, 500) : Promise.resolve<CollectionModel[]>([]),
  ]);

  const shareView = isShare ? (pageRead as ShareView | null) : null;
  const collection = isShare ? (shareView?.page ?? null) : (pageRead as CollectionModel | null);
  if (!collection) return null;

  const savedImages = saved.ok ? saved.items : [];
  const followedCollectionIds = followed.ok ? followed.items : [];

  const { collectionBlocks, imageBlocks } = splitUserContent(collection.content);

  const followedSet = new Set(followedCollectionIds);
  const followedBlocks = toCollectionBlocks(catalog.filter(c => followedSet.has(c.id)));

  const associatedCollections = unionCollectionBlocks(collectionBlocks, followedBlocks);

  const subject = isSelf
    ? {
        possessive: 'You have',
        tagged: 'You are',
        savedUnavailable: 'Your saved images are unavailable right now.',
        followingUnavailable:
          'Your followed collections are unavailable right now, so this list may be incomplete.',
      }
    : {
        possessive: 'This user has',
        tagged: 'This user is',
        savedUnavailable: 'Saved images are unavailable right now.',
        followingUnavailable:
          'Followed collections are unavailable right now, so this list may be incomplete.',
      };

  const sections: Record<TabKey, UserSpaceSection> = {
    collections: {
      label: 'Collections',
      content: associatedCollections,
      count: countAssociatedCollections(collectionBlocks, followedCollectionIds),
      emptyLabel: 'No collections yet.',
      unavailableLabel: followed.ok || isShare ? undefined : subject.followingUnavailable,
    },
    images: {
      label: 'Images',
      content: imageBlocks,
      count: imageBlocks.length,
      emptyLabel: `${subject.tagged} not tagged in any images yet.`,
    },
    saved: {
      label: 'Saved',
      content: savedImages,
      count: saved.ok ? savedImages.length : undefined,
      emptyLabel: `${subject.possessive} not saved any images yet.`,
      unavailableLabel: saved.ok ? undefined : subject.savedUnavailable,
    },
  };

  return {
    collection,
    sections,
    followedCollectionIds: isSelf ? followedCollectionIds : [],
    savedImageIds: isSelf ? savedImages.map(i => i.id) : [],
    grantedCollectionIds: collectionBlocks
      .filter(isContentCollection)
      .map(block => block.referencedCollectionId),
    visibleKeys: isShare ? SHARE_TAB_KEYS : TAB_KEYS,
    ownerName: shareView?.ownerName ?? null,
  };
}
