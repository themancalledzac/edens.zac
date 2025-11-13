import {
  type AnyContentModel,
  type ContentCollectionModel,
  type ContentImageModel,
  type ContentParallaxImageModel,
} from '@/app/types/Content';
import { getContentDimensions, hasImage, isContentCollection, isContentImage } from '@/app/utils/contentTypeGuards';

/**
 * Simplified Layout utilities for Content system
 * Direct processing without complex normalization - works with proper Content types
 */

/**
 * Chunk ContentModels based on standalone rules (panorama) and slot width system (rated images)
 */
export function chunkContent(
  content: AnyContentModel[],
  chunkSize: number = 2
): AnyContentModel[][] {
  if (!content || content.length === 0) return [];

  const result: AnyContentModel[][] = [];
  let currentRow: AnyContentModel[] = [];
  let currentRowSlots: number = 0;

  for (const contentItem of content) {
    const slotWidth = getSlotWidth(contentItem, chunkSize);
    
    // Standalone items (panoramas) get their own row
    if (slotWidth === Infinity) {
      // Finish current row if it has content
      if (currentRow.length > 0) {
        result.push([...currentRow]);
        currentRow = [];
        currentRowSlots = 0;
      }
      // Add as standalone
      result.push([contentItem]);
      continue;
    }

    // If item needs more slots than available, make it standalone
    if (slotWidth > chunkSize) {
      // Finish current row if it has content
      if (currentRow.length > 0) {
        result.push([...currentRow]);
        currentRow = [];
        currentRowSlots = 0;
      }
      result.push([contentItem]);
      continue;
    }

    // Check if item fits in current row
    if (currentRowSlots + slotWidth <= chunkSize) {
      currentRow.push(contentItem);
      currentRowSlots += slotWidth;
      
      // Row is full, start new row
      if (currentRowSlots === chunkSize) {
        result.push([...currentRow]);
        currentRow = [];
        currentRowSlots = 0;
      }
    } else {
      // Item doesn't fit, finish current row and start new one
      if (currentRow.length > 0) {
        result.push([...currentRow]);
      }
      currentRow = [contentItem];
      currentRowSlots = slotWidth;
    }
  }

  // Add remaining content if any
  if (currentRow.length > 0) {
    result.push(currentRow);
  }

  return result;
}

/**
 * Get the slot width for a content item
 * @returns slot width: 1 (normal), 2 (4-star), 3 (5-star), or Infinity (standalone/panorama)
 */
function getSlotWidth(
  contentItem: AnyContentModel,
  _chunkSize: number
): number {
  if (!hasImage(contentItem)) return 1;

  // Panoramas are always standalone (full width)
  const { width, height } = getContentDimensions(contentItem);
  const aspectRatio = width / Math.max(1, height);
  const isPanorama = aspectRatio >= 2;
  if (isPanorama) return Infinity;

  // Rating-based slot width (only for images)
  // Only apply to images that are wider than tall (aspect ratio >= 1.0)
  // Taller images (aspect ratio < 1.0) don't get slot width to prevent taking too much horizontal space
  if (isContentImage(contentItem)) {
    const rating = contentItem.rating;
    const isWiderThanTall = aspectRatio >= 1.0;
    
    if (isWiderThanTall) {
      if (rating === 5) return 3; // 5-star = 3 slots
      if (rating === 4) return 2; // 4-star = 2 slots
    }
  }

  return 1; // Normal = 1 slot
}

/**
 * Determine if a Content should be rendered standalone
 */
export function shouldBeStandalone(contentItem: AnyContentModel): boolean {
  return getSlotWidth(contentItem, 2) === Infinity; // chunkSize doesn't matter for standalone check
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
 * Accounts for slot width: rated images (4-5 star) take 2-3x the proportional space
 */
export function calculateContentSizes(
  content: AnyContentModel[],
  componentWidth: number,
  chunkSize: number = 2
): CalculatedContentSize[] {
  if (!content || content.length === 0) return [];

  if (content.length === 1) {
    const contentElement = content[0];
    if (!contentElement) return [];

    const { width, height } = getContentDimensions(contentElement);
    
    // Validate dimensions
    if (width <= 0 || height <= 0) {
      // Fallback to default aspect ratio
      return [{
        content: contentElement,
        width: componentWidth,
        height: componentWidth / 1.5, // Default 3:2 aspect ratio
      }];
    }
    
    const ratio = width / Math.max(1, height);
    const displayHeight = componentWidth / ratio;

    // Validate calculated height
    if (!Number.isFinite(displayHeight) || displayHeight <= 0) {
      return [{
        content: contentElement,
        width: componentWidth,
        height: componentWidth / 1.5, // Fallback to default aspect ratio
      }];
    }

    return [{
      content: contentElement,
      width: componentWidth,
      height: displayHeight,
    }];
  }

  // Calculate ratios for all content, using effective dimensions for rated images
  // For 4-5 star images, scale BOTH width and height by slot width to get effective dimensions
  // This preserves aspect ratio while giving them 2-3x the space
  // Note: Padding (.imageLeft, .imageRight) is INSIDE the div width due to box-sizing: border-box
  // So we don't subtract padding - the divs should sum to the full componentWidth
  const ratios = content.map(contentItem => {
    const { width, height } = getContentDimensions(contentItem);
    const slotWidth = getSlotWidth(contentItem, chunkSize);
    
    // Guard: Standalone items (Infinity slot width) should never reach here
    // If they do, treat as normal (1 slot) to prevent NaN calculations
    if (slotWidth === Infinity) {
      const baseRatio = width / Math.max(1, height);
      return baseRatio;
    }
    
    // Validate dimensions to prevent division by zero or invalid calculations
    if (width <= 0 || height <= 0) {
      // Fallback to default aspect ratio if dimensions are invalid
      return 1.5; // Default 3:2 aspect ratio
    }
    
    // For rated images, scale both dimensions by slot width to get effective dimensions
    // This means a 4-star image (2 slots) is treated as 2x larger in both dimensions
    // Example: 640x180 becomes 1280x360 for space calculation (same ratio, 2x size)
    const effectiveWidth = width * slotWidth;
    const effectiveHeight = height * slotWidth;
    const effectiveRatio = effectiveWidth / Math.max(1, effectiveHeight);
    
    return effectiveRatio;
  });

  const ratioSum = ratios.reduce((sum, ratio) => {
    // Filter out invalid ratios (NaN, Infinity, or 0)
    if (!Number.isFinite(ratio) || ratio <= 0) return sum;
    return sum + ratio;
  }, 0);
  
  // Guard against division by zero
  if (ratioSum === 0 || !Number.isFinite(ratioSum)) {
    // Fallback: distribute width equally among all items
    const equalWidth = componentWidth / content.length;
    return content.map(contentItem => {
      const { width, height } = getContentDimensions(contentItem);
      const ratio = width / Math.max(1, height);
      const calculatedHeight = equalWidth / ratio;
      return {
        content: contentItem,
        width: equalWidth,
        height: calculatedHeight,
      };
    });
  }
  
  const commonHeight = componentWidth / ratioSum;

  return content.map((contentItem, idx) => {
    const ratio = ratios[idx];
    if (!ratio || !Number.isFinite(ratio) || ratio <= 0) {
      return { content: contentItem, width: 0, height: 0 };
    }

    // Calculate width from effective ratio (gives 2-3x space for rated images)
    const calculatedWidth = ratio * commonHeight;
    
    // Calculate height to preserve the ORIGINAL aspect ratio (not effective)
    // We use the original dimensions, not the effective ones, for the final height
    const { width: originalWidth, height: originalHeight } = getContentDimensions(contentItem);
    
    // Validate original dimensions
    if (originalWidth <= 0 || originalHeight <= 0) {
      // Fallback: use calculated width with default aspect ratio
      return {
        content: contentItem,
        width: calculatedWidth,
        height: calculatedWidth / 1.5, // Default 3:2 aspect ratio
      };
    }
    
    const originalRatio = originalWidth / Math.max(1, originalHeight);
    const calculatedHeight = calculatedWidth / originalRatio;

    // Validate calculated dimensions
    if (!Number.isFinite(calculatedWidth) || !Number.isFinite(calculatedHeight) || calculatedWidth <= 0 || calculatedHeight <= 0) {
      return { content: contentItem, width: 0, height: 0 };
    }

    return {
      content: contentItem,
      width: calculatedWidth,
      height: calculatedHeight,
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
  return chunks.map(chunk => calculateContentSizes(chunk, componentWidth, chunkSize));
}

/**
 * Extract image dimensions from a cover image
 * Prioritizes imageWidth/imageHeight over width/height for accurate aspect ratios
 *
 * @param coverImage - The cover image to extract dimensions from
 * @returns Object with imageWidth and imageHeight (may be undefined)
 */
function extractCollectionDimensions(coverImage?: ContentImageModel | null): {
  imageWidth?: number;
  imageHeight?: number;
} {
  return {
    imageWidth: coverImage?.imageWidth ?? coverImage?.width,
    imageHeight: coverImage?.imageHeight ?? coverImage?.height,
  };
}

/**
 * Convert CollectionContentModel to ParallaxImageContentModel for unified rendering
 * Used when processing content blocks from a collection that contain child collections
 * Uses coverImage dimensions for accurate layout calculations
 * 
 * Used on public collection pages where collections should render as parallax images
 */
export function convertCollectionContentToParallax(col: ContentCollectionModel): ContentParallaxImageModel {
  // Extract dimensions from coverImage (prioritize imageWidth/imageHeight for accurate aspect ratios)
  const { imageWidth, imageHeight } = extractCollectionDimensions(col.coverImage);
  
  return {
    contentType: 'IMAGE',
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
export function convertCollectionContentToImage(col: ContentCollectionModel): ContentImageModel {
  const coverImage = col.coverImage;
  
  // Extract dimensions from coverImage (prioritize imageWidth/imageHeight for accurate aspect ratios)
  const { imageWidth, imageHeight } = extractCollectionDimensions(coverImage);
  
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
 * Filter visible content blocks
 * Removes blocks where visible === false, and for images, checks collection-specific visibility
 * 
 * @param content - Array of content blocks to filter
 * @param filterVisible - If true, filters out non-visible blocks
 * @param collectionId - Optional collection ID to check collection-specific visibility for images
 * @returns Filtered array of content blocks
 */
function filterVisibleBlocks(
  content: AnyContentModel[],
  filterVisible: boolean,
  collectionId?: number
): AnyContentModel[] {
  if (!filterVisible) return content;
  
  return content.filter(block => {
    if (block.visible === false) return false;
    
    // For images, check collection-specific visibility
    if (block.contentType === 'IMAGE' && collectionId) {
      const imageBlock = block as ContentImageModel;
      const collectionEntry = imageBlock.collections?.find(
        c => c.collectionId === collectionId
      );
      if (collectionEntry?.visible === false) return false;
    }
    
    return true;
  });
}

/**
 * Transform CollectionContentModel blocks to ParallaxImageContentModel
 * 
 * @param content - Array of content blocks to transform
 * @returns Array with CollectionContentModel blocks converted to ParallaxImageContentModel
 */
function transformCollectionBlocks(content: AnyContentModel[]): AnyContentModel[] {
  return content.map(block => {
    if (isContentCollection(block)) {
      const collectionBlock = block as ContentCollectionModel;
      return convertCollectionContentToParallax(collectionBlock);
    }
    return block;
  });
}

/**
 * Update orderIndex for image blocks from collection-specific entry
 * 
 * @param content - Array of content blocks to update
 * @param collectionId - Collection ID to look up collection-specific orderIndex
 * @returns Array with updated orderIndex for image blocks
 */
function updateImageOrderIndex(
  content: AnyContentModel[],
  collectionId?: number
): AnyContentModel[] {
  if (!collectionId) return content;
  
  return content.map(block => {
    if (block.contentType === 'IMAGE') {
      const imageBlock = block as ContentImageModel;
      const collectionEntry = imageBlock.collections?.find(
        c => c.collectionId === collectionId
      );
      if (collectionEntry?.orderIndex !== undefined) {
        return {
          ...imageBlock,
          orderIndex: collectionEntry.orderIndex,
        };
      }
    }
    return block;
  });
}

/**
 * Ensure content blocks with parallax enabled have proper imageWidth/imageHeight dimensions
 * 
 * @param content - Array of content blocks to process
 * @returns Array with parallax-enabled blocks having proper dimensions
 */
function ensureParallaxDimensions(content: AnyContentModel[]): AnyContentModel[] {
  return content.map(block => {
    // Check for enableParallax flag instead of contentType
    if ('enableParallax' in block && block.enableParallax && block.contentType === 'IMAGE') {
      const parallaxBlock = block as ContentParallaxImageModel;
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

/**
 * Sort content blocks by orderIndex
 * 
 * @param content - Array of content blocks to sort
 * @returns Sorted array by orderIndex (ascending)
 */
function sortContentByOrderIndex(content: AnyContentModel[]): AnyContentModel[] {
  return [...content].sort((a, b) => {
    return (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
  });
}

/**
 * Sort content blocks by createdAt date (chronological)
 * 
 * @param content - Array of content blocks to sort
 * @returns Sorted array by createdAt (ascending - oldest first)
 */
function sortContentByCreatedAt(content: AnyContentModel[]): AnyContentModel[] {
  return [...content].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateA - dateB;
  });
}

/**
 * Process content blocks for display, converting CollectionContentModel to ParallaxImageContentModel
 * and ensuring PARALLAX blocks have proper dimensions
 * Also filters out non-visible content blocks for public collection pages
 * 
 * Pipeline: filter → transform → update → ensure → sort
 * 
 * @param content - Array of content blocks to process
 * @param filterVisible - If true, filters out blocks where visible === false (default: true for public pages)
 * @param collectionId - Optional collection ID to check collection-specific visibility
 * @param displayMode - Display mode: 'CHRONOLOGICAL' sorts by createdAt, 'ORDERED' sorts by orderIndex
 * @returns Processed and sorted array of content blocks
 */
export function processContentBlocks(
  content: AnyContentModel[],
  filterVisible: boolean = true,
  collectionId?: number,
  displayMode?: 'CHRONOLOGICAL' | 'ORDERED'
): AnyContentModel[] {
  let processed = filterVisibleBlocks(content, filterVisible, collectionId);
  processed = transformCollectionBlocks(processed);
  processed = updateImageOrderIndex(processed, collectionId);
  processed = ensureParallaxDimensions(processed);
  // Sort based on display mode using a ternary expression
  processed = displayMode === 'CHRONOLOGICAL'
    ? sortContentByCreatedAt(processed)
    : sortContentByOrderIndex(processed);

  return processed;
}