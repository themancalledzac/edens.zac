/**
 * Type Guards for ContentBlock System
 *
 * Provides compile-time type safety for ContentBlock discrimination.
 * Use these instead of runtime type checking or casting.
 */
import {
  type CodeContentBlock,
  type ContentBlock,
  type GifContentBlock,
  type ImageContentBlock,
  type ParallaxImageContentBlock,
  type TextContentBlock,
} from '@/app/types/ContentBlock';

/**
 * Type guard to check if a ContentBlock is an ImageContentBlock
 */
export function isImageBlock(block: ContentBlock): block is ImageContentBlock {
  return block.blockType === 'IMAGE';
}

/**
 * Type guard to check if a ContentBlock is a ParallaxImageContentBlock
 */
export function isParallaxImageBlock(block: ContentBlock): block is ParallaxImageContentBlock {
  return block.blockType === 'PARALLAX' && 'enableParallax' in block && block.enableParallax === true;
}

/**
 * Type guard to check if a ContentBlock is a TextContentBlock
 */
export function isTextBlock(block: ContentBlock): block is TextContentBlock {
  return block.blockType === 'TEXT';
}

/**
 * Type guard to check if a ContentBlock is a CodeContentBlock
 */
export function isCodeBlock(block: ContentBlock): block is CodeContentBlock {
  return block.blockType === 'CODE';
}

/**
 * Type guard to check if a ContentBlock is a GifContentBlock
 */
export function isGifBlock(block: ContentBlock): block is GifContentBlock {
  return block.blockType === 'GIF';
}

/**
 * Type guard to check if a ContentBlock has an image (IMAGE, PARALLAX, or GIF)
 */
export function hasImage(block: ContentBlock): block is ImageContentBlock | ParallaxImageContentBlock | GifContentBlock {
  return isImageBlock(block) || isParallaxImageBlock(block) || isGifBlock(block);
}

/**
 * Get the content width and height from any ContentBlock
 * Falls back to imageWidth/Height for image blocks, or default dimensions
 */
export function getBlockDimensions(block: ContentBlock, defaultWidth = 1300, defaultAspect = 2/3): { width: number; height: number } {
  // Use explicit width/height if available
  if (block.width && block.height) {
    return { width: block.width, height: block.height };
  }

  // For image blocks (including parallax), use image dimensions
  if (isImageBlock(block) || isParallaxImageBlock(block)) {
    const width = block.imageWidth || defaultWidth;
    const height = block.imageHeight || Math.round(width / defaultAspect);
    return { width, height };
  }

  // For all other blocks, use defaults
  return { width: defaultWidth, height: Math.round(defaultWidth / defaultAspect) };
}

/**
 * Validation function to ensure a ContentBlock has required fields
 */
export function validateContentBlock(block: unknown): block is ContentBlock {
  if (!block || typeof block !== 'object') return false;

  const candidate = block as Record<string, unknown>;

  return (
    typeof candidate.id === 'number' &&
    typeof candidate.blockType === 'string' &&
    ['IMAGE', 'TEXT', 'CODE', 'GIF', 'PARALLAX'].includes(candidate.blockType) &&
    typeof candidate.orderIndex === 'number'
  );
}