import { LoadingSpinner } from '@/app/components/LoadingSpinner/LoadingSpinner';
import { CollectionHeader } from '@/app/components/ui/CollectionHeader/CollectionHeader';
import { PageShell } from '@/app/components/ui/PageShell/PageShell';

import styles from './loading.module.scss';

/**
 * Loading UI for `/search`. Renders the real shell and heading, unlike the root spinner, so only
 * the grid appears when data lands.
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
