import { type NormalizedContentBlock } from '@/utils/imageUtils';

/**
 * Check if a block is an image block
 */
export function isImageBlock(block: NormalizedContentBlock): boolean {
  return !!block.imageUrlWeb;
}

/**
 * Get position-based CSS class for block layout
 */
export function getPositionStyle(index: number, total: number): string {
  // Import styles dynamically to avoid circular dependencies
  const styles = require('@/styles/Home.module.scss');

  if (total === 1) return styles.imageSingle || '';
  if (index === 0) return styles.imageLeft || '';
  if (index === total - 1) return styles.imageRight || '';
  return styles.imageMiddle || '';
}

/**
 * Extract original block data safely with proper typing
 */
export function getOriginalBlock(block: any): any {
  return block.originalBlock || {};
}