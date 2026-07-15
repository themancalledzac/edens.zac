import { type ContentParallaxImageModel } from '@/app/types/Content';
import { clampParallaxDimensions } from '@/app/utils/contentLayout';

/**
 * Sentinel id for the synthetic "All Collections" tile. Negative so it never
 * collides with real content ids; distinct from ME_TILE_ID (-1000) and the -1/-2
 * header-row ids used by contentLayout.ts.
 */
export const ALL_COLLECTIONS_TILE_ID = -1001;

/**
 * Build the synthetic "All Collections" tile injected into the home grid right
 * after the Me tile (or as the second tile for anonymous viewers). Links to
 * /all-collections, which the backend permission-scopes per viewer. Empty
 * imageUrl -> the renderer's placeholder card. Mirrors buildMeContentBlock.
 */
export function buildAllCollectionsContentBlock(): ContentParallaxImageModel {
  const { imageWidth, imageHeight } = clampParallaxDimensions();
  return {
    contentType: 'IMAGE',
    enableParallax: true,
    id: ALL_COLLECTIONS_TILE_ID,
    title: 'All Collections',
    slug: 'all-collections',
    description: null,
    imageUrl: '',
    overlayText: 'All Collections',
    alt: 'Browse all collections',
    imageWidth,
    imageHeight,
    width: imageWidth,
    height: imageHeight,
    orderIndex: 1,
    visible: true,
    locations: [],
  };
}
