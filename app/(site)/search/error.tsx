'use client';

import { useEffect } from 'react';

import { StatusPage } from '@/app/components/ui/StatusPage/StatusPage';
import { logger } from '@/app/utils/logger';

/**
 * Error boundary for `/search`. Offers a retry rather than the root boundary's "back home",
 * since the whole page is one fetch and `reset()` re-runs it.
 */
export default function SearchError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('app/search', 'Search read failed', error);
  }, [error]);

  return (
    <StatusPage
      title="Search is unavailable"
      message="The photo search could not be loaded. This is usually temporary — try again in a moment."
      detail={error?.digest ? `Error ID: ${error.digest}` : undefined}
      onRetry={() => reset()}
    />
  );
}
