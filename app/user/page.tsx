import { notFound } from 'next/navigation';

import CollectionPageClient from '@/app/components/ContentCollection/CollectionPageClient';
import { AccountCard } from '@/app/components/Personal/AccountCard';
import { FollowsProvider } from '@/app/components/Personal/FollowsContext';
import { SendMessageButton } from '@/app/components/SendMessageButton/SendMessageButton';
import { type ToolbarSection } from '@/app/components/ui/FilterToolbar/FilterToolbar';
import { PageShell } from '@/app/components/ui/PageShell/PageShell';
import { meServer } from '@/app/lib/api/auth';
import { getAllCollections } from '@/app/lib/api/collections';
import { listFollowedCollectionIdsServer, listSavedImagesServer } from '@/app/lib/api/personal';
import { getUserPage } from '@/app/lib/api/user';
import { type CollectionModel } from '@/app/types/Collection';
import { type AnyContentModel, type ContentCollectionModel } from '@/app/types/Content';
import { isContentCollection, isContentImage, isGifContent } from '@/app/utils/contentTypeGuards';
import { resolveSsrViewport } from '@/app/utils/ssrViewport';

import styles from './page.module.scss';

export const dynamic = 'force-dynamic';

/**
 * Starting density for the Collections and Following sections. Collection cards are uniform (fixed
 * effective rating, aspect ratio clamped near 5:4), so a high budget composes them several across —
 * the point of those sections being a scannable index rather than an editorial spread.
 *
 * Must stay inside the density slider's range (`LAYOUT.minDensity`..`LAYOUT.maxDensityDesktop`).
 * This was 14 while `/user` had no visible slider, which the shared bar cannot represent — the
 * control would sit pinned at its maximum and report a value the page was not using.
 */
const COLLECTIONS_CHUNK_SIZE = 7;

/**
 * Starting density for the Images and Saved sections. Deliberately below the Collections density:
 * these are photographs, and packing them as tightly as uniform cover cards shrinks them past the
 * point of being worth looking at.
 */
const PHOTO_CHUNK_SIZE = 5;

const TAB_KEYS = ['collections', 'images', 'saved', 'following'] as const;

type TabKey = (typeof TAB_KEYS)[number];

const DEFAULT_TAB: TabKey = 'collections';

/** Narrow an untrusted `?tab=` value to a known key, falling back to the default section. */
function resolveTabKey(raw: string | string[] | undefined): TabKey {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return TAB_KEYS.includes(value as TabKey) ? (value as TabKey) : DEFAULT_TAB;
}

/** Split the synthetic user collection's content into COLLECTION blocks and IMAGE/GIF blocks. */
function splitUserContent(content: AnyContentModel[] | undefined): {
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
function toCollectionBlocks(collections: CollectionModel[]): ContentCollectionModel[] {
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

interface UserPageProps {
  searchParams: Promise<{ tab?: string | string[] }>;
}

/**
 * Session-gated self-only "Your Space" page for the signed-in user. Four sections — Collections
 * (default), Images (tagged), Saved (bookmarks), Following — selected via `?tab=`, then an Account
 * card (email + passkey enrollment) below. Anonymous visitors get a 404; sign-in lives at `/login`
 * (which lands here on success) and onboarding at the invite-link flow.
 *
 * Each section renders through `CollectionPageClient` — the same component every collection page
 * uses — by handing it the user's synthetic collection with the selected section's blocks as its
 * content. The collection header, filter toolbar, density control, save hearts and grid therefore
 * come from the shared stack rather than a `/user`-only variant of it.
 *
 * The section switcher is not a component of its own: the four sections are passed to that same
 * stack as `sections`, and render as navigating chips at the head of the shared filter bar. They
 * stay `?tab=` links rather than joining `FilterState` because each section's blocks come from a
 * different server read, and because the choice should stay shareable and back-button-walkable.
 * Their presence is also what makes the bar render here at all — `/user` has no facet dimensions
 * of its own — which is how the page picks up the density slider and the rest of the bar chrome.
 *
 * Load-bearing invariant: the backend's `UserPageAssembler` builds this collection with no `id`,
 * `isClient` or `isPasswordProtected` (it is assembled, not a `collection` row). That absence is
 * what keeps the client-gallery affordances inside `CollectionPageClient` switched off here —
 * `canDownloadCollection` short-circuits on the missing id and `selectsEnabled` on the missing
 * `isClient`. Do not synthesize an id onto this collection to satisfy the `CollectionModel` type;
 * doing so would arm the download and Selects UI on a page that has no gallery to grant.
 */
export default async function UserPage({ searchParams }: UserPageProps) {
  const principal = await meServer();
  if (!principal) notFound();

  const [{ tab }, collection, savedImages, followedCollectionIds, allCollections, ssrViewport] =
    await Promise.all([
      searchParams,
      getUserPage(),
      listSavedImagesServer(),
      listFollowedCollectionIdsServer(),
      getAllCollections(0, 500),
      resolveSsrViewport(),
    ]);
  if (!collection) notFound();

  // `/user/saves/images` already returns the full saved set, so derive the ids from it rather than
  // issuing a second `/user/saves` ids-only read (single-fetch rule).
  const savedImageIds = savedImages.map(i => i.id);

  const { collectionBlocks, imageBlocks } = splitUserContent(collection.content);

  const followedSet = new Set(followedCollectionIds);
  const followedBlocks = toCollectionBlocks(allCollections.filter(c => followedSet.has(c.id)));

  const sections: Record<
    TabKey,
    { label: string; content: AnyContentModel[]; chunkSize: number; emptyLabel: string }
  > = {
    collections: {
      label: 'Collections',
      content: collectionBlocks,
      chunkSize: COLLECTIONS_CHUNK_SIZE,
      emptyLabel: 'No collections yet.',
    },
    images: {
      label: 'Images',
      content: imageBlocks,
      chunkSize: PHOTO_CHUNK_SIZE,
      emptyLabel: 'You are not tagged in any images yet.',
    },
    saved: {
      label: 'Saved',
      content: savedImages,
      chunkSize: PHOTO_CHUNK_SIZE,
      emptyLabel: 'You have not saved any images yet.',
    },
    following: {
      label: 'Following',
      content: followedBlocks,
      chunkSize: COLLECTIONS_CHUNK_SIZE,
      emptyLabel: 'You are not following any collections yet.',
    },
  };

  const activeKey = resolveTabKey(tab);
  const active = sections[activeKey];

  const toolbarSections: ToolbarSection[] = TAB_KEYS.map(key => ({
    key,
    label: sections[key].label,
    count: sections[key].content.length,
    href: `/user?tab=${key}`,
  }));

  // Same collection (so the header row, slug and display mode are unchanged section to section),
  // swapping only which blocks the grid renders.
  const sectionCollection: CollectionModel = { ...collection, content: active.content };

  return (
    <PageShell pageType="default" collectionSlug={collection.slug}>
      <h1 className={styles.srOnly}>Your Space</h1>

      <div className={styles.sections}>
        <div className={styles.topBar}>
          <SendMessageButton />
        </div>

        <FollowsProvider initialFollowedIds={followedCollectionIds}>
          <CollectionPageClient
            key={activeKey}
            collection={sectionCollection}
            chunkSize={active.chunkSize}
            serverContentWidth={ssrViewport?.contentWidth}
            serverViewportHeight={ssrViewport?.viewportHeight}
            serverIsMobile={ssrViewport?.isMobile}
            me={principal}
            initialSavedImageIds={savedImageIds}
            sections={toolbarSections}
            activeSectionKey={activeKey}
          />
        </FollowsProvider>

        {active.content.length === 0 && <p className={styles.empty}>{active.emptyLabel}</p>}

        <AccountCard email={principal.email} />
      </div>
    </PageShell>
  );
}
