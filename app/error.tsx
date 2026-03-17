"use client";

/**
 * Global Error Boundary
 *
 * Client-side error boundary component that renders fallback UI when
 * unhandled errors occur in the application. Provides error recovery
 * functionality and optional error reporting integration.
 *
 * @dependencies
 * - React for useEffect hook and component structure
 * - layout.module.scss for styling
 *
 * @param error - Error object with optional digest for tracking
 * @param reset - Function to attempt error recovery and re-render
 * @returns Client component with error message and retry functionality
 */
import { useEffect } from 'react';

import { logger } from '@/app/utils/logger';

import styles from './styles/layout.module.scss';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('app', 'Unhandled error boundary', error);
  }, [error]);

  return (
    <main className={styles.main}>
      <h1>Something went wrong</h1>
      {error?.digest ? (
        <p className={styles.errorMessage}>Error ID: {error.digest}</p>
      ) : null}
      <button onClick={() => reset()} className={styles.retryButton}>
        Try again
      </button>
    </main>
  );
}
