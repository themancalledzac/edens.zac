import SiteHeader from '@/app/components/site-header';

import styles from '../../page.module.scss';

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