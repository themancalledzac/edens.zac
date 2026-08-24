import {
  buildAdminHubContent,
  COLLAPSED_PANEL_SIZE,
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

/** Users, Messages, Roles, Collections — the panels the hub puts ahead of the nav tiles. */
const PANEL_COUNT = 4;

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
    expect(panels.map(p => p.panelType)).toEqual(['users', 'messages', 'roles', 'collections']);
    for (const panel of panels) {
      expect(panel.rating).toBe(5);
    }
  });

  /**
   * The four panel literals are one `PANEL_ORDER.map` now, with `id` and `orderIndex` derived from
   * a panel's position rather than written out. These are the values the literals carried, pinned
   * so the derivation cannot drift: an off-by-one in either base, or a `.map` that reused the same
   * index, would still produce four panels in the right order and pass every other test here.
   */
  it('numbers panel ids and orderIndex from their position in the list', () => {
    const panels = result.slice(0, PANEL_COUNT) as ContentPanelModel[];
    expect(panels.map(p => p.id)).toEqual([1001, 1002, 1003, 1004]);
    expect(panels.map(p => p.orderIndex)).toEqual([100, 101, 102, 103]);
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
  const NONE = { users: false, messages: false, roles: false, collections: false } as const;

  it('returns the content unchanged when nothing is collapsed', () => {
    expect(withPanelFootprints(content, NONE)).toEqual(content);
  });

  it('gives a collapsed panel the bar footprint and leaves its siblings alone', () => {
    const [users, messages, roles, collections] = withPanelFootprints(content, {
      ...NONE,
      users: true,
    }) as ContentPanelModel[];

    expect(users?.width).toBe(COLLAPSED_PANEL_SIZE.width);
    expect(users?.height).toBe(COLLAPSED_PANEL_SIZE.height);
    expect(users?.rating).toBe(COLLAPSED_PANEL_SIZE.rating);
    expect(users?.minWidth).toBe(COLLAPSED_PANEL_SIZE.minWidth);
    expect(users?.maxWidth).toBe(COLLAPSED_PANEL_SIZE.maxWidth);
    expect(users?.minHeight).toBe(COLLAPSED_PANEL_SIZE.minHeight);
    expect(users?.maxHeight).toBe(COLLAPSED_PANEL_SIZE.maxHeight);
    expect(messages?.height).toBe(1100);
    expect(roles?.height).toBe(1100);
    expect(collections?.height).toBe(1100);
  });

  it('collapses every panel type, not just the first', () => {
    const panels = withPanelFootprints(content, {
      users: true,
      messages: true,
      roles: true,
      collections: true,
    }).slice(0, PANEL_COUNT) as ContentPanelModel[];

    for (const panel of panels) {
      expect(panel.height).toBe(COLLAPSED_PANEL_SIZE.height);
    }
  });

  it('leaves non-panel blocks untouched', () => {
    const collapsed = withPanelFootprints(content, {
      users: true,
      messages: true,
      roles: true,
      collections: true,
    });
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
    const [users] = withPanelFootprints(content, { ...NONE, users: true });
    expect(isSoloHero(users!, LAYOUT.defaultChunkSize)).toBe(false);
  });

  it('an expanded panel does NOT solo — it shares its row', () => {
    const [users] = withPanelFootprints(content, NONE);
    expect(isSoloHero(users!, LAYOUT.defaultChunkSize)).toBe(false);
  });

  /**
   * Collapse is still the only footprint rewrite `withPanelFootprints` performs — it must hand an
   * expanded panel back exactly as `buildAdminHubContent` declared it. What that declaration
   * CONTAINS changed: a panel now carries a content-derived height pin. The pin is set once, on the
   * server, from a row count; it is not a measurement and nothing downstream of layout may rewrite
   * it. That distinction is what separates this from the measured-size path that shipped briefly on
   * 2026-08-10 and was reverted the same day (oscillating re-pack → remount → refetch storm).
   */
  it('hands an expanded panel back exactly as declared, pin included', () => {
    const [users, messages, roles, collections] = withPanelFootprints(
      content,
      NONE
    ) as ContentPanelModel[];
    const [declaredUsers, declaredMessages, declaredRoles, declaredCollections] =
      content as ContentPanelModel[];

    for (const [panel, declared] of [
      [users, declaredUsers],
      [messages, declaredMessages],
      [roles, declaredRoles],
      [collections, declaredCollections],
    ] as const) {
      expect(panel?.width).toBe(600);
      expect(panel?.height).toBe(1100);
      expect(panel?.minWidth).toBe(400);
      expect(panel?.minHeight).toBe(declared?.minHeight);
      expect(panel?.maxHeight).toBe(declared?.maxHeight);
    }
  });

  /**
   * The pin is what makes a panel's reserved box track its contents, so it has to be equal on both
   * ends (that equality is how the sizer recognises a width-independent height) and it has to
   * MOVE with the count. A panel that reserved the same height for two messages as for forty is
   * the bug this feature exists to remove.
   */
  it('pins a panel to a height that grows with its row count', () => {
    const small = buildAdminHubContent([], { users: 2, messages: 2, roles: 2, collections: 2 });
    const large = buildAdminHubContent([], { users: 12, messages: 9, roles: 9, collections: 9 });

    for (const index of [0, 1, 2, 3]) {
      const lean = small[index] as ContentPanelModel;
      const full = large[index] as ContentPanelModel;

      expect(lean.minHeight).toBe(lean.maxHeight);
      expect(full.minHeight).toBe(full.maxHeight);
      expect(full.minHeight!).toBeGreaterThan(lean.minHeight!);
    }
  });

  it('floors an empty panel and caps a runaway one, so neither breaks the row', () => {
    const [emptyUsers] = buildAdminHubContent([], {
      users: 0,
      messages: 0,
      roles: 0,
      collections: 0,
    }) as ContentPanelModel[];
    const [hugeUsers] = buildAdminHubContent([], {
      users: 500,
      messages: 0,
      roles: 0,
      collections: 0,
    }) as ContentPanelModel[];

    expect(emptyUsers?.minHeight).toBe(192);
    expect(hugeUsers?.minHeight).toBe(1000);
  });
});
