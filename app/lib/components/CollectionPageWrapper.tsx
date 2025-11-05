import { notFound } from 'next/navigation';

import CollectionPage from '@/app/components/ContentCollection/CollectionPage';
import { getCollectionBySlug } from '@/app/lib/api/collections.new';

interface CollectionPageWrapperProps {
  slug: string;
}

/**
 * Collection Page Wrapper
 *
 * Shared component that fetches a collection by slug and renders it using CollectionPage.
 * Eliminates code duplication between home page (slug="home") and dynamic collection pages.
 *
 * @param slug - Collection slug to fetch and display
 * @returns Server component rendering the collection page
 */
export default async function CollectionPageWrapper({ slug }: CollectionPageWrapperProps) {
  if (!slug) {
    notFound();
  }

  try {
    // Await the collection data - backend always returns complete data
    // This ensures we have the full response before rendering
    const collection = await getCollectionBySlug(slug, 0, 50);
    
    // Backend guarantees complete data structure, so we can render directly
    return <CollectionPage collection={collection} />;
  } catch (error) {
    // Log the error for debugging
    console.error('[CollectionPageWrapper] Error loading collection:', {
      slug,
      error: error instanceof Error ? error.message : String(error),
    });
    
    // Handle 404s appropriately
    if (error instanceof Error && error.message.includes('404')) {
      notFound();
    }
    
    // Re-throw other errors so they can be handled by Next.js error boundary
    throw error;
  }
}

