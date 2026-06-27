import { type CollectionModel } from '@/app/types/Collection';
import { type ContentParallaxImageModel } from '@/app/types/Content';
import { clampParallaxDimensions } from '@/app/utils/contentLayout';

/**
 * Sentinel id for the synthetic "Me" tile. Negative so it never collides with real
 * (positive) content ids, and deliberately NOT -1/-2 — `contentLayout.ts` uses those
 * for the cover-image and metadata/text header-row blocks, which also render on home.
 */
export const ME_TILE_ID = -1000;

/**
 * Build the synthetic "Me" tile shown as the second tile on the home page for a
 * logged-in user: the same parallax image card the home grid already uses, linking
 * to `/user`. Uses the user-page cover when present, else an empty `imageUrl` (the
 * renderer shows its placeholder). Mirrors the shape of `collectionToContentModel`.
 */
export function buildMeContentBlock(userPage: CollectionModel | null): ContentParallaxImageModel {
  const cover = userPage?.coverImage ?? null;
  const { imageWidth, imageHeight } = clampParallaxDimensions(
    cover?.imageWidth,
    cover?.imageHeight
  );
  const label = userPage?.title || 'You';

  return {
    contentType: 'IMAGE',
    enableParallax: true,
    id: ME_TILE_ID,
    title: label,
    slug: 'user',
    description: null,
    imageUrl: cover?.imageUrl ?? '',
    overlayText: label,
    alt: 'Your page',
    imageWidth,
    imageHeight,
    width: imageWidth,
    height: imageHeight,
    orderIndex: 1,
    visible: true,
    locations: [],
  };
}
