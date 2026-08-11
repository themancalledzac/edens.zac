import styles from './StatusText.module.scss';

export interface StaleNoticeProps {
  /** See {@link EmptyStateProps.align} — same two placements, same meaning. */
  align?: 'inline' | 'page';
  className?: string;
}

/**
 * The line shown above content that is being served from cache after a refresh failed.
 *
 * It exists because the other two messages in this family both describe an absence, and this one
 * describes something worse: content that is present, looks current, and is not. An admin panel
 * backed by `useCachedPanelData` paints instantly from localStorage and reconciles in the
 * background; when that background read fails there is no error branch to fall into, because
 * there IS something on screen. Without this the panel would keep presenting a dead backend's
 * last known user list as fact, indefinitely, across reloads.
 *
 * Muted rather than alarming, and deliberately the same weight as {@link EmptyState}: the data is
 * probably still right, and the panel's own `loadError` branch already owns the loud case where
 * there is nothing to show at all.
 *
 * `role="status"` announces the change politely. The insertion caveat in {@link LoadingText}'s
 * docblock applies — a live region that arrives with its text already in it is not reliably
 * announced — so this is an improvement for screen-reader users, not a guarantee for them.
 */
export function StaleNotice({ align = 'inline', className }: StaleNoticeProps) {
  const classes = [styles.text, styles[align], className].filter(Boolean).join(' ');
  return (
    <p className={classes} role="status">
      Showing cached data — the latest could not be loaded.
    </p>
  );
}

export default StaleNotice;
