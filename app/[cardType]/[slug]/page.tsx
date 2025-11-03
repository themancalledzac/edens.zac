import { notFound } from 'next/navigation';

import ContentBlockWithFullScreen from '@/app/components/Content/ContentBlockWithFullScreen';
import SiteHeader from '@/app/components/SiteHeader/SiteHeader';
import { getCollectionBySlug } from '@/app/lib/api/collections.new';
import { type CollectionModel } from '@/app/types/Collection';
import {
  type AnyContentModel,
  type ImageContentModel,
  type ParallaxImageContentModel,
  type TextContentModel,
} from '@/app/types/Content';
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
  content: CollectionModel,
  coverBlock: ParallaxImageContentModel | null
): TextContentModel {
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
    contentType: 'TEXT',
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
  // Fetch ALL blocks (set high page size to get everything in one call)
  let content: CollectionModel;
  try {
    content = await getCollectionBySlug(slug, 0, 1000);
  } catch {
    // If fetch fails, return 404
    return notFound();
  }

  if (!content) {
    return notFound();
  }

  // Filter content to only show images visible in this collection
  const filteredContent = (content.content as AnyContentModel[])?.filter(content => {
    // Only filter IMAGE blocks that have collections metadata
    if (content.contentType === 'IMAGE' && 'collections' in content) {
      const imageBlock = content as ImageContentModel;
      // Find the collection relationship for the current collection
      const collectionRelation = imageBlock.collections?.find(
        c => c.collectionId === content.id
      );
      // If found, check visibility (default to true if not specified)
      return collectionRelation ? (collectionRelation.visible ?? true) : true;
    }
    // Non-image blocks are always shown
    return true;
  }) || [];

  // Build synthetic blocks for unified layout
  const heroContent: AnyContentModel[] = [];
  const image =
    content.coverImage ||
    (filteredContent.find(contentItem => contentItem.contentType === 'IMAGE') as ImageContentModel | undefined);
  const coverBlock = buildParallaxImageContentBlock(
    image,
    content.collectionDate ?? '',
    content.type,
    content.title
  );
  if (coverBlock) heroContent.push(coverBlock);
  heroContent.push(buildMetadataTextBlock(content, coverBlock));
  const combinedBlocks: AnyContentModel[] = [
    ...heroContent,
    ...filteredContent,
  ];


  return (
    <div>
      <SiteHeader pageType="collection" collectionSlug={slug} />

      <div className={styles.contentPadding}>
        <div className={styles.blockGroup}>
          <ContentBlockWithFullScreen
            content={combinedBlocks}
            priorityBlockIndex={0}
            enableFullScreenView
            initialPageSize={30}
            collectionSlug={slug}
            collectionData={content}
          />
        </div>
      </div>
    </div>
  );
}
