import { notFound } from 'next/navigation';

import { MeProvider } from '@/app/components/auth/MeProvider';
import LocationCollections from '@/app/components/LocationPage/LocationCollections';
import { CollapsibleSection } from '@/app/components/Personal/CollapsibleSection';
import { FollowsProvider } from '@/app/components/Personal/FollowsContext';
import { PersonalContentGrid } from '@/app/components/Personal/PersonalContentGrid';
import { SendMessageButton } from '@/app/components/SendMessageButton/SendMessageButton';
import SiteHeader from '@/app/components/SiteHeader/SiteHeader';
import { meServer } from '@/app/lib/api/auth';
import { getAllCollections } from '@/app/lib/api/collections';
import {
  listFollowedCollectionIdsServer,
  listSavedImageIdsServer,
  listSavedImagesServer,
} from '@/app/lib/api/personal';
import { getUserPage } from '@/app/lib/api/user';
import { type AnyContentModel, type ViewableContent } from '@/app/types/Content';
import { isContentCollection, isContentImage, isGifContent } from '@/app/utils/contentTypeGuards';

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
 * headed by a title card. Anonymous visitors get a 404 (no login surface exists yet — invite /
 * onboarding is a later Phase C slice).
 */
export default async function UserPage() {
  const principal = await meServer();
  if (!principal) notFound();

  const [collection, savedImages, savedImageIds, followedCollectionIds, allCollections] =
    await Promise.all([
      getUserPage(),
      listSavedImagesServer(),
      listSavedImageIdsServer(),
      listFollowedCollectionIdsServer(),
      getAllCollections(0, 500),
    ]);
  if (!collection) notFound();

  const { collectionBlocks, imageBlocks } = splitUserContent(collection.content);

  const followedSet = new Set(followedCollectionIds);
  const followedCollections = allCollections.filter(c => followedSet.has(c.id));

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <SiteHeader pageType="collection" collectionSlug={collection.slug} />

        <div className={styles.sections}>
          <div className={styles.topBar}>
            <MeProvider me={principal}>
              <SendMessageButton />
            </MeProvider>
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
            <PersonalContentGrid
              content={imageBlocks}
              withSaves
              me={principal}
              initialSavedImageIds={savedImageIds}
            />
          </CollapsibleSection>

          <CollapsibleSection
            label="Saved"
            count={savedImages.length}
            emptyLabel="You have not saved any images yet."
          >
            <PersonalContentGrid
              content={savedImages}
              withSaves
              me={principal}
              initialSavedImageIds={savedImageIds}
            />
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
        </div>
      </main>
    </div>
  );
}
