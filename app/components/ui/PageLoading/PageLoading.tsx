import { PageShell } from '@/app/components/ui/PageShell/PageShell';

import styles from './PageLoading.module.scss';

/**
 * Page loading fallback. Renders the real page frame (site header) around a shimmer body that
 * stretches into the frame's existing full-viewport space, so it carries no height of its own and
 * the handoff to the loaded page does not shift. Used by `app/(site)/loading.tsx` and by the
 * `<Suspense>` boundaries inside the collection, tag and location pages.
 */
export function PageLoading() {
  return (
    <PageShell className={styles.fill}>
      <div className={styles.body} aria-hidden="true" />
    </PageShell>
  );
}
