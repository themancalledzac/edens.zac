'use client';

import { useEffect } from 'react';

import { StatusPage } from '@/app/components/ui/StatusPage/StatusPage';
import { logger } from '@/app/utils/logger';

/**
 * Error boundary for `/search`.
 *
 * The root boundary would already catch this, but it can only offer "head back home". A failed
 * search read is almost always a transient backend hiccup on a page whose entire content is one
 * fetch, so the useful recovery is retrying that fetch — which is what `reset()` does. Saying so
 * in the message is the difference between a dead end and a working page one click away.
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
