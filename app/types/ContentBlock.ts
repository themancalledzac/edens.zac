/**
 * Unified Content Block Type System
 *
 * Single source of truth for all ContentBlock types following proper inheritance hierarchy.
 * All blocks extend the base ContentBlock interface for consistent behavior.
 */

/** Content block kinds supported by the system. */
export type ContentBlockType = 'IMAGE' | 'TEXT' | 'CODE' | 'GIF' | 'PARALLAX';

/**
 * ImageCollection - Represents the relationship between an image and a collection
 * Each image can belong to multiple collections with collection-specific metadata
 */
export interface ImageCollection {
  /**
   * The ID of the collection
   */
  collectionId: number;

  /**
   * The name of the collection (for reference/validation)
   */
  collectionName: string;

  /**
   * Whether the image is visible in this collection
   * Defaults to true if not specified
   */
  visible?: boolean;

  /**
   * The order index of this image within this specific collection
   * Each image/collection relationship has its own order_index
   */
  orderIndex?: number;
}

/**
 * Base ContentBlock interface - all content blocks extend this
 * Provides consistent shape for layout, rendering, and UI enhancements
 */
export interface ContentBlock {
  id: number;
  blockType: ContentBlockType;
  orderIndex: number;
  title?: string;
  caption?: string | null;
  createdAt?: string;
  updatedAt?: string;

  // Layout properties for rendering
  width?: number;
  height?: number;

  // UI enhancements for cover images and display
  overlayText?: string;
  cardTypeBadge?: string;
  dateBadge?: string;
}

/**
 * Image content block - displays images from S3/CloudFront
 */
export interface ImageContentBlock extends ContentBlock {
  blockType: 'IMAGE';
  imageUrlWeb: string;
  imageUrlRaw?: string | null;
  imageWidth?: number;
  imageHeight?: number;
  iso?: number;
  author?: string | null;
  rating?: number;
  lens?: string | null;
  blackAndWhite?: boolean;
  isFilm?: boolean;
  shutterSpeed?: string | null;
  rawFileName?: string | null;
  camera?: string | null;
  focalLength?: string | null;
  location?: string | null;
  createDate?: string | null;
  fstop?: string | null;
  alt?: string;
  aspectRatio?: number;

  /**
   * List of collections this image belongs to
   * Each entry contains collection-specific metadata like visibility and order
   */
  imageCollectionList?: ImageCollection[];
}

/**
 * Parallax-enabled image content block
 * Based on ImageContentBlock with parallax functionality
 */
export interface ParallaxImageContentBlock extends Omit<ImageContentBlock, 'blockType'> {
  blockType: 'PARALLAX';
  collectionDate?: string;
  type?: string;
  enableParallax: true;
  parallaxSpeed?: number;
}

/**
 * Text content block - displays formatted text content
 */
export interface TextContentBlock extends ContentBlock {
  blockType: 'TEXT';
  content: string;
  format: 'plain' | 'markdown' | 'html';
  align: 'left' | 'center' | 'right';
}

/**
 * Code content block - displays syntax-highlighted code
 */
export interface CodeContentBlock extends ContentBlock {
  blockType: 'CODE';
  content: string;
  language: string;
  filename?: string;
}

/**
 * GIF content block - displays animated GIFs
 */
export interface GifContentBlock extends ContentBlock {
  blockType: 'GIF';
  imageUrlWeb: string;
  imageUrlRaw?: string | null;
  alt?: string;
}

/**
 * Union type of all supported content blocks
 * Use this for type-safe rendering and processing
 */
export type AnyContentBlock = ImageContentBlock | ParallaxImageContentBlock | TextContentBlock | CodeContentBlock | GifContentBlock;
