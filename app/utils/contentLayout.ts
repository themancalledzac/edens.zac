import { type CollectionModel } from '@/app/types/Collection';
import {
  type AnyContentModel,
  type ContentCollectionModel,
  type ContentImageModel,
  type ContentParallaxImageModel,
  type ContentTextModel,
  type TextBlockItem,
} from '@/app/types/Content';
import { getContentDimensions, hasImage, isContentCollection, isContentImage } from '@/app/utils/contentTypeGuards';

/**
 * Simplified Layout utilities for Content system
 * Direct processing without complex normalization - works with proper Content types
 */

/**
 * Chunk ContentModels based on standalone rules (panorama) and slot width system (rated images)
 * @param content - Array of content blocks to chunk into rows
 * @param chunkSize - Number of normal-width items per row (default: 2)
 * @returns Array of content rows
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
 * Get slot width for content item based on aspect ratio and rating
 * Returns 1 (normal), 2 (4-star), 3 (5-star), or Infinity (standalone panorama)
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
 * Determine if content should be rendered standalone (panorama images)
 */
export function shouldBeStandalone(contentItem: AnyContentModel): boolean {
  return getSlotWidth(contentItem, 2) === Infinity;
}

// ===================== Content sizing =====================

export interface CalculatedContentSize {
  content: AnyContentModel;
  width: number;
  height: number;
}

/**
 * Calculate display sizes for row of content to match heights and sum to component width
 * Accounts for slot width where rated images (4-5 star) take 2-3x proportional space
 * @param content - Array of content blocks in a single row
 * @param componentWidth - Total available width for the row
 * @param chunkSize - Number of normal-width items per row (default: 2)
 * @returns Array of content blocks with calculated display dimensions
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
 * Chunk content into rows and calculate display sizes for each chunk
 * @param content - Array of content blocks to process
 * @param componentWidth - Total available width for display
 * @param chunkSize - Number of normal-width items per row (default: 2)
 * @returns Array of rows, each containing sized content blocks
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
 * Extract image dimensions from cover image with fallback to width/height properties
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
 * Convert collection to parallax image for unified rendering on public pages
 * @param col - Collection content model to convert
 * @returns Parallax image model with collection metadata
 */
export function convertCollectionContentToParallax(col: ContentCollectionModel): ContentParallaxImageModel {
  const { imageWidth, imageHeight } = extractCollectionDimensions(col.coverImage);
  
  return {
    contentType: 'IMAGE',
    enableParallax: true,
    id: col.id,
    title: col.title,
    slug: col.slug,
    collectionType: col.collectionType,
    description: col.description ?? null,
    imageUrl: col.coverImage?.imageUrl ?? '',
    overlayText: col.title || col.slug || '',
    imageWidth,
    imageHeight,
    width: imageWidth,
    height: imageHeight,
    orderIndex: col.orderIndex,
    visible: col.visible ?? true,
    createdAt: col.createdAt,
    updatedAt: col.updatedAt,
  };
}

/**
 * Convert collection to regular image for admin/manage page rendering
 * @param col - Collection content model to convert
 * @returns Image model with collection metadata
 */
export function convertCollectionContentToImage(col: ContentCollectionModel): ContentImageModel {
  const coverImage = col.coverImage;
  const { imageWidth, imageHeight } = extractCollectionDimensions(coverImage);
  
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
    overlayText: col.title || col.slug || '',
  };
}

/**
 * Filter out non-visible content blocks and check collection-specific visibility for images
 */
function filterVisibleBlocks(
  content: AnyContentModel[],
  filterVisible: boolean,
  collectionId?: number
): AnyContentModel[] {
  if (!filterVisible) return content;
  
  return content.filter(block => {
    if (block.visible === false) return false;
    
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
 * Convert collection content blocks to parallax image blocks for unified rendering
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
 * Update orderIndex for image blocks using collection-specific values
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
 * Ensure parallax blocks have proper imageWidth/imageHeight dimensions with fallback
 */
function ensureParallaxDimensions(content: AnyContentModel[]): AnyContentModel[] {
  return content.map(block => {
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
 * Sort content blocks by orderIndex in ascending order
 */
function sortContentByOrderIndex(content: AnyContentModel[]): AnyContentModel[] {
  return [...content].sort((a, b) => {
    return (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
  });
}

/**
 * Sort content blocks by createdAt date in chronological order (oldest first)
 */
function sortContentByCreatedAt(content: AnyContentModel[]): AnyContentModel[] {
  return [...content].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateA - dateB;
  });
}

/**
 * Reorder content to show images/text/gifs first, then collections
 */
function reorderImagesBeforeCollections(content: AnyContentModel[]): AnyContentModel[] {
  const nonCollections: AnyContentModel[] = [];
  const collections: AnyContentModel[] = [];
  
  for (const block of content) {
    if (block.contentType === 'COLLECTION') {
      collections.push(block);
    } else {
      nonCollections.push(block);
    }
  }
  
  return [...nonCollections, ...collections];
}

/**
 * Process content blocks through filtering, sorting, and transformation pipeline
 * Converts collections to parallax images and ensures proper dimensions
 * @param content - Array of content blocks to process
 * @param filterVisible - Whether to filter out non-visible blocks (default: true)
 * @param collectionId - Collection ID for checking image visibility
 * @param displayMode - Sort by 'CHRONOLOGICAL' or 'ORDERED' (default: ORDERED)
 * @returns Processed and sorted content blocks
 */
export function processContentBlocks(
  content: AnyContentModel[],
  filterVisible: boolean = true,
  collectionId?: number,
  displayMode?: 'CHRONOLOGICAL' | 'ORDERED'
): AnyContentModel[] {
  let processed = filterVisibleBlocks(content, filterVisible, collectionId);
  processed = updateImageOrderIndex(processed, collectionId);
  processed = ensureParallaxDimensions(processed);
  processed = displayMode === 'CHRONOLOGICAL'
    ? sortContentByCreatedAt(processed)
    : sortContentByOrderIndex(processed);
  
  processed = reorderImagesBeforeCollections(processed);
  processed = transformCollectionBlocks(processed);

  return processed;
}

// ===================== Collection Header Row Injection =====================

/**
 * Build metadata items array from collection fields
 */
function buildMetadataItems(collection: CollectionModel): TextBlockItem[] {
  const items: TextBlockItem[] = [];
  
  if (collection.collectionDate) {
    items.push({
      type: 'date',
      value: collection.collectionDate,
    });
  }
  
  if (collection.location) {
    items.push({
      type: 'location',
      value: collection.location,
    });
  }
  
  if (collection.description) {
    items.push({
      type: 'description',
      value: collection.description,
    });
  }
  
  return items;
}

/**
 * Create metadata text block with same dimensions as cover image for equal row sizing
 */
function createMetadataTextBlock(
  items: TextBlockItem[],
  width?: number,
  height?: number
): ContentTextModel | null {
  if (items.length === 0 || !width || !height) {
    return null;
  }
  
  return {
    contentType: 'TEXT',
    id: -2,
    items,
    format: 'plain',
    formatType: 'plain',
    align: 'left',
    orderIndex: -1,
    visible: true,
    width,
    height,
  };
}

/**
 * Create parallax cover image block with title overlay
 */
function createCoverImageBlock(collection: CollectionModel): ContentParallaxImageModel {
  const coverImage = collection.coverImage!;
  const { imageWidth, imageHeight } = extractCollectionDimensions(coverImage);
  
  return {
    contentType: 'IMAGE',
    enableParallax: true,
    id: -1,
    title: collection.title,
    imageUrl: coverImage.imageUrl,
    overlayText: collection.title,
    imageWidth,
    imageHeight,
    width: imageWidth,
    height: imageHeight,
    orderIndex: -2,
    visible: true,
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt,
  };
}

/**
 * Inject header row with cover image and metadata at the top of collection content
 * 
 * Creates two blocks that form the first row:
 * - Cover image with title overlay (parallax-enabled)
 * - Metadata text block (date, location, description)
 * 
 * Both blocks share the same dimensions for equal 50/50 width split on desktop.
 * Returns empty array if cover image missing or has no dimensions.
 * @param collection - Collection model with cover image and metadata
 * @returns Array of header blocks (empty if no cover image or dimensions)
 */
export function injectTopRow(collection: CollectionModel): AnyContentModel[] {
  if (!collection.coverImage) {
    return [];
  }
  
  const coverBlock = createCoverImageBlock(collection);
  
  if (!coverBlock.imageWidth || !coverBlock.imageHeight) {
    return [];
  }
  
  const headerBlocks: AnyContentModel[] = [coverBlock];
  
  const metadataItems = buildMetadataItems(collection);
  const metadataBlock = createMetadataTextBlock(
    metadataItems,
    coverBlock.imageWidth,
    coverBlock.imageHeight
  );
  
  if (metadataBlock) {
    headerBlocks.push(metadataBlock);
  }
  
  return headerBlocks;
}