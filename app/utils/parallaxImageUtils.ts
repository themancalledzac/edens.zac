import {
  type AnyContentModel,
  type ContentCollectionModel,
  type ContentImageModel,
  type ContentParallaxImageModel,
} from '@/app/types/Content';
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
  image: ContentImageModel | undefined,
  collectionDate: string,
  type: string,
  title: string
): ContentParallaxImageModel | null {
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
 * Collections are now already Parallax type, but this function handles legacy COLLECTION type for backwards compatibility.
 *
 * @param content - Any content model (ParallaxImageContentModel, CollectionContentModel, ImageContentModel, etc.)
 * @returns Formatted parallax image model
 */
export function buildParallaxImageFromContent(content: AnyContentModel): ContentParallaxImageModel {
  // If already Parallax type, return as-is (collections are now converted to Parallax earlier)
  if (content.contentType === 'PARALLAX') {
    return content as ContentParallaxImageModel;
  }

  // Handle legacy CollectionContentModel (for backwards compatibility)
  if (content.contentType === 'COLLECTION') {
    const collectionContent = content as ContentCollectionModel;
    
    // Use coverImage dimensions (imageWidth/imageHeight) if available, otherwise fallback to defaults
    // This matches the same logic used in convertCollectionContentToParallax
    const coverImage = collectionContent.coverImage;
    const imageWidth = coverImage?.imageWidth ?? coverImage?.width ?? 800;
    const imageHeight = coverImage?.imageHeight ?? coverImage?.height ?? 800;

    return {
      id: content.id,
      contentType: 'PARALLAX',
      title: content.title ?? 'Untitled',
      imageUrl: coverImage?.imageUrl ?? '',
      imageWidth,
      imageHeight,
      width: imageWidth,
      height: imageHeight,
      createdAt: content.createdAt,
      updatedAt: content.updatedAt,
      // Preserve collection-specific fields
      slug: 'slug' in content ? content.slug : undefined,
      collectionType: 'collectionType' in content ? content.collectionType : undefined,
      // Parallax-specific properties
      ...createBaseParallaxProperties(
        content.title ?? 'Untitled',
        'collectionType' in content ? content.collectionType : 'MISC',
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
    imageUrl: content.imageUrl ?? '',
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
