import { fetchCollectionsByType } from '@/lib/api/home';

import ContentCollectionPage from '../components/ContentCollectionPage';

// Blogs page component
export default function BlogsPage() {
  const blogsCardsPromise = fetchCollectionsByType('BLOG');

  return <ContentCollectionPage cardsPromise={blogsCardsPromise} />;
}