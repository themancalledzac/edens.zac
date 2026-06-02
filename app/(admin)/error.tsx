'use client';

import { useEffect } from 'react';

import { StatusPage } from '@/app/components/ui/StatusPage/StatusPage';
import { logger } from '@/app/utils/logger';

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
    <StatusPage
      title="Admin Error — Something went wrong"
      message="An unexpected error occurred in the admin area."
      detail={error?.digest ? `Error ID: ${error.digest}` : undefined}
      onRetry={() => reset()}
    />
  );
}
