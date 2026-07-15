import {
  ALL_COLLECTIONS_TILE_ID,
  buildAllCollectionsContentBlock,
} from '@/app/utils/allCollectionsContentBlock';
import { ME_TILE_ID } from '@/app/utils/meContentBlock';

describe('buildAllCollectionsContentBlock', () => {
  it('builds a parallax placeholder tile linking to /all-collections', () => {
    const tile = buildAllCollectionsContentBlock();
    expect(tile.contentType).toBe('IMAGE');
    expect(tile.enableParallax).toBe(true);
    expect(tile.id).toBe(ALL_COLLECTIONS_TILE_ID);
    expect(tile.slug).toBe('all-collections');
    expect(tile.overlayText).toBe('All Collections');
    expect(tile.imageUrl).toBe('');
    expect(tile.visible).toBe(true);
  });

  it('uses a sentinel id distinct from the Me tile and header-row ids', () => {
    expect(ALL_COLLECTIONS_TILE_ID).toBeLessThan(0);
    expect(ALL_COLLECTIONS_TILE_ID).not.toBe(ME_TILE_ID);
    expect([-1, -2]).not.toContain(ALL_COLLECTIONS_TILE_ID);
  });
});
