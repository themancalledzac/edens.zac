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

// See app/tag/[slug]/page.tsx for the rationale; this route also reads filter state from
// search params, which a prerendered page has no access to.
export const dynamic = 'force-dynamic';

/**
 * The public search route. Fetches the corpus once; read failures fall through to `error.tsx`.
 */
export default async function SearchRoute() {
  const images = await searchImages({ size: SEARCH_RESULT_LIMIT });

  return (
    <PageShell>
      <SearchPageClient images={images} />
    </PageShell>
  );
}
