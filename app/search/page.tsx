import { type Metadata } from 'next';
import { unstable_rethrow } from 'next/navigation';
import { Suspense } from 'react';

import { PageShell } from '@/app/components/ui/PageShell/PageShell';
import { meServer } from '@/app/lib/api/auth';
import { type MeResponse } from '@/app/types/Auth';
import { logger } from '@/app/utils/logger';

import { SearchLoadingBody } from './SearchLoadingBody';
import { SearchResults } from './SearchResults';

export const metadata: Metadata = {
  title: 'Search — Zac Edens Photography',
  description: 'Search photography by tag, person, location, camera and lens.',
  openGraph: {
    title: 'Search — Zac Edens Photography',
    description: 'Search photography by tag, person, location, camera and lens.',
    type: 'website',
  },
};

/**
 * See app/tag/[slug]/page.tsx for the rationale; this route also reads filter state from
 * search params, which a prerendered page has no access to.
 */
export const dynamic = 'force-dynamic';

/**
 * The public search route.
 *
 * The corpus fetch is the largest read on the site and used to sit in front of the whole
 * response. It now streams inside a Suspense boundary, so the shell and heading flush first and
 * only the grid waits. Read failures still fall through to `error.tsx`; a failed principal read
 * other than a Next control-flow throw degrades to an anonymous shell.
 */
export default async function SearchRoute() {
  let me: MeResponse | null;
  try {
    me = await meServer();
  } catch (error) {
    unstable_rethrow(error);
    logger.warn('SearchRoute', 'Failed to resolve the principal', { error });
    me = null;
  }

  return (
    <PageShell me={me}>
      <Suspense fallback={<SearchLoadingBody />}>
        <SearchResults />
      </Suspense>
    </PageShell>
  );
}
