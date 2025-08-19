/**
 * ArtGalleryView — Type-Specific Collection Renderer (RSC)
 *
 * Renders ART_GALLERY collections using SSR-optimized content blocks.
 */
import { Suspense } from 'react';

import ContentBlockRenderer from '@/Components/content-blocks/content-block-renderer';
import { type ContentCollectionNormalized } from '@/lib/api/contentCollections';

export type ArtGalleryViewProps = {
  collection: ContentCollectionNormalized;
};

// Server component for ART_GALLERY collections
export default function ArtGalleryView({ collection }: ArtGalleryViewProps) {
  const { blocks } = collection;

  // Progressive loading groups for large galleries
  const chunkSize = 12;
  const chunks: typeof blocks[] = [];
  for (let i = 0; i < blocks.length; i += chunkSize) {
    chunks.push(blocks.slice(i, i + chunkSize));
  }

  return (
    <section aria-label="Art gallery" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
      gap: '0.75rem',
    }}>
      {chunks.map((group) => {
        const groupKey = `grp-${group[0]?.id ?? 'start'}-${group[group.length - 1]?.id ?? 'end'}`;
        return (
          <Suspense key={groupKey} fallback={<div style={{ height: 180, background: '#f2f3f5', borderRadius: 8 }} />}>
            {group.map((block) => (
              <article key={block.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: '0.5rem' }}>
                <ContentBlockRenderer block={block} />
              </article>
            ))}
          </Suspense>
        );
      })}
    </section>
  );
}
