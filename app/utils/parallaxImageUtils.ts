import {
  type AnyContentModel,
  type ContentCollectionModel,
  type ContentImageModel,
  type ContentParallaxImageModel,
} from '@/app/types/Content';
import { isContentImage } from '@/app/utils/contentTypeGuards';

/**
 * Create base parallax image properties.
 *
 * Sets `orderIndex` to ensure the block appears first and `rating` to a
 * standard value (3) to prevent full-screen display.
 *
 * @param overlayText - Text displayed as overlay on the parallax image
 * @param cardTypeBadge - Badge label for the card type
 * @param orderIndex - Display order (default -2 places it before regular content)
 * @param rating - Rating value (default 3 prevents full-screen layout)
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
    orderIndex,
    rating,
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
  if (image && isContentImage(image)) {
    return {
      ...image,
      ...createBaseParallaxProperties(title, type),
      contentType: 'IMAGE',
      title,
      collectionDate,
      type,
    };
  }

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
 * @see convertCollectionContentToParallax
 */
export function buildParallaxImageFromContent(content: AnyContentModel): ContentParallaxImageModel {
  if ('enableParallax' in content && content.enableParallax && content.contentType === 'IMAGE') {
    return content as ContentParallaxImageModel;
  }

  if (content.contentType === 'COLLECTION') {
    const collectionContent = content as ContentCollectionModel;
    const coverImage = collectionContent.coverImage;
    const imageWidth = coverImage?.imageWidth ?? coverImage?.width ?? 800;
    const imageHeight = coverImage?.imageHeight ?? coverImage?.height ?? 800;

    return {
      id: content.id,
      contentType: 'IMAGE',
      title: content.title ?? 'Untitled',
      imageUrl: coverImage?.imageUrl ?? '',
      imageWidth,
      imageHeight,
      width: imageWidth,
      height: imageHeight,
      createdAt: content.createdAt,
      updatedAt: content.updatedAt,
      slug: 'slug' in content ? content.slug : undefined,
      collectionType: 'collectionType' in content ? content.collectionType : undefined,
      ...createBaseParallaxProperties(
        content.title ?? 'Untitled',
        'collectionType' in content ? content.collectionType : 'MISC',
        content.orderIndex
      ),
    };
  }

  if (content.contentType === 'IMAGE') {
    return {
      ...content,
      ...createBaseParallaxProperties(
        content.title ?? 'Untitled Image',
        'IMAGE',
        content.orderIndex
      ),
      contentType: 'IMAGE',
    };
  }

  return {
    id: content.id,
    contentType: 'IMAGE',
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
