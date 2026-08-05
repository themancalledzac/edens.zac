import { type ReactNode } from 'react';

import styles from './StatusText.module.scss';

export interface LoadingTextProps {
  children: ReactNode;
  /** See {@link EmptyStateProps.align} — same two placements, same meaning. */
  align?: 'inline' | 'page';
  className?: string;
}

/**
 * Text shown while a read is in flight.
 *
 * Carries `role="status"` + `aria-live="polite"` so the wait is announced. That is the reason this
 * exists as a component rather than a convention: of the six hand-rolled loading messages this
 * replaces, only one announced itself, so screen-reader users got silence where sighted users got
 * "Loading…". `Button` already handles its own pending state via its `loading` prop — use that for
 * a control, and this for a region.
 */
export function LoadingText({ children, align = 'inline', className }: LoadingTextProps) {
  const classes = [styles.text, styles[align], className].filter(Boolean).join(' ');
  return (
    <p className={classes} role="status" aria-live="polite">
      {children}
    </p>
  );
}

export default LoadingText;
