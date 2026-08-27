/**
 * Data layer for the "user space" page — the four-section view rendered at `/user` for the
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

export const TAB_KEYS = ['collections', 'images', 'saved', 'following'] as const;

export type TabKey = (typeof TAB_KEYS)[number];

const DEFAULT_TAB: TabKey = 'collections';

/**
 * The sections a share-link recipient is offered. Saved and Following are the owner's private
 * bookmarks and are absent from the backend's recipient view by design.
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
  | 'self'
  | { mode: 'admin'; userId: number }
  | { mode: 'share'; token?: string };

/** Narrow an untrusted `?tab=` value to a known key, falling back to the default section. */
export function resolveTabKey(raw: string | string[] | undefined): TabKey {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return TAB_KEYS.includes(value as TabKey) ? (value as TabKey) : DEFAULT_TAB;
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
 * Wrap followed collections as COLLECTION content blocks so the Following tab flows through the
 * same pipeline as every other collection grid: `processContentBlocks` converts these to parallax
 * cards via `convertCollectionContentToParallax`, which carries `referencedCollectionId` through as
 * the card's `collectionId` — the id the follow toggle persists against.
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
   * Set only when this section's read FAILED, in which case it replaces {@link emptyLabel}.
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
  /** Ids the follow toggle seeds from. Empty in admin mode — nothing there is the admin's to follow. */
  followedCollectionIds: number[];
  /** Ids the save toggle seeds from. Empty in admin mode, for the same reason. */
  savedImageIds: number[];
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
 * Load one user's space, hydrating only the section that is actually on screen.
 *
 * Returns `null` when the space itself genuinely does not exist (404 or an empty body), which the
 * caller turns into a 404 / empty state; any other read failure rejects so the error boundary
 * handles it.
 *
 * ## Why `activeKey` is a parameter
 *
 * Every section's COUNT is read on every request, so all four chips keep an accurate badge. But the
 * Following section additionally needs the full collection catalog to turn its id list into
 * renderable blocks, and that read (`getAllCollections(0, 500)`) is ~0.5s and ~57KB against the
 * local backend — spent on all four tabs to serve one. The page is `force-dynamic`, so hydrating it
 * unconditionally spends it again on every single tab switch.
 *
 * Deferring it is only safe because the count does not come from the hydrated array: Following's
 * badge is `followedCollectionIds.length`, which the (cheap) follows read already gives us, so the
 * chip is accurate whether or not the catalog was fetched. That is the whole reason
 * {@link UserSpaceSection.count} exists as a field rather than being derived from `content.length`
 * — derive it, and a deferred section silently claims it holds nothing.
 *
 * Collections and Images need no such guard: both come from the single `page` read that is already
 * required to render the header, so splitting them costs nothing extra.
 *
 * ## Fail-soft reads
 *
 * Saved and Following stay fail-soft, because their admin endpoints are not on the deployed backend
 * yet and a missing bookmark list should not take down the page. Both modes' reads come back as
 * {@link FailSoftRead} — the admin twins in `users.ts` and the session-bound reads in `personal.ts`
 * alike — and a failed one is threaded to its section as `unavailableLabel`, so the section says
 * the data is unavailable rather than asserting the user has none. The two modes differ only in the
 * PERSON of the copy, never in whether the truth gets told.
 */
export async function loadUserSpace(
  target: UserSpaceMode,
  activeKey: TabKey = DEFAULT_TAB
): Promise<UserSpaceData | null> {
  const isSelf = target === 'self';
  const isShare = target !== 'self' && target.mode === 'share';

  // A recipient owns no bookmarks here, so both fail-soft reads are a genuine empty rather than a
  // skipped read reported as a failure. Saved/Following are not offered as sections at all in this
  // mode (see `visibleKeys`); this only keeps the shape uniform for the code below.
  const noBookmarks = Promise.resolve<FailSoftRead<never>>({ ok: true, items: [] });

  // The catalog read stays INSIDE the Promise.all rather than being awaited after it: on the
  // Following tab it is needed, and awaiting it downstream would serialize it behind the page read
  // instead of overlapping with it — trading a wasted read on three tabs for a slower fourth.
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
    // Never fetched in share mode: the Following section is not offered, so the catalog it exists
    // to hydrate would be a ~0.5s read serving a tab the recipient cannot reach.
    activeKey === 'following' && !isShare
      ? getAllCollections(0, 500)
      : Promise.resolve<CollectionModel[]>([]),
  ]);

  // Share mode's read carries the owner's name alongside the page; the other two return the page
  // alone. Unwrapped here so the rest of the function sees one shape.
  const shareView = isShare ? (pageRead as ShareView | null) : null;
  const collection = isShare ? (shareView?.page ?? null) : (pageRead as CollectionModel | null);
  if (!collection) return null;

  // A failed read has no `items` to take — see {@link FailSoftRead}. `[]` here is only ever the
  // array the SECTIONS render from; `saved.ok` / `followed.ok` is what decides whether that empty
  // array is allowed to speak, a few lines down.
  const savedImages = saved.ok ? saved.items : [];
  const followedCollectionIds = followed.ok ? followed.items : [];

  const { collectionBlocks, imageBlocks } = splitUserContent(collection.content);

  // Non-empty only on the Following tab, because `catalog` is only fetched there — see the
  // docblock. The count below is read from `followedCollectionIds`, never from this array.
  const followedSet = new Set(followedCollectionIds);
  const followedBlocks = toCollectionBlocks(catalog.filter(c => followedSet.has(c.id)));

  // Second person for the owner, third for an admin looking in — an empty Saved tab saying
  // "You have not saved any images yet" on someone else's page reads as the admin's own state.
  // The failure copy splits the same way: "Your saved images" is wrong on a page that is not the
  // viewer's, and the unqualified form is vague on the page that is.
  const subject = isSelf
    ? {
        possessive: 'You have',
        tagged: 'You are',
        following: 'You are',
        savedUnavailable: 'Your saved images are unavailable right now.',
        followingUnavailable: 'Your followed collections are unavailable right now.',
      }
    : {
        possessive: 'This user has',
        tagged: 'This user is',
        following: 'This user is',
        savedUnavailable: 'Saved images are unavailable right now.',
        followingUnavailable: 'Followed collections are unavailable right now.',
      };

  const sections: Record<TabKey, UserSpaceSection> = {
    collections: {
      label: 'Collections',
      content: collectionBlocks,
      count: collectionBlocks.length,
      emptyLabel: 'No collections yet.',
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
    following: {
      label: 'Following',
      content: followedBlocks,
      // From the id list, NOT `followedBlocks` — which is empty on every tab but this one. A
      // followed collection that has since been deleted (or that falls outside the 500-row catalog
      // page) counts here without being renderable, so this can legitimately exceed the number of
      // tiles the Following tab draws. The id list is what the backend says this user follows,
      // which is the honest answer to "how many".
      count: followed.ok ? followedCollectionIds.length : undefined,
      emptyLabel: `${subject.following} not following any collections yet.`,
      unavailableLabel: followed.ok ? undefined : subject.followingUnavailable,
    },
  };

  return {
    collection,
    sections,
    // Seeding the toggles is only meaningful for one's own space. In admin mode the controls are
    // not rendered at all (see UserSpace), so seeding them with the TARGET's ids would put another
    // user's state into the admin's client-side providers for no benefit.
    followedCollectionIds: isSelf ? followedCollectionIds : [],
    // `/user/saves/images` already returns the full saved set, so derive the ids from it rather
    // than issuing a second `/user/saves` ids-only read (single-fetch rule).
    savedImageIds: isSelf ? savedImages.map(i => i.id) : [],
    visibleKeys: isShare ? SHARE_TAB_KEYS : TAB_KEYS,
    ownerName: shareView?.ownerName ?? null,
  };
}
