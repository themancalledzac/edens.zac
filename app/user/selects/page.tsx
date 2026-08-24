import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import SiteHeader from '@/app/components/SiteHeader/SiteHeader';
import { SkipTarget } from '@/app/components/ui/SkipLink/SkipLink';
import { EmptyState } from '@/app/components/ui/StatusText/EmptyState';
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
 *
 * This page builds its own container instead of using `PageShell`, so it supplies the
 * {@link SkipTarget} half of the skip-link pair itself — the link is site-wide and unconditional.
 */
export default async function UserSelectsPage() {
  const me = await meServer();
  if (!me) {
    notFound();
  }

  const groups = await listAllSelectsServer();

  return (
    <div className={styles.container}>
      <SiteHeader />
      <SkipTarget>
        <h1 className={styles.heading}>Your Selects</h1>

        {groups.length === 0 ? (
          <EmptyState>You have not selected any images yet.</EmptyState>
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
      </SkipTarget>
    </div>
  );
}
