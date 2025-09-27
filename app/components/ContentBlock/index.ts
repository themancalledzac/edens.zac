/**
 * ContentBlock Module Exports
 *
 * Central export hub for the ContentBlock system providing unified access to all
 * components, utilities, and type definitions.
 */
import styles from './ContentBlock.module.scss';

export { BadgeOverlay } from './BadgeOverlay';
export { BlockWrapper } from './BlockWrapper';
export { ImageContentBlockRenderer } from './ImageBlockRenderer';
export { ParallaxImageRenderer } from './ParallaxImageRenderer';
export { TextBlockRenderer } from './TextBlockRenderer';

/**
 * Get position-based CSS class for block layout
 */
export function getPositionStyle(index: number, total: number): string {
  if (total === 1) return styles.imageSingle || '';
  if (index === 0) return styles.imageLeft || '';
  if (index === total - 1) return styles.imageRight || '';
  return styles.imageMiddle || '';
}
