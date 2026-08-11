import { buildAdminHubContent, withPanelFootprints } from '@/app/(admin)/admin/adminHubContent';
import { ADMIN_TILES } from '@/app/(admin)/admin/adminTiles';
import { buildContentRows } from '@/app/components/Content/componentUtils';
import { LAYOUT } from '@/app/constants';
import type { AdminHomeTileApi } from '@/app/lib/api/adminHome';
import type { PanelType } from '@/app/types/Content';
import { isPanelContent } from '@/app/utils/contentTypeGuards';
import { measureRow } from '@/app/utils/layoutDebug';

/**
 * The fill rules, enforced across EVERY collapse state — the invariants of Zac's 2026-08-10
 * review rounds, asserted with the same `measureRow` measurements the dev console logs:
 *
 *  1. Every row's content spans the body width. ("we need a Consistent body width … our layout
 *     FITS the width of the body. ALWAYS")
 *  2. No slack pockets inside a row. ("we don't want 'SPACE' anywhere")
 *  3. Panels stack in ONE column, so they all render at ONE shared width. ("when we combine all
 *     3 dropdown contentComponents … the width should be the SAME for all of them")
 *  4. A collapsed bar renders at exactly its pinned height, at or above the shared minimum.
 *
 * Tile fixtures carry the live cover dimensions of 2026-08-10 (All Collections 2079×2048,
 * All Images null → default shape, Client Galleries portrait 1728×2500) — the portrait cover is
 * what historically broke these invariants, so the fixture must keep it.
 */
const LIVE_DIMS: Array<{ w: number | null; h: number | null }> = [
  { w: 2079, h: 2048 },
  { w: null, h: null },
  { w: 1728, h: 2500 },
];

const apiTiles: AdminHomeTileApi[] = ADMIN_TILES.map((c, i) => ({
  tileKey: c.tileKey,
  coverImageUrl: `https://cdn.example.com/${c.tileKey}.jpg`,
  coverImageWidth: LIVE_DIMS[i]!.w,
  coverImageHeight: LIVE_DIMS[i]!.h,
  displayOrder: i,
}));

const DESKTOP = { contentWidth: 1274.4, viewportHeight: 900, isMobile: false };
const COUNTS = { users: 12, messages: 2, roles: 6 };

/**
 * Desktop widths the invariants are enforced at. The band below ~1174 is the one the review
 * found broken and no test covered: 742.4 is a half-screen laptop / iPad-landscape body,
 * 812.8 is exactly `2 × PANEL_MIN_WIDTH + gridGap` (the width the pinned membership rules
 * used to switch off at), and the rest sample the run up to the 1300px page cap. Widths
 * below 742.4 are not swept — two 400px panel columns plus a gap no longer fit, so the
 * layout is legitimately one block per row and the mobile path takes over.
 */
const WIDTHS = [742.4, 780, 812.8, 850, 900, 1000, 1100, 1174.4, 1274.4];

/** Right-edge tolerance: FILL_TOLERANCE_GAPS (2.5) × gridGap, the packer's own clean bar. */
const EDGE_TOLERANCE = 2.5 * LAYOUT.gridGap;

/** Pocket tolerance: POCKET_TOLERANCE (5%) of the row's bounding box, ditto. */
const POCKET_FRACTION = 0.05;

const STATES: Array<[string, Record<PanelType, boolean>]> = [
  ['all open', { users: false, messages: false, roles: false }],
  ['users', { users: true, messages: false, roles: false }],
  ['messages', { users: false, messages: true, roles: false }],
  ['roles', { users: false, messages: false, roles: true }],
  ['users+messages', { users: true, messages: true, roles: false }],
  ['users+roles', { users: true, messages: false, roles: true }],
  ['messages+roles', { users: false, messages: true, roles: true }],
  ['all collapsed', { users: true, messages: true, roles: true }],
];

const rowsFor = (collapsed: Record<PanelType, boolean>, contentWidth = DESKTOP.contentWidth) =>
  buildContentRows(
    withPanelFootprints(buildAdminHubContent(apiTiles, COUNTS), collapsed),
    undefined,
    { ...DESKTOP, contentWidth },
    LAYOUT.defaultChunkSize
  ).rows;

describe('admin hub all-open baseline', () => {
  /**
   * The cap binding, pinned where it visibly happens: the live covers press Users against
   * exactly `PANEL_MAX_WIDTH` in the approved all-open layout. The default-dims fixture in
   * `page.collapsedLayout.test.ts` never reaches the cap, so this is the only place that
   * proves 700 is what stops the column.
   */
  it('presses Users against exactly its maxWidth', () => {
    const rows = rowsFor({ users: false, messages: false, roles: false });
    const users = rows
      .flatMap(row => row.items)
      .find(item => isPanelContent(item.content) && item.content.panelType === 'users');

    expect(users?.width).toBe(700);
  });
});

const CASES: Array<[number, string, Record<PanelType, boolean>]> = WIDTHS.flatMap(width =>
  STATES.map(([name, collapsed]): [number, string, Record<PanelType, boolean>] => [
    width,
    name,
    collapsed,
  ])
);

describe.each(CASES)('admin hub at %spx, collapse state: %s', (width, _name, collapsed) => {
  const rows = rowsFor(collapsed, width);

  it('spans the body width in every row', () => {
    for (const row of rows) {
      const m = measureRow(row);
      expect(width - m.spanPx).toBeLessThanOrEqual(EDGE_TOLERANCE);
    }
  });

  it('leaves no slack pocket inside any row', () => {
    for (const row of rows) {
      const m = measureRow(row);
      expect(m.pocketPx2).toBeLessThanOrEqual(POCKET_FRACTION * m.spanPx * m.heightPx);
    }
  });

  it('renders every panel in a row at one shared width', () => {
    for (const row of rows) {
      const panelWidths = new Set(
        row.items.filter(item => isPanelContent(item.content)).map(item => Math.round(item.width))
      );
      expect(panelWidths.size).toBeLessThanOrEqual(1);
    }
  });
});
