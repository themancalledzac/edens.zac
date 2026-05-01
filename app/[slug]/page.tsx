import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getCollectionBySlug } from '@/app/lib/api/collections';
import CollectionPageWrapper from '@/app/lib/components/CollectionPageWrapper';
import { CollectionType } from '@/app/types/Collection';

interface CollectionPageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Render every collection through Lambda SSR — same path the home page
// (app/page.tsx) uses. Amplify's static-with-dynamic-fallback routing for
// this segment doesn't work in prod: non-prerendered slugs return a fixed
// CloudFront 500 without invoking Lambda. Going fully dynamic sidesteps
// the broken fallback and matches what local dev already does.
export const dynamic = 'force-dynamic';

const STATIC_FILES = ['favicon.ico', 'robots.txt', 'sitemap.xml', 'manifest.json'];

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { slug } = await params;

  if (STATIC_FILES.includes(slug.toLowerCase())) {
    return { title: 'Not Found' };
  }

  try {
    const collection = await getCollectionBySlug(slug, 0, 500);
    const title = collection.title;
    const description = collection.description ?? `${title} — photography by Zac Eden`;
    // Suppress OG/Twitter image for protected client galleries — the cover image is private
    // until the per-gallery password is verified, and meta tags are crawlable without auth.
    const isProtected =
      collection.type === CollectionType.CLIENT_GALLERY && collection.isPasswordProtected === true;
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
  } catch {
    return { title: 'Not Found' };
  }
}

/**
 * Dynamic Collection Page
 *
 * Route handler for individual collections by slug (e.g., /film, /portfolio-work).
 * Uses shared CollectionPageWrapper to eliminate code duplication with home page.
 *
 * @param params - Next.js dynamic route params containing slug
 * @returns Server component displaying collection content
 */
export default async function CollectionPage({ params }: CollectionPageProps) {
  const { slug } = await params;

  if (!slug) {
    notFound();
  }

  if (STATIC_FILES.includes(slug.toLowerCase())) {
    notFound();
  }

  return <CollectionPageWrapper slug={slug} />;
}
