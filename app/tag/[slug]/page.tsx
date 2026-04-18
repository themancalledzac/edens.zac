import { type Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import TaxonomyPage from '@/app/components/TaxonomyPage/TaxonomyPage';
import { getAllTags, searchImages } from '@/app/lib/api/content';

const getCachedTags = cache(() => getAllTags());

interface TagPageRouteProps {
  params: Promise<{ slug: string }>;
}

/**
 * Generate SEO metadata for tag pages.
 *
 * @remarks Resolves the slug by exact API slug first, then falls back to a
 *   case-insensitive name match for backwards-compatible URLs.
 */
export async function generateMetadata({ params }: TagPageRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const tags = await getCachedTags();

  const tag =
    tags?.find(t => t.slug === slug) ??
    tags?.find(
      t => t.name.toLowerCase() === decodeURIComponent(slug).replace(/-/g, ' ').toLowerCase()
    );
  const tagName = tag?.name ?? decodeURIComponent(slug).replace(/-/g, ' ');

  return {
    title: `${tagName} — Zac Edens Photography`,
    description: `Photos tagged "${tagName}" by Zac Edens`,
    openGraph: {
      title: `${tagName} — Zac Edens Photography`,
      description: `Photos tagged "${tagName}" by Zac Edens`,
      type: 'website',
    },
  };
}

/**
 * Tag Page Route
 *
 * Fetches all images associated with a tag resolved from the URL slug.
 *
 * @remarks Resolves the slug by exact API slug first, then falls back to a
 *   case-insensitive name match for backwards-compatible URLs.
 */
export default async function TagPageRoute({ params }: TagPageRouteProps) {
  const { slug } = await params;
  if (!slug) notFound();

  const tags = await getCachedTags();
  if (!tags?.length) notFound();

  const matchedTag =
    tags.find(t => t.slug === slug) ??
    tags.find(
      t => t.name.toLowerCase() === decodeURIComponent(slug).replace(/-/g, ' ').toLowerCase()
    );
  if (!matchedTag) notFound();

  const images = await searchImages({ tagIds: [matchedTag.id] });

  return <TaxonomyPage entityName={matchedTag.name} images={images} />;
}
