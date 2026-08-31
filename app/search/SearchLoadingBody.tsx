import { LoadingSpinner } from '@/app/components/LoadingSpinner/LoadingSpinner';
import { CollectionHeader } from '@/app/components/ui/CollectionHeader/CollectionHeader';

import styles from './loading.module.scss';

/**
 * The heading-plus-spinner body shown while the search corpus loads.
 *
 * Shared by `loading.tsx` (navigation into the route) and the route's own Suspense fallback
 * (streaming the first response), so the two cannot drift into showing different placeholders.
 * `SearchPageClient` renders the same {@link CollectionHeader} once the corpus lands.
 */
export function SearchLoadingBody() {
  return (
    <>
      <CollectionHeader title="Search" />
      <div className={styles.spinner}>
        <LoadingSpinner size="large" color="dark" />
      </div>
    </>
  );
}

export default SearchLoadingBody;
