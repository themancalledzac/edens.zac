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

    if (collection.type === CollectionType.CLIENT_GALLERY) {
      // Auth signal: backend (CollectionControllerProd.getCollectionBySlug) sets
      // `content` to null when the per-slug cookie is missing or invalid, and
      // returns an array (possibly empty) once the cookie validates. So
      // `Array.isArray(content)` distinguishes authenticated from locked, and
      // is the only authoritative signal — `isPasswordProtected` stays true
      // even after the cookie validates (it describes the gallery, not the
      // viewer's session).
      //
      // Routing here, rather than wrapping <CollectionPage> as gate children,
      // means we never serialize the page's RSC payload (cover image, grid)
      // for a locked viewer (FE-H6 invariant, structurally enforced).
      const isAuthenticated = Array.isArray(collection.content);
      if (!collection.isPasswordProtected || isAuthenticated) {
        return <CollectionPage collection={collection} chunkSize={chunkSize} />;
      }
      return <ClientGalleryGate collection={collection} />;
    }

    return <CollectionPage collection={collection} chunkSize={chunkSize} />;
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
