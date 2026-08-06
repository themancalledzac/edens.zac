import { type ReactNode } from 'react';

import styles from './StatusText.module.scss';

export interface EmptyStateProps {
  children: ReactNode;
  /**
   * `inline` sits flush inside a panel body or list that already has padding. `page` centres the
   * message and gives it its own vertical room, for a whole grid or route that resolved to nothing.
   */
  align?: 'inline' | 'page';
  className?: string;
}

/**
 * The message shown when a surface has nothing to display.
 *
 * Use it for a genuinely empty result — never for a read that failed. An empty state tells the
 * viewer there is nothing here, which is a claim about the data; rendering one after an error says
 * something false. Failed reads get their own branch (see `UserManagementPanel`, where the two are
 * deliberately styled apart so a dead backend cannot read as an empty list).
 */
export function EmptyState({ children, align = 'inline', className }: EmptyStateProps) {
  const classes = [styles.text, styles[align], className].filter(Boolean).join(' ');
  return <p className={classes}>{children}</p>;
}

export default EmptyState;
