import { type ReactNode } from 'react';

import { Button } from '@/app/components/ui/Button/Button';
import { NavLink } from '@/app/components/ui/NavLink/NavLink';
import { PageShell } from '@/app/components/ui/PageShell/PageShell';

import styles from './StatusPage.module.scss';

export interface StatusPageProps {
  title: string;
  message: string;
  /** Optional detail line (e.g. an error digest). */
  detail?: ReactNode;
  /** When provided, renders a "Try again" button wired to this handler. */
  onRetry?: () => void;
  /** Show the "Return home" link (default true). */
  showHomeLink?: boolean;
  /** Render the SiteHeader chrome (default true). */
  withHeader?: boolean;
}

/**
 * Canonical 404 / error / empty-state page on the painted, dark-safe surface.
 * Readable pattern: role="alert", a type=button retry, and a home link.
 */
export function StatusPage({
  title,
  message,
  detail,
  onRetry,
  showHomeLink = true,
  withHeader = true,
}: StatusPageProps) {
  return (
    <PageShell withHeader={withHeader}>
      <div className={styles.status} role="alert">
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.message}>{message}</p>
        {detail && <p className={styles.detail}>{detail}</p>}
        {(onRetry || showHomeLink) && (
          <div className={styles.actions}>
            {onRetry && (
              <Button type="button" variant="primary" onClick={onRetry}>
                Try again
              </Button>
            )}
            {showHomeLink && <NavLink href="/">Return home</NavLink>}
          </div>
        )}
      </div>
    </PageShell>
  );
}

export default StatusPage;
