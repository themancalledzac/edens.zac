import { type ReactNode } from 'react';

import { EmptyState } from '@/app/components/ui/StatusText/EmptyState';
import { LoadError } from '@/app/components/ui/StatusText/LoadError';
import { LoadingText } from '@/app/components/ui/StatusText/LoadingText';
import { StaleNotice } from '@/app/components/ui/StatusText/StaleNotice';

/**
 * Branch predicates for {@link PanelBody}, held on an object so a test can replace one and watch
 * the branch order matter.
 */
export const panelBodyGuards = {
  showsLoadError(loadError: string | null): boolean {
    return loadError !== null;
  },
};

interface PanelBodyProps {
  loading: boolean;
  loadError: string | null;
  revalidationFailed: boolean;
  onRetry: () => void;
  loadingLabel: string;
  isEmpty: boolean;
  emptyLabel: ReactNode;
  children: ReactNode;
}

/**
 * The shared body of a list panel: loading, then a load error with Retry, then the empty state,
 * then the stale notice over the data.
 *
 * The error branch sits ahead of the empty branch on purpose. A failed fetch leaves the list empty,
 * and rendering the empty label there would present a dead backend as "no items". The loading text
 * stays mounted beside the swapped content so its live region announces each transition.
 */
export function PanelBody({
  loading,
  loadError,
  revalidationFailed,
  onRetry,
  loadingLabel,
  isEmpty,
  emptyLabel,
  children,
}: PanelBodyProps) {
  return (
    <>
      <LoadingText isLoading={loading}>{loadingLabel}</LoadingText>
      {!loading && panelBodyGuards.showsLoadError(loadError) && loadError !== null && (
        <LoadError message={loadError} onRetry={onRetry} />
      )}
      {!loading && !panelBodyGuards.showsLoadError(loadError) && isEmpty && (
        <EmptyState>{emptyLabel}</EmptyState>
      )}
      {!loading && !panelBodyGuards.showsLoadError(loadError) && !isEmpty && (
        <>
          {revalidationFailed && <StaleNotice />}
          {children}
        </>
      )}
    </>
  );
}
