import { type ContentParallaxImageModel } from '@/app/types/Content';
import { HOME_SLUG } from '@/app/utils/collectionSlugs';
import { buildParallaxCard } from '@/app/utils/parallaxCard';

/**
 * Sentinel id for the synthetic "All Collections" tile. Negative so it never
 * collides with real content ids; distinct from ME_TILE_ID (-1000) and the -1/-2
 * header-row ids used by contentLayout.ts.
 */
export const ALL_COLLECTIONS_TILE_ID = -1001;

/**
 * Build the synthetic "All Collections" tile injected into the home grid right after the Me
 * tile, or leading it for an anonymous viewer. Links to /collections, which the backend
 * permission-scopes per viewer — the tile's slug IS its href (`/${slug}`), so this is the
 * canonical browse route, not the backend's `all-collections` resource slug.
 *
 * `orderIndex` -1 keeps it behind the Me tile (-2) and ahead of every backend child (0 and up)
 * once `processContentBlocks` sorts. It has no cover, so its `imageUrl` is empty and the public
 * view's renderability filter drops it before layout.
 */
export function buildAllCollectionsContentBlock(): ContentParallaxImageModel {
  return buildParallaxCard({
    id: ALL_COLLECTIONS_TILE_ID,
    title: 'All Collections',
    slug: 'collections',
    description: null,
    alt: 'Browse all collections',
    orderIndex: -1,
  });
}

/**
 * Whether home gets the All Collections tile. Only the `?manage=1` edit view does; the public
 * view would drop the imageless tile anyway, so it is never built there.
 */
export function shouldBuildAllCollectionsTile(editMode: boolean): boolean {
  return editMode === true;
}

/**
 * Whether the personal user page is needed: only the home slug for a signed-in viewer.
 */
export function shouldFetchUserPage(slug: string, me: unknown): boolean {
  return slug === HOME_SLUG && me !== null && me !== undefined;
}
