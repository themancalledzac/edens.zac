import type { Metadata } from 'next';
import { notFound, redirect, unstable_rethrow } from 'next/navigation';
import { Suspense } from 'react';

import CollectionPageWrapper from '@/app/components/ContentCollection/CollectionPageWrapper';
import { CollectionJsonLd } from '@/app/components/StructuredData/CollectionJsonLd';
import { PageLoading } from '@/app/components/ui/PageLoading/PageLoading';
import { getCollectionBySlug } from '@/app/lib/api/collections';
import { requireAdmin } from '@/app/utils/admin';
import { HOME_SLUG } from '@/app/utils/collectionSlugs';
import { logger } from '@/app/utils/logger';
import { AUTHOR_NAME } from '@/app/utils/structuredData';

interface CollectionPageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    manage?: string;
  }>;
}

/**
 * Renders every collection through Lambda SSR, the same path the home page uses. Amplify's
 * static-with-dynamic-fallback routing returns a fixed CloudFront 500 for non-prerendered slugs.
 */
export const dynamic = 'force-dynamic';

const STATIC_FILES = ['favicon.ico', 'robots.txt', 'sitemap.xml', 'manifest.json'];

/**
 * Settles the response status before the page's `<Suspense>` boundary streams. This route sits
 * outside the `(site)` group's `loading.tsx`, so nothing streams before this check. The read is
 * `getCollectionBySlug(slug, 0, 500)`, the same call `generateMetadata` and `CollectionPageWrapper`
 * make, so it is served from the shared fetch cache with no extra request.
 * Control-flow errors from Next.js (they carry a `digest`) are rethrown; any other failure is left
 * for the page body to handle, so an outage is never reported as a missing page.
 */
async function assertCollectionExists(slug: string) {
  try {
    await getCollectionBySlug(slug, 0, 500);
  } catch (error) {
    if (error instanceof Error && 'digest' in error) throw error;
    logger.warn('slug-page', 'existence check failed; deferring to the page body', { slug, error });
  }
}

/**
 * Resolves collection metadata and decides the response status for an unknown slug.
 *
 * Status mechanism (shared with the tag and location pages): metadata streams for
 * non-bot clients, so the status for them is decided by the page body, which runs the existence
 * check {@link assertCollectionExists} before returning its JSX. This function covers HTML-limited
 * bots, which block on metadata, with the read it already makes, `getCollectionBySlug(slug, 0, 500)`, which throws
 * `notFound()` on a backend 404 and shares its cache entry with the page body, so no extra request
 * is made. The catch passes Next.js control-flow errors on through `unstable_rethrow` so that
 * `notFound()` reaches the framework instead of being swallowed. Any other failure (5xx, network)
 * is logged and falls back to the 'Not Found' title, so an outage is not reported as a missing page.
 *
 * OG/Twitter images are suppressed for password-protected collections: the cover image is private
 * until the password is verified, and meta tags are crawlable without auth. This is keyed on
 * `isPasswordProtected` alone, not the collection kind, because protected is private regardless of
 * kind and the backend retains `coverImage` on locked responses. A protected payload missing the
 * kind booleans (stale cache or deploy-order slip) is still suppressed and logged so the window
 * is observable.
 */
export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { slug } = await params;

  if (STATIC_FILES.includes(slug.toLowerCase())) {
    return { title: 'Not Found' };
  }

  try {
    const collection = await getCollectionBySlug(slug, 0, 500);
    const title = collection.title;
    const description = collection.description ?? `${title} — photography by ${AUTHOR_NAME}`;
    const isProtected = collection.isPasswordProtected === true;
    if (isProtected && collection.isClient === undefined) {
      logger.warn('slug-page', 'Protected collection payload is missing isClient/isBlog', { slug });
    }
    const images =
      !isProtected && collection.coverImage?.imageUrl
        ? [{ url: collection.coverImage.imageUrl }]
        : [];
    const safeDescription = isProtected ? 'Private gallery — password required.' : description;

    return {
      title: isProtected ? `${title} — Private Gallery` : title,
      description: safeDescription,
      openGraph: {
        title,
        description: safeDescription,
        images,
        type: 'website',
      },
      twitter: {
        card: images.length > 0 ? 'summary_large_image' : 'summary',
        title,
        description: safeDescription,
        images: images.map(img => img.url),
      },
    };
  } catch (error) {
    unstable_rethrow(error);
    logger.warn('slug-page', 'generateMetadata failed; falling back to Not Found', { slug, error });
    return { title: 'Not Found' };
  }
}

/**
 * Route handler for individual collections by slug (e.g. /film, /portfolio-work).
 * Renders via the shared CollectionPageWrapper.
 *
 * A public `/home` redirects (temporary) to `/`, the canonical home URL; only `/home?manage=1`
 * stays reachable, to open the home edit view.
 *
 * `?manage=1` enters the in-place edit surface. Authorization is enforced by
 * {@link requireAdmin} below (redirects anonymous/non-admin viewers to /login) — a
 * real `isAdmin` principal, not an environment check, is what gates this in prod.
 *
 * {@link CollectionJsonLd} is skipped in edit mode: the admin surface is not a public gallery,
 * and it suppresses itself for password-protected collections the way `generateMetadata` does.
 *
 * The content renders inside `<Suspense>` only after {@link assertCollectionExists}, so an unknown
 * slug answers a real 404 and a known one still shows {@link PageLoading} while it streams.
 */
export default async function CollectionPage({ params, searchParams }: CollectionPageProps) {
  const { slug } = await params;

  if (!slug) {
    notFound();
  }

  if (STATIC_FILES.includes(slug.toLowerCase())) {
    notFound();
  }

  const resolvedSearchParams = await searchParams;
  const editMode = resolvedSearchParams?.manage === '1';

  if (slug === HOME_SLUG && !editMode) {
    redirect('/');
  }

  if (editMode) {
    await requireAdmin();
  }

  await assertCollectionExists(slug);

  return (
    <Suspense fallback={<PageLoading />}>
      {!editMode && <CollectionJsonLd slug={slug} />}
      <CollectionPageWrapper slug={slug} editMode={editMode} />
    </Suspense>
  );
}
