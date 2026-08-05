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
import { listFollowedCollectionIdsServer, listSavedImagesServer } from '@/app/lib/api/personal';
import { getUserPage } from '@/app/lib/api/user';
import {
  getUserPageById,
  listFollowedCollectionIdsByUserServer,
  listSavedImagesByUserServer,
} from '@/app/lib/api/users';
import { type CollectionModel } from '@/app/types/Collection';
import { type AnyContentModel, type ContentCollectionModel } from '@/app/types/Content';
import { isContentCollection, isContentImage, isGifContent } from '@/app/utils/contentTypeGuards';

export const TAB_KEYS = ['collections', 'images', 'saved', 'following'] as const;

export type TabKey = (typeof TAB_KEYS)[number];

const DEFAULT_TAB: TabKey = 'collections';

/**
 * Whose space is being rendered.
 *
 * `self` is the signed-in user viewing their own space; `admin` is an admin observing another
 * user's. The distinction is not cosmetic — it decides which reads run AND whether the personal
 * action controls are armed. See {@link UserSpace} for why admin mode renders them off.
 */
export type UserSpaceMode = 'self' | { mode: 'admin'; userId: number };

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
  content: AnyContentModel[];
  emptyLabel: string;
}

export interface UserSpaceData {
  collection: CollectionModel;
  sections: Record<TabKey, UserSpaceSection>;
  /** Ids the follow toggle seeds from. Empty in admin mode — nothing there is the admin's to follow. */
  followedCollectionIds: number[];
  /** Ids the save toggle seeds from. Empty in admin mode, for the same reason. */
  savedImageIds: number[];
}

/**
 * Load every section's content for one user's space.
 *
 * All four sections are fetched on every request regardless of which is active, so the inactive
 * chips can show accurate counts. Returns `null` when the space itself cannot be loaded, which the
 * caller turns into a 404.
 */
export async function loadUserSpace(target: UserSpaceMode): Promise<UserSpaceData | null> {
  const isSelf = target === 'self';

  const [collection, savedImages, followedCollectionIds, allCollections] = await Promise.all([
    isSelf ? getUserPage() : getUserPageById(target.userId).catch(() => null),
    isSelf ? listSavedImagesServer() : listSavedImagesByUserServer(target.userId),
    isSelf
      ? listFollowedCollectionIdsServer()
      : listFollowedCollectionIdsByUserServer(target.userId),
    getAllCollections(0, 500),
  ]);

  if (!collection) return null;

  const { collectionBlocks, imageBlocks } = splitUserContent(collection.content);

  const followedSet = new Set(followedCollectionIds);
  const followedBlocks = toCollectionBlocks(allCollections.filter(c => followedSet.has(c.id)));

  // Second person for the owner, third for an admin looking in — an empty Saved tab saying
  // "You have not saved any images yet" on someone else's page reads as the admin's own state.
  const subject = isSelf
    ? { possessive: 'You have', tagged: 'You are', following: 'You are' }
    : { possessive: 'This user has', tagged: 'This user is', following: 'This user is' };

  const sections: Record<TabKey, UserSpaceSection> = {
    collections: {
      label: 'Collections',
      content: collectionBlocks,
      emptyLabel: 'No collections yet.',
    },
    images: {
      label: 'Images',
      content: imageBlocks,
      emptyLabel: `${subject.tagged} not tagged in any images yet.`,
    },
    saved: {
      label: 'Saved',
      content: savedImages,
      emptyLabel: `${subject.possessive} not saved any images yet.`,
    },
    following: {
      label: 'Following',
      content: followedBlocks,
      emptyLabel: `${subject.following} not following any collections yet.`,
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
  };
}
