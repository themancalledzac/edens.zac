import { Button } from '@/app/components/ui/Button/Button';

import styles from './StatusText.module.scss';

export interface LoadErrorProps {
  /** What failed, in the caller's own words. Already a sentence — this renders it verbatim. */
  message: string;
  /** Runs the read again. Wire it to the same refetch the panel uses on mount. */
  onRetry: () => void;
}

/**
 * The message shown when a read failed and there is nothing to show in its place.
 *
 * The failed-read branch of the same family as {@link EmptyState}, {@link LoadingText} and
 * {@link StaleNotice} — the one that was described in `EmptyState`'s docblock as needing its own
 * treatment but never written, so five call sites hand-rolled it identically instead: all four
 * admin panels plus `RoleDetailView`, which reached across into `RolesPanel.module.scss` for the
 * rule rather than declaring a fifth copy.
 *
 * Deliberately unlike {@link EmptyState}: an empty state claims there is nothing here, which is a
 * statement about the data, and rendering one after a failed fetch says something false. This says
 * the read failed and offers the way out. It is the loud member of the family — the other three are
 * muted on purpose so this one can carry the danger color alone.
 *
 * `role="alert"` rather than `role="status"`: unlike the pending and cached-data messages, this one
 * reports a dead end the user has to act on, and it always arrives as a change to an already-mounted
 * subtree (the panel was loading a moment ago), which is the insertion case that DOES announce
 * reliably. See {@link LoadingText}'s docblock for why the other two cannot rely on that.
 *
 * The Retry control is part of the component rather than a slot. Every call site passed the same
 * `secondary`/`sm` Button with the same label, and a failed read whose recovery affordance differs
 * per panel reads as a bug on a hub where the panels sit side by side.
 */
export function LoadError({ message, onRetry }: LoadErrorProps) {
  return (
    <div className={styles.loadError} role="alert">
      <p className={styles.loadErrorMessage}>{message}</p>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

export default LoadError;
