import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getAllCollections, getCollectionBySlug } from '@/app/lib/api/collections';
import CollectionPageWrapper from '@/app/lib/components/CollectionPageWrapper';

interface CollectionPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const collections = await getAllCollections();
  return collections.map((c) => ({ slug: c.slug ?? '' })).filter((p) => p.slug !== '');
}

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const collection = await getCollectionBySlug(slug, 0, 500);
    const title = collection.title;
    const description = collection.description ?? `${title} — photography by Zac Eden`;
    const images = collection.coverImage?.imageUrl ? [{ url: collection.coverImage.imageUrl }] : [];

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images,
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: images.map((img) => img.url),
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

  // Validate slug exists
  if (!slug) {
    notFound();
  }

  // Exclude common static file requests from dynamic route
  // These should be handled by Next.js static file serving
  const staticFiles = ['favicon.ico', 'robots.txt', 'sitemap.xml', 'manifest.json'];
  if (staticFiles.includes(slug.toLowerCase())) {
    notFound();
  }

  return <CollectionPageWrapper slug={slug} />;
}

