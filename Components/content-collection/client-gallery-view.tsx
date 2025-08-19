/**
 * ClientGalleryView — Type-Specific Collection Renderer (Hybrid later)
 *
 * For now SSR-rendered; future phases will introduce client password flow.
 */
import { Suspense } from 'react';

import ContentBlockRenderer from '@/Components/content-blocks/content-block-renderer';
import { type ContentCollectionNormalized } from '@/lib/api/contentCollections';

export type ClientGalleryViewProps = {
  collection: ContentCollectionNormalized;
};

// Hybrid planned later; for now provide minimal server-rendered placeholder
export default function ClientGalleryView({ collection }: ClientGalleryViewProps) {
  const { blocks } = collection;

  const chunkSize = 10;
  const chunks: typeof blocks[] = [];
  for (let i = 0; i < blocks.length; i += chunkSize) {
    chunks.push(blocks.slice(i, i + chunkSize));
  }

  return (
    <section aria-label="Client gallery" style={{ display: 'grid', gap: '1rem' }}>
      <div style={{ padding: '0.75rem', background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 8 }}>
        Private gallery features (password, downloads) will be added in a later phase.
      </div>
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
