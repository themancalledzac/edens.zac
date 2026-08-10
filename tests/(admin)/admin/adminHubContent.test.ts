import {
  buildAdminHubContent,
  COLLAPSED_PANEL_SIZE,
  withCollapsedPanels,
} from '@/app/(admin)/admin/adminHubContent';
import { ADMIN_TILES } from '@/app/(admin)/admin/adminTiles';
import { LAYOUT } from '@/app/constants';
import type { AdminHomeTileApi } from '@/app/lib/api/adminHome';
import type { ContentPanelModel, ContentParallaxImageModel } from '@/app/types/Content';
import { isSoloHero } from '@/app/utils/rowCombination';

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

/** Users, Messages, Roles — the panels the hub puts ahead of the nav tiles. */
const PANEL_COUNT = 3;

describe('buildAdminHubContent', () => {
  const apiTiles: AdminHomeTileApi[] = ADMIN_TILES.map(c => makeTile(c.tileKey));
  const result = buildAdminHubContent(apiTiles);

  it('returns one item per configured tile, plus the panels', () => {
    expect(result).toHaveLength(ADMIN_TILES.length + PANEL_COUNT);
  });

  it('panels come first', () => {
    for (const panel of result.slice(0, PANEL_COUNT)) {
      expect(panel.contentType).toBe('PANEL');
    }
  });

  it('tile models all have contentType IMAGE', () => {
    const tiles = result.slice(PANEL_COUNT);
    for (const tile of tiles) {
      expect(tile.contentType).toBe('IMAGE');
    }
  });

  it('tile models all have enableParallax true', () => {
    const tiles = result.slice(PANEL_COUNT) as ContentParallaxImageModel[];
    for (const tile of tiles) {
      expect(tile.enableParallax).toBe(true);
    }
  });

  it('tile models do not have collectionType', () => {
    const tiles = result.slice(PANEL_COUNT) as ContentParallaxImageModel[];
    for (const tile of tiles) {
      expect('collectionType' in tile).toBe(false);
    }
  });

  it('carries each tile config rating through to its model', () => {
    const tiles = result.slice(PANEL_COUNT) as ContentParallaxImageModel[];
    expect(tiles.length).toBe(ADMIN_TILES.length);
    for (const [i, tile] of tiles.entries()) {
      expect(tile.rating).toBe(ADMIN_TILES[i]?.rating);
    }
  });

  it('gives every tile a non-empty slug so isSlugNav can link it', () => {
    const tiles = result.slice(PANEL_COUNT) as ContentParallaxImageModel[];
    for (const tile of tiles) {
      expect(tile.slug).toBeTruthy();
    }
  });

  it('slug maps so /slug equals config.href', () => {
    const tiles = result.slice(PANEL_COUNT) as ContentParallaxImageModel[];
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
    const firstTile = res[PANEL_COUNT] as ContentParallaxImageModel;
    expect(firstTile.imageWidth).toBeGreaterThan(0);
    expect(firstTile.imageHeight).toBeGreaterThan(0);
  });

  it('falls back gracefully when api tile has no cover dimensions', () => {
    const tilesNoCover: AdminHomeTileApi[] = ADMIN_TILES.map(c =>
      makeTile(c.tileKey, { coverImageUrl: null, coverImageWidth: null, coverImageHeight: null })
    );
    const res = buildAdminHubContent(tilesNoCover);
    const tiles = res.slice(PANEL_COUNT) as ContentParallaxImageModel[];
    for (const tile of tiles) {
      expect(tile.imageUrl).toBe('');
    }
  });

  it('carries every panel type, in order, all rated 5', () => {
    const panels = result.slice(0, PANEL_COUNT) as ContentPanelModel[];
    expect(panels.map(p => p.panelType)).toEqual(['users', 'messages', 'roles']);
    for (const panel of panels) {
      expect(panel.rating).toBe(5);
    }
  });

  it('panels have vertical AR (width < height)', () => {
    const panels = result.slice(0, PANEL_COUNT) as ContentPanelModel[];
    for (const panel of panels) {
      expect((panel.width ?? 0) < (panel.height ?? 0)).toBe(true);
    }
  });

  /**
   * The packer's height reaches the DOM as a max-height, so this ratio is each panel's tallest
   * allowed shape. At exactly 1:2 the extremeness hits EXTREMENESS_RAMP_START and prominenceFactor
   * steps from 1.0 to 1.4, which re-solves width allocation for the whole hub.
   */
  it('keeps every panel strictly under the 1:2 extremeness ramp', () => {
    const panels = result.slice(0, PANEL_COUNT) as ContentPanelModel[];
    for (const panel of panels) {
      expect((panel.height ?? 0) / (panel.width ?? 1)).toBeLessThan(2);
    }
  });

  it('all ids are unique', () => {
    const ids = result.map(item => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('works with an empty tiles array', () => {
    const res = buildAdminHubContent([]);
    expect(res).toHaveLength(ADMIN_TILES.length + PANEL_COUNT);
    const tiles = res.slice(PANEL_COUNT) as ContentParallaxImageModel[];
    for (const tile of tiles) {
      expect(tile.imageUrl).toBe('');
    }
  });
});

describe('withCollapsedPanels', () => {
  const content = buildAdminHubContent([]);
  const NONE = { users: false, messages: false, roles: false } as const;

  it('returns the content unchanged when nothing is collapsed', () => {
    expect(withCollapsedPanels(content, NONE)).toEqual(content);
  });

  it('gives a collapsed panel the bar footprint and leaves its siblings alone', () => {
    const [users, messages, roles] = withCollapsedPanels(content, {
      ...NONE,
      users: true,
    }) as ContentPanelModel[];

    expect(users?.width).toBe(COLLAPSED_PANEL_SIZE.width);
    expect(users?.height).toBe(COLLAPSED_PANEL_SIZE.height);
    expect(messages?.height).toBe(1100);
    expect(roles?.height).toBe(1100);
  });

  it('collapses every panel type, not just the first', () => {
    const panels = withCollapsedPanels(content, {
      users: true,
      messages: true,
      roles: true,
    }).slice(0, PANEL_COUNT) as ContentPanelModel[];

    for (const panel of panels) {
      expect(panel.height).toBe(COLLAPSED_PANEL_SIZE.height);
    }
  });

  it('leaves non-panel blocks untouched', () => {
    const collapsed = withCollapsedPanels(content, {
      users: true,
      messages: true,
      roles: true,
    });
    expect(collapsed.slice(PANEL_COUNT)).toEqual(content.slice(PANEL_COUNT));
  });

  it('a collapsed panel clears the solo-hero gates, so it claims its own full-width row', () => {
    const [users] = withCollapsedPanels(content, { ...NONE, users: true });
    expect(isSoloHero(users!, LAYOUT.defaultChunkSize)).toBe(true);
  });

  it('an expanded panel does NOT solo — it shares its row', () => {
    const [users] = withCollapsedPanels(content, NONE);
    expect(isSoloHero(users!, LAYOUT.defaultChunkSize)).toBe(false);
  });
});
