import CollectionPageWrapper from '@/app/lib/components/CollectionPageWrapper';

/**
 * Home Page
 *
 * Main landing page component that displays the 'home' collection.
 * Uses shared CollectionPageWrapper to eliminate code duplication.
 *
 * @returns React Server Component displaying home page content
 */
// Temporarily force dynamic rendering until backend schema is fixed
// TODO: Remove this once backend removes 'blocks_per_page' column reference
// Once fixed, restore: export const revalidate = 3600; export const dynamic = 'error';
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  return <CollectionPageWrapper slug="home" />;
}
