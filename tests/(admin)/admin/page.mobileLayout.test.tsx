import { buildAdminHubContent } from '@/app/(admin)/admin/adminHubContent';
import { ADMIN_TILES } from '@/app/(admin)/admin/adminTiles';
import { buildContentRows } from '@/app/components/Content/componentUtils';
import { LAYOUT } from '@/app/constants';
import type { AdminHomeTileApi } from '@/app/lib/api/adminHome';

/**
 * The admin hub lays out through the shared content pipeline, whose mobile row budget
 * ({@link LAYOUT.mobileSlotWidth}) is calibrated for photos: left at that budget the packer fits two
 * items per row on a phone. `mobileChunkSize={1}` restores the single column the pre-pipeline
 * `AdminHubGrid` had via `grid-template-columns: 1fr`.
 *
 * The panels no longer depend on that prop for their own protection — each declares a 400px
 * {@link Content.minWidth}, which a 430px phone cannot satisfy twice over, so the packer keeps them
 * one per row at any budget. Portrait-covered nav TILES still pair up at ~212px without the prop,
 * which is what it is still there for; the last case below pins exactly that split.
 */
const MOBILE_VIEWPORT = { contentWidth: 430, viewportHeight: 932, isMobile: true };

// Keyed off ADMIN_TILES rather than a hardcoded list: a fixture key that matches no
// configured tile silently exercises the no-cover path instead of the cover path it
// is named for, which is what the stale 'homePage' key here was doing.
const tilesWithCovers = (width: number, height: number): AdminHomeTileApi[] =>
  ADMIN_TILES.map(({ tileKey }, i) => ({
    tileKey,
    coverImageUrl: `https://cdn.example/${tileKey}.webp`,
    coverImageWidth: width,
    coverImageHeight: height,
    displayOrder: i,
  }));

const layout = (tiles: AdminHomeTileApi[], mobileChunkSize?: number) =>
  buildContentRows(
    buildAdminHubContent(tiles),
    undefined,
    MOBILE_VIEWPORT,
    LAYOUT.defaultChunkSize,
    mobileChunkSize
  ).rows;

describe('admin hub mobile layout', () => {
  const coverCases: [string, AdminHomeTileApi[]][] = [
    ['no cover images', []],
    ['landscape covers', tilesWithCovers(2400, 1600)],
    ['portrait covers', tilesWithCovers(1600, 2400)],
  ];

  it.each(coverCases)('is one item per row on a 430px phone — %s', (_label, tiles) => {
    const rows = layout(tiles, 1);

    expect(rows).not.toHaveLength(0);
    for (const row of rows) {
      expect(row.items).toHaveLength(1);
      expect(row.items.map(item => Math.round(item.width))).toEqual([MOBILE_VIEWPORT.contentWidth]);
    }
  });

  it('never lets a row exceed the content width', () => {
    for (const [, tiles] of coverCases) {
      for (const row of layout(tiles, 1)) {
        const widest = Math.max(...row.items.map(item => item.width));
        expect(widest).toBeLessThanOrEqual(MOBILE_VIEWPORT.contentWidth + 1);
      }
    }
  });

  it('leaves every panel one per row at the un-pinned budget, on its declared minimum alone', () => {
    const panelRows = layout([]).filter(row =>
      row.items.some(item => item.content.contentType === 'PANEL')
    );

    expect(panelRows).toHaveLength(3);
    for (const row of panelRows) {
      expect(row.items).toHaveLength(1);
      expect(Math.round(row.items[0]!.width)).toBe(MOBILE_VIEWPORT.contentWidth);
    }
  });

  /**
   * This used to document the opposite: at the un-pinned budget the nav tiles PAIRED on a 430px
   * phone, each rendering under half the content width, and that pairing was the reason
   * `mobileChunkSize={1}` had to be pinned in `page.tsx`.
   *
   * The tiles now declare their own `minWidth`, so two of them cannot share a 430px row — the
   * packer honours the minimum and gives each its own. The pin in `page.tsx` stays (it is what
   * keeps a PANEL off a shared mobile row, and it is cheap insurance), but the tiles no longer
   * depend on it.
   */
  it('no longer pairs nav tiles at the un-pinned budget — their minimum forbids it', () => {
    const tileRows = layout(tilesWithCovers(1600, 2400)).filter(row =>
      row.items.every(item => item.content.contentType !== 'PANEL')
    );

    expect(tileRows.length).toBeGreaterThan(0);
    for (const row of tileRows) {
      expect(row.items).toHaveLength(1);
      expect(Math.round(row.items[0]!.width)).toBe(MOBILE_VIEWPORT.contentWidth);
    }
  });
});
