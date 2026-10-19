import { type Metadata } from 'next';
import { unstable_rethrow } from 'next/navigation';
import { Suspense } from 'react';

import { LoadingSpinner } from '@/app/components/LoadingSpinner/LoadingSpinner';
import { CollectionHeader } from '@/app/components/ui/CollectionHeader/CollectionHeader';
import { PageShell } from '@/app/components/ui/PageShell/PageShell';
import { meServer } from '@/app/lib/api/auth';
import { type MeResponse } from '@/app/types/Auth';
import { logger } from '@/app/utils/logger';

import styles from './Explore.module.scss';
import { ExploreDirectory } from './ExploreDirectory';

/**
 * Render on every request. The directory reads through the BFF proxy, which can be unreachable
 * mid-build — same rationale as the taxonomy routes. The reads still use the fetch cache:
 * `force-dynamic` only turns it off for fetches that set no `revalidate` of their own.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Explore — Zac Edens Photography',
  description: 'Browse the photography archive by tag or location.',
};

/**
 * The tag/location directory route.
 *
 * The page awaits only the cached principal read, so the shell and heading reach the browser in
 * the first flush while {@link ExploreDirectory} streams in behind a Suspense boundary. A failed
 * principal read other than a Next control-flow throw degrades to an anonymous shell.
 */
export default async function ExplorePage() {
  let me: MeResponse | null;
  try {
    me = await meServer();
  } catch (error) {
    unstable_rethrow(error);
    logger.warn('ExplorePage', 'Failed to resolve the principal', { error });
    me = null;
  }

  return (
    <PageShell me={me}>
      <CollectionHeader title="Explore" />
      <p className={styles.intro}>Browse the archive by tag or location.</p>

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
