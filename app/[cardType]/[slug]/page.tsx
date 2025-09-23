import { notFound } from 'next/navigation';

import SiteHeader from '@/app/components/site-header';
import { type ContentCollectionNormalized } from '@/lib/api/contentCollections';
import { fetchCollectionBySlug } from '@/lib/api/home';
import { type AnyContentBlock } from '@/types/ContentBlock';

import styles from '../../page.module.scss';
import ContentBlocksClient from './ContentBlocksClient';

interface ContentCollectionPageProps {
  params: Promise<{
    cardType: string;
    slug: string;
  }>;
}

function buildCoverImageBlock(content: ContentCollectionNormalized, cardType: string): AnyContentBlock | null {
  // If coverImage exists, use it (it's always a ContentBlock now)
  if (content.coverImage) {
    return {
      ...content.coverImage,
      overlayText: content.title, // Add collection title as overlay text
      cardTypeBadge: cardType, // Add cardType badge for top-left positioning
      orderIndex: -2, // Ensure it appears first
    } as AnyContentBlock;
  }

  // Fallback: use the first IMAGE block from content.blocks
  const firstImageBlock = content.blocks.find(block => block.blockType === 'IMAGE');
  if (firstImageBlock) {
    return {
      ...firstImageBlock,
      overlayText: content.title, // Add collection title as overlay text
      cardTypeBadge: cardType, // Add cardType badge for top-left positioning
      orderIndex: -2, // Ensure it appears first
    } as AnyContentBlock;
  }

  // No cover image available
  return null;
}

function buildMetadataTextBlock(
  content: ContentCollectionNormalized,
  coverBlock: AnyContentBlock | null
): AnyContentBlock {
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
    type: 'TEXT',
    blockType: 'TEXT',
    title: `${content.title} — Details`,
    content: rows.join('\n'),
    format: 'plain',
    align: 'left',
    dateBadge: dateBadge, // Add date badge for top-left positioning on metadata block
    // Match the cover image's rating to ensure identical layout treatment
    rating: coverBlock?.rating || 3,
    // Provide sizing hints so normalizeContentBlock uses these exact dims
    contentWidth: typeof width === 'number' && width > 0 ? width : undefined,
    contentHeight: typeof height === 'number' && height > 0 ? height : undefined,
    orderIndex: -1,
  } as AnyContentBlock;
}

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
  const combinedBlocks: AnyContentBlock[] = [...heroBlocks, ...(content.blocks || [])];

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
