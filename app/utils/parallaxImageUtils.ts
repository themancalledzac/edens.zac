import { type AnyContentModel, type ImageContentModel, type ParallaxImageContentModel } from '@/app/types/Content';
import { isContentImage } from '@/app/utils/contentTypeGuards';

/**
 * Create base parallax image properties
 * Shared logic for common parallax block configuration
 */
function createBaseParallaxProperties(
  overlayText: string,
  cardTypeBadge: string,
  orderIndex = -2,
  rating = 3
) {
  return {
    enableParallax: true as const,
    overlayText,
    cardTypeBadge,
    orderIndex, // Ensure it appears first
    rating, // Force standard rating to prevent full-screen display
  };
}

/**
 * Build Parallax Image Content Model from Image Data
 *
 * Creates a synthetic parallax image model from specific image data. Adds
 * overlay text and card type badge for consistent display formatting.
 *
 * @param image - Image model data (either coverImage or first image block)
 * @param collectionDate - Collection date for the image
 * @param type - Collection type for badge display
 * @param title - Collection title for overlay text
 * @returns Formatted parallax image model or null if no image available
 */
export function buildParallaxImageContentBlock(
  image: ImageContentModel | undefined,
  collectionDate: string,
  type: string,
  title: string
): ParallaxImageContentModel | null {
  // If image exists and it's an image block, use it
  if (image && isContentImage(image)) {
    return {
      ...image,
      ...createBaseParallaxProperties(title, type),
      contentType: 'PARALLAX',
      title, // Override the image's title with the collection title
      collectionDate,
      type,
    };
  }

  // No image available
  return null;
}

/**
 * Build Parallax Image Content Model from any content type
 *
 * Converts any AnyContentModel to a ParallaxImageContentModel for use in the grid system.
 * This enables unified parallax behavior between home page grid and collection pages.
 *
 * @param content - Any content model (CollectionContentModel, ImageContentModel, etc.)
 * @returns Formatted parallax image model
 */
export function buildParallaxImageFromContent(content: AnyContentModel): ParallaxImageContentModel {
  // Handle CollectionContentModel
  if (content.contentType === 'COLLECTION') {
    // Determine aspect ratio based on collection type
    // BLOG uses 1.75:1 (457 height), everything else uses 1:1 (800 height)
    const imageHeight = content.collectionType === 'BLOG' ? 457 : 800;

    return {
      id: content.id,
      contentType: 'PARALLAX',
      title: content.title ?? 'Untitled',
      imageUrlWeb: content.imageUrl ?? '',
      imageWidth: 800, // Default width for grid images
      imageHeight,
      createdAt: content.createdAt,
      updatedAt: content.updatedAt,
      // Parallax-specific properties
      ...createBaseParallaxProperties(
        content.title ?? 'Untitled',
        content.collectionType, // Already uppercase in CollectionType enum
        content.orderIndex
      ),
    };
  }

  // Handle ImageContentModel
  if (content.contentType === 'IMAGE') {
    return {
      ...content,
      ...createBaseParallaxProperties(
        content.title ?? 'Untitled Image',
        'IMAGE',
        content.orderIndex
      ),
      contentType: 'PARALLAX',
    };
  }

  // Handle GIF or other content types - convert to basic parallax image
  return {
    id: content.id,
    contentType: 'PARALLAX',
    title: content.title ?? 'Untitled',
    imageUrlWeb: content.imageUrl ?? '',
    imageWidth: content.width ?? 800,
    imageHeight: content.height ?? 800,
    createdAt: content.createdAt,
    updatedAt: content.updatedAt,
    ...createBaseParallaxProperties(
      content.title ?? 'Untitled',
      content.contentType,
      content.orderIndex
    ),
  };
}
