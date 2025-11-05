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
    const collection = await getCollectionBySlug(slug, 0, 50);
    return <CollectionPage collection={collection} />;
  } catch {
    notFound();
  }
}

