'use client';

import { useEffect } from 'react';

import { logger } from '@/app/utils/logger';

import styles from '../styles/layout.module.scss';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('admin', 'Unhandled admin error boundary', error);
  }, [error]);

  return (
    <main className={styles.main}>
      <h1>Admin Error — Something went wrong</h1>
      {error?.digest ? <p className={styles.errorMessage}>Error ID: {error.digest}</p> : null}
      <button onClick={() => reset()} className={styles.retryButton}>
        Try again
      </button>
    </main>
  );
}
