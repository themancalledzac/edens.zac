/**
 * Normalized props for ContentRenderer
 * All content types are normalized to these props before rendering
 * This eliminates the need for type checking inside the renderer component
 */

import { type ContentImageModel, type ContentParallaxImageModel, type TextBlockItem } from './Content';

/**
 * Base props that all content renderers receive
 * Content is normalized to these props in Component.tsx before rendering
 */
export interface ContentRendererProps {
  // Content ID (for handlers)
  contentId: number;
  
  // Position/layout props
  className: string; // imageLeft/imageRight/imageSingle/imageMiddle
  width: number;
  height: number;
  isMobile: boolean;
  
  // Image data (normalized from any content type)
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  alt: string;
  
  // Overlay/badge data
  overlayText?: string;
  cardTypeBadge?: string; // Only for collections
  dateBadge?: string;
  
  // Parallax (boolean - currently true for collections, false for others)
  // Can be enabled for any image in the future
  enableParallax: boolean;
  
  // Click behavior
  hasSlug?: string; // If present, click navigates to collection
  isCollection?: boolean; // For badge contentType
  
  // Content type for special handling (NO PARALLAX - it's just a boolean flag)
  contentType: 'IMAGE' | 'TEXT' | 'GIF' | 'COLLECTION';
  
  // TEXT-specific
  textItems?: TextBlockItem[];
  
  // GIF-specific
  isGif?: boolean; // For unoptimized flag
}

/**
 * Extended props that include handler functions
 * Used by CollectionContentRenderer component
 */
export interface CollectionContentRendererProps extends ContentRendererProps {
  // Reorder mode props
  isReorderMode?: boolean;
  isPickedUp?: boolean;
  pickedUpImageId?: number | null;
  hasMoved?: boolean;
  isFirstInOrder?: boolean;
  isLastInOrder?: boolean;
  onArrowMove?: (contentId: number, direction: -1 | 1) => void;
  onPickUp?: (contentId: number) => void;
  onPlace?: (targetId: number) => void;
  onCancelImageMove?: (contentId: number) => void;

  // Click handlers
  onImageClick?: (imageId: number) => void;
  enableFullScreenView?: boolean;
  onFullScreenImageClick?: (image: ContentImageModel | ContentParallaxImageModel) => void;

  // Image-specific overlays (only for IMAGE type)
  selectedImageIds?: number[];
  currentCollectionId?: number;
  isSelectingCoverImage?: boolean;
  currentCoverImageId?: number;
  justClickedImageId?: number | null;
}

