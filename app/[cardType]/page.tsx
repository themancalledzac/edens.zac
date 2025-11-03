import { notFound } from 'next/navigation';

import CollectionPage from '@/app/components/ContentCollection/CollectionPage';
import { getCollectionsByType } from '@/app/lib/api/collections.new';
import { CollectionType } from '@/app/types/Collection';

interface PageProps {
  params: Promise<{
    cardType: string;
  }>;
}

/**
 * Dynamic Collection Type Page
 *
 * Universal page component that handles all content collection types through
 * dynamic routing. Uses CollectionType enum keys directly as URL parameters.
 *
 * @example
 * - /blogs -> CollectionType.blogs ('BLOG') collections
 * - /art-gallery -> CollectionType['art-gallery'] ('ART_GALLERY') collections
 * - /client-gallery -> CollectionType['client-gallery'] ('CLIENT_GALLERY') collections
 * - /portfolio -> CollectionType.portfolio ('PORTFOLIO') collections
 *
 * @dependencies
 * - getCollectionsByType - API function for type-filtered content retrieval
 * - CollectionPage - Shared component for displaying collections
 *
 * @param params - Next.js dynamic route params containing cardType
 * @returns Server component displaying type-specific collections
 */
export default async function DynamicCollectionPage({ params }: PageProps) {
  const { cardType } = await params;

  // Validate cardType parameter matches CollectionType enum keys
  if (!cardType || !(cardType in CollectionType)) {
    notFound();
  }

  const collectionType = CollectionType[cardType as keyof typeof CollectionType];
  const collections = await getCollectionsByType(collectionType);

  if (!collections) {
    notFound();
  }

  return <CollectionPage collection={collections} collectionType={collectionType} />;
}
