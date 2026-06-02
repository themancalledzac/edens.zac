'use client';

import { useEffect } from 'react';

import { StatusPage } from '@/app/components/ui/StatusPage/StatusPage';
import { logger } from '@/app/utils/logger';

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
    <StatusPage
      title="Something went wrong"
      message="An unexpected error occurred. You can retry, or head back home."
      detail={error?.digest ? `Error ID: ${error.digest}` : undefined}
      onRetry={() => reset()}
    />
  );
}
