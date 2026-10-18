import { type ContentImageModel } from '@/app/types/Content';
import {
  ALL_COLLECTIONS_TILE_ID,
  buildAllCollectionsContentBlock,
} from '@/app/utils/allCollectionsContentBlock';
import { processContentBlocks } from '@/app/utils/contentLayout';
import { buildMeContentBlock, ME_TILE_ID } from '@/app/utils/meContentBlock';

describe('buildAllCollectionsContentBlock', () => {
  /**
   * The tile's slug IS its href (`/${slug}`), so it must name the canonical browse ROUTE, not the
   * backend's `all-collections` resource slug — /all-collections no longer exists.
   */
  it('builds a parallax placeholder tile linking to /collections', () => {
    const tile = buildAllCollectionsContentBlock();
    expect(tile.contentType).toBe('IMAGE');
    expect(tile.enableParallax).toBe(true);
    expect(tile.id).toBe(ALL_COLLECTIONS_TILE_ID);
    expect(tile.slug).toBe('collections');
    expect(tile.overlayText).toBe('All Collections');
    expect(tile.imageUrl).toBe('');
    expect(tile.visible).toBe(true);
  });

  it('uses a sentinel id distinct from the Me tile and header-row ids', () => {
    expect(ALL_COLLECTIONS_TILE_ID).toBeLessThan(0);
    expect(ALL_COLLECTIONS_TILE_ID).not.toBe(ME_TILE_ID);
    expect([-1, -2]).not.toContain(ALL_COLLECTIONS_TILE_ID);
  });

  /**
   * `processContentBlocks` sorts by `orderIndex`, so the wrapper's array order is not what decides
   * the running order. The unfiltered (manage) path is used here because the public path drops
   * both cover-less tiles on renderability before it ever sorts them.
   */
  it('sorts behind the Me tile and ahead of a backend child at orderIndex 0, whatever the array order', () => {
    const child: ContentImageModel = {
      id: 10,
      contentType: 'IMAGE',
      orderIndex: 0,
      imageUrl: 'https://cdn.example.com/child.jpg',
      imageWidth: 1600,
      imageHeight: 1000,
      visible: true,
      locations: [],
    };

    const processed = processContentBlocks(
      [child, buildAllCollectionsContentBlock(), buildMeContentBlock(null)],
      false,
      34,
      'ORDERED'
    );

    expect(processed.map(block => block.id)).toEqual([ME_TILE_ID, ALL_COLLECTIONS_TILE_ID, 10]);
  });
});
