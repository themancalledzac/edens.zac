import {
  buildAdminHubContent,
  PANEL_MAX_WIDTH,
  PANEL_MIN_WIDTH,
  withPanelFootprints,
} from '@/app/(admin)/admin/adminHubContent';
import { ADMIN_TILES } from '@/app/(admin)/admin/adminTiles';
import { buildContentRows } from '@/app/components/Content/componentUtils';
import { LAYOUT } from '@/app/constants';
import type { AdminHomeTileApi } from '@/app/lib/api/adminHome';
import { isPanelContent } from '@/app/utils/contentTypeGuards';
import { measureRow } from '@/app/utils/layoutDebug';
import type { BoxTree } from '@/app/utils/rowCombination';
import { computeHeightCoeffs } from '@/app/utils/rowStructureAlgorithm';

/**
 * The fill rules, enforced in BOTH collapse states of the hub's one tabbed panel — the invariants
 * of Zac's 2026-08-10 review rounds, asserted with the same `measureRow` measurements the dev
 * console logs:
 *
 *  1. Every row's content spans the body width. ("we need a Consistent body width … our layout
 *     FITS the width of the body. ALWAYS")
 *  2. No slack pockets inside a row. ("we don't want 'SPACE' anywhere")
 *  3. Every stacked column renders at the height the packer's model predicts.
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
const COUNTS = { users: 12, messages: 2, roles: 6, collections: 8 };

/**
 * Desktop widths the invariants are enforced at. The band below ~1174 is the one the review
 * found broken and no test covered: 742.4 is a half-screen laptop / iPad-landscape body,
 * 812.8 is exactly `2 × PANEL_MIN_WIDTH + gridGap` (the width the pinned membership rules
 * used to switch off at), and the rest sample the run up to the 1300px page cap.
 *
 * 600 covers the middle of the 390–742 desktop band, which nothing reached before. Below 812.8 a
 * second 400px panel column does not fit, so the layout is legitimately one block per row — but
 * "one block per row" is precisely the shape the composer's stopping rules were relaxed for, and
 * the fill invariants still have to hold there. A desktop body of 600px is a narrow split pane, not
 * a phone: `isMobile` is false, so this is the desktop path packing at a phone-ish width.
 */
const WIDTHS = [600, 742.4, 780, 812.8, 850, 900, 1000, 1100, 1174.4, 1274.4];

/**
 * Width at which the panel and a tile column fit side by side: `PANEL_MIN_WIDTH + gap + a tile's
 * 300px minimum`. Above it a panel alone in its row is a layout choice rather than a necessity.
 */
const PANEL_BESIDE_TILE = PANEL_MIN_WIDTH + LAYOUT.gridGap + 300;

/** Right-edge tolerance: FILL_TOLERANCE_GAPS (2.5) × gridGap, the packer's own clean bar. */
const EDGE_TOLERANCE = 2.5 * LAYOUT.gridGap;

/** Pocket tolerance: POCKET_TOLERANCE (5%) of the row's bounding box, ditto. */
const POCKET_FRACTION = 0.05;

/** The panel's two states. */
const STATES: Array<[string, boolean]> = [
  ['open', false],
  ['collapsed', true],
];

const rowsFor = (collapsed: boolean, contentWidth = DESKTOP.contentWidth) =>
  buildContentRows(
    withPanelFootprints(buildAdminHubContent(apiTiles, COUNTS), collapsed),
    undefined,
    { ...DESKTOP, contentWidth },
    LAYOUT.defaultChunkSize
  ).rows;

/**
 * Every OUTERMOST stacked column in a row, as `{ width, renderedHeight, tree }` — the rendered
 * height being what CSS produces (child heights plus the gap between them), walked exactly as
 * {@link measureRow} walks it.
 *
 * Outermost only, because only an outermost column renders at its own model height. A nested
 * stack is deliberately shorter than its model: its parent's gap comes out of it, which is the
 * whole mechanism of vbox gap absorption.
 *
 * KNOWN LIMITATION: `insideStack` is derived from the immediate parent's own direction, not from
 * whether any ancestor is a vbox. So a vbox reached through an intervening hbox (H-under-V) is
 * walked with `insideStack === false` and gets collected here as "outermost", even when an
 * ancestor vbox's gap absorption shortens its true rendered height below the model height this
 * function reports. Every fixture exercised by this suite happens not to hit that shape (every
 * case green), so the bug is latent, not triggered — but if it ever is, the failure direction
 * is safe: the reported `renderedHeight` for a wrongly-classified column is the true, already-
 * absorbed height (measured from production item sizes), which falls short of the un-absorbed
 * `a·W + b` model height the assertion compares it against — measured one gap (12.8px) short on
 * the H-under-V probe shape — so the assertion can only fail too eagerly (false red). It can
 * never under-report and produce a false pass.
 */
function stackedColumns(
  row: { items: Array<{ width: number; height: number }>; boxTree?: BoxTree },
  gap: number
): Array<{ width: number; renderedHeight: number; tree: BoxTree }> {
  const columns: Array<{ width: number; renderedHeight: number; tree: BoxTree }> = [];
  if (!row.boxTree) return columns;

  let cursor = 0;
  const walk = (tree: BoxTree, insideStack: boolean): { w: number; h: number } => {
    if (tree.type === 'leaf') {
      const item = row.items[cursor++];
      return { w: item?.width ?? 0, h: item?.height ?? 0 };
    }
    const stacked = tree.direction === 'vertical';
    const first = walk(tree.children[0], stacked);
    const second = walk(tree.children[1], stacked);
    if (!stacked) return { w: first.w + gap + second.w, h: Math.max(first.h, second.h) };

    const node = { w: Math.max(first.w, second.w), h: first.h + gap + second.h };
    if (!insideStack) columns.push({ width: node.w, renderedHeight: node.h, tree });
    return node;
  };

  walk(row.boxTree, false);
  return columns;
}

const CASES: Array<[number, string, boolean]> = WIDTHS.flatMap(width =>
  STATES.map(([name, collapsed]): [number, string, boolean] => [width, name, collapsed])
);

describe.each(CASES)('admin hub at %spx, panel %s', (width, _name, collapsed) => {
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

  /**
   * The renderer and the composer must describe the same column. A stacked column's rendered
   * height is `a·W + b` — the model `computeHeightCoeffs` hands the packer, and the basis for
   * every fill and pocket rule it applies. A pixel of tolerance covers the model's own second-order
   * residual (< 0.2px here).
   */
  it('renders every stacked column at the height the model predicts', () => {
    for (const row of rows) {
      for (const column of stackedColumns(row, LAYOUT.gridGap)) {
        const { a, b } = computeHeightCoeffs(column.tree, LAYOUT.gridGap);
        expect(Math.abs(column.renderedHeight - (a * column.width + b))).toBeLessThan(1);
      }
    }
  });
});

describe('admin hub panel legibility', () => {
  /**
   * Wherever a tile column fits beside it, the open panel shares its row: a panel alone in a row
   * wide enough for company is a wide, mostly empty list.
   */
  it.each(WIDTHS.filter(w => w >= PANEL_BESIDE_TILE))(
    'shares its row with the tiles at %spx',
    width => {
      const row = rowsFor(false, width).find(r => r.items.some(i => isPanelContent(i.content)));
      expect(row?.items.length).toBeGreaterThan(1);
    }
  );

  it.each(WIDTHS)('keeps the open panel between its width bounds when it shares — %spx', width => {
    for (const row of rowsFor(false, width)) {
      const panel = row.items.find(i => isPanelContent(i.content));
      if (!panel || row.items.length === 1) continue;
      expect(panel.width).toBeGreaterThanOrEqual(PANEL_MIN_WIDTH - 1);
      expect(panel.width).toBeLessThanOrEqual(PANEL_MAX_WIDTH + 1);
    }
  });
});

const pageHeight = (collapsed: boolean, width: number) =>
  rowsFor(collapsed, width).reduce((sum, row) => sum + measureRow(row).heightPx, 0);

/**
 * Body widths at which collapsing the panel makes the page TALLER. Collapsing exists to reclaim
 * space, so this should be empty; it is not, because of how the packer composes the three tiles
 * once the panel is a short bar. At 742.4px the open panel and a stacked tile column share one
 * 963px row, while the collapsed bar takes a row of its own and each tile then takes one too
 * (a tile's 300px minimum rules out pairing two covers there), 2256px in all.
 *
 * Pinned exactly, in both directions, the same discipline the old four-panel suite used: a new
 * break fails this, and so does fixing this one. The list is meant to shrink to `[]`.
 */
const TALLER_WHEN_COLLAPSED_TODAY = [742.4];

describe('admin hub page height', () => {
  it('is no taller collapsed than open, outside the known break', () => {
    const taller = WIDTHS.filter(width => pageHeight(true, width) > pageHeight(false, width) + 1);
    expect(taller).toEqual(TALLER_WHEN_COLLAPSED_TODAY);
  });
});
