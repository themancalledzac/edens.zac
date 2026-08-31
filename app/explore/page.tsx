import { type Metadata } from 'next';
import { Suspense } from 'react';

import { LoadingSpinner } from '@/app/components/LoadingSpinner/LoadingSpinner';
import { PageShell } from '@/app/components/ui/PageShell/PageShell';

import styles from './Explore.module.scss';
import { ExploreDirectory } from './ExploreDirectory';

/**
 * Render on every request. `getMetadata()` calls `fetchAdminGetApi`, which can fail mid-build
 * before the proxy is live — same rationale as the taxonomy routes.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Explore — Zac Edens Photography',
  description: 'Browse the photography archive by tag or location.',
};

/**
 * The tag/location directory route.
 *
 * The page itself awaits nothing, so the shell and heading reach the browser in the first flush
 * while {@link ExploreDirectory} streams in behind a Suspense boundary. Before the split, one
 * backend read held the entire response — including the site header — for its whole duration.
 */
export default function ExplorePage() {
  return (
    <PageShell>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Explore</h1>
        <p className={styles.intro}>Browse the archive by tag or location.</p>
      </header>

      <Suspense
        fallback={
          <div className={styles.directoryPending}>
            <LoadingSpinner size="large" color="dark" />
          </div>
        }
      >
        <ExploreDirectory />
      </Suspense>
    </PageShell>
  );
}
