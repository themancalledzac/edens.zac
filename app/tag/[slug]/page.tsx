import { type Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { resolveTaxonomyBySlug } from '@/app/components/TaxonomyPage/resolveTaxonomy';
import TaxonomyPage from '@/app/components/TaxonomyPage/TaxonomyPage';
import { getAllTags, searchImages } from '@/app/lib/api/content';

const getCachedTags = cache(() => getAllTags());

// Render on every request rather than at build time. The page renders
// `searchImages({ tagIds: [...] })` and `getAllTags()` server-side; build-time
// prerender requires the build container to reach the deployed proxy/backend,
// which is brittle (chicken-and-egg during fresh deploys, dies on transient
// failures, and fails the entire build for one bad tag). The server-side
// React `cache()` wrapper above still dedupes within a single request.
export const dynamic = 'force-dynamic';

interface TagPageRouteProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: TagPageRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const tags = await getCachedTags();
  const tag = resolveTaxonomyBySlug(tags, slug);
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

export default async function TagPageRoute({ params }: TagPageRouteProps) {
  const { slug } = await params;
  if (!slug) notFound();

  const tags = await getCachedTags();
  const matchedTag = resolveTaxonomyBySlug(tags, slug);
  if (!matchedTag) notFound();

  const images = await searchImages({ tagIds: [matchedTag.id] });
  return <TaxonomyPage entityName={matchedTag.name} images={images} />;
}
