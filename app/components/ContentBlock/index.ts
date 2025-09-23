/**
 * ContentBlock Module Exports
 *
 * Central export hub for the ContentBlock system providing unified access to all
 * components, utilities, and type definitions. Organizes the modular ContentBlock
 * architecture with clear separation of concerns and streamlined imports.
 *
 * @exports
 * - Core rendering components (BlockWrapper, ImageBlockRenderer, TextBlockRenderer)
 * - Badge system components and utilities (BadgeOverlay, createBadgeConfigs)
 * - Utility functions for block processing (isImageBlock, getPositionStyle, getOriginalBlock)
 * - Complete TypeScript type definitions and interfaces
 */

export { BadgeOverlay, createBadgeConfigs } from './BadgeOverlay';
export { BlockWrapper } from './BlockWrapper';
export { ImageBlockRenderer } from './ImageBlockRenderer';
export { TextBlockRenderer } from './TextBlockRenderer';
export type * from './types';
export { getOriginalBlock,getPositionStyle, isImageBlock } from './utils';