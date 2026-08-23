import { type ContentParallaxImageModel } from '@/app/types/Content';
import { buildParallaxCard } from '@/app/utils/parallaxCard';

/**
 * Sentinel id for the synthetic "All Collections" tile. Negative so it never
 * collides with real content ids; distinct from ME_TILE_ID (-1000) and the -1/-2
 * header-row ids used by contentLayout.ts.
 */
export const ALL_COLLECTIONS_TILE_ID = -1001;

/**
 * Build the synthetic "All Collections" tile injected into the home grid right
 * after the Me tile (or as the second tile for anonymous viewers). Links to
 * /collections, which the backend permission-scopes per viewer — the tile's slug
 * IS its href (`/${slug}`), so this is the canonical browse route, not the
 * backend's `all-collections` resource slug. No cover -> empty imageUrl and
 * undefined dimensions, which the renderer draws as its placeholder card.
 *
 * No `collectionId` — that is what keeps the follow toggle from attaching to a tile
 * that is not a real collection.
 */
export function buildAllCollectionsContentBlock(): ContentParallaxImageModel {
  return buildParallaxCard({
    id: ALL_COLLECTIONS_TILE_ID,
    title: 'All Collections',
    slug: 'collections',
    description: null,
    alt: 'Browse all collections',
    orderIndex: 1,
  });
}
