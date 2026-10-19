'use client';

import { useRouter } from 'next/navigation';

import { StatusPage } from '@/app/components/ui/StatusPage/StatusPage';
import { type MeResponse } from '@/app/types/Auth';

/**
 * Failed-read state for /collections. A client wrapper because the retry handler cannot cross
 * the server boundary; `router.refresh()` re-runs the page's server read. `me` keeps the site
 * header and bottom nav fed exactly as the success render does.
 */
export function CollectionsReadError({ me }: { me: MeResponse | null }) {
  const router = useRouter();

  return (
    <StatusPage
      me={me}
      title="Collections"
      message="Unable to load collections right now. Please try again later."
      onRetry={() => router.refresh()}
    />
  );
}

export default CollectionsReadError;
