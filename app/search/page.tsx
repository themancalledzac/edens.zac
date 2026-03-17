import { type Metadata } from 'next';

import SearchPage from '@/app/components/SearchPage/SearchPage';

export const metadata: Metadata = {
  title: 'Search — Zac Edens Photography',
  description: 'Search and filter photography by Zac Edens',
  openGraph: {
    title: 'Search — Zac Edens Photography',
    description: 'Search and filter photography by Zac Edens',
    type: 'website',
  },
};

/**
 * Search Page Route
 *
 * POC search/filter page for browsing all public images.
 * Uses mock data until the backend search endpoint is available.
 * See todo/backend-requirements-search.md for backend requirements.
 *
 * Filter state is stored in URL search params for shareability.
 */
export default function SearchPageRoute() {
  // In production, this would fetch from GET /api/read/content/search
  // with query params forwarded from the URL
  // For now, the SearchPage component handles mock data internally
  return <SearchPage />;
}
