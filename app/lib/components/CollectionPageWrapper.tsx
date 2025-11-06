import { notFound } from 'next/navigation';

import CollectionPage from '@/app/components/ContentCollection/CollectionPage';
import { getCollectionBySlug } from '@/app/lib/api/collections.new';
import {
  handleCollectionError,
  NotFoundError,
} from '@/app/lib/utils/collectionErrorHandler';

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
    // Handle 404 errors
    if (error instanceof NotFoundError) {
      notFound();
    }

    // Handle all other errors (backend errors, unknown errors, etc.)
    handleCollectionError(error, slug);
  }
}

