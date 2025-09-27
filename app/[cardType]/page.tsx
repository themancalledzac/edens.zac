import { notFound } from 'next/navigation';

import ContentCollectionPage from '@/app/components/ContentCollection/ContentCollectionPage';
import { fetchCollectionsByType } from '@/app/lib/api/contentCollections';

// Valid collection types that map to URL cardType params
const VALID_CARD_TYPES = {
  'blogs': 'BLOG',
  'art-gallery': 'ART_GALLERY',
  'client-gallery': 'CLIENT_GALLERY',
  'portfolio': 'PORTFOLIO'
} as const;

type ValidCardType = keyof typeof VALID_CARD_TYPES;

interface PageProps {
  params: Promise<{
    cardType: string;
  }>;
}

/**
 * Dynamic Collection Type Page
 *
 * Universal page component that handles all content collection types through
 * dynamic routing. Maps URL cardType parameters to backend CollectionType
 * enums and fetches appropriate data using the shared API function.
 *
 * @example
 * - /blogs -> BLOG collections
 * - /art-gallery -> ART_GALLERY collections
 * - /client-gallery -> CLIENT_GALLERY collections
 * - /portfolio -> PORTFOLIO collections
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

  // Validate cardType parameter
  if (!cardType || !(cardType in VALID_CARD_TYPES)) {
    notFound();
  }

  const collectionType = VALID_CARD_TYPES[cardType as ValidCardType];
  const cardsPromise = fetchCollectionsByType(collectionType).then(cards => cards || null);

  return <ContentCollectionPage cardsPromise={cardsPromise} collectionType={collectionType} />;
}
