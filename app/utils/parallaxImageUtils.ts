import { PARALLAX_CONSTANTS } from '@/app/constants/parallax';
import { type ImageContentBlock, type ParallaxImageContentBlock } from '@/app/types/ContentBlock';
import { type HomeCardModel } from '@/app/types/HomeCardModel';
import { isImageBlock } from '@/app/utils/contentBlockTypeGuards';

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
    parallaxSpeed: PARALLAX_CONSTANTS.DEFAULT_SPEED,
    overlayText,
    cardTypeBadge,
    orderIndex, // Ensure it appears first
    rating, // Force standard rating to prevent full-screen display
  };
}

/**
 * Build Parallax Image Content Block from Image Data
 *
 * Creates a synthetic parallax image block from specific image data. Adds
 * overlay text and card type badge for consistent display formatting.
 *
 * @param image - Image block data (either coverImage or first image block)
 * @param collectionDate - Collection date for the image
 * @param type - Collection type for badge display
 * @param title - Collection title for overlay text
 * @returns Formatted parallax image block or null if no image available
 */
export function buildParallaxImageContentBlock(
  image: ImageContentBlock | undefined,
  collectionDate: string,
  type: string,
  title: string
): ParallaxImageContentBlock | null {
  // If image exists and it's an image block, use it
  if (image && isImageBlock(image)) {
    return {
      ...image,
      ...createBaseParallaxProperties(title, type),
      blockType: 'PARALLAX',
      title, // Override the image's title with the collection title
      collectionDate,
      type,
    };
  }

  // No image available
  return null;
}

/**
 * Build Parallax Image Content Block from Home Card Model
 *
 * Converts a HomeCardModel to a ParallaxImageContentBlock for use in the grid system.
 * This enables unified parallax behavior between home page grid and collection pages.
 *
 * @param homeCard - Home card model data
 * @returns Formatted parallax image block
 */
export function buildParallaxImageFromHomeCard(homeCard: HomeCardModel): ParallaxImageContentBlock {
  return {
    id: homeCard.id,
    blockType: 'PARALLAX',
    title: homeCard.title,
    imageUrlWeb: homeCard.coverImageUrl, // Use coverImageUrl for web display
    imageWidth: 800, // Default width for grid images
    imageHeight: homeCard.cardType === 'catalog' ? 800 : 457, // 1:1 for catalog, 1.75:1 for blog to match current grid
    createdAt: homeCard.date || new Date().toISOString(),
    updatedAt: homeCard.date || new Date().toISOString(),
    // Parallax-specific properties with custom order from priority
    ...createBaseParallaxProperties(
      homeCard.title,
      homeCard.cardType.toUpperCase(),
      homeCard.priority
    ),
  };
}
