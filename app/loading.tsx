import { PageShell } from '@/app/components/ui/PageShell/PageShell';

import styles from './loading.module.scss';

/**
 * Route fallback. Renders the real page frame (site header, no footer) around a shimmer body that
 * stretches into the frame's existing full-viewport space, so it carries no height of its own and
 * the handoff to the loaded page does not shift. The footer is omitted so it cannot paint before
 * the content and jump on hydration.
 */
export default function Loading() {
  return (
    <PageShell withFooter={false} className={styles.fill}>
      <div className={styles.body} aria-hidden="true" />
    </PageShell>
  );
}
