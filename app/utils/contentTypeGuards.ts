/**
 * Type Guards for Content System
 *
 * Provides compile-time type safety for Content discrimination.
 * Use these instead of runtime type checking or casting.
 */
import {
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
 * Type guard to check if a Content has an image (IMAGE, PARALLAX, or GIF)
 */
export function hasImage(block: Content): block is ImageContentModel | ParallaxImageContentModel | GifContentModel {
  return isContentImage(block) || isParallaxImageContent(block) || isGifContent(block);
}

/**
 * Get the content width and height from any Content
 * Falls back to imageWidth/Height for image blocks, or default dimensions
 */
export function getContentDimensions(block: Content, defaultWidth = 1300, defaultAspect = 2/3): { width: number; height: number } {
  // Use explicit width/height if available
  if (block.width && block.height) {
    return { width: block.width, height: block.height };
  }

  // For image blocks (including parallax), use image dimensions
  if (isContentImage(block) || isParallaxImageContent(block)) {
    const width = block.imageWidth || defaultWidth;
    const height = block.imageHeight || Math.round(width / defaultAspect);
    return { width, height };
  }

  // For all other blocks, use defaults
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
