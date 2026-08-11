import { buildAdminHubContent, withPanelFootprints } from '@/app/(admin)/admin/adminHubContent';
import { ADMIN_TILES } from '@/app/(admin)/admin/adminTiles';
import { buildContentRows } from '@/app/components/Content/componentUtils';
import { LAYOUT } from '@/app/constants';
import type { AdminHomeTileApi } from '@/app/lib/api/adminHome';
import type { PanelType } from '@/app/types/Content';
import { isPanelContent } from '@/app/utils/contentTypeGuards';
import { measureRow } from '@/app/utils/layoutDebug';
import type { BoxTree } from '@/app/utils/rowCombination';
import { computeHeightCoeffs } from '@/app/utils/rowStructureAlgorithm';

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

/**
 * Every OUTERMOST stacked column in a row, as `{ width, renderedHeight, tree }` — the rendered
 * height being what CSS produces (child heights plus the gap between them), walked exactly as
 * {@link measureRow} walks it.
 *
 * Outermost only, because only an outermost column renders at its own model height. A nested
 * stack is deliberately shorter than its model: its parent's gap comes out of it, which is the
 * whole mechanism of vbox gap absorption.
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

/**
 * The renderer and the composer must describe the same column. A stacked column's rendered
 * height is `a·W + b` — the model `computeHeightCoeffs` hands the packer, and the basis for every
 * fill and pocket rule it applies. The sizer keeps that true by scaling the column's flexible
 * members down to swallow the CSS gap, and a pin is exempt from that scaling; when a pin sat two
 * levels down inside an otherwise-flexible stack the scale factor could not see it, so only part of
 * the gap was absorbed and the column rendered several px taller than the model it was chosen by
 * (~4-7px per nesting level, a multi-thousand px² pocket on the hub).
 *
 * A pixel of tolerance covers the model's own second-order residual — the gap a nested stack has
 * already absorbed is not available to absorb its parent's, worth `gap²/height` (< 0.8px here).
 */
describe('rendered columns agree with the height model', () => {
  it.each(STATES)('at width 900, collapse state: %s', (_name, collapsed) => {
    for (const row of rowsFor(collapsed, 900)) {
      for (const column of stackedColumns(row, LAYOUT.gridGap)) {
        const { a, b } = computeHeightCoeffs(column.tree, LAYOUT.gridGap);
        expect(Math.abs(column.renderedHeight - (a * column.width + b))).toBeLessThan(1);
      }
    }
  });
});

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
