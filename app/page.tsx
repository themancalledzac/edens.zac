import CollectionPageWrapper from '@/app/lib/components/CollectionPageWrapper';

/**
 * Home Page
 *
 * Main landing page component that displays the 'home' collection.
 * Uses shared CollectionPageWrapper to eliminate code duplication.
 *
 * @returns React Server Component displaying home page content
 */
export default async function HomePage() {
  return <CollectionPageWrapper slug="home" />;
}
