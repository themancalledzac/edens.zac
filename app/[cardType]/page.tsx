import { notFound } from 'next/navigation';

import ContentCollectionPage from '@/app/components/ContentCollection/ContentCollectionPage';
import { fetchCollectionsByType } from '@/app/lib/api/contentCollections';
import { CollectionType } from '@/app/types/ContentCollection';

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
 * - /catalog -> CollectionType.catalog ('CATALOG') collections
 * - /client-gallery -> CollectionType['client-gallery'] ('CLIENT_GALLERY') collections
 * - /portfolio -> CollectionType.portfolio ('PORTFOLIO') collections
 *
 * @dependencies
 * - fetchCollectionsByType - API function for type-filtered content retrieval
 * - ContentCollectionPage - Shared component for displaying collections
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
  const cardsPromise = fetchCollectionsByType(collectionType).then(cards => cards || null);

  return <ContentCollectionPage cardsPromise={cardsPromise} collectionType={collectionType} />;
}
