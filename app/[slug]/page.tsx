import { notFound } from 'next/navigation';

import CollectionPageWrapper from '@/app/lib/components/CollectionPageWrapper';

interface CollectionPageProps {
  params: Promise<{
    slug: string;
  }>;
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

