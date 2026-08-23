import { buildAdminHubContent } from '@/app/(admin)/admin/adminHubContent';
import { ADMIN_TILES } from '@/app/(admin)/admin/adminTiles';
import { buildContentRows } from '@/app/components/Content/componentUtils';
import { LAYOUT } from '@/app/constants';
import type { AdminHomeTileApi } from '@/app/lib/api/adminHome';

/**
 * The hub's four panels are rating-5 leaves competing for one row against the nav tiles, and the
 * packer re-solves that row whenever a panel is added or its rating changes. Nothing pinned the
 * desktop composition before the roles panel arrived, and the collections panel that followed it
 * proved the point — a fifth panel, or a rating tweak, could quietly squeeze the panels to a width
 * no list is readable at, and the first sign of it would be in the browser.
 */
const DESKTOP_VIEWPORT = { contentWidth: 1274, viewportHeight: 900, isMobile: false };

/**
 * A panel narrower than this cannot hold a name plus its row controls without every row
 * ellipsizing — the same failure the mobile pinning exists to prevent, at a different budget.
 */
const MIN_READABLE_PANEL_WIDTH = 280;
/**
 * Users, Messages, Roles, Collections. Named rather than written as a literal at each call site,
 * because a fourth panel is exactly the change that made these assertions fail.
 */
const PANEL_COUNT = 4;

const tilesWithCovers = (width: number, height: number): AdminHomeTileApi[] =>
  ADMIN_TILES.map(({ tileKey }, i) => ({
    tileKey,
    coverImageUrl: `https://cdn.example/${tileKey}.webp`,
    coverImageWidth: width,
    coverImageHeight: height,
    displayOrder: i,
  }));

const layout = (tiles: AdminHomeTileApi[]) =>
  buildContentRows(
    buildAdminHubContent(tiles),
    undefined,
    DESKTOP_VIEWPORT,
    LAYOUT.defaultChunkSize,
    1
  ).rows;

const coverCases: [string, AdminHomeTileApi[]][] = [
  ['no cover images', []],
  ['landscape covers', tilesWithCovers(2400, 1600)],
  ['portrait covers', tilesWithCovers(1600, 2400)],
];

describe('admin hub desktop layout', () => {
  it.each(coverCases)('keeps all four panels in the first row — %s', (_label, tiles) => {
    const [firstRow] = layout(tiles);
    const panels = (firstRow?.items ?? []).filter(item => item.content.contentType === 'PANEL');

    expect(panels).toHaveLength(PANEL_COUNT);
  });

  it.each(coverCases)('leaves every panel wide enough to read — %s', (_label, tiles) => {
    for (const row of layout(tiles)) {
      for (const item of row.items) {
        if (item.content.contentType !== 'PANEL') continue;
        expect(item.width).toBeGreaterThanOrEqual(MIN_READABLE_PANEL_WIDTH);
      }
    }
  });

  /**
   * The packer's height becomes a max-height on the panel box, so this is the tallest shape a
   * panel can take before its body scrolls. Past 2:1 the extremeness ramp would also re-weight the
   * panel's prominence and re-solve the row.
   */
  it.each(coverCases)('never solves a panel taller than 2:1 — %s', (_label, tiles) => {
    for (const row of layout(tiles)) {
      for (const item of row.items) {
        if (item.content.contentType !== 'PANEL') continue;
        expect(item.height / item.width).toBeLessThan(2);
      }
    }
  });
});
