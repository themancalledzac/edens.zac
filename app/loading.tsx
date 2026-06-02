import { LoadingSpinner } from '@/app/components/LoadingSpinner/LoadingSpinner';

import styles from './loading.module.scss';

export default function Loading() {
  // Reserve the full viewport while the route's data is fetched so the page
  // doesn't collapse to a bare spinner (which let the footer render first and
  // jump on hydration). color="dark" keeps the spinner visible on the surface.
  return (
    <div className={styles.loading}>
      <LoadingSpinner size="large" color="dark" />
    </div>
  );
}
