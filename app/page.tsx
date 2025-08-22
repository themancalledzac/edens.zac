import Link from 'next/link';
import React from 'react';

import { fetchHomePageCollections } from '@/lib/api/contentCollections';

/**
 * Simplified Home Page
 * - Renders a 2-column grid of images based on fetchHomePageCollections response.items
 * - Uses backgroundImage style consistent with ParallaxSection
 * - Server Component (no client hooks)
 */
export const revalidate = 600;

/** Infer items array from various backend shapes */
function toItemsArray(data: unknown): Array<any> {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'object') {
    const items = (data as any).items ?? (data as any).content ?? (data as any).collections ?? null;
    return Array.isArray(items) ? items : [];
  }
  return [];
}

export default async function HomePage() {
  const raw = await fetchHomePageCollections({ maxPriority: 3, limit: 12 });
  const items = toItemsArray(raw);

  return (
    <main
      style={{
        padding: '1rem',
        display: 'grid',
        justifyItems: 'center',
      }}
    >
      <section aria-label="Collections" style={{ width: '100%', maxWidth: 1400 }}>
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '1rem',
          }}
        >
          {items.map((item) => {
            // Support both HomeCardModel and possible legacy shapes
            const id = String(item.id ?? item.slug ?? Math.random());
            const slug = String(item.slug ?? '');
            const title = String(item.title ?? '');
            const coverImageUrl = String(item.coverImageUrl ?? item.coverUrl ?? '');
            const href = `/collection/${slug}`;

            if (!slug || !coverImageUrl) return null; // guard against incomplete data

            return (
              <li key={id}>
                <Link href={href} prefetch aria-label={title} title={title}>
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      aspectRatio: '3 / 2',
                      borderRadius: 8,
                      overflow: 'hidden',
                      backgroundColor: '#e5e7eb',
                      backgroundImage: `url(${coverImageUrl})`, // See ParallaxSection usage
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                    }}
                    role="img"
                    aria-label={title}
                  />
                </Link>
              </li>
            );
          })}

          {items.length === 0 && (
            ['a','b','c','d'].map((key) => (
              <li key={`skeleton-${key}`}>
                <div
                  aria-hidden
                  style={{
                    width: '100%',
                    aspectRatio: '3 / 2',
                    borderRadius: 8,
                    background: 'linear-gradient(90deg,#e5e7eb,#f3f4f6)',
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }}
                />
              </li>
            ))
          )}
        </ul>
      </section>
    </main>
  );
}
