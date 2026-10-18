import { SEARCH_RESULT_LIMIT } from '@/app/components/SearchPage/searchFilters';
import SearchPageClient from '@/app/components/SearchPage/SearchPageClient';
import { searchImages } from '@/app/lib/api/content';
import { resolveSsrViewport } from '@/app/utils/ssrViewport';

/**
 * Fetches the search corpus and hands it to the client filter surface.
 *
 * Split out of the route so the fetch sits inside a Suspense boundary rather than in front of
 * the whole response. Read failures still fall through to `error.tsx`.
 */
export async function SearchResults() {
  const [images, ssrViewport] = await Promise.all([
    searchImages({ size: SEARCH_RESULT_LIMIT }),
    resolveSsrViewport(),
  ]);

  return <SearchPageClient images={images} ssrViewport={ssrViewport} />;
}

export default SearchResults;
