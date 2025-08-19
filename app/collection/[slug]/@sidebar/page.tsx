/**
 * Title: Collection Sidebar Slot (@sidebar) — Server Component
 *
 * What this file is:
 * - RSC for the @sidebar parallel route. Renders metadata and pagination links, fetching a light page.
 *
 * Replaces in the old code:
 * - Replaces sidebar/metadata baked into a single Pages Router view, enabling independent loading.
 *
 * New Next.js features used:
 * - Parallel Route slot composition, server-side Link-based pagination using URL state.
 *
 * TODOs / Improvements:
 * - Move inline styles to CSS Modules and unify typography.
 * - Add aria-current and keyboard focus styles to pagination links.
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { type ContentCollectionNormalized,fetchCollectionBySlug } from '@/lib/api/contentCollections';

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

export default async function SidebarPage({ params, searchParams }: PageProps) {
  const { page, size } = parsePagination(searchParams);

  let collection: ContentCollectionNormalized | null = null;
  try {
    // Fetch a small page just to get metadata quick; still pass page/size to reflect current
    collection = await fetchCollectionBySlug(params.slug, page, Math.min(size, 5));
  } catch {
    return notFound();
  }

  if (!collection) return notFound();

  const { title, description, pagination } = collection;

  const current = pagination.currentPage;
  const total = pagination.totalPages;

  const pages = Array.from({ length: total }, (_, i) => i);

  return (
    <aside style={{ position: 'sticky', top: 16 }}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      {description ? <p style={{ color: '#666' }}>{description}</p> : null}
      <div style={{ fontSize: 12, color: '#888', margin: '0.5rem 0 1rem' }}>
        Page {current + 1} of {total}
      </div>
      <nav aria-label="Pagination">
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
          {pages.map((p) => (
            <li key={p}>
              {p === current ? (
                <span style={{ fontWeight: 700 }}>Page {p + 1}</span>
              ) : (
                <Link prefetch href={{ pathname: `/collection/${params.slug}`, query: { page: p, size: pagination.pageSize } }}>
                  Page {p + 1}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
