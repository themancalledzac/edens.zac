import { notFound } from 'next/navigation';

import ClientGalleryGate from '@/app/components/ClientGalleryGate/ClientGalleryGate';
import CollectionPage from '@/app/components/ContentCollection/CollectionPage';
import { LAYOUT } from '@/app/constants';
import { meServer } from '@/app/lib/api/auth';
import { getCollectionBySlug, getScopedAllCollections } from '@/app/lib/api/collections';
import { getUserPage, listSavedImageIdsServer } from '@/app/lib/api/personal';
import { listSelectIdsServer } from '@/app/lib/api/selects';
import { buildAllCollectionsContentBlock } from '@/app/utils/allCollectionsContentBlock';
import { HOME_SLUG } from '@/app/utils/collectionSlugs';
import { findMembership } from '@/app/utils/galleryAccess';
import { logger } from '@/app/utils/logger';
import { buildMeContentBlock } from '@/app/utils/meContentBlock';
import { resolveSsrViewport } from '@/app/utils/ssrViewport';

interface CollectionPageWrapperProps {
  slug: string;
  /**
   * Slugs of child collection refs to drop from `collection.content` before
   * rendering. Used by synthetic listing pages (e.g. /all-collections) to hide
   * collections that exist as standalone pages but shouldn't appear in lists.
   */
  excludeContentSlugs?: readonly string[];
  /**
   * When true, render the admin edit surface (threaded down to CollectionPageClient) and
   * bypass the per-gallery password gate — an admin editing shouldn't be password-walled.
   * When false/absent the fetch, gate, and render are byte-identical to the public view.
   */
  editMode?: boolean;
}

/**
 * Fetches a collection by slug and renders it via CollectionPage. Shared by the home page
 * (slug="home") and dynamic collection pages, including home's own `?manage=1` edit view.
 *
 * The all-collections slug is permission-scoped per viewer, so it uses the no-store fetch; every
 * other slug keeps the shared cacheable fetch. Home gets two synthetic tiles ahead of its backend
 * children: the personal Me tile for a signed-in viewer (one extra no-store fetch, skipped on
 * anonymous home) and the All Collections tile for everyone. Their negative `orderIndex` is what
 * puts them first once `processContentBlocks` sorts, so the array order here mirrors that rather
 * than deciding it. Home also pins its mobile row budget to `LAYOUT.homeMobileChunkSize`, since
 * its saved density of 2 would otherwise map to one tile per row on a phone.
 *
 * `Array.isArray(content)` is the password-gate signal: the backend nulls `content` when the
 * gallery cookie fails to validate, and a locked viewer is routed to the gate here rather than
 * wrapped, so no RSC payload is serialised for them. Edit mode bypasses the gate.
 *
 * Errors are classified by duck-typing `status`, not `instanceof ApiError`, because production
 * code-splitting can load two copies of the class. Next's own sentinels (`NEXT_*` digests) are
 * re-thrown untouched; a 5xx re-throws on home, which is force-dynamic, and becomes notFound()
 * elsewhere.
 */
export default async function CollectionPageWrapper({
  slug,
  excludeContentSlugs,
  editMode = false,
}: CollectionPageWrapperProps) {
  if (!slug) {
    notFound();
  }

  try {
    const [fetched, ssrViewport, me] = await Promise.all([
      slug === 'all-collections' ? getScopedAllCollections() : getCollectionBySlug(slug, 0, 500),
      resolveSsrViewport(),
      meServer(),
    ]);

    const baseCollection =
      excludeContentSlugs && excludeContentSlugs.length > 0 && Array.isArray(fetched.content)
        ? {
            ...fetched,
            content: fetched.content.filter(
              item => item.contentType !== 'COLLECTION' || !excludeContentSlugs.includes(item.slug)
            ),
          }
        : fetched;

    const isHome = slug === HOME_SLUG;

    const collection =
      isHome && Array.isArray(baseCollection.content)
        ? {
            ...baseCollection,
            content: [
              ...(me ? [buildMeContentBlock(await getUserPage())] : []),
              buildAllCollectionsContentBlock(),
              ...baseCollection.content,
            ],
          }
        : baseCollection;

    const chunkSize = collection.rowsWide ?? LAYOUT.defaultChunkSize;
    const mobileChunkSize = isHome ? LAYOUT.homeMobileChunkSize : undefined;

    if (collection.isClient === undefined && findMembership(me, collection.id)) {
      logger.warn('CollectionPageWrapper', 'Membership held on a payload missing isClient', {
        slug,
        collectionId: collection.id,
      });
    }

    const [initialSelectedIds, initialSavedImageIds] = await Promise.all([
      collection.isClient === true
        ? listSelectIdsServer(collection.id)
        : Promise.resolve<number[]>([]),
      me ? listSavedImageIdsServer() : Promise.resolve<number[]>([]),
    ]);

    if (!editMode && collection.isPasswordProtected === true) {
      const isAuthenticated = Array.isArray(collection.content);
      if (!isAuthenticated) {
        return <ClientGalleryGate collection={collection} />;
      }
    }

    return (
      <CollectionPage
        collection={collection}
        chunkSize={chunkSize}
        mobileChunkSize={mobileChunkSize}
        ssrViewport={ssrViewport}
        editMode={editMode}
        me={me}
        initialSelectedIds={initialSelectedIds}
        initialSavedImageIds={initialSavedImageIds}
      />
    );
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      typeof (error as { digest?: unknown }).digest === 'string' &&
      ((error as { digest: string }).digest.startsWith('NEXT_') ||
        (error as { digest: string }).digest === 'DYNAMIC_SERVER_USAGE')
    ) {
      throw error;
    }

    const status =
      typeof error === 'object' && error !== null && 'status' in error
        ? Number((error as { status: unknown }).status)
        : Number.NaN;

    if (status === 404) {
      notFound();
    }

    if (status >= 500) {
      if (slug === HOME_SLUG) {
        throw error;
      }
      notFound();
    }

    if (Number.isFinite(status)) {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('404')) {
      notFound();
    }

    throw error;
  }
}
