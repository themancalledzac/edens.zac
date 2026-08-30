import { LoadingSpinner } from '@/app/components/LoadingSpinner/LoadingSpinner';
import { CollectionHeader } from '@/app/components/ui/CollectionHeader/CollectionHeader';
import { PageShell } from '@/app/components/ui/PageShell/PageShell';

import styles from './loading.module.scss';

/**
 * Route-level loading UI for `/search`.
 *
 * The root `app/loading.tsx` would cover this route already, but it reserves the viewport for a
 * bare spinner — so the header and site chrome pop in afterwards and the page shifts. Search has a
 * fixed heading, so rendering the real shell and heading now means the only thing that changes
 * when data lands is the grid below them.
 */
export default function SearchLoading() {
  return (
    <PageShell>
      <CollectionHeader title="Search" />
      <div className={styles.spinner}>
        <LoadingSpinner size="large" color="dark" />
      </div>
    </PageShell>
  );
}
