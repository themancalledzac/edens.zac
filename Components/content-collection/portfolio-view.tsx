/**
 * PortfolioView — Type-Specific Collection Renderer (RSC)
 *
 * Renders PORTFOLIO collections using SSR-optimized content blocks.
 */
import { Suspense } from 'react';

import ContentBlockRenderer from '@/Components/content-blocks/content-block-renderer';
import { type ContentCollectionNormalized } from '@/lib/api/contentCollections';

export type PortfolioViewProps = {
  collection: ContentCollectionNormalized;
};

// Server component for PORTFOLIO collections
export default function PortfolioView({ collection }: PortfolioViewProps) {
  const { blocks } = collection;

  const chunkSize = 8;
  const chunks: typeof blocks[] = [];
  for (let i = 0; i < blocks.length; i += chunkSize) {
    chunks.push(blocks.slice(i, i + chunkSize));
  }

  return (
    <section aria-label="Portfolio" style={{ display: 'grid', gap: '1rem' }}>
      {chunks.map((group) => {
        const groupKey = `grp-${group[0]?.id ?? 'start'}-${group[group.length - 1]?.id ?? 'end'}`;
        return (
          <Suspense key={groupKey} fallback={<div style={{ height: 140, background: '#f5f5f5', borderRadius: 10 }} />}>
            {group.map((block) => (
              <article key={block.id} style={{ border: '1px solid #ddd', borderRadius: 10, padding: '1rem' }}>
                <ContentBlockRenderer block={block} />
              </article>
            ))}
          </Suspense>
        );
      })}
    </section>
  );
}
