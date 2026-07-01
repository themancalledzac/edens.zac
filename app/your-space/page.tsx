import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import LocationCollections from '@/app/components/LocationPage/LocationCollections';
import { FollowsProvider } from '@/app/components/Personal/FollowsContext';
import SiteHeader from '@/app/components/SiteHeader/SiteHeader';
import { meServer } from '@/app/lib/api/auth';
import { getAllCollections } from '@/app/lib/api/collections';
import { listFollowedCollectionIdsServer, listSavedImageIdsServer } from '@/app/lib/api/personal';

import styles from './page.module.scss';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your Space',
  robots: { index: false, follow: false },
};

/**
 * The signed-in viewer's "Your Space": saved (bookmarked) images and followed collections.
 * Anonymous viewers get a 404 (the page does not exist for them — mirrors the self-only
 * `/api/read/user/*` contract).
 *
 * Saved images render as id tiles: the backend `GET /user/saves` returns bare ids and there is no
 * batch-image-by-ids endpoint, so a full image grid would need a new backend read. Followed
 * collections render as real cards by fetching the collections index and filtering to the followed
 * ids.
 */
export default async function YourSpacePage() {
  const me = await meServer();
  if (!me) {
    notFound();
  }

  const [savedImageIds, followedCollectionIds, allCollections] = await Promise.all([
    listSavedImageIdsServer(),
    listFollowedCollectionIdsServer(),
    getAllCollections(0, 500),
  ]);

  const followedSet = new Set(followedCollectionIds);
  const followedCollections = allCollections.filter(c => followedSet.has(c.id));

  return (
    <div className={styles.container}>
      <SiteHeader pageType="default" />
      <h1 className={styles.heading}>Your Space</h1>

      <section className={styles.shelf}>
        <h2 className={styles.shelfHeading}>Saved images</h2>
        {savedImageIds.length === 0 ? (
          <p className={styles.empty}>You have not saved any images yet.</p>
        ) : (
          <ul className={styles.ids}>
            {savedImageIds.map(id => (
              <li key={id} className={styles.idChip}>
                Image {id}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.shelf}>
        <h2 className={styles.shelfHeading}>Followed collections</h2>
        {followedCollections.length === 0 ? (
          <p className={styles.empty}>You are not following any collections yet.</p>
        ) : (
          <FollowsProvider initialFollowedIds={followedCollectionIds}>
            <LocationCollections collections={followedCollections} />
          </FollowsProvider>
        )}
      </section>
    </div>
  );
}
