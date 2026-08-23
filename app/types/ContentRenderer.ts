/**
 * Normalized props for ContentRenderer
 * All content types are normalized to these props before rendering
 * This eliminates the need for type checking inside the renderer component
 */

import { type TextBlockItem, type ViewableContent } from './Content';

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

  /**
   * The COLLECTION id behind a collection card, when known. Drives the follow toggle. Distinct
   * from `contentId`, which is the content-table row id for child-collection blocks — see
   * `ContentParallaxImageModel.collectionId`. Absent for photo/GIF/text blocks and for the
   * synthetic home tiles, so its presence is what gates the follow affordance.
   */
  followCollectionId?: number;

  // Content type for special handling (NO PARALLAX - it's just a boolean flag)
  contentType: 'IMAGE' | 'TEXT' | 'GIF' | 'COLLECTION';

  // TEXT-specific
  textItems?: TextBlockItem[];

  // GIF-specific
  isGif?: boolean; // For unoptimized flag
  thumbnailUrl?: string | null; // Poster frame for video/GIF while loading

  // Download capability - true when the viewer may download from this collection (CLIENT_GALLERY
  // type OR a logged-in CLIENT membership). Gates the "Download" section.
  canDownload?: boolean;
  // Collection slug - needed for download endpoints
  collectionSlug?: string;
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
  /**
   * Open the fullscreen viewer for any visual content block — images, parallax images, or
   * animated GIF/MP4 blocks. The viewer renders the correct element (<Image> vs <video>)
   * based on contentType.
   */
  onFullScreenImageClick?: (image: ViewableContent) => void;

  // Image-specific overlays (only for IMAGE type)
  selectedIds?: number[];
  currentCollectionId?: number;
  /**
   * True when this block is hidden in the collection being managed, which paints the gray
   * `visibilityOverlay` tint over the tile. Computed by `BoxRenderer` from the real content block,
   * because the renderer only receives normalized primitives and cannot derive it. Always false on
   * public views — see the manage-view gate on `currentCollectionId` in `BoxRenderer`.
   */
  notVisible?: boolean;
  isSelectingCoverImage?: boolean;
  currentCoverImageId?: number;
  justClickedImageId?: number | null;

  // LCP optimization
  priority?: boolean;

  // Error handling
  onImageLoadError?: (contentId: number) => void;
}
