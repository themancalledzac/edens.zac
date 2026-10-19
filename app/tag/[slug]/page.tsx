import { type Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache, Suspense } from 'react';

import { resolveTaxonomyBySlug } from '@/app/components/TaxonomyPage/resolveTaxonomy';
import TaxonomyPage from '@/app/components/TaxonomyPage/TaxonomyPage';
import { PageLoading } from '@/app/components/ui/PageLoading/PageLoading';
import { getAllTags, searchImages } from '@/app/lib/api/content';
import { resolveSsrViewport } from '@/app/utils/ssrViewport';

const getCachedTags = cache(() => getAllTags());

/**
 * Renders on every request rather than at build time. A build-time prerender would need the build
 * container to reach the deployed backend, and one bad tag would fail the whole build.
 */
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

/** Fetches the tag's images and renders the page; runs inside the route's `<Suspense>`. */
async function TagPageContent({ tagId, tagName }: { tagId: number; tagName: string }) {
  const [images, ssrViewport] = await Promise.all([
    searchImages({ tagIds: [tagId] }),
    resolveSsrViewport(),
  ]);
  return <TaxonomyPage entityName={tagName} images={images} ssrViewport={ssrViewport} />;
}

/**
 * Tag page route. Resolves the slug against {@link getCachedTags} and throws `notFound()` before
 * anything streams, so an unknown tag answers a real 404. The route sits outside the `(site)`
 * group's `loading.tsx` for that reason; the image search streams behind its own `<Suspense>`.
 * The tag list is the read `generateMetadata` already made, deduped by `cache()`.
 */
export default async function TagPageRoute({ params }: TagPageRouteProps) {
  const { slug } = await params;
  if (!slug) notFound();

  const tags = await getCachedTags();
  const matchedTag = resolveTaxonomyBySlug(tags, slug);
  if (!matchedTag) notFound();

  return (
    <Suspense fallback={<PageLoading />}>
      <TagPageContent tagId={matchedTag.id} tagName={matchedTag.name} />
    </Suspense>
  );
}
