import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import SiteHeader from '@/app/components/SiteHeader/SiteHeader';
import { meServer } from '@/app/lib/api/auth';
import { listAllSelectsServer } from '@/app/lib/api/selects';

import styles from './page.module.scss';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your Selects',
  robots: { index: false, follow: false },
};

/**
 * The signed-in viewer's personal Selects across all their galleries. Anonymous viewers get a 404
 * (the page does not exist for them — mirrors the self-only `/api/read/user/*` contract). Selects
 * are grouped by collection; each group links back to that collection.
 */
export default async function UserSelectsPage() {
  const me = await meServer();
  if (!me) {
    notFound();
  }

  const groups = await listAllSelectsServer();

  return (
    <div className={styles.container}>
      <SiteHeader pageType="default" />
      <h1 className={styles.heading}>Your Selects</h1>

      {groups.length === 0 ? (
        <p className={styles.empty}>You have not selected any images yet.</p>
      ) : (
        groups.map(group => (
          <section key={group.collectionId} className={styles.group}>
            <h2 className={styles.groupHeading}>
              <Link href={`/?collection=${group.collectionId}`}>
                Collection {group.collectionId}
              </Link>
            </h2>
            <ul className={styles.ids}>
              {group.contentIds.map(id => (
                <li key={id} className={styles.idChip}>
                  Image {id}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
