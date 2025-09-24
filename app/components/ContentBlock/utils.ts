import { type NormalizedContentBlock } from '@/app/utils/imageUtils';

import styles from './ContentBlock.module.scss';
import { type EnhancedOriginalBlock } from './types';

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
  if (total === 1) return styles.imageSingle || '';
  if (index === 0) return styles.imageLeft || '';
  if (index === total - 1) return styles.imageRight || '';
  return styles.imageMiddle || '';
}

/**
 * Extract original block data safely with proper typing
 */
export function getOriginalBlock(block: NormalizedContentBlock): EnhancedOriginalBlock {
  return (block.originalBlock as EnhancedOriginalBlock) || {};
}