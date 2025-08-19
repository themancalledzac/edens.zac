/**
 * ContentBlockRenderer — SSR switch for block types
 *
 * Server component. Chooses the right SSR-optimized subcomponent for each block.
 * Keeps logic minimal; pure rendering with guard clauses.
 */
import { Suspense } from 'react';

import CodeContentBlock from '@/Components/content-blocks/code-content-block';
import ImageContentBlock from '@/Components/content-blocks/image-content-block';
import TextContentBlock from '@/Components/content-blocks/text-content-block';
import { type BaseContentBlock } from '@/lib/api/contentCollections';
import { type CodeBlock, type ImageBlock, type TextBlock } from '@/types/ContentBlock';

function ImageBlockSkeleton() {
  return (
    <div aria-hidden="true" style={{ width: '100%', aspectRatio: '3 / 2', background: '#f2f3f5', borderRadius: 8 }} />
  );
}

export type ContentBlockRendererProps = {
  block: BaseContentBlock;
  className?: string;
};

export type AnyRenderableBlock = ImageBlock | TextBlock | CodeBlock | BaseContentBlock;

export default function ContentBlockRenderer({ block, className }: ContentBlockRendererProps) {
  // Defensive: ensure a type exists
  const type = (block?.type ?? '').toString().toUpperCase();

  switch (type) {
    case 'IMAGE': {
      return (
        <Suspense fallback={<ImageBlockSkeleton />}>
          <ImageContentBlock block={block as ImageBlock} className={className} />
        </Suspense>
      );
    }
    case 'TEXT': {
      return <TextContentBlock block={block as TextBlock} className={className} />;
    }
    case 'CODE': {
      return <CodeContentBlock block={block as CodeBlock} className={className} />;
    }
    case 'GIF': {
      // Temporary: treat GIF as simple <img> for now without next/image optimizations.
      const b = block as unknown as { webUrl?: string; url?: string; src?: string; alt?: string; caption?: string };
      const src = b.webUrl || b.url || b.src || '';
      if (!src) return null;
      const alt = b.alt || b.caption || '';
      return (
        <figure className={className} style={{ margin: 0 }}>
          <img src={src} alt={alt} style={{ width: '100%', height: 'auto', borderRadius: 8 }} loading="lazy" />
          {b.caption ? <figcaption style={{ fontSize: 12, color: '#666', marginTop: 6 }}>{String(b.caption)}</figcaption> : null}
        </figure>
      );
    }
    default: {
      // Unknown type: render nothing to avoid layout shift/noise
      return null;
    }
  }
}
