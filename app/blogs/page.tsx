import { fetchCollectionsByType } from '@/lib/api/home';

import ContentCollectionPage from '../components/ContentCollectionPage';

/**
 * Blogs Page
 *
 * Dedicated page for displaying blog-type content collections. Filters
 * content by BLOG type and renders using the shared ContentCollectionPage
 * component for consistent layout and functionality.
 *
 * @dependencies
 * - fetchCollectionsByType - API function for type-filtered content retrieval
 * - ContentCollectionPage - Shared component for displaying collections
 *
 * @returns Server component displaying blog collections
 */
export default function BlogsPage() {
  const blogsCardsPromise = fetchCollectionsByType('BLOG');

  return <ContentCollectionPage cardsPromise={blogsCardsPromise} />;
}