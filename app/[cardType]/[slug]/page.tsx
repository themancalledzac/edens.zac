import { notFound } from 'next/navigation';

import ContentBlockComponent from '@/app/components/ContentBlock/ContentBlockComponent';
import { ImageFullScreenController } from '@/app/components/ImageFullScreenController';
import SiteHeader from '@/app/components/SiteHeader/SiteHeader';
import { type ContentCollectionBase } from '@/app/lib/api/contentCollections';
import { fetchCollectionBySlug } from '@/app/lib/api/home';
import {
  type AnyContentBlock,
  type ImageContentBlock,
  type ParallaxImageContentBlock,
  type TextContentBlock,
} from '@/app/types/ContentBlock';
import { buildParallaxImageContentBlock } from '@/app/utils/parallaxImageUtils';

import styles from '../../page.module.scss';

interface ContentCollectionPageProps {
  params: Promise<{
    cardType: string;
    slug: string;
  }>;
}

/**
 * Build Metadata Text Block
 *
 * Creates a synthetic text block containing collection metadata including
 * location, description, and formatted date. Matches dimensions to cover
 * image for proper layout alignment.
 *
 * @param content - Normalized collection data
 * @param coverBlock - Cover image block for dimension matching
 * @returns Formatted metadata text block
 */
function buildMetadataTextBlock(
  content: ContentCollectionBase,
  coverBlock: ParallaxImageContentBlock | null
): TextContentBlock {
  const rows = [
    content.location ? `Location: ${content.location}` : undefined,
    content.description ? content.description : undefined,
  ].filter(Boolean) as string[];

  // Format date for badge display
  const dateBadge = content.collectionDate
    ? new Date(content.collectionDate).toLocaleDateString()
    : undefined;

  // Match metadata block dimensions to the cover image when available so the first row aligns.
  const width = coverBlock?.imageWidth;
  const height = coverBlock?.imageHeight;

  return {
    id: Number.MAX_SAFE_INTEGER,
    blockType: 'TEXT',
    title: `${content.title} — Details`,
    content: rows.join('\n'),
    format: 'plain' as const,
    align: 'left' as const,
    dateBadge: dateBadge, // Add date badge for top-left positioning on metadata block
    // Provide sizing hints for layout
    width: typeof width === 'number' && width > 0 ? width : undefined,
    height: typeof height === 'number' && height > 0 ? height : undefined,
    orderIndex: -1,
    createdAt: content.collectionDate,
    updatedAt: content.collectionDate,
  };
}

/**
 * Content Collection Page
 *
 * Dynamic route page for displaying individual content collections by slug.
 * Constructs unified layout with synthetic cover and metadata blocks,
 * handles server-side data fetching with proper error boundaries.
 *
 * @dependencies
 * - Next.js notFound for 404 handling
 * - SiteHeader for navigation
 * - fetchCollectionBySlug for data retrieval
 * - ContentBlocksClient for block rendering
 * - Helper functions for block construction
 *
 * @param params - Route parameters containing cardType and slug
 * @returns Server component displaying collection content
 */
export default async function ContentCollectionPage({ params }: ContentCollectionPageProps) {
  const { slug } = await params;

  // Server-side data fetching with proper error handling
  let content: ContentCollectionBase;
  try {
    content = await fetchCollectionBySlug(slug);
  } catch {
    // If fetch fails, return 404
    return notFound();
  }

  if (!content) {
    return notFound();
  }

  // Build synthetic blocks for unified layout
  const heroBlocks: AnyContentBlock[] = [];
  const image =
    content.coverImage ||
    (content.blocks.find(block => block.blockType === 'IMAGE') as ImageContentBlock | undefined);
  const coverBlock = buildParallaxImageContentBlock(
    image,
    content.collectionDate ?? '',
    content.type,
    content.title
  );
  if (coverBlock) heroBlocks.push(coverBlock);
  heroBlocks.push(buildMetadataTextBlock(content, coverBlock));
  const combinedBlocks: AnyContentBlock[] = [
    ...heroBlocks,
    ...((content.blocks as AnyContentBlock[]) || []),
  ];

  // Extract all image blocks for full-screen viewing
  // Include both regular images and parallax images
  const allImages: ImageContentBlock[] = combinedBlocks.filter(
    (block): block is ImageContentBlock =>
      block.blockType === 'IMAGE' || block.blockType === 'PARALLAX'
  );

  return (
    <div>
      <SiteHeader pageType="collection" collectionSlug={slug} />
      <ImageFullScreenController images={allImages} />
      <div className={styles.contentPadding}>
        <div className={styles.blockGroup}>
          <ContentBlockComponent blocks={combinedBlocks} priorityBlockIndex={0} enableFullScreenView />
        </div>
      </div>
    </div>
  );
}
