import { type ContentCollectionNormalized } from '@/app/lib/api/contentCollections';
import { type ParallaxImageContentBlock } from '@/app/types/ContentBlock';
import { type HomeCardModel } from '@/app/types/HomeCardModel';
import { isImageBlock } from '@/app/utils/contentBlockTypeGuards';

/**
 * Build Parallax Image Content Block from Collection Data
 *
 * Creates a synthetic parallax image block from collection data, either using
 * the defined cover image or falling back to the first image block. Adds
 * overlay text and card type badge for consistent display formatting.
 *
 * @param content - Normalized collection data
 * @param cardType - Collection type for badge display
 * @returns Formatted parallax image block or null if no image available
 */
export function buildParallaxImageContentBlock(
  content: ContentCollectionNormalized,
  cardType: string
): ParallaxImageContentBlock | null {
  // If coverImage exists and it's an image block, use it
  if (content.coverImage && isImageBlock(content.coverImage)) {
    return {
      ...content.coverImage,
      enableParallax: true, // Enable parallax for cover images
      parallaxSpeed: -0.1, // Default parallax speed
      overlayText: content.title, // Add collection title as overlay text
      cardTypeBadge: cardType, // Add cardType badge for top-left positioning
      orderIndex: -2, // Ensure it appears first
      rating: 3, // Force standard rating to prevent full-screen display (rating=5 causes standalone/full-width behavior)
    };
  }

  // Fallback: use the first IMAGE block from content.blocks
  const firstImageBlock = content.blocks.find(isImageBlock);
  if (firstImageBlock) {
    return {
      ...firstImageBlock,
      enableParallax: true, // Enable parallax for cover images
      parallaxSpeed: -0.1, // Default parallax speed
      overlayText: content.title, // Add collection title as overlay text
      cardTypeBadge: cardType, // Add cardType badge for top-left positioning
      orderIndex: -2, // Ensure it appears first
      rating: 3, // Force standard rating to prevent full-screen display (rating=5 causes standalone/full-width behavior)
    };
  }

  // No cover image available
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
    blockType: 'IMAGE',
    title: homeCard.title,
    imageUrlWeb: homeCard.coverImageUrl, // Use coverImageUrl for web display
    imageWidth: 800, // Default width for grid images
    imageHeight: homeCard.cardType === 'catalog' ? 800 : 457, // 1:1 for catalog, 1.75:1 for blog to match current grid
    orderIndex: homeCard.priority,
    rating: 3, // Standard rating for grid display
    createdAt: homeCard.date || new Date().toISOString(),
    updatedAt: homeCard.date || new Date().toISOString(),
    // Parallax-specific properties
    enableParallax: true,
    parallaxSpeed: -0.1, // Standard parallax speed
    overlayText: homeCard.title, // Use title as overlay text
    cardTypeBadge: homeCard.cardType.toUpperCase(), // Badge showing card type
  };
}