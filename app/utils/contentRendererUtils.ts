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
  const baseProps: ContentRendererProps = {
    contentId: content.id,
    className: positionClassName,
    width: Math.round(calculatedWidth),
    height: Math.round(calculatedHeight),
    isMobile,
    imageUrl: '',
    imageWidth: 800,
    imageHeight: 800,
    alt: '',
    enableParallax: false,
    isCollection: false,
    contentType: content.contentType === 'PARALLAX' ? 'IMAGE' : content.contentType, // Convert legacy PARALLAX to IMAGE
  };

  // COLLECTION: Use coverImage, enableParallax = true
  if (isContentCollection(content)) {
    const coverImage = content.coverImage;
    return {
      ...baseProps,
      imageUrl: coverImage?.imageUrl ?? '',
      imageWidth: coverImage?.imageWidth ?? coverImage?.width ?? 800,
      imageHeight: coverImage?.imageHeight ?? coverImage?.height ?? 800,
      alt: content.title || content.slug || 'Collection',
      overlayText: content.title,
      cardTypeBadge: content.collectionType, // Only collections have this
      enableParallax: true, // Collections are parallax
      hasSlug: content.slug,
      isCollection: true,
      contentType: 'COLLECTION',
    };
  }

  // IMAGE: Standard image, enableParallax = false (but could be enabled later)
  if (isContentImage(content)) {
    return {
      ...baseProps,
      imageUrl: content.imageUrl,
      imageWidth: content.imageWidth ?? content.width ?? 800,
      imageHeight: content.imageHeight ?? content.height ?? 800,
      alt: content.alt || content.title || content.caption || 'Image',
      overlayText: content.overlayText,
      enableParallax: false, // Currently false, but could be enabled in future
      isCollection: false,
      contentType: 'IMAGE',
    };
  }

  // PARALLAX: Legacy format - treat as IMAGE with enableParallax = true
  // This handles any legacy PARALLAX content that might still exist
  if (content.contentType === 'PARALLAX') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parallaxContent = content as any; // Type assertion for legacy content
    return {
      ...baseProps,
      imageUrl: parallaxContent.imageUrl ?? '',
      imageWidth: parallaxContent.imageWidth ?? parallaxContent.width ?? 800,
      imageHeight: parallaxContent.imageHeight ?? parallaxContent.height ?? 800,
      alt: parallaxContent.title || parallaxContent.caption || 'Image',
      overlayText: parallaxContent.overlayText,
      cardTypeBadge: parallaxContent.cardTypeBadge,
      enableParallax: true, // Legacy parallax content
      hasSlug: parallaxContent.slug,
      isCollection: !!parallaxContent.slug,
      contentType: 'IMAGE', // Convert to IMAGE type
    };
  }

  // GIF: Treat as image, use gifUrl
  if (isGifContent(content)) {
    return {
      ...baseProps,
      imageUrl: content.gifUrl,
      imageWidth: content.width ?? 800,
      imageHeight: content.height ?? 800,
      alt: content.alt || content.title || content.caption || 'GIF',
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
      textContent: content.content,
      textAlign: content.align,
    };
  }

  // Fallback
  return baseProps;
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

