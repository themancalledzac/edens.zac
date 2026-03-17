import { notFound } from 'next/navigation';

import CollectionPage from '@/app/components/ContentCollection/CollectionPage';
import { LAYOUT } from '@/app/constants';
import { getCollectionBySlug } from '@/app/lib/api/collections';
import { ApiError } from '@/app/lib/api/core';

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

    // Use rowsWide from collection data if available, otherwise use default chunk size
    const chunkSize = collection.rowsWide ?? LAYOUT.defaultChunkSize;

    // Backend guarantees complete data structure, so we can render directly
    return <CollectionPage collection={collection} chunkSize={chunkSize} />;
  } catch (error) {
    // Handle typed API errors first
    if (error instanceof ApiError) {
      // 404 status
      if (error.status === 404) {
        notFound();
      }

      // 500 or other backend errors
      if (error.status >= 500) {
        // For home page, re-throw (page is force-dynamic so this won't break build)
        if (slug === 'home') {
          throw error;
        }
        notFound();
      }

      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);

    // Handle 404s in non-ApiError messages
    if (errorMessage.includes('404')) {
      notFound();
    }

    // Re-throw other errors so they can be handled by Next.js error boundary
    throw error;
  }
}
