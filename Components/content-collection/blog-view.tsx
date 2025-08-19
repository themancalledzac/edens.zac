/**
 * BlogView — Type-Specific Collection Renderer (RSC)
 *
 * What this file is:
 * - Server component that renders BLOG-type ContentCollections.
 * - Delegates to SSR-optimized content block components (Phase 5.4).
 */
import { Suspense } from 'react';

import ContentBlockRenderer from '@/Components/content-blocks/content-block-renderer';
import { type ContentCollectionNormalized } from '@/lib/api/contentCollections';

export type BlogViewProps = {
  collection: ContentCollectionNormalized;
};

// Server component for BLOG collections
export default function BlogView({ collection }: BlogViewProps) {
  const { blocks } = collection;

  // Progressive loading: chunk blocks into groups for streaming
  const chunkSize = 10;
  const chunks: typeof blocks[] = [];
  for (let i = 0; i < blocks.length; i += chunkSize) {
    chunks.push(blocks.slice(i, i + chunkSize));
  }

  return (
    <section aria-label="Blog content" style={{ display: 'grid', gap: '1.25rem' }}>
      {chunks.map((group) => {
        const groupKey = `grp-${group[0]?.id ?? 'start'}-${group[group.length - 1]?.id ?? 'end'}`;
        return (
          <Suspense key={groupKey} fallback={<div style={{ height: 120, background: '#fafafa', borderRadius: 8 }} />}>
            {group.map((block) => (
              <article key={block.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: '0.75rem' }}>
                <ContentBlockRenderer block={block} />
              </article>
            ))}
          </Suspense>
        );
      })}
    </section>
  );
}
