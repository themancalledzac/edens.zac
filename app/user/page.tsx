import { notFound } from 'next/navigation';

import { MeProvider } from '@/app/components/auth/MeProvider';
import ContentBlockWithFullScreen from '@/app/components/Content/ContentBlockWithFullScreen';
import LocationCollections from '@/app/components/LocationPage/LocationCollections';
import { AccountCard } from '@/app/components/Personal/AccountCard';
import { CollapsibleSection } from '@/app/components/Personal/CollapsibleSection';
import { FollowsProvider } from '@/app/components/Personal/FollowsContext';
import { PersonalContentGrid } from '@/app/components/Personal/PersonalContentGrid';
import { SavesProvider } from '@/app/components/Personal/SavesContext';
import { SendMessageButton } from '@/app/components/SendMessageButton/SendMessageButton';
import { PageShell } from '@/app/components/ui/PageShell/PageShell';
import { meServer } from '@/app/lib/api/auth';
import { getAllCollections } from '@/app/lib/api/collections';
import { listFollowedCollectionIdsServer, listSavedImagesServer } from '@/app/lib/api/personal';
import { getUserPage } from '@/app/lib/api/user';
import { type AnyContentModel, type ViewableContent } from '@/app/types/Content';
import { isContentCollection, isContentImage, isGifContent } from '@/app/utils/contentTypeGuards';
import { resolveSsrViewport } from '@/app/utils/ssrViewport';

import styles from './page.module.scss';

export const dynamic = 'force-dynamic';

/** Split the synthetic user collection's content into COLLECTION blocks and IMAGE/GIF blocks. */
function splitUserContent(content: AnyContentModel[] | undefined): {
  collectionBlocks: AnyContentModel[];
  imageBlocks: ViewableContent[];
} {
  const collectionBlocks: AnyContentModel[] = [];
  const imageBlocks: ViewableContent[] = [];
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
 * Session-gated self-only "Your Space" page for the signed-in user. Renders four ordered,
 * collapsible sections — Collections (open), Images (tagged), Saved (bookmarks), Following — each
 * headed by a title card, then an Account card (email + passkey enrollment) below the stack.
 * Anonymous visitors get a 404; sign-in lives at `/login` (which lands here on success) and
 * onboarding at the invite-link flow.
 */
export default async function UserPage() {
  const principal = await meServer();
  if (!principal) notFound();

  const [collection, savedImages, followedCollectionIds, allCollections, ssrViewport] =
    await Promise.all([
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
  const followedCollections = allCollections.filter(c => followedSet.has(c.id));

  return (
    <PageShell pageType="default" collectionSlug={collection.slug}>
      <h1 className={styles.srOnly}>Your Space</h1>

      {/* Collection "first row": the cover-image + title/description header every collection page
          shows at the top. Rendered with empty body content + the user collection as collectionData,
          so the layout pipeline prepends only the header row (createHeaderRow) and no gallery tiles.
          The cover is the LCP (priorityBlockIndex 0), sized server-side to avoid layout shift; it is
          an intro, not a gallery tile, so fullscreen viewing is off and it needs no SaveHeart
          providers. */}
      <ContentBlockWithFullScreen
        content={[]}
        collectionData={collection}
        priorityBlockIndex={0}
        enableFullScreenView={false}
        serverContentWidth={ssrViewport?.contentWidth}
        serverViewportHeight={ssrViewport?.viewportHeight}
        serverIsMobile={ssrViewport?.isMobile}
      />

      {/* One MeProvider + SavesProvider wraps every section so SaveHeart renders and toggles
            consistently across the Images and Saved grids (a single source of truth for the saved
            set — no per-section provider desync). The Collections grid renders no hearts (SaveHeart
            gates on contentType === 'IMAGE'), so the shared SavesProvider is a no-op there. */}
      <MeProvider me={principal}>
        <SavesProvider initialSavedIds={savedImageIds}>
          <div className={styles.sections}>
            <div className={styles.topBar}>
              <SendMessageButton />
            </div>

            <CollapsibleSection
              label="Collections"
              count={collectionBlocks.length}
              defaultOpen
              emptyLabel="No collections yet."
            >
              <PersonalContentGrid content={collectionBlocks} />
            </CollapsibleSection>

            <CollapsibleSection
              label="Images"
              count={imageBlocks.length}
              emptyLabel="You are not tagged in any images yet."
            >
              <PersonalContentGrid content={imageBlocks} />
            </CollapsibleSection>

            <CollapsibleSection
              label="Saved"
              count={savedImages.length}
              emptyLabel="You have not saved any images yet."
            >
              <PersonalContentGrid content={savedImages} />
            </CollapsibleSection>

            <CollapsibleSection
              label="Following"
              count={followedCollections.length}
              emptyLabel="You are not following any collections yet."
            >
              <FollowsProvider initialFollowedIds={followedCollectionIds}>
                <LocationCollections collections={followedCollections} />
              </FollowsProvider>
            </CollapsibleSection>

            <AccountCard email={principal.email} />
          </div>
        </SavesProvider>
      </MeProvider>
    </PageShell>
  );
}
