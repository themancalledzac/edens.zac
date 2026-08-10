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
    for (const row of layout([]).slice(0, 3)) {
      expect(row.items).toHaveLength(1);
      expect(Math.round(row.items[0]!.width)).toBe(MOBILE_VIEWPORT.contentWidth);
    }
  });

  it('documents the un-pinned budget still pairing nav tiles — why mobileChunkSize is pinned', () => {
    const tileRow = layout(tilesWithCovers(1600, 2400)).find(row =>
      row.items.every(item => item.content.contentType !== 'PANEL')
    );

    expect(tileRow?.items).toHaveLength(2);
    for (const item of tileRow?.items ?? []) {
      expect(item.width).toBeLessThan(MOBILE_VIEWPORT.contentWidth / 2);
    }
  });
});
