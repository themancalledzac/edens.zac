import { type Metadata } from 'next';

import { SEARCH_RESULT_LIMIT } from '@/app/components/SearchPage/searchFilters';
import SearchPageClient from '@/app/components/SearchPage/SearchPageClient';
import { PageShell } from '@/app/components/ui/PageShell/PageShell';
import { searchImages } from '@/app/lib/api/content';

export const metadata: Metadata = {
  title: 'Search — Zac Edens Photography',
  description: 'Search photography by tag, person, location, camera and lens.',
  openGraph: {
    title: 'Search — Zac Edens Photography',
    description: 'Search photography by tag, person, location, camera and lens.',
    type: 'website',
  },
};

// Render on every request rather than at build time. See app/tag/[slug]/page.tsx for the
// rationale — the same trade-off applies, and this route additionally reads its filter state
// from search params, which a prerendered page has no access to.
export const dynamic = 'force-dynamic';

/**
 * The public search route.
 *
 * One fetch, deliberately: the corpus is pulled once here and every filter dimension is then
 * derived from it client-side. Read failures are not caught — they belong to `error.tsx`, which
 * can offer a retry, whereas a caught error here could only render an empty page that would be
 * indistinguishable from a genuinely empty result.
 */
export default async function SearchRoute() {
  const images = await searchImages({ size: SEARCH_RESULT_LIMIT });

  return (
    <PageShell>
      <SearchPageClient images={images} />
    </PageShell>
  );
}
