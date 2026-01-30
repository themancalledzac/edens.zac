/**
 * Content Renderer Utilities
 * 
 * Functions for normalizing content types to renderer props.
 * All content type checking and data extraction happens here,
 * so the renderer component doesn't need to know about content types.
 */

import { type AnyContentModel } from '@/app/types/Content';
import { type ContentRendererProps } from '@/app/types/ContentRenderer';
import {
  isContentCollection,
  isContentImage,
  isGifContent,
  isTextContent,
} from '@/app/utils/contentTypeGuards';

/**
 * Extracts image dimensions with fallback logic
 * Prioritizes imageWidth/imageHeight over width/height, with default fallback
 */
function extractImageDimensions(
  imageWidth?: number,
  width?: number,
  imageHeight?: number,
  height?: number,
  defaultDimension = 800
): { imageWidth: number; imageHeight: number } {
  return {
    imageWidth: imageWidth ?? width ?? defaultDimension,
    imageHeight: imageHeight ?? height ?? defaultDimension,
  };
}

/**
 * Extracts alt text with fallback options
 */
function extractAltText(
  alt?: string | null,
  title?: string | null,
  caption?: string | null,
  slug?: string | null,
  defaultText = 'Image'
): string {
  return alt || title || caption || slug || defaultText;
}

/**
 * Normalizes contentType (no longer needed for PARALLAX conversion, but kept for consistency)
 */
function normalizeContentType(contentType: string): 'IMAGE' | 'TEXT' | 'GIF' | 'COLLECTION' {
  return contentType as 'IMAGE' | 'TEXT' | 'GIF' | 'COLLECTION';
}

/**
 * Determines position className based on row position
 * REPLACES the logic from determineBaseProps in Component.tsx (lines 46-50)
 * 
 * @param totalInRow - Total number of items in the row
 * @param index - Current item's index in the row (0-based)
 * @param styles - Style module with position class names
 * @returns Position className (imageLeft/imageRight/imageSingle/imageMiddle)
 */
export function determinePositionClassName(
  totalInRow: number,
  index: number,
  styles: { imageSingle: string; imageLeft: string; imageRight: string; imageMiddle: string }
): string {
  // EXACT REPLACEMENT of Component.tsx lines 46-50
  if (totalInRow === 1) return styles.imageSingle || '';
  if (index === 0) return styles.imageLeft || '';
  if (index === totalInRow - 1) return styles.imageRight || '';
  return styles.imageMiddle || '';
}

/**
 * Normalizes any content type to ContentRendererProps
 * Handles all content type checking and data extraction
 * 
 * @param content - Any content model to normalize
 * @param calculatedWidth - Pre-calculated display width
 * @param calculatedHeight - Pre-calculated display height
 * @param positionClassName - Position class (imageLeft/imageRight/etc)
 * @param isMobile - Whether on mobile device
 * @returns Normalized props for ContentRenderer
 */
export function normalizeContentToRendererProps(
  content: AnyContentModel,
  calculatedWidth: number,
  calculatedHeight: number,
  positionClassName: string,
  isMobile: boolean
): ContentRendererProps {
  // DEBUG: Check for NaN values
  if (!Number.isFinite(calculatedWidth) || !Number.isFinite(calculatedHeight)) {
    console.error('[normalizeContentToRendererProps] NaN detected:', {
      contentId: content.id,
      contentType: content.contentType,
      calculatedWidth,
      calculatedHeight,
      isNaNWidth: !Number.isFinite(calculatedWidth),
      isNaNHeight: !Number.isFinite(calculatedHeight),
    });
  }
  
  // Calculate fallback values if NaN detected
  let validWidth = calculatedWidth;
  let validHeight = calculatedHeight;
  
  if (!Number.isFinite(calculatedWidth) || !Number.isFinite(calculatedHeight)) {
    // Try to get image dimensions to calculate fallback
    let imageWidth: number | undefined;
    let imageHeight: number | undefined;
    
    if (isContentImage(content)) {
      imageWidth = content.imageWidth ?? content.width;
      imageHeight = content.imageHeight ?? content.height;
    } else if (isContentCollection(content)) {
      imageWidth = content.coverImage?.imageWidth ?? content.coverImage?.width;
      imageHeight = content.coverImage?.imageHeight ?? content.coverImage?.height;
    } else if (isGifContent(content)) {
      imageWidth = content.width;
      imageHeight = content.height;
    }
    
    // Calculate fallback from image dimensions if available
    if (imageWidth && imageHeight && imageWidth > 0 && imageHeight > 0) {
      if (!Number.isFinite(calculatedWidth) && Number.isFinite(calculatedHeight)) {
        // Width is NaN, height is valid - calculate width from aspect ratio
        validWidth = (calculatedHeight * imageWidth) / imageHeight;
      } else if (!Number.isFinite(calculatedHeight) && Number.isFinite(calculatedWidth)) {
        // Height is NaN, width is valid - calculate height from aspect ratio
        validHeight = (calculatedWidth * imageHeight) / imageWidth;
      } else {
        // Both are NaN - use default aspect ratio (3:2)
        validWidth = 300;
        validHeight = 200;
      }
    } else {
      // No image dimensions available - use default aspect ratio (3:2)
      if (!Number.isFinite(calculatedWidth)) {
        validWidth = Number.isFinite(calculatedHeight) ? (calculatedHeight * 1.5) : 300;
      }
      if (!Number.isFinite(calculatedHeight)) {
        validHeight = Number.isFinite(calculatedWidth) ? (calculatedWidth / 1.5) : 200;
      }
      if (!Number.isFinite(validWidth) && !Number.isFinite(validHeight)) {
        validWidth = 300;
        validHeight = 200;
      }
    }
  }
  
  const baseProps: ContentRendererProps = {
    contentId: content.id,
    className: positionClassName,
    width: Math.round(validWidth),
    height: Math.round(validHeight),
    isMobile,
    imageUrl: '',
    imageWidth: 800,
    imageHeight: 800,
    alt: '',
    enableParallax: false,
    isCollection: false,
    contentType: normalizeContentType(content.contentType),
  };

  // COLLECTION: Use coverImage, enableParallax = true
  if (isContentCollection(content)) {
    const coverImage = content.coverImage;
    const dimensions = extractImageDimensions(
      coverImage?.imageWidth,
      coverImage?.width,
      coverImage?.imageHeight,
      coverImage?.height
    );
    
    return {
      ...baseProps,
      imageUrl: coverImage?.imageUrl ?? '',
      imageWidth: dimensions.imageWidth,
      imageHeight: dimensions.imageHeight,
      alt: extractAltText(undefined, content.title, undefined, content.slug, 'Collection'),
      overlayText: content.title,
      cardTypeBadge: content.collectionType, // Only collections have this
      enableParallax: true, // Collections are parallax
      hasSlug: content.slug,
      isCollection: true,
      contentType: 'COLLECTION',
    };
  }

  // PARALLAX IMAGE: Check for enableParallax BEFORE regular image check
  // ContentParallaxImageModel has contentType: 'IMAGE' but enableParallax: true
  if (isContentImage(content) && 'enableParallax' in content && content.enableParallax) {
    const dimensions = extractImageDimensions(
      content.imageWidth,
      content.width,
      content.imageHeight,
      content.height
    );
    
    return {
      ...baseProps,
      imageUrl: content.imageUrl,
      imageWidth: dimensions.imageWidth,
      imageHeight: dimensions.imageHeight,
      alt: extractAltText(content.alt, content.title, content.caption),
      overlayText: content.overlayText,
      cardTypeBadge: 'collectionType' in content ? content.collectionType : undefined,
      enableParallax: true, // Preserve parallax flag
      hasSlug: 'slug' in content ? content.slug : undefined,
      isCollection: false,
      contentType: 'IMAGE',
    };
  }

  // IMAGE: Standard image, enableParallax = false (but could be enabled later)
  if (isContentImage(content)) {
    const dimensions = extractImageDimensions(
      content.imageWidth,
      content.width,
      content.imageHeight,
      content.height
    );
    
    return {
      ...baseProps,
      imageUrl: content.imageUrl,
      imageWidth: dimensions.imageWidth,
      imageHeight: dimensions.imageHeight,
      alt: extractAltText(content.alt, content.title, content.caption),
      overlayText: content.overlayText,
      enableParallax: false, // Currently false, but could be enabled in future
      isCollection: false,
      contentType: 'IMAGE',
    };
  }

  // GIF: Treat as image, use gifUrl
  if (isGifContent(content)) {
    const dimensions = extractImageDimensions(
      undefined,
      content.width,
      undefined,
      content.height
    );
    
    return {
      ...baseProps,
      imageUrl: content.gifUrl,
      imageWidth: dimensions.imageWidth,
      imageHeight: dimensions.imageHeight,
      alt: extractAltText(content.alt, content.title, content.caption, undefined, 'GIF'),
      overlayText: content.overlayText,
      enableParallax: false,
      isCollection: false,
      contentType: 'GIF',
      isGif: true,
    };
  }

  // TEXT: No image, just dimensions
  if (isTextContent(content)) {
    return {
      ...baseProps,
      imageUrl: '',
      imageWidth: content.width ?? 800,
      imageHeight: content.height ?? 200, // Default text height
      alt: '',
      enableParallax: false,
      isCollection: false,
      contentType: 'TEXT',
      textItems: content.items,
    };
  }

  // Fallback
  return baseProps;
}

/**
 * Build wrapper className string for content renderer
 * Combines position class with conditional classes based on state
 * 
 * @param positionClassName - Position class (imageLeft/imageRight/imageSingle/imageMiddle) - MUST be first
 * @param styles - Style module with class names
 * @param options - Configuration options
 * @returns Combined className string
 */
export function buildWrapperClassName(
  positionClassName: string,
  styles: Record<string, string>,
  options: {
    includeDragContainer?: boolean;
    enableParallax?: boolean;
    isMobile?: boolean;
    isDragged?: boolean;
    enableDragAndDrop?: boolean;
    hasClickHandler?: boolean;
    isSelected?: boolean;
  } = {}
): string {
  const {
    includeDragContainer = false,
    enableParallax = false,
    isMobile = false,
    isDragged = false,
    enableDragAndDrop = false,
    hasClickHandler = false,
    isSelected = false,
  } = options;

  return [
    positionClassName, // Position class - MUST be first
    includeDragContainer ? styles.dragContainer : '',
    enableParallax ? styles.parallaxContainer : '',
    enableParallax ? styles.overlayContainer : '',
    isMobile ? styles.mobile : '',
    isDragged ? styles.dragging : '',
    enableDragAndDrop ? '' : (hasClickHandler ? styles.clickable : styles.default),
    isSelected ? styles.selected : '',
  ].filter(Boolean).join(' ');
}

/**
 * Build simplified wrapper className for parallax images
 * Only includes essential classes (position, mobile, dragging, selected)
 * Excludes redundant classes that are handled by inline styles
 * 
 * @param positionClassName - Position class (imageLeft/imageRight/imageSingle/imageMiddle) - MUST be first
 * @param styles - Style module with class names
 * @param options - Configuration options
 * @returns Combined className string
 */
export function buildParallaxWrapperClassName(
  positionClassName: string,
  styles: Record<string, string>,
  options: {
    isMobile?: boolean;
    isDragged?: boolean;
    isSelected?: boolean;
  } = {}
): string {
  const {
    isMobile = false,
    isDragged = false,
    isSelected = false,
  } = options;

  return [
    positionClassName, // Position class - MUST be first
    isMobile ? styles.mobile : '',
    isDragged ? styles.dragging : '',
    isSelected ? styles.selected : '',
  ].filter(Boolean).join(' ');
}

/**
 * Determines full renderer props including position and normalized content data
 * REPLACES determineBaseProps entirely - combines position logic with content normalization
 * 
 * @param item - Processed content item with calculated dimensions
 * @param totalInRow - Total number of items in the row
 * @param index - Current item's index in the row (0-based)
 * @param isMobile - Whether on mobile device
 * @param styles - Style module with position class names
 * @returns Complete ContentRendererProps ready for rendering
 */
export function determineContentRendererProps(
  item: { content: AnyContentModel; width: number; height: number },
  totalInRow: number,
  index: number,
  isMobile: boolean,
  styles: { imageSingle: string; imageLeft: string; imageRight: string; imageMiddle: string }
): ContentRendererProps {
  // DEBUG: Check for NaN values before normalization
  if (!Number.isFinite(item.width) || !Number.isFinite(item.height)) {
    console.error('[determineContentRendererProps] NaN detected:', {
      contentId: item.content.id,
      contentType: item.content.contentType,
      itemWidth: item.width,
      itemHeight: item.height,
      isNaNWidth: !Number.isFinite(item.width),
      isNaNHeight: !Number.isFinite(item.height),
      totalInRow,
      index,
    });
  }
  
  // Determine position class (REPLACES Component.tsx determineBaseProps logic)
  const positionClassName = determinePositionClassName(totalInRow, index, styles);
  
  // Normalize content to renderer props
  return normalizeContentToRendererProps(
    item.content,
    item.width,
    item.height,
    positionClassName,
    isMobile
  );
}

