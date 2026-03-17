import type { Metadata } from 'next';

import CollectionPageWrapper from '@/app/lib/components/CollectionPageWrapper';

export const metadata: Metadata = {
  title: 'Home',
  description: 'Photography portfolio by Zac Eden — landscape, portrait, and event photography',
  openGraph: {
    title: 'Edens Zac — Photography Portfolio',
    description: 'Photography portfolio by Zac Eden — landscape, portrait, and event photography',
    type: 'website',
  },
};

/**
 * Home Page
 *
 * Main landing page component that displays the 'home' collection.
 * Uses shared CollectionPageWrapper to eliminate code duplication.
 *
 * @returns React Server Component displaying home page content
 */
// Temporarily force dynamic rendering until backend schema is fixed
// NOTE: Waiting for backend to remove 'blocks_per_page' column reference
// Once fixed, restore: export const revalidate = 3600; export const dynamic = 'error';
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  return <CollectionPageWrapper slug="home" />;
}
