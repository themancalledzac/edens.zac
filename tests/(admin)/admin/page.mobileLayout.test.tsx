import { buildAdminHubContent } from '@/app/(admin)/admin/adminHubContent';
import { buildContentRows } from '@/app/components/Content/componentUtils';
import { LAYOUT } from '@/app/constants';
import type { AdminHomeTileApi } from '@/app/lib/api/adminHome';

/**
 * The admin hub lays out through the shared content pipeline, whose mobile row budget
 * ({@link LAYOUT.mobileSlotWidth}) is calibrated for photos. Left at that budget the packer fits two
 * items per row on a phone: the users/messages panels land at ~212px each — too narrow for a user
 * list — and portrait-covered nav tiles pair up too. `mobileChunkSize={1}` restores the single
 * column the pre-pipeline `AdminHubGrid` had via `grid-template-columns: 1fr`.
 */
const MOBILE_VIEWPORT = { contentWidth: 430, viewportHeight: 932, isMobile: true };

const tilesWithCovers = (width: number, height: number): AdminHomeTileApi[] =>
  ['homePage', 'all-collections', 'all-images', 'all-client-galleries'].map((tileKey, i) => ({
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

  it('documents the un-pinned budget that squeezed both panels into one row', () => {
    const [panelRow] = layout([]);

    expect(panelRow?.items).toHaveLength(2);
    for (const item of panelRow?.items ?? []) {
      expect(item.width).toBeLessThan(MOBILE_VIEWPORT.contentWidth / 2);
    }
  });
});
