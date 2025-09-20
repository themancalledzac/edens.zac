'use client';

import { use, useEffect, useState } from 'react';
import { notFound } from 'next/navigation';

import SiteHeader from '@/app/components/site-header';
import { type ContentCollectionNormalized } from '@/lib/api/contentCollections';
import { fetchCollectionBySlug } from '@/lib/api/home';
import { type AnyContentBlock } from '@/types/ContentBlock';
import ContentBlocksClient from './ContentBlocksClient';

import blogData from '../../../Data/getBlogById.json';
import styles from '../../page.module.scss';

interface ContentCollectionPageProps {
  params: Promise<{
    cardType: string;
    slug: string;
  }>;
}

type CoverDescriptor = { url: string; width?: number; height?: number } | null;

function getCoverDescriptor(content: ContentCollectionNormalized): CoverDescriptor {
  const cov = content.coverImage ?? (content.coverImageUrl ? { url: content.coverImageUrl } : null);
  if (!cov || !cov.url) return null;
  return { url: cov.url, width: cov.width, height: cov.height };
}

function buildCoverImageBlock(content: ContentCollectionNormalized, cover: CoverDescriptor): AnyContentBlock | null {
  if (!cover) return null;
  return {
    id: Number.MAX_SAFE_INTEGER - 1,
    type: 'IMAGE',
    blockType: 'IMAGE',
    title: content.title,
    caption: content.description ?? undefined,
    imageUrlWeb: cover.url,
    imageWidth: cover.width,
    imageHeight: cover.height,
    rating: 3,
    orderIndex: -2,
  } as AnyContentBlock;
}

function buildMetadataTextBlock(
  content: ContentCollectionNormalized,
  opts: { cardType: string; slug: string },
  cover: CoverDescriptor
): AnyContentBlock {
  const rows = [
    `Card Type: ${opts.cardType}`,
    `Title: ${content.title}`,
    `Slug: ${opts.slug}`,
    content.location ? `Location: ${content.location}` : undefined,
    content.collectionDate ? `Date: ${new Date(content.collectionDate).toLocaleDateString()}` : undefined,
    content.description ? `Description: ${content.description}` : undefined,
  ].filter(Boolean) as string[];

  // Match metadata block dimensions to the cover image when available so the first row aligns.
  const width = cover?.width;
  const height = cover?.height;

  return {
    id: Number.MAX_SAFE_INTEGER,
    type: 'TEXT',
    blockType: 'TEXT',
    title: `${content.title} — Details`,
    content: rows.join('\n'),
    format: 'plain',
    align: 'start',
    // Provide sizing hints so normalizeContentBlock uses these exact dims
    contentWidth: typeof width === 'number' && width > 0 ? width : undefined,
    contentHeight: typeof height === 'number' && height > 0 ? height : undefined,
    rating: 3,
    orderIndex: -1,
  } as AnyContentBlock;
}

export default function ContentCollectionPage({ params }: ContentCollectionPageProps) {
  const { cardType, slug } = use(params);
  const [content, setContent] = useState<ContentCollectionNormalized | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setIsLoading(true);

        console.log(`Attempting to fetch collection: cardType=${cardType}, slug=${slug}`);
        const collectionData = await fetchCollectionBySlug(slug);
        setContent(collectionData);
      } catch (error_) {
        console.error('Error fetching content:', error_);
        // Fallback to local JSON sample normalized to the expected shape
        const fallback: ContentCollectionNormalized = {
          id: (blogData as any).id,
          title: (blogData as any).title,
          description: (blogData as any).description,
          slug: (blogData as any).slug,
          type: (blogData as any).type,
          coverImageUrl: (blogData as any).coverImageUrl,
          coverImage: (blogData as any).coverImage ?? ((blogData as any).coverImageUrl ? { url: (blogData as any).coverImageUrl } : null),
          blocks: (blogData as any).contentBlocks ?? [],
          pagination: {
            currentPage: (blogData as any).currentPage ?? 0,
            totalPages: (blogData as any).totalPages ?? 1,
            totalBlocks: (blogData as any).totalBlocks ?? ((blogData as any).contentBlocks?.length ?? 0),
            pageSize: (blogData as any).blocksPerPage ?? 30,
          },
        };
        setContent(fallback);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [slug, cardType]);

  if (isLoading) {
    return (
      <div>
        <SiteHeader />
        <div className={styles.main}>
          <p>Loading {cardType} content...</p>
        </div>
      </div>
    );
  }

  if (!content) {
    return notFound();
  }

  // Build synthetic blocks for unified layout
  const heroBlocks: AnyContentBlock[] = [];
  const coverDesc = getCoverDescriptor(content);
  const coverBlock = buildCoverImageBlock(content, coverDesc);
  if (coverBlock) heroBlocks.push(coverBlock);
  heroBlocks.push(buildMetadataTextBlock(content, { cardType, slug }, coverDesc));
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
