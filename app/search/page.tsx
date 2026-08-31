import { type Metadata } from 'next';
import { Suspense } from 'react';

import { PageShell } from '@/app/components/ui/PageShell/PageShell';

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
 * only the grid waits. Read failures still fall through to `error.tsx`.
 */
export default function SearchRoute() {
  return (
    <PageShell>
      <Suspense fallback={<SearchLoadingBody />}>
        <SearchResults />
      </Suspense>
    </PageShell>
  );
}
