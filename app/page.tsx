import { getCollectionBySlug } from '@/app/lib/api/collections.new';

import CollectionPage from './components/ContentCollection/CollectionPage';

/**
 * Home Page
 *
 * Main landing page component that displays the 'home' collection.
 * The home collection contains nested COLLECTION content types that are
 * extracted and displayed by CollectionPage.
 *
 * @dependencies
 * - getCollectionBySlug - API function for retrieving collection data
 * - CollectionPage - Shared component for displaying content collections
 *
 * @returns React Server Component displaying home page content
 */
export default async function HomePage() {
  const homeCollection = await getCollectionBySlug('home', 0, 50);

  return <CollectionPage collection={homeCollection} collectionType="Home" />;
}
