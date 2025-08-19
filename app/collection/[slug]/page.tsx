/**
 * Title: Collection Route (App Router) — Server Component
 *
 * What this file is:
 * - RSC page for /collection/[slug] that fetches a ContentCollection with pagination.
 * - Provides generateMetadata() for SEO and renders a minimal server-first placeholder view.
 *
 * Replaces in the old code:
 * - Replaces Pages Router pattern (pages/collection/[slug].tsx with getServerSideProps) that mirrored catalog flows.
 * - Moves away from catalog-centric rendering and context-heavy client patterns.
 *
 * New Next.js features used:
 * - React Server Components (no 'use client'), generateMetadata, and route-level revalidate for caching.
 * - notFound() for HTTP-aware 404 handling without getServerSideProps.
 *
 * TODOs / Improvements:
 * - Move inline styles to CSS Modules and unify spacing vars.
 * - Replace JSON previews with real block renderers (Phase 5.4) and enable streaming with Suspense.
 * - Add cache tags for targeted revalidation (Phase 5.6).
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { type ContentCollectionNormalized, fetchCollectionBySlug } from '@/lib/api/contentCollections';

export const revalidate = 3600; // cache for 1 hour

type PageProps = {
  params: { slug: string };
  searchParams: { page?: string; size?: string };
};

function parsePagination(searchParams: PageProps['searchParams']): { page: number; size: number } {
  const rawPage = Number(searchParams.page);
  const rawSize = Number(searchParams.size);
  const page = Number.isFinite(rawPage) && rawPage >= 0 ? Math.floor(rawPage) : 0;
  const size = Number.isFinite(rawSize) && rawSize > 0 && rawSize <= 100 ? Math.floor(rawSize) : 30;
  return { page, size };
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  try {
    const collection = await fetchCollectionBySlug(params.slug, 0, 1);
    const title = collection?.title ? `${collection.title} — Collection` : 'Collection';
    const description = collection?.description ?? 'Photography collection';

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
        url: `/collection/${params.slug}`,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
      },
    };
  } catch {
    return { title: 'Collection', description: 'Photography collection' };
  }
}

export default async function CollectionPage({ params, searchParams }: PageProps) {
  const { page, size } = parsePagination(searchParams);

  let collection: ContentCollectionNormalized | null = null;

  try {
    collection = await fetchCollectionBySlug(params.slug, page, size);
  } catch {
    // If 404 or similar, show not found
    return notFound();
  }

  if (!collection) {
    return notFound();
  }

  const { title, description, blocks, pagination } = collection;

  return (
    <main style={{ padding: '1rem', maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ marginBottom: '1rem' }}>
        <h1 style={{ margin: 0 }}>{title}</h1>
        {description ? (
          <p style={{ color: '#666', marginTop: '0.5rem' }}>{description}</p>
        ) : null}
        <small style={{ color: '#888' }}>
          Page {pagination.currentPage + 1} of {pagination.totalPages} · {pagination.totalBlocks} items
        </small>
      </header>

      <section aria-label="Content blocks" style={{ display: 'grid', gap: '1rem' }}>
        {blocks.length === 0 ? (
          <p>No content yet.</p>
        ) : (
          blocks.map((block) => (
            <article key={block.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: '0.75rem' }}>
              <div style={{ fontSize: 12, color: '#999' }}>
                #{block.orderIndex} · {String(block.type)}
              </div>
              {/* Minimal placeholder rendering; detailed rendering will be implemented in Phase 5.4 */}
              <pre style={{ overflow: 'auto', whiteSpace: 'pre-wrap', marginTop: 8 }}>
                {JSON.stringify(block, null, 2)}
              </pre>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
