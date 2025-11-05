/**
 * Type Guards for Content System
 *
 * Provides compile-time type safety for Content discrimination.
 * Use these instead of runtime type checking or casting.
 */
import {
  type CollectionContentModel,
  type Content,
  type GifContentModel,
  type ImageContentModel,
  type ParallaxImageContentModel,
  type TextContentModel,
} from '@/app/types/Content';

/**
 * Type guard to check if a Content is an ImageContentModel
 */
export function isContentImage(block: Content): block is ImageContentModel {
  return block.contentType === 'IMAGE';
}

/**
 * Type guard to check if a Content is a ParallaxImageContentModel
 */
export function isParallaxImageContent(block: Content): block is ParallaxImageContentModel {
  return block.contentType === 'PARALLAX' && 'enableParallax' in block && block.enableParallax === true;
}

/**
 * Type guard to check if a Content is a TextContentModel
 */
export function isTextContent(block: Content): block is TextContentModel {
  return block.contentType === 'TEXT';
}

/**
 * Type guard to check if a Content is a GifContentModel
 */
export function isGifContent(block: Content): block is GifContentModel {
  return block.contentType === 'GIF';
}

/**
 * Type guard to check if a Content is a CollectionContentModel
 */
export function isCollectionContent(block: Content): block is CollectionContentModel {
  return block.contentType === 'COLLECTION';
}

/**
 * Type guard to check if a Content has an image (IMAGE, PARALLAX, or GIF)
 */
export function hasImage(block: Content): block is ImageContentModel | ParallaxImageContentModel | GifContentModel {
  return isContentImage(block) || isParallaxImageContent(block) || isGifContent(block);
}

/**
 * Get the content width and height from any Content
 * Falls back to imageWidth/Height for image blocks, or default dimensions
 * For parallax images, prioritizes imageWidth/imageHeight over width/height for accurate aspect ratios
 */
export function getContentDimensions(block: Content, defaultWidth = 1300, defaultAspect = 3/2): { width: number; height: number } {
  // For image blocks (including parallax), prioritize image dimensions for accurate aspect ratios
  if (isContentImage(block) || isParallaxImageContent(block)) {
    // Use imageWidth/imageHeight if available (most accurate for images)
    if (block.imageWidth && block.imageHeight) {
      return { width: block.imageWidth, height: block.imageHeight };
    }
    // Fall back to width/height if imageWidth/imageHeight not available
    if (block.width && block.height) {
      return { width: block.width, height: block.height };
    }
    // Final fallback to defaults
    const width = defaultWidth;
    const height = Math.round(width / defaultAspect);
    return { width, height };
  }

  // For collection blocks, use explicit width/height if set (from coverImage dimensions)
  // This allows proper chunking based on actual cover image aspect ratio
  if (isCollectionContent(block)) {
    // If width/height are set (from coverImage.imageWidth/imageHeight), use them
    // Otherwise fall back to default aspect ratio
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
    ['IMAGE', 'TEXT', 'GIF', 'PARALLAX', 'COLLECTION'].includes(candidate.contentType) &&
    typeof candidate.orderIndex === 'number'
  );
}
