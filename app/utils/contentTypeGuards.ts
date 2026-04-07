/**
 * Type Guards for Content System
 *
 * Provides compile-time type safety for Content discrimination.
 * Use these instead of runtime type checking or casting.
 */
import { CollectionType } from '@/app/types/Collection';
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
export function hasImage(
  block: Content
): block is ContentImageModel | ContentParallaxImageModel | ContentGifModel {
  return isContentImage(block) || isGifContent(block);
}

/**
 * Get the content width and height from any Content
 * Falls back to imageWidth/Height for image blocks, or default dimensions
 * Prioritizes imageWidth/imageHeight over width/height for accurate aspect ratios
 */
export function getContentDimensions(
  block: Content,
  defaultWidth = 1300,
  defaultAspect = 3 / 2
): { width: number; height: number } {
  if (isContentImage(block)) {
    if (block.imageWidth && block.imageHeight) {
      return { width: block.imageWidth, height: block.imageHeight };
    }
    if (block.width && block.height) {
      return { width: block.width, height: block.height };
    }
    const width = defaultWidth;
    const height = Math.round(width / defaultAspect);
    return { width, height };
  }

  if (isContentCollection(block)) {
    const collectionBlock = block as ContentCollectionModel;
    if (collectionBlock.coverImage?.imageWidth && collectionBlock.coverImage?.imageHeight) {
      return {
        width: collectionBlock.coverImage.imageWidth,
        height: collectionBlock.coverImage.imageHeight,
      };
    }
    if (collectionBlock.coverImage?.width && collectionBlock.coverImage?.height) {
      return {
        width: collectionBlock.coverImage.width,
        height: collectionBlock.coverImage.height,
      };
    }
    return { width: defaultWidth, height: Math.round(defaultWidth / defaultAspect) };
  }

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
 * Get slot width for content item based on aspect ratio and rating.
 *
 * Square images (ratio == 1:1) are considered vertical, not horizontal.
 *
 * Slot width rules:
 * - Collection cards (has slug): chunkSize/2 (pair up on catalog pages)
 * - Wide panorama (ratio ≥ 2): chunkSize (standalone)
 * - Tall panorama (ratio ≤ 0.5): 1 (normal)
 * - 5-star horizontal: chunkSize (standalone)
 * - 4-star horizontal: chunkSize (standalone)
 * - 3-star (any orientation): chunkSize/2
 * - Vertical 4-5 star: chunkSize/2
 * - Vertical 1-2 star: 1 (normal)
 * - Horizontal 1-2 star: 1 (normal)
 */
export function getSlotWidth(contentItem: Content, chunkSize: number): number {
  const halfSlot = Math.floor(chunkSize / 2);

  if ('slug' in contentItem && contentItem.slug) {
    return halfSlot;
  }

  if (!hasImage(contentItem)) return 1;

  const { width, height } = getContentDimensions(contentItem);
  const ratio = width / Math.max(1, height);
  const isHorizontal = ratio > 1.0;

  if (ratio >= 2) return chunkSize;

  if (ratio <= 0.5) return 1;

  if (isContentImage(contentItem)) {
    const rating = contentItem.rating || 0;

    if (isHorizontal) {
      if (rating >= 4) return chunkSize;
      if (rating === 3) return halfSlot;
      return 1;
    } else {
      return rating >= 3 ? halfSlot : 1;
    }
  }

  return 1;
}

/**
 * Check if a collection type is a "parent-type" collection.
 * Parent-type collections (HOME, PARENT) can only contain child collections,
 * not images, text, or GIFs.
 */
export function isParentType(type: CollectionType | string | undefined): boolean {
  return type === CollectionType.HOME || type === CollectionType.PARENT;
}
