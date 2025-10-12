import { PAGINATION } from '@/app/constants';
import { fetchHomePage } from '@/app/lib/api/home';

import ContentCollectionPage from './components/ContentCollection/ContentCollectionPage';

/**
 * Home Page
 *
 * Main landing page component that displays a curated collection of content cards.
 * Fetches home page data with priority filtering and renders using the shared
 * ContentCollectionPage component.
 *
 * @dependencies
 * - fetchHomePage - API function for retrieving home page content
 * - ContentCollectionPage - Shared component for displaying content collections
 *
 * @returns React Server Component displaying home page content
 */
export default function HomePage() {
  const homeCardsPromise = fetchHomePage({ maxPriority: 2, limit: PAGINATION.homePageSize });

  return <ContentCollectionPage cardsPromise={homeCardsPromise} />;
}
