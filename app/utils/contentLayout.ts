import { LAYOUT } from '@/app/constants';
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

// ===================== Image Classification Helpers =====================

/**
 * Check if content is a vertical/square image (aspect ratio <= 1.0, excluding tall panoramas)
 */
function isVerticalImage(item: AnyContentModel | undefined): boolean {
  if (!item || !hasImage(item)) return false;
  const { width, height } = getContentDimensions(item);
  const ratio = width / Math.max(1, height);
  return ratio <= 1.0 && ratio > 0.5; // Vertical or square, but not a tall panorama
}

/**
 * Check if content is a 5-star horizontal image (standalone)
 * Note: Square (1:1) is considered vertical, so horizontal means ratio > 1.0
 */
function isFiveStarHorizontal(item: AnyContentModel | undefined): boolean {
  if (!item || !hasImage(item) || !isContentImage(item)) return false;
  const { width, height } = getContentDimensions(item);
  const ratio = width / Math.max(1, height);
  return ratio > 1.0 && item.rating === 5;
}

/**
 * Reorder lonely verticals followed by 5-star horizontals
 * A vertical is "lonely" if previous item can't pair with it (nothing or 5-star horizontal)
 */
function reorderLonelyVerticals(content: AnyContentModel[]): AnyContentModel[] {
  if (content.length < 2) return content;
  
  const result = [...content];
  let i = 0;
  
  while (i < result.length - 1) {
    const current = result[i];
    const next = result[i + 1];
    
    if (current && next && isVerticalImage(current) && isFiveStarHorizontal(next)) {
      const prev = i > 0 ? result[i - 1] : undefined;
      // Lonely if nothing before, or previous is 5-star horizontal (can't pair)
      const isLonely = !prev || isFiveStarHorizontal(prev);
      
      if (isLonely) {
        // Swap: [V, 5H] → [5H, V]
        result[i] = next;
        result[i + 1] = current;
        i += 2;
        continue;
      }
    }
    i++;
  }
  
  return result;
}

// ===================== Chunking =====================

/**
 * Chunk ContentModels based on rating-aware slot system
 * - 5-star horizontal: standalone
 * - 4-star horizontal: standalone unless adjacent to vertical (then pairs)
 * - 3+ star: half-width slots (chunkSize/2)
 * - 1-2 star: normal slots (1)
 * @param content - Array of content blocks to chunk into rows
 * @param chunkSize - Number of normal-width items per row (default: 2)
 * @returns Array of content rows
 */
export function chunkContent(
  content: AnyContentModel[],
  chunkSize: number = LAYOUT.defaultChunkSize
): AnyContentModel[][] {
  if (!content || content.length === 0) return [];
  
  // Enforce minimum chunk size to ensure halfSlot is at least 1
  const effectiveChunkSize = Math.max(chunkSize, LAYOUT.minChunkSize);

  // Reorder to handle lonely verticals followed by 5-star horizontals
  const reordered = reorderLonelyVerticals(content);

  const result: AnyContentModel[][] = [];
  let currentRow: AnyContentModel[] = [];
  let currentRowSlots: number = 0;

  for (let i = 0; i < reordered.length; i++) {
    const contentItem = reordered[i];
    if (!contentItem) continue;
    
    const prevItem = i > 0 ? reordered[i - 1] : undefined;
    const nextItem = i < reordered.length - 1 ? reordered[i + 1] : undefined;
    
    const slotWidth = getSlotWidth(contentItem, effectiveChunkSize, prevItem, nextItem);
    
    // Standalone items get their own row
    if (slotWidth === Infinity) {
      if (currentRow.length > 0) {
        result.push([...currentRow]);
        currentRow = [];
        currentRowSlots = 0;
      }
      result.push([contentItem]);
      continue;
    }

    // If item needs more slots than available, make it standalone
    if (slotWidth > effectiveChunkSize) {
      if (currentRow.length > 0) {
        result.push([...currentRow]);
        currentRow = [];
        currentRowSlots = 0;
      }
      result.push([contentItem]);
      continue;
    }

    // Check if item fits in current row
    if (currentRowSlots + slotWidth <= effectiveChunkSize) {
      currentRow.push(contentItem);
      currentRowSlots += slotWidth;
      
      if (currentRowSlots === effectiveChunkSize) {
        result.push([...currentRow]);
        currentRow = [];
        currentRowSlots = 0;
      }
    } else {
      if (currentRow.length > 0) {
        result.push([...currentRow]);
      }
      currentRow = [contentItem];
      currentRowSlots = slotWidth;
    }
  }

  if (currentRow.length > 0) {
    result.push(currentRow);
  }

  return result;
}

/**
 * Get slot width for content item based on aspect ratio, rating, and adjacency context
 * 
 * Slot width rules:
 * - Header items (id: -1, -2): chunkSize/2 (always pair to fill row)
 * - Collection cards (has slug): chunkSize/2 (pair up on catalog pages)
 * - Wide panorama (ratio ≥ 2): Infinity (standalone)
 * - Tall panorama (ratio ≤ 0.5): 1 (normal)
 * - 5-star horizontal: Infinity (standalone)
 * - 4-star horizontal: Infinity, unless adjacent to vertical then chunkSize/2
 * - 3-star (any orientation): chunkSize/2
 * - Vertical 4-5 star: chunkSize/2
 * - Vertical 1-2 star: 1 (normal)
 * - Horizontal 1-2 star: 1 (normal)
 */
function getSlotWidth(
  contentItem: AnyContentModel,
  chunkSize: number,
  prevItem?: AnyContentModel,
  nextItem?: AnyContentModel
): number {
  const halfSlot = Math.floor(chunkSize / 2);
  
  // Header items (cover image & metadata) always fill half the row each
  // This ensures they pair together without other content joining
  if (contentItem.id === -1 || contentItem.id === -2) {
    return halfSlot;
  }
  
  // Collection cards (with slug for navigation) get half slot
  // This ensures 2 collections per row on home/catalog pages
  if ('slug' in contentItem && contentItem.slug) {
    return halfSlot;
  }
  
  if (!hasImage(contentItem)) return 1;

  const { width, height } = getContentDimensions(contentItem);
  const ratio = width / Math.max(1, height);
  const isHorizontal = ratio > 1.0; // Square (1:1) is considered vertical
  
  // Wide panorama → standalone
  if (ratio >= 2) return Infinity;
  
  // Tall panorama → normal slot
  if (ratio <= 0.5) return 1;

  // Rating-based logic (only for images with ratings)
  if (isContentImage(contentItem)) {
    const rating = contentItem.rating || 0;
    
    if (isHorizontal) {
      // 5-star horizontal → always standalone
      if (rating === 5) return Infinity;
      
      // 4-star horizontal → standalone unless adjacent to vertical
      if (rating === 4) {
        const adjacentToVertical = isVerticalImage(prevItem) || isVerticalImage(nextItem);
        return adjacentToVertical ? halfSlot : Infinity;
      }
      
      // 3-star horizontal → half slot
      if (rating === 3) return halfSlot;
      
      // 1-2 star horizontal → normal
      return 1;
    } else {
      // Vertical images
      // 3+ star vertical → half slot
      if (rating >= 3) return halfSlot;
      
      // 1-2 star vertical → normal
      return 1;
    }
  }

  return 1;
}

// ===================== Content sizing =====================

export interface CalculatedContentSize {
  content: AnyContentModel;
  width: number;
  height: number;
}

/**
 * Calculate display sizes for row of content to match heights and sum to component width
 * Uses slot width for proportional space allocation:
 * - 3+ star images get chunkSize/2 slots (more visual space)
 * - Normal images get 1 slot
 * @param content - Array of content blocks in a single row
 * @param componentWidth - Total available width for the row
 * @param chunkSize - Number of normal-width items per row (default: 2)
 * @returns Array of content blocks with calculated display dimensions
 */
export function calculateContentSizes(
  content: AnyContentModel[],
  componentWidth: number,
  chunkSize: number = LAYOUT.defaultChunkSize
): CalculatedContentSize[] {
  if (!content || content.length === 0) return [];
  
  // Enforce minimum chunk size
  const effectiveChunkSize = Math.max(chunkSize, LAYOUT.minChunkSize);

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

  // Calculate ratios for all content, using effective dimensions based on slot width
  // Higher slot widths (3+ star images) get proportionally more visual space
  // Note: Padding is INSIDE the div width due to box-sizing: border-box
  const ratios = content.map(contentItem => {
    const { width, height } = getContentDimensions(contentItem);
    const slotWidth = getSlotWidth(contentItem, effectiveChunkSize);
    
    // Guard: Standalone items (Infinity slot width) should never reach here
    if (slotWidth === Infinity) {
      return width / Math.max(1, height);
    }
    
    // Validate dimensions
    if (width <= 0 || height <= 0) {
      return 1.5; // Default 3:2 aspect ratio
    }
    
    // Scale by slot width for proportional space allocation
    // Example: slot=2 means 2x visual space compared to slot=1
    const effectiveWidth = width * slotWidth;
    const effectiveHeight = height * slotWidth;
    
    return effectiveWidth / Math.max(1, effectiveHeight);
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
  chunkSize: number = LAYOUT.defaultChunkSize
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
  // Note: We now use block.orderIndex directly instead of collections[].orderIndex
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