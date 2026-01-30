/**
 * Type Guards for Content System
 *
 * Provides compile-time type safety for Content discrimination.
 * Use these instead of runtime type checking or casting.
 */
import {
  type Content,
  type ContentCollectionModel,
  type ContentGifModel,
  type ContentImageModel,
  type ContentParallaxImageModel,
  type ContentTextModel,
} from '@/app/types/Content';

/**
 * Type guard to check if a Content is an ImageContentModel
 * Accepts unknown to handle untyped data, but also works with Content type
 */
export function isContentImage(block: Content | unknown): block is ContentImageModel {
  if (!block || typeof block !== 'object') return false;
  const candidate = block as Record<string, unknown>;
  return candidate.contentType === 'IMAGE' && 'imageUrl' in candidate;
}

/**
 * Type guard to check if a Content is a TextContentModel
 */
export function isTextContent(block: Content): block is ContentTextModel {
  return block.contentType === 'TEXT';
}

/**
 * Type guard to check if a Content is a GifContentModel
 */
export function isGifContent(block: Content): block is ContentGifModel {
  return block.contentType === 'GIF';
}

/**
 * Type guard to check if a Content is a CollectionContentModel
 */
export function isContentCollection(block: Content): block is ContentCollectionModel {
  return block.contentType === 'COLLECTION';
}

/**
 * Type guard to check if a Content has an image (IMAGE or GIF)
 * Note: PARALLAX is no longer a separate contentType - it's just a boolean flag
 */
export function hasImage(block: Content): block is ContentImageModel | ContentParallaxImageModel | ContentGifModel {
  return isContentImage(block) || isGifContent(block);
}

/**
 * Get the content width and height from any Content
 * Falls back to imageWidth/Height for image blocks, or default dimensions
 * Prioritizes imageWidth/imageHeight over width/height for accurate aspect ratios
 */
export function getContentDimensions(block: Content, defaultWidth = 1300, defaultAspect = 3/2): { width: number; height: number } {
  // For image blocks, prioritize image dimensions for accurate aspect ratios
  if (isContentImage(block)) {
    // Use imageWidth/imageHeight if available (most accurate for images)
    if (block.imageWidth && block.imageHeight) {
      const result = { width: block.imageWidth, height: block.imageHeight };
      // DEBUG: Check for NaN
      if (!Number.isFinite(result.width) || !Number.isFinite(result.height)) {
        console.error('[getContentDimensions] NaN from imageWidth/imageHeight:', {
          contentId: block.id,
          imageWidth: block.imageWidth,
          imageHeight: block.imageHeight,
        });
      }
      return result;
    }
    // Fall back to width/height if imageWidth/imageHeight not available
    if (block.width && block.height) {
      const result = { width: block.width, height: block.height };
      // DEBUG: Check for NaN
      if (!Number.isFinite(result.width) || !Number.isFinite(result.height)) {
        console.error('[getContentDimensions] NaN from width/height:', {
          contentId: block.id,
          width: block.width,
          height: block.height,
        });
      }
      return result;
    }
    // Final fallback to defaults
    const width = defaultWidth;
    const height = Math.round(width / defaultAspect);
    return { width, height };
  }

  // For collection blocks, use coverImage dimensions if available
  // This allows proper chunking based on actual cover image aspect ratio
  if (isContentCollection(block)) {
    const collectionBlock = block as ContentCollectionModel;
    // Prioritize coverImage.imageWidth/imageHeight for accurate aspect ratios
    if (collectionBlock.coverImage?.imageWidth && collectionBlock.coverImage?.imageHeight) {
      return {
        width: collectionBlock.coverImage.imageWidth,
        height: collectionBlock.coverImage.imageHeight,
      };
    }
    // Fallback to coverImage.width/height if imageWidth/imageHeight not available
    if (collectionBlock.coverImage?.width && collectionBlock.coverImage?.height) {
      return {
        width: collectionBlock.coverImage.width,
        height: collectionBlock.coverImage.height,
      };
    }
    // Final fallback to default aspect ratio
    return { width: defaultWidth, height: Math.round(defaultWidth / defaultAspect) };
  }

  // For all other blocks, use explicit width/height if available, otherwise defaults
  if (block.width && block.height) {
    return { width: block.width, height: block.height };
  }

  return { width: defaultWidth, height: Math.round(defaultWidth / defaultAspect) };
}

/**
 * Validation function to ensure a Content has required fields
 */
export function validateContentBlock(block: unknown): block is Content {
  if (!block || typeof block !== 'object') return false;

  const candidate = block as Record<string, unknown>;

  return (
    typeof candidate.id === 'number' &&
    typeof candidate.contentType === 'string' &&
    ['IMAGE', 'TEXT', 'GIF', 'COLLECTION'].includes(candidate.contentType) &&
    typeof candidate.orderIndex === 'number'
  );
}

// =============================================================================
// LAYOUT HELPER FUNCTIONS
// =============================================================================

/**
 * Get aspect ratio for content item
 */
export function getAspectRatio(item: Content): number {
  if (!hasImage(item)) return 1.0;

  const { width, height } = getContentDimensions(item);
  if (width <= 0 || height <= 0) return 1.0;

  return width / height;
}

/**
 * Check if content is a vertical/square image (aspect ratio <= 1.0, excluding tall panoramas)
 */
export function isVerticalImage(item: Content | undefined): boolean {
  if (!item || !hasImage(item)) return false;
  const ratio = getAspectRatio(item);
  return ratio <= 1.0 && ratio > 0.5;
}

/**
 * Get slot width for content item based on aspect ratio, rating, and adjacency context
 *
 * Slot width rules:
 * - Collection cards (has slug): chunkSize/2 (pair up on catalog pages)
 * - Wide panorama (ratio ≥ 2): chunkSize (standalone - pattern registry handles detection)
 * - Tall panorama (ratio ≤ 0.5): 1 (normal)
 * - 5-star horizontal: chunkSize (standalone - pattern registry handles detection)
 * - 4-star horizontal: chunkSize (standalone) unless adjacent to vertical then chunkSize/2
 * - 3-star (any orientation): chunkSize/2
 * - Vertical 4-5 star: chunkSize/2
 * - Vertical 1-2 star: 1 (normal)
 * - Horizontal 1-2 star: 1 (normal)
 *
 * Note: Standalone items are now detected by pattern registry, not by Infinity slotWidth.
 * This function returns finite slotWidth values for proportional space allocation.
 * Pattern registry uses item properties (isWidePanorama, rating) to detect standalone.
 *
 * Note: Header items (cover image + metadata) are no longer in the content array.
 * They are created as a separate row in processContentForDisplay().
 */
export function getSlotWidth(
  contentItem: Content,
  chunkSize: number,
  prevItem?: Content,
  nextItem?: Content
): number {
  const halfSlot = Math.floor(chunkSize / 2);

  // Collection cards (with slug for navigation) get half slot
  if ('slug' in contentItem && contentItem.slug) {
    return halfSlot;
  }

  if (!hasImage(contentItem)) return 1;

  const { width, height } = getContentDimensions(contentItem);
  const ratio = width / Math.max(1, height);
  const isHorizontal = ratio > 1.0; // Square (1:1) is considered vertical

  // Wide panorama → standalone (pattern registry will detect, but return chunkSize for slot calculation)
  if (ratio >= 2) return chunkSize;

  // Tall panorama → normal slot
  if (ratio <= 0.5) return 1;

  // Rating-based logic (only for images with ratings)
  if (isContentImage(contentItem)) {
    const rating = contentItem.rating || 0;

    if (isHorizontal) {
      // 5-star horizontal → standalone (pattern registry will detect, but return chunkSize for slot calculation)
      if (rating === 5) return chunkSize;

      // 4-star horizontal → standalone unless adjacent to vertical
      if (rating === 4) {
        const adjacentToVertical = isVerticalImage(prevItem) || isVerticalImage(nextItem);
        return adjacentToVertical ? halfSlot : chunkSize;
      }

      // 3-star horizontal → half slot
      if (rating === 3) return halfSlot;

      // 1-2 star horizontal → normal
      return 1;
    } else {
      // Vertical images: 3+ star → half slot, 1-2 star → normal
      return rating >= 3 ? halfSlot : 1;
    }
  }

  return 1;
}
