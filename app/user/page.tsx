import { notFound } from 'next/navigation';

import CollectionPage from '@/app/components/ContentCollection/CollectionPage';
import LocationCollections from '@/app/components/LocationPage/LocationCollections';
import { FollowsProvider } from '@/app/components/Personal/FollowsContext';
import { SavedImagesGrid } from '@/app/components/Personal/SavedImagesGrid';
import { meServer } from '@/app/lib/api/auth';
import { getAllCollections } from '@/app/lib/api/collections';
import {
  listFollowedCollectionIdsServer,
  listSavedImageIdsServer,
  listSavedImagesServer,
} from '@/app/lib/api/personal';
import { getUserPage } from '@/app/lib/api/user';

import styles from './page.module.scss';

export const dynamic = 'force-dynamic';

/**
 * Session-gated self-only page for the signed-in user: their galleries and tagged content (via the
 * standard collection pipeline), followed by "Saved" (bookmarked images) and "Following" (followed
 * collections) shelves. Anonymous visitors get a 404 (no login surface exists yet — invite/onboarding
 * is a later Phase C slice).
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

  const followedSet = new Set(followedCollectionIds);
  const followedCollections = allCollections.filter(c => followedSet.has(c.id));

  // showSendMessage surfaces a "Send a message" button in the filter-bar area of the
  // user's own page, which opens the contact form in a modal.
  return (
    <>
      <CollectionPage
        collection={collection}
        me={principal}
        initialSavedImageIds={savedImageIds}
        showSendMessage
      />

      <div className={styles.sections}>
        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Saved</h2>
          {savedImages.length === 0 ? (
            <p className={styles.empty}>You have not saved any images yet.</p>
          ) : (
            <SavedImagesGrid
              images={savedImages}
              me={principal}
              initialSavedImageIds={savedImageIds}
            />
          )}
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Following</h2>
          {followedCollections.length === 0 ? (
            <p className={styles.empty}>You are not following any collections yet.</p>
          ) : (
            <FollowsProvider initialFollowedIds={followedCollectionIds}>
              <LocationCollections collections={followedCollections} />
            </FollowsProvider>
          )}
        </section>
      </div>
    </>
  );
}
