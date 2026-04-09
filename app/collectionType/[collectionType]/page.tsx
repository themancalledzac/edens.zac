import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import CollectionPage from '@/app/components/ContentCollection/CollectionPage';
import { getCollectionsByType } from '@/app/lib/api/collections';
import { ApiError } from '@/app/lib/api/core';
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
    parent: CollectionType.PARENT,
  };
  return mapping[normalized] || null;
}

export async function generateMetadata({ params }: CollectionTypePageProps): Promise<Metadata> {
  const { collectionType } = await params;
  const type = collectionType.charAt(0).toUpperCase() + collectionType.slice(1).toLowerCase();
  const description = `${type} collections — photography by Zac Eden`;

  return {
    title: type,
    description,
    openGraph: {
      title: type,
      description,
    },
  };
}

/**
 * Collection Type Page
 *
 * Route handler for collections by type (e.g., /collectionType/blogs, /collectionType/portfolio).
 * Fetches all collections of the specified type and displays them using
 * the shared CollectionPage component, which handles arrays of collections.
 *
 * @remarks Fetches page 0 using the default size from `PAGINATION.collectionPageSize`.
 *   Non-ApiError responses that embed "404" in the message are also treated as notFound(),
 *   since some fetch wrappers surface HTTP status as a plain Error.
 * @param params - Next.js dynamic route params containing collectionType
 * @returns Server component displaying collections of the specified type
 */
export default async function CollectionTypePage({ params }: CollectionTypePageProps) {
  const { collectionType } = await params;

  if (!collectionType) {
    notFound();
  }

  const type = mapUrlToCollectionType(collectionType);
  if (!type) {
    notFound();
  }

  try {
    const collections = await getCollectionsByType(type, 0);

    return <CollectionPage collection={collections} />;
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 404 || error.status >= 500) {
        notFound();
      }
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('404')) {
      notFound();
    }

    throw error;
  }
}
