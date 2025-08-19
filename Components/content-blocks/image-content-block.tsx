/**
 * ImageContentBlock — SSR image renderer using next/image
 *
 * Server component. Optimized for CloudFront/S3 remote images configured in next.config.js.
 *
 * Expected block shape (flexible to backend variance):
 * - type: 'IMAGE'
 * - webUrl | url | src — optimized web image URL (AVIF/WEBP preferred via CDN)
 * - rawUrl? — original file URL (optional)
 * - width?, height? — intrinsic dimensions for layout stability
 * - alt?, caption? — accessible text
 * - aspectRatio? — optional hint if width/height unknown
 */
import Image from 'next/image';

import { type ImageBlock } from '@/types/ContentBlock';

export type ImageContentBlockProps = {
  block: ImageBlock;
  priority?: boolean;
  sizes?: string; // e.g., '(max-width: 768px) 100vw, 50vw'
  className?: string;
};

const pickUrl = (b: ImageBlock) => {
  if (typeof b.webUrl === 'string' && b.webUrl.length > 0) return b.webUrl;
  if (typeof b.url === 'string' && b.url.length > 0) return b.url;
  if (typeof b.src === 'string' && b.src.length > 0) return b.src;
  return '';
};

export default function ImageContentBlock({ block, priority = false, sizes = '(max-width: 768px) 100vw, 50vw', className }: ImageContentBlockProps) {
  const src = pickUrl(block);

  if (!src) {
    // Guard: nothing to render
    return null;
  }

  const width = Number.isFinite(block.width as number) ? (block.width as number) : undefined;
  const height = Number.isFinite(block.height as number) ? (block.height as number) : undefined;
  let alt = '';
  if (typeof block.alt === 'string') alt = block.alt;
  else if (block.caption) alt = String(block.caption);

  // If width/height are unknown, fall back to responsive fill within a container
  if (!width || !height) {
    const ratio = (typeof block.aspectRatio === 'number' && block.aspectRatio > 0) ? block.aspectRatio : 3 / 2;
    return (
      <figure className={className} style={{ position: 'relative', width: '100%', aspectRatio: String(ratio), overflow: 'hidden', borderRadius: 8 }}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          priority={priority}
          style={{ objectFit: 'cover' }}
        />
        {block.caption ? (
          <figcaption style={{ fontSize: 12, color: '#666', marginTop: 6 }}>{String(block.caption)}</figcaption>
        ) : null}
      </figure>
    );
  }

  return (
    <figure className={className} style={{ margin: 0 }}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        loading={priority ? 'eager' : 'lazy'}
        priority={priority}
        style={{ width: '100%', height: 'auto', borderRadius: 8 }}
      />
      {block.caption ? (
        <figcaption style={{ fontSize: 12, color: '#666', marginTop: 6 }}>{String(block.caption)}</figcaption>
      ) : null}
    </figure>
  );
}
