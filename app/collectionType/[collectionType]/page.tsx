import { notFound } from 'next/navigation';

import CollectionPage from '@/app/components/ContentCollection/CollectionPage';
import { getCollectionsByType } from '@/app/lib/api/collections';
import { CollectionType } from '@/app/types/Collection';

interface CollectionTypePageProps {
  params: Promise<{
    collectionType: string;
  }>;
}

/**
 * Map URL-friendly collection type names to CollectionType enum values
 */
function mapUrlToCollectionType(urlType: string): CollectionType | null {
  const normalized = urlType.toLowerCase();
  const mapping: Record<string, CollectionType> = {
    blogs: CollectionType.BLOG,
    blog: CollectionType.BLOG,
    portfolio: CollectionType.PORTFOLIO,
    'art-gallery': CollectionType.ART_GALLERY,
    artgallery: CollectionType.ART_GALLERY,
    'client-gallery': CollectionType.CLIENT_GALLERY,
    clientgallery: CollectionType.CLIENT_GALLERY,
  };
  return mapping[normalized] || null;
}

/**
 * Collection Type Page
 *
 * Route handler for collections by type (e.g., /collectionType/blogs, /collectionType/portfolio).
 * Fetches all collections of the specified type and displays them using
 * the shared CollectionPage component, which handles arrays of collections.
 *
 * @param params - Next.js dynamic route params containing collectionType
 * @returns Server component displaying collections of the specified type
 */
export default async function CollectionTypePage({ params }: CollectionTypePageProps) {
  const { collectionType } = await params;

  // Validate collectionType exists
  if (!collectionType) {
    notFound();
  }

  // Map URL param to CollectionType enum
  const type = mapUrlToCollectionType(collectionType);
  if (!type) {
    notFound();
  }

  try {
    // Fetch all collections of this type
    // Using default pagination (page 0, size from PAGINATION.collectionPageSize)
    const collections = await getCollectionsByType(type, 0);

    // If no collections found, still render the page (empty state handled by CollectionPage)
    return <CollectionPage collection={collections} />;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Handle 404s
    if (errorMessage.includes('404')) {
      notFound();
    }

    // Handle backend schema/database errors
    const isBackendError =
      errorMessage.includes('JDBC') ||
      errorMessage.includes('Unknown column') ||
      errorMessage.includes('API 500') ||
      errorMessage.includes('Failed to retrieve');

    if (isBackendError) {
      notFound();
    }

    // Re-throw other errors so they can be handled by Next.js error boundary
    throw error;
  }
}

