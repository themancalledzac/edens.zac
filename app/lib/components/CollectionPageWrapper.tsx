import { notFound } from 'next/navigation';

import ClientGalleryGate from '@/app/components/ClientGalleryGate/ClientGalleryGate';
import CollectionPage from '@/app/components/ContentCollection/CollectionPage';
import { LAYOUT } from '@/app/constants';
import { meServer } from '@/app/lib/api/auth';
import { getCollectionBySlug } from '@/app/lib/api/collections';
import { listSelectIdsServer } from '@/app/lib/api/selects';
import { getUserPage } from '@/app/lib/api/user';
import { CollectionType } from '@/app/types/Collection';
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
  /** `?via=<slug>` arrived-from collection; forwarded to the breadcrumb. */
  via?: string;
}

/**
 * Fetches a collection by slug and renders it via CollectionPage. Shared by the
 * home page (slug="home") and dynamic collection pages.
 */
export default async function CollectionPageWrapper({
  slug,
  excludeContentSlugs,
  editMode = false,
  via,
}: CollectionPageWrapperProps) {
  if (!slug) {
    notFound();
  }

  try {
    const [fetched, ssrViewport, me] = await Promise.all([
      getCollectionBySlug(slug, 0, 500),
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

    // "Me" tile: home page only, logged-in viewer only. Inject the personal parallax
    // card (links to /user) as the SECOND tile. One extra no-store fetch for logged-in
    // home views; anonymous home is byte-identical (no fetch, no injection).
    const collection =
      slug === 'home' && me && Array.isArray(baseCollection.content)
        ? {
            ...baseCollection,
            content: [
              ...baseCollection.content.slice(0, 1),
              buildMeContentBlock(await getUserPage()),
              ...baseCollection.content.slice(1),
            ],
          }
        : baseCollection;

    const chunkSize = collection.rowsWide ?? LAYOUT.defaultChunkSize;

    // Seed the viewer's persisted selects for this collection so the SelectsProvider primes
    // without a client round-trip. Only client galleries have selects; skip the call otherwise.
    const initialSelectedIds =
      collection.type === CollectionType.CLIENT_GALLERY
        ? await listSelectIdsServer(collection.id)
        : [];

    // Gate password-protected galleries. `Array.isArray(content)` is the auth signal —
    // the backend sets content to null when the password cookie fails to validate.
    // Routing here (not wrapping children) prevents RSC payload serialization for locked viewers.
    // editMode bypasses the gate entirely — admins are never password-walled.
    const isGateableType =
      !editMode &&
      (collection.type === CollectionType.CLIENT_GALLERY ||
        collection.type === CollectionType.PARENT);
    if (isGateableType) {
      const isAuthenticated = Array.isArray(collection.content);
      if (!collection.isPasswordProtected || isAuthenticated) {
        return (
          <CollectionPage
            collection={collection}
            chunkSize={chunkSize}
            ssrViewport={ssrViewport}
            editMode={editMode}
            me={me}
            initialSelectedIds={initialSelectedIds}
            via={via}
          />
        );
      }
      return <ClientGalleryGate collection={collection} />;
    }

    return (
      <CollectionPage
        collection={collection}
        chunkSize={chunkSize}
        ssrViewport={ssrViewport}
        editMode={editMode}
        me={me}
        initialSelectedIds={initialSelectedIds}
        via={via}
      />
    );
  } catch (error) {
    // Re-throw Next.js sentinel errors (notFound(), redirect()) so the framework
    // can handle them. Their digest property starts with `NEXT_`.
    if (
      typeof error === 'object' &&
      error !== null &&
      typeof (error as { digest?: unknown }).digest === 'string' &&
      ((error as { digest: string }).digest.startsWith('NEXT_') ||
        (error as { digest: string }).digest === 'DYNAMIC_SERVER_USAGE')
    ) {
      throw error;
    }

    // Duck-type the status field instead of `instanceof ApiError`. In production
    // builds, code splitting can produce two copies of the ApiError class in
    // different chunks; an instance from one chunk fails `instanceof` against
    // the class in another, so the 404→notFound() branch silently misses and we
    // fall through to a Lambda-level 500 page. Reading `error.status` works
    // regardless of which copy of the class is throwing.
    const status =
      typeof error === 'object' && error !== null && 'status' in error
        ? Number((error as { status: unknown }).status)
        : Number.NaN;

    if (status === 404) {
      notFound();
    }

    if (status >= 500) {
      // For home page, re-throw (page is force-dynamic so this won't break build)
      if (slug === 'home') {
        throw error;
      }
      notFound();
    }

    // Re-throw other known numeric statuses (4xx like 401, 403) as unhandled errors.
    // These bubble up as Lambda 500s — same behavior as the prior instanceof branch.
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
