import {
  type AnyContentModel,
  type CollectionContentModel,
  type ImageContentModel,
  type ParallaxImageContentModel,
} from '@/app/types/Content';
import { getContentDimensions, hasImage, isCollectionContent, isContentImage } from '@/app/utils/contentTypeGuards';

/**
 * Simplified Layout utilities for Content system
 * Direct processing without complex normalization - works with proper Content types
 */

/**
 * Chunk ContentModels based on standalone rules (panorama, high-rated horizontals)
 */
export function chunkContent(
  content: AnyContentModel[],
  chunkSize: number = 2
): AnyContentModel[][] {
  if (!content || content.length === 0) return [];

  const result: AnyContentModel[][] = [];
  let currentChunk: AnyContentModel[] = [];

  for (const contentItem of content) {
    // Check if this contentItem should be standalone
    if (shouldBeStandalone(contentItem)) {
      // Finish current chunk if it has content
      if (currentChunk.length > 0) {
        result.push([...currentChunk]);
        currentChunk = [];
      }
      // Add as standalone
      result.push([contentItem]);
      continue;
    }

    // Add to current chunk
    currentChunk.push(contentItem);
    if (currentChunk.length === chunkSize) {
      result.push([...currentChunk]);
      currentChunk = [];
    }
  }

  // Add remaining content if any
  if (currentChunk.length > 0) {
    result.push(currentChunk);
  }

  return result;
}

/**
 * Determine if a Content should be rendered standalone
 */
export function shouldBeStandalone(contentItem: AnyContentModel): boolean {
  if (!hasImage(contentItem)) return false;

  const { width, height } = getContentDimensions(contentItem);
  const ratio = width / Math.max(1, height);
  const isPanorama = ratio >= 2;
  const isVertical = height > width;

  // Check for high rating (5-star) if it's an image contentItem
  const isHighRated = isContentImage(contentItem) && contentItem.rating === 5;

  return isPanorama || (isHighRated && !isVertical);
}

// ===================== Content sizing =====================

export interface CalculatedContentSize {
  content: AnyContentModel;
  width: number;
  height: number;
}

/**
 * Calculate display sizes for a row of ContentModels so their heights match
 * and their widths sum to the component width
 * Accounts for padding between images (.imageLeft padding-right: 0.4rem + .imageRight padding-left: 0.4rem = 0.8rem total)
 */
export function calculateContentSizes(
  content: AnyContentModel[],
  componentWidth: number
): CalculatedContentSize[] {
  if (!content || content.length === 0) return [];

  if (content.length === 1) {
    const contentElement = content[0];
    if (!contentElement) return [];

    const { width, height } = getContentDimensions(contentElement);
    const ratio = width / Math.max(1, height);
    const displayHeight = componentWidth / ratio;

    return [{
      content: contentElement,
      width: componentWidth,
      height: displayHeight,
    }];
  }

  // Calculate ratios for all content
  // Note: Padding (.imageLeft, .imageRight) is INSIDE the div width due to box-sizing: border-box
  // So we don't subtract padding - the divs should sum to the full componentWidth
  const ratios = content.map(contentItem => {
    const { width, height } = getContentDimensions(contentItem);
    return width / Math.max(1, height);
  });

  const ratioSum = ratios.reduce((sum, ratio) => sum + ratio, 0);
  const commonHeight = componentWidth / ratioSum;

  return content.map((contentItem, idx) => {
    const ratio = ratios[idx];
    if (!ratio) return { content: contentItem, width: 0, height: 0 };

    return {
      content: contentItem,
      width: ratio * commonHeight,
      height: commonHeight,
    };
  });
}

/**
 * Complete pipeline: chunk ContentModels then calculate sizes for each chunk
 */
export function processContentForDisplay(
  content: AnyContentModel[],
  componentWidth: number,
  chunkSize: number = 2
): CalculatedContentSize[][] {
  const chunks = chunkContent(content, chunkSize);
  return chunks.map(chunk => calculateContentSizes(chunk, componentWidth));
}

/**
 * Convert CollectionContentModel to ParallaxImageContentModel for unified rendering
 * Used when processing content blocks from a collection that contain child collections
 * Uses coverImage dimensions for accurate layout calculations
 * 
 * Used on public collection pages where collections should render as parallax images
 */
export function convertCollectionContentToParallax(col: CollectionContentModel): ParallaxImageContentModel {
  // Extract dimensions from coverImage (prioritize imageWidth/imageHeight for accurate aspect ratios)
  const imageWidth = col.coverImage?.imageWidth ?? col.coverImage?.width;
  const imageHeight = col.coverImage?.imageHeight ?? col.coverImage?.height;
  
  return {
    contentType: 'PARALLAX',
    enableParallax: true,
    id: col.id,
    title: col.title,
    slug: col.slug,
    collectionType: col.collectionType,
    description: col.description ?? null,
    imageUrl: col.coverImage?.imageUrl ?? '', // Use coverImage.imageUrl only
    overlayText: col.title || col.slug || '', // Display title on child collection cards
    // Use explicit width/height from coverImage dimensions for proper chunking
    // Prioritize imageWidth/imageHeight for accurate aspect ratio calculations
    imageWidth,
    imageHeight,
    // Also set width/height on base Content interface for layout (fallback)
    width: imageWidth,
    height: imageHeight,
    orderIndex: col.orderIndex,
    visible: col.visible ?? true,
    createdAt: col.createdAt,
    updatedAt: col.updatedAt,
  };
}

/**
 * Convert CollectionContentModel to ImageContentModel for manage page rendering
 * Used on admin/manage pages where collections should render as regular images (not parallax)
 * Uses the collection's coverImage as the base for the ImageContentModel
 */
export function convertCollectionContentToImage(col: CollectionContentModel): ImageContentModel {
  const coverImage = col.coverImage;
  
  // Extract dimensions from coverImage (prioritize imageWidth/imageHeight for accurate aspect ratios)
  const imageWidth = coverImage?.imageWidth ?? coverImage?.width;
  const imageHeight = coverImage?.imageHeight ?? coverImage?.height;
  
  // Create ImageContentModel from the coverImage, preserving collection metadata
  return {
    contentType: 'IMAGE',
    id: col.id,
    title: col.title,
    description: col.description ?? null,
    imageUrl: coverImage?.imageUrl ?? '',
    imageUrlRaw: coverImage?.imageUrlRaw ?? null,
    imageWidth,
    imageHeight,
    width: imageWidth,
    height: imageHeight,
    orderIndex: col.orderIndex,
    visible: col.visible ?? true,
    createdAt: col.createdAt,
    updatedAt: col.updatedAt,
    // Preserve image metadata from coverImage if available
    iso: coverImage?.iso,
    author: coverImage?.author ?? null,
    rating: coverImage?.rating,
    lens: coverImage?.lens ?? null,
    blackAndWhite: coverImage?.blackAndWhite,
    isFilm: coverImage?.isFilm,
    shutterSpeed: coverImage?.shutterSpeed ?? null,
    rawFileName: coverImage?.rawFileName ?? null,
    camera: coverImage?.camera ?? null,
    focalLength: coverImage?.focalLength ?? null,
    location: coverImage?.location ?? null,
    createDate: coverImage?.createDate ?? null,
    fStop: coverImage?.fStop ?? null,
    alt: col.title || col.slug || '',
    aspectRatio: imageWidth && imageHeight ? imageWidth / imageHeight : undefined,
    filmType: coverImage?.filmType ?? null,
    filmFormat: coverImage?.filmFormat ?? null,
    tags: coverImage?.tags ?? [],
    people: coverImage?.people ?? [],
    collections: coverImage?.collections ?? [],
    // Use overlayText to show collection title on image
    overlayText: col.title || col.slug || '',
  };
}

/**
 * Process content blocks for display, converting CollectionContentModel to ParallaxImageContentModel
 * and ensuring PARALLAX blocks have proper dimensions
 */
export function processContentBlocks(content: AnyContentModel[]): AnyContentModel[] {
  return content.map(block => {
    // Convert any CollectionContentModel blocks to ParallaxImageContentModel
    if (isCollectionContent(block)) {
      const collectionBlock = block as CollectionContentModel;
      // Debug: Log coverImage data to diagnose missing images
      if (process.env.NODE_ENV === 'development' && !collectionBlock.coverImage) {
        console.warn('[processContentBlocks] CollectionContentModel missing coverImage:', {
          id: collectionBlock.id,
          title: collectionBlock.title,
          slug: collectionBlock.slug,
          hasImageUrl: !!collectionBlock.imageUrl, // Check if old imageUrl field exists
        });
      }
      return convertCollectionContentToParallax(collectionBlock);
    }
    // Ensure PARALLAX content blocks have imageWidth/imageHeight preserved
    if (block.contentType === 'PARALLAX' && 'enableParallax' in block && block.enableParallax) {
      const parallaxBlock = block as ParallaxImageContentModel;
      if (!parallaxBlock.imageWidth || !parallaxBlock.imageHeight) {
        return {
          ...parallaxBlock,
          imageWidth: parallaxBlock.imageWidth || parallaxBlock.width,
          imageHeight: parallaxBlock.imageHeight || parallaxBlock.height,
        };
      }
    }
    return block;
  });
}