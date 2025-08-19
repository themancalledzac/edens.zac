/**
 * Collection Viewer Slot (@viewer) — Server Component
 *
 * What this file is:
 * - RSC for the @viewer parallel route. Fetches the collection page and renders a type-specific view.
 *
 * Replaces in the old code:
 * - Replaces a single all-in-one page render in Pages Router that mixed metadata and viewer concerns.
 *
 * New Next.js features used:
 * - Parallel Route slot rendering with independent loading.tsx and notFound().
 * - Server-first data fetching without getServerSideProps.
 *
 * TODOs / Improvements:
 * - Wire to SSR-optimized content block components (Phase 5.4) and enable Suspense streaming.
 * - Move inline styles inside view components to CSS Modules where applicable.
 */
import { notFound } from 'next/navigation';

import ArtGalleryView from '@/Components/content-collection/art-gallery-view';
import BlogView from '@/Components/content-collection/blog-view';
import ClientGalleryView from '@/Components/content-collection/client-gallery-view';
import PortfolioView from '@/Components/content-collection/portfolio-view';
import { type ContentCollectionNormalized, fetchCollectionBySlug } from '@/lib/api/contentCollections';

export const dynamic = 'force-static';
export const revalidate = 3600;

type PageProps = {
  params: { slug: string };
  searchParams: { page?: string; size?: string };
};

const parsePagination = (searchParams: PageProps['searchParams']): { page: number; size: number } => {
  const rawPage = Number(searchParams.page);
  const rawSize = Number(searchParams.size);
  const page = Number.isFinite(rawPage) && rawPage >= 0 ? Math.floor(rawPage) : 0;
  const size = Number.isFinite(rawSize) && rawSize > 0 && rawSize <= 100 ? Math.floor(rawSize) : 30;
  return { page, size };
};

export default async function ViewerPage({ params, searchParams }: PageProps) {
  const { page, size } = parsePagination(searchParams);

  let collection: ContentCollectionNormalized | null = null;
  try {
    collection = await fetchCollectionBySlug(params.slug, page, size);
  } catch {
    return notFound();
  }

  if (!collection) return notFound();

  switch (collection.type) {
    case 'BLOG':
      return <BlogView collection={collection} />;
    case 'ART_GALLERY':
      return <ArtGalleryView collection={collection} />;
    case 'PORTFOLIO':
      return <PortfolioView collection={collection} />;
    case 'CLIENT_GALLERY':
      return <ClientGalleryView collection={collection} />;
    default:
      return notFound();
  }
}
