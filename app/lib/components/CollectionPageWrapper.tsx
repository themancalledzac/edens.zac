import { notFound } from 'next/navigation';

import ClientGalleryGate from '@/app/components/ClientGalleryGate/ClientGalleryGate';
import CollectionPage from '@/app/components/ContentCollection/CollectionPage';
import { LAYOUT } from '@/app/constants';
import { getCollectionBySlug } from '@/app/lib/api/collections';
import { ApiError } from '@/app/lib/api/core';
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
    const collection = await getCollectionBySlug(slug, 0, 500);

    const chunkSize = collection.rowsWide ?? LAYOUT.defaultChunkSize;

    const collectionPage = <CollectionPage collection={collection} chunkSize={chunkSize} />;

    if (collection.type === CollectionType.CLIENT_GALLERY) {
      return (
        <ClientGalleryGate collection={collection}>
          {collectionPage}
        </ClientGalleryGate>
      );
    }

    return collectionPage;
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 404) {
        notFound();
      }

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

    if (errorMessage.includes('404')) {
      notFound();
    }

    throw error;
  }
}
