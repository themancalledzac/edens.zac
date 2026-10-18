import { type CollectionModel } from '@/app/types/Collection';
import { type ContentParallaxImageModel } from '@/app/types/Content';
import { buildParallaxCard } from '@/app/utils/parallaxCard';

/**
 * Sentinel id for the synthetic "Me" tile. Negative so it never collides with real
 * (positive) content ids, and deliberately NOT -1/-2 — `contentLayout.ts` uses those
 * for the cover-image and metadata/text header-row blocks, which also render on home.
 */
export const ME_TILE_ID = -1000;

/**
 * Build the synthetic "Me" tile that leads the home page for a signed-in viewer: the same
 * parallax image card the home grid already uses, linking to `/user`. Uses the user-page cover
 * when present; without one the tile has an empty `imageUrl`, which the public view's
 * renderability filter drops.
 *
 * `orderIndex` is negative because `processContentBlocks` sorts home content by it and backend
 * children start at 0. The All Collections tile sits at -1 so it follows this one.
 */
export function buildMeContentBlock(userPage: CollectionModel | null): ContentParallaxImageModel {
  return buildParallaxCard({
    id: ME_TILE_ID,
    title: userPage?.title || 'You',
    slug: 'user',
    description: null,
    coverImage: userPage?.coverImage ?? null,
    alt: 'Your page',
    orderIndex: -2,
  });
}
