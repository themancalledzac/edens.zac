import {
  buildAdminHubContent,
  COLLAPSED_PANEL_SIZE,
  panelContentHeight,
  tabbedPanelHeight,
  withPanelFootprints,
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

/** The one tabbed list panel (Users, Messages, Roles, Collections) the hub puts ahead of the tiles. */
const PANEL_COUNT = 1;

describe('buildAdminHubContent', () => {
  const apiTiles: AdminHomeTileApi[] = ADMIN_TILES.map(c => makeTile(c.tileKey));
  const result = buildAdminHubContent(apiTiles);

  it('returns one item per configured tile, plus the panel', () => {
    expect(result).toHaveLength(ADMIN_TILES.length + PANEL_COUNT);
  });

  it('the panel comes first', () => {
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

  it('declares one panel, rated 5, with a fixed id and orderIndex', () => {
    const [panel] = result as ContentPanelModel[];
    expect(panel?.contentType).toBe('PANEL');
    expect(panel?.rating).toBe(5);
    expect(panel?.id).toBe(1001);
    expect(panel?.orderIndex).toBe(100);
  });

  /**
   * Panel ids sit clear of the tiles' `1..n` run. `all ids are unique` below would catch a
   * collision today, but only because there are far fewer than 1000 tiles; this says outright which
   * range belongs to which.
   */
  it('keeps panel ids above every tile id', () => {
    const panelIds = result.slice(0, PANEL_COUNT).map(item => item.id);
    const tileIds = result.slice(PANEL_COUNT).map(item => item.id);
    expect(Math.min(...panelIds)).toBeGreaterThan(Math.max(...tileIds));
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

describe('withPanelFootprints', () => {
  const content = buildAdminHubContent([]);

  it('returns the content unchanged when expanded', () => {
    expect(withPanelFootprints(content, false)).toEqual(content);
  });

  it('gives the collapsed panel the bar footprint', () => {
    const [panel] = withPanelFootprints(content, true) as ContentPanelModel[];

    expect(panel?.width).toBe(COLLAPSED_PANEL_SIZE.width);
    expect(panel?.height).toBe(COLLAPSED_PANEL_SIZE.height);
    expect(panel?.rating).toBe(COLLAPSED_PANEL_SIZE.rating);
    expect(panel?.minWidth).toBe(COLLAPSED_PANEL_SIZE.minWidth);
    expect(panel?.maxWidth).toBe(COLLAPSED_PANEL_SIZE.maxWidth);
    expect(panel?.minHeight).toBe(COLLAPSED_PANEL_SIZE.minHeight);
    expect(panel?.maxHeight).toBe(COLLAPSED_PANEL_SIZE.maxHeight);
  });

  it('leaves non-panel blocks untouched', () => {
    const collapsed = withPanelFootprints(content, true);
    expect(collapsed.slice(PANEL_COUNT)).toEqual(content.slice(PANEL_COUNT));
  });

  /**
   * The reversal of this feature's first design, which declared 1200×56 precisely so the bar WOULD
   * clear both gates and claim its own row — leaving ~874px of dead space beside a 400px-capped
   * bar (Zac's 2026-08-10 review). A collapsed panel is an ordinary small block now: its declared
   * AR sits under the extremeness ramp, so `isSoloHero` can never fire and the bar goes through
   * row composition like any other item.
   */
  it('a collapsed panel stays under the solo-hero gates, so it composes like any block', () => {
    const [panel] = withPanelFootprints(content, true);
    expect(isSoloHero(panel!, LAYOUT.defaultChunkSize)).toBe(false);
  });

  it('an expanded panel does NOT solo — it shares its row', () => {
    const [panel] = withPanelFootprints(content, false);
    expect(isSoloHero(panel!, LAYOUT.defaultChunkSize)).toBe(false);
  });

  /**
   * Collapse is the only footprint rewrite `withPanelFootprints` performs — it must hand an
   * expanded panel back exactly as `buildAdminHubContent` declared it, content-derived height pin
   * included. The pin is set once, on the server, from row counts; it is not a measurement and
   * nothing downstream of layout may rewrite it. That distinction is what separates this from the
   * measured-size path that shipped briefly on 2026-08-10 and was reverted the same day
   * (oscillating re-pack → remount → refetch storm).
   */
  it('hands an expanded panel back exactly as declared, pin included', () => {
    const [panel] = withPanelFootprints(content, false) as ContentPanelModel[];
    const [declared] = content as ContentPanelModel[];

    expect(panel?.width).toBe(600);
    expect(panel?.height).toBe(1100);
    expect(panel?.minWidth).toBe(400);
    expect(panel?.minHeight).toBe(declared?.minHeight);
    expect(panel?.maxHeight).toBe(declared?.maxHeight);
  });
});

describe('tabbed panel height', () => {
  const NONE = { users: 0, messages: 0, roles: 0, collections: 0 };

  /**
   * The pin has to be equal on both ends (that equality is how the sizer recognises a
   * width-independent height) and it has to MOVE with the counts.
   */
  it('pins the panel to a height that grows with its row counts', () => {
    const [lean] = buildAdminHubContent([], {
      users: 2,
      messages: 2,
      roles: 2,
      collections: 2,
    }) as ContentPanelModel[];
    const [full] = buildAdminHubContent([], {
      users: 9,
      messages: 9,
      roles: 9,
      collections: 9,
    }) as ContentPanelModel[];

    expect(lean?.minHeight).toBe(lean?.maxHeight);
    expect(full?.minHeight).toBe(full?.maxHeight);
    expect(full!.minHeight!).toBeGreaterThan(lean!.minHeight!);
  });

  /**
   * One box for every tab: switching tabs must not re-pack the page, so the panel reserves what its
   * TALLEST tab needs. Checked against each tab in turn being the tall one, so a max over the wrong
   * set of tabs (or a sum) cannot pass.
   */
  it.each(['users', 'messages', 'roles', 'collections'] as const)(
    'reserves the tallest tab when %s is the long list',
    tab => {
      const counts = { ...NONE, [tab]: 8 };
      expect(tabbedPanelHeight(counts)).toBe(panelContentHeight(tab, 8));
      const [panel] = buildAdminHubContent([], counts) as ContentPanelModel[];
      expect(panel?.minHeight).toBe(panelContentHeight(tab, 8));
    }
  );

  /** The Users tab's tag-only toggle is a first body line the other tabs do not have. */
  it('adds the Users toolbar line to that tab only', () => {
    // 86 of header chrome, then the 17px toggle line and its 8px gap, then 71px rows.
    expect(panelContentHeight('users', 5)).toBe(86 + 17 + 8 + 5 * 71);
    // No toolbar: 86 of header chrome, then 40px rows.
    expect(panelContentHeight('roles', 5)).toBe(86 + 5 * 40);
  });

  it('floors an empty panel and caps a runaway one, so neither breaks the row', () => {
    const [empty] = buildAdminHubContent([], NONE) as ContentPanelModel[];
    const [huge] = buildAdminHubContent([], { ...NONE, users: 500 }) as ContentPanelModel[];

    expect(empty?.minHeight).toBe(192);
    expect(huge?.minHeight).toBe(1000);
  });
});
