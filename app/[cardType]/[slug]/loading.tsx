import SiteHeader from '@/app/components/SiteHeader/SiteHeader';

import styles from '../../page.module.scss';

/**
 * Loading Page
 *
 * Loading state component for dynamic collection routes. Displays
 * consistent layout with site header and loading message while
 * content collection data is being fetched.
 *
 * @dependencies
 * - SiteHeader for navigation consistency
 * - page.module.scss for layout styling
 *
 * @returns Loading UI component for collection pages
 */
export default function Loading() {
  return (
    <div>
      <SiteHeader />
      <div className={styles.main}>
        <p>Loading content...</p>
      </div>
    </div>
  );
}