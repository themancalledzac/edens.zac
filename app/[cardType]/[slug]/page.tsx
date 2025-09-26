import { notFound } from 'next/navigation';

import SiteHeader from '@/app/components/SiteHeader/SiteHeader';
import { type ContentCollectionNormalized } from '@/app/lib/api/contentCollections';
import { fetchCollectionBySlug } from '@/app/lib/api/home';
import { type AnyContentBlock, type ParallaxImageContentBlock, type TextContentBlock } from '@/app/types/ContentBlock';
import { isImageBlock } from '@/app/utils/contentBlockTypeGuards';

import styles from '../../page.module.scss';
import ContentBlocksClient from './ContentBlocksClient';

interface ContentCollectionPageProps {
  params: Promise<{
    cardType: string;
    slug: string;
  }>;
}

/**
 * Build Cover Image Block
 *
 * Creates a synthetic cover image block from collection data, either using
 * the defined cover image or falling back to the first image block. Adds
 * overlay text and card type badge for consistent display formatting.
 *
 * @param content - Normalized collection data
 * @param cardType - Collection type for badge display
 * @returns Formatted cover image block or null if no image available
 */
function buildCoverImageBlock(content: ContentCollectionNormalized, cardType: string): ParallaxImageContentBlock | null {
  // If coverImage exists and it's an image block, use it
  if (content.coverImage && isImageBlock(content.coverImage)) {
    return {
      ...content.coverImage,
      enableParallax: true, // Enable parallax for cover images
      parallaxSpeed: -0.1, // Default parallax speed
      overlayText: content.title, // Add collection title as overlay text
      cardTypeBadge: cardType, // Add cardType badge for top-left positioning
      orderIndex: -2, // Ensure it appears first
      rating: 3, // Force standard rating to prevent full-screen display (rating=5 causes standalone/full-width behavior)
    };
  }

  // Fallback: use the first IMAGE block from content.blocks
  const firstImageBlock = content.blocks.find(isImageBlock);
  if (firstImageBlock) {
    return {
      ...firstImageBlock,
      enableParallax: true, // Enable parallax for cover images
      parallaxSpeed: -0.1, // Default parallax speed
      overlayText: content.title, // Add collection title as overlay text
      cardTypeBadge: cardType, // Add cardType badge for top-left positioning
      orderIndex: -2, // Ensure it appears first
      rating: 3, // Force standard rating to prevent full-screen display (rating=5 causes standalone/full-width behavior)
    };
  }

  // No cover image available
  return null;
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
  content: ContentCollectionNormalized,
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
  const { cardType, slug } = await params;

  // Server-side data fetching with proper error handling
  let content: ContentCollectionNormalized;
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
  const coverBlock = buildCoverImageBlock(content, cardType);
  if (coverBlock) heroBlocks.push(coverBlock);
  heroBlocks.push(buildMetadataTextBlock(content, coverBlock));
  const combinedBlocks: AnyContentBlock[] = [...heroBlocks, ...(content.blocks as AnyContentBlock[] || [])];

  return (
    <div>
      <SiteHeader />
      <div className={styles.contentPadding}>
        <div className={styles.blockGroup}>
          <ContentBlocksClient blocks={combinedBlocks} />
        </div>
      </div>
    </div>
  );
}
