import { buildAdminHubContent } from '@/app/(admin)/admin/adminHubContent';
import { ADMIN_TILES } from '@/app/(admin)/admin/adminTiles';
import type { AdminHomeTileApi } from '@/app/lib/api/adminHome';
import type { ContentPanelModel, ContentParallaxImageModel } from '@/app/types/Content';

function makeTile(tileKey: string, overrides: Partial<AdminHomeTileApi> = {}): AdminHomeTileApi {
  return {
    tileKey,
    coverImageUrl: `https://cdn.example.com/${tileKey}.jpg`,
    coverImageWidth: null,
    coverImageHeight: null,
    displayOrder: 0,
    ...overrides,
  };
}

describe('buildAdminHubContent', () => {
  const apiTiles: AdminHomeTileApi[] = ADMIN_TILES.map(c => makeTile(c.tileKey));
  const result = buildAdminHubContent(apiTiles);

  it('returns one item per configured tile, plus the 2 panels', () => {
    expect(result).toHaveLength(ADMIN_TILES.length + 2);
  });

  it('panels come first (indices 0 and 1)', () => {
    expect(result[0]?.contentType).toBe('PANEL');
    expect(result[1]?.contentType).toBe('PANEL');
  });

  it('tile models all have contentType IMAGE', () => {
    const tiles = result.slice(2);
    for (const tile of tiles) {
      expect(tile.contentType).toBe('IMAGE');
    }
  });

  it('tile models all have enableParallax true', () => {
    const tiles = result.slice(2) as ContentParallaxImageModel[];
    for (const tile of tiles) {
      expect(tile.enableParallax).toBe(true);
    }
  });

  it('tile models do not have collectionType', () => {
    const tiles = result.slice(2) as ContentParallaxImageModel[];
    for (const tile of tiles) {
      expect('collectionType' in tile).toBe(false);
    }
  });

  it('carries each tile config rating through to its model', () => {
    const tiles = result.slice(2) as ContentParallaxImageModel[];
    expect(tiles.length).toBe(ADMIN_TILES.length);
    for (const [i, tile] of tiles.entries()) {
      expect(tile.rating).toBe(ADMIN_TILES[i]?.rating);
    }
  });

  it('gives every tile a non-empty slug so isSlugNav can link it', () => {
    const tiles = result.slice(2) as ContentParallaxImageModel[];
    for (const tile of tiles) {
      expect(tile.slug).toBeTruthy();
    }
  });

  it('slug maps so /slug equals config.href', () => {
    const tiles = result.slice(2) as ContentParallaxImageModel[];
    for (let i = 0; i < ADMIN_TILES.length; i++) {
      const config = ADMIN_TILES[i];
      const tile = tiles[i];
      expect(`/${tile?.slug}`).toBe(config?.href);
    }
  });

  it('uses cover image dimensions from api tile', () => {
    const tilesWithDims: AdminHomeTileApi[] = ADMIN_TILES.map(c =>
      makeTile(c.tileKey, { coverImageWidth: 1200, coverImageHeight: 800 })
    );
    const res = buildAdminHubContent(tilesWithDims);
    const firstTile = res[2] as ContentParallaxImageModel;
    expect(firstTile.imageWidth).toBeGreaterThan(0);
    expect(firstTile.imageHeight).toBeGreaterThan(0);
  });

  it('falls back gracefully when api tile has no cover dimensions', () => {
    const tilesNoCover: AdminHomeTileApi[] = ADMIN_TILES.map(c =>
      makeTile(c.tileKey, { coverImageUrl: null, coverImageWidth: null, coverImageHeight: null })
    );
    const res = buildAdminHubContent(tilesNoCover);
    const tiles = res.slice(2) as ContentParallaxImageModel[];
    for (const tile of tiles) {
      expect(tile.imageUrl).toBe('');
    }
  });

  it('panels have contentType PANEL and rating 5', () => {
    const usersPanel = result[0] as ContentPanelModel;
    const messagesPanel = result[1] as ContentPanelModel;
    expect(usersPanel.panelType).toBe('users');
    expect(usersPanel.rating).toBe(5);
    expect(messagesPanel.panelType).toBe('messages');
    expect(messagesPanel.rating).toBe(5);
  });

  it('panels have vertical AR (width < height)', () => {
    const usersPanel = result[0] as ContentPanelModel;
    const messagesPanel = result[1] as ContentPanelModel;
    expect((usersPanel.width ?? 0) < (usersPanel.height ?? 0)).toBe(true);
    expect((messagesPanel.width ?? 0) < (messagesPanel.height ?? 0)).toBe(true);
  });

  it('all ids are unique', () => {
    const ids = result.map(item => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('works with an empty tiles array', () => {
    const res = buildAdminHubContent([]);
    expect(res).toHaveLength(ADMIN_TILES.length + 2);
    const tiles = res.slice(2) as ContentParallaxImageModel[];
    for (const tile of tiles) {
      expect(tile.imageUrl).toBe('');
    }
  });
});
