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
 * Build the synthetic "Me" tile shown as the second tile on the home page for a
 * logged-in user: the same parallax image card the home grid already uses, linking
 * to `/user`. Uses the user-page cover when present, else an empty `imageUrl` (the
 * renderer shows its placeholder).
 *
 * No `collectionId` — that is what keeps the follow toggle from attaching to a tile
 * that is not a real collection.
 */
export function buildMeContentBlock(userPage: CollectionModel | null): ContentParallaxImageModel {
  return buildParallaxCard({
    id: ME_TILE_ID,
    title: userPage?.title || 'You',
    slug: 'user',
    description: null,
    coverImage: userPage?.coverImage ?? null,
    alt: 'Your page',
    orderIndex: 1,
  });
}
