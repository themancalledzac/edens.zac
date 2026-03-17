import { notFound } from 'next/navigation';

import ClientGalleryGate from '@/app/components/ClientGalleryGate/ClientGalleryGate';
import CollectionPage from '@/app/components/ContentCollection/CollectionPage';
import { LAYOUT } from '@/app/constants';
import { getCollectionBySlug } from '@/app/lib/api/collections';
import { CollectionType } from '@/app/types/Collection';

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
    const collectionPage = <CollectionPage collection={collection} chunkSize={chunkSize} />;

    // Wrap CLIENT_GALLERY collections with password gate
    if (collection.type === CollectionType.CLIENT_GALLERY) {
      return (
        <ClientGalleryGate collection={collection}>
          {collectionPage}
        </ClientGalleryGate>
      );
    }

    return collectionPage;
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
