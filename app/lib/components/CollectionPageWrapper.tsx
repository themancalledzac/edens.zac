import { notFound } from 'next/navigation';

import CollectionPage from '@/app/components/ContentCollection/CollectionPage';
import { getCollectionBySlug } from '@/app/lib/api/collections';

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
    // Fetch a larger batch or implement proper pagination
    // Option 1: Increase size to handle most collections
    const collection = await getCollectionBySlug(slug, 0, 500);

    // Backend guarantees complete data structure, so we can render directly
    return <CollectionPage collection={collection} />;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Handle 404s
    if (errorMessage.includes('404')) {
      notFound();
    }

    // Handle backend schema/database errors
    // Common backend errors: JDBC exceptions, "Unknown column", database connection issues
    const isBackendError =
      errorMessage.includes('JDBC') ||
      errorMessage.includes('Unknown column') ||
      errorMessage.includes('API 500') ||
      errorMessage.includes('Failed to retrieve collection');

    if (isBackendError) {
      // For home page, re-throw (page is force-dynamic so this won't break build)
      if (slug === 'home') {
        throw error;
      }

      // For other collection pages, return notFound
      notFound();
    }

    // Re-throw other errors so they can be handled by Next.js error boundary
    throw error;
  }
}

