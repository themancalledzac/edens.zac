import {
  buildAdminHubContent,
  PANEL_MIN_WIDTH,
  withPanelFootprints,
} from '@/app/(admin)/admin/adminHubContent';
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
 * Width at which a second panel column becomes possible: `2 × PANEL_MIN_WIDTH + gridGap`. Above it
 * a panel sitting alone in a row is a layout choice rather than a necessity — see the lone-panel
 * guard below.
 */
const TWO_PANEL_COLUMNS = 2 * PANEL_MIN_WIDTH + LAYOUT.gridGap;

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

  /**
   * The renderer and the composer must describe the same column. A stacked column's rendered
   * height is `a·W + b` — the model `computeHeightCoeffs` hands the packer, and the basis for
   * every fill and pocket rule it applies. The sizer keeps that true by scaling the column's
   * flexible members down to swallow the CSS gap, and a pin is exempt from that scaling; when a
   * pin sat two levels down inside an otherwise-flexible stack the scale factor could not see it,
   * so only part of the gap was absorbed and the column rendered several px taller than the model
   * it had been chosen by — 4-7px per nesting level, worst 20.6px, and a multi-thousand px²
   * pocket in a row the composer had scored as pocket-free.
   *
   * Swept across every width, not one: the defect was worst at 1274.4 and absent at some widths
   * entirely, since which state nests a pin under a flexible stack is a function of the width.
   *
   * A pixel of tolerance covers the model's own second-order residual — the gap a nested stack has
   * already absorbed is not available to absorb its parent's, worth `gap²/height` (< 0.2px here).
   */
  it('renders every stacked column at the height the model predicts', () => {
    for (const row of rows) {
      for (const column of stackedColumns(row, LAYOUT.gridGap)) {
        const { a, b } = computeHeightCoeffs(column.tree, LAYOUT.gridGap);
        expect(Math.abs(column.renderedHeight - (a * column.width + b))).toBeLessThan(1);
      }
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

/**
 * The legibility bound `PANEL_MAX_WIDTH` used to guarantee, restated as a property of the LAYOUT
 * rather than of the renderer.
 *
 * A 700px cap existed because a user list past roughly that width reads as a stretched table — the
 * identity and its two buttons separated by a field of nothing. The cap now degrades for a block
 * that is alone in its row, which is correct as far as it goes (a lone capped block otherwise
 * leaves a dead strip beside it, and there is no row-mate to hand the width to). But it means the
 * cap protects nothing on its own: the only thing left between the engine and a full-bleed user
 * table is the packer's choice to give a panel a row-mate. So assert THAT instead — above
 * `2 × PANEL_MIN_WIDTH + gridGap` a second panel column fits, and a panel alone in a row that wide
 * is a decision the packer made, not a width it was forced into.
 *
 * It does not hold today, in three of the eighty width × state combinations swept, and this pins
 * exactly which. The check is exact in both directions on purpose: a new lone-panel row fails it,
 * and so does fixing one — the list is meant to shrink to `[]` and be deleted, not topped up.
 */
const LONE_PANEL_ROWS_TODAY = [
  '850px all open: users renders 850.0px wide, alone',
  '850px messages: users renders 850.0px wide, alone',
  '900px all open: users renders 900.0px wide, alone',
];

describe('admin hub panel legibility', () => {
  it('leaves a panel alone in a row wide enough for two only in the three known cases', () => {
    const loneRows: string[] = [];

    for (const width of WIDTHS) {
      for (const [name, collapsed] of STATES) {
        for (const row of rowsFor(collapsed, width)) {
          const [only] = row.items;
          if (row.items.length !== 1 || !only || !isPanelContent(only.content)) continue;
          if (measureRow(row).spanPx <= TWO_PANEL_COLUMNS) continue;
          loneRows.push(
            `${width}px ${name}: ${only.content.panelType} renders ${only.width.toFixed(1)}px wide, alone`
          );
        }
      }
    }

    expect(loneRows).toEqual(LONE_PANEL_ROWS_TODAY);
  });
});

/** Page height as CSS renders it: every row's measured height, summed. */
const pageHeight = (collapsed: Record<PanelType, boolean>, width = DESKTOP.contentWidth) =>
  rowsFor(collapsed, width).reduce((sum, row) => sum + measureRow(row).heightPx, 0);

/** The one state where collapsing makes the page longer. See the regression block below. */
const MESSAGES_ROLES: Record<PanelType, boolean> = { users: false, messages: true, roles: true };

/**
 * Collapsing panels must not make the page LONGER — the one height property that survived the
 * 2026-08-10 review rounds, since filling the body width, uniform column widths and grouping the
 * panels into one column all outrank a shorter page and can re-compose any single step taller than
 * its predecessor.
 *
 * `page.collapsedLayout.test.ts` asserts the same thing on the default-dims fixture, where it holds
 * in all seven states. This is the live-cover fixture — All Collections 2079×2048, Client Galleries
 * portrait 1728×2500 — and the portrait cover is what breaks it, exactly as it has broken every
 * other hub invariant first.
 */
describe('admin hub page height against the all-open baseline', () => {
  const openHeight = pageHeight(STATES[0]![1]);

  it.each(STATES.slice(1).filter(([name]) => name !== 'messages+roles'))(
    'runs shorter than the all-open page in the %s state',
    (_name, collapsed) => {
      expect(pageHeight(collapsed)).toBeLessThan(openHeight);
    }
  );

  /**
   * REGRESSION, pinned at its measured size. Introduced by `e2328f6` — not a pre-existing property
   * of the composer, which is what a bisect of the branch establishes: the pre-Task-1 engine
   * (`6c001f2`) packed this exact case at 1174.4px into `H(users, V(V(messages, roles),
   * AllCollections))` + `H(AllImages, ClientGalleries)` for a total of **1491.2px**. The six
   * commits after `e2328f6` change nothing here.
   *
   * The cause is `e2328f6`'s `pinnedWidthSpread` membership predicate, added to fix a real defect
   * in this same state — a row spanning the body and pocketing nothing while putting one panel at
   * its 400px floor beside two collapsed bars at 762px, which is Zac's third fill rule ("the width
   * should be the SAME for all of them") broken outright. The predicate rejects the old
   * composition, and the re-pack strands Client Galleries alone in a row where the portrait cover
   * renders 1174×1468.
   *
   * The trade looks intrinsic rather than fixable by tuning: in that composition equal panel
   * columns force unequal column heights, unequal heights are a pocket, so shared-width and
   * no-pocket cannot both hold there. Membership rejection was the only lever available, and the
   * page height is what it costs. Which of the two rules should yield is a design question for
   * Zac, not something to settle by loosening a tolerance here.
   *
   * Reproducible in one edit, which is the cheapest way to see the trade whole: set
   * `PINNED_WIDTH_SPREAD_GAPS` in `rowCombination.ts` from 1 to a large number (turning the
   * predicate off) and re-run this file. The 1174.4px case below drops to **1491.17px** — the
   * pre-`e2328f6` figure, recovered — and 'renders every panel in a row at one shared width' fails
   * in the same run with two distinct panel widths. The short page and the shared width are
   * available one at a time.
   *
   * The values below are asserted EXACTLY, not as "taller than the baseline", so that any
   * worsening goes red on its own and any improvement forces a deliberate edit to this block —
   * the same discipline as {@link LONE_PANEL_ROWS_TODAY}.
   *
   * Not confined to these two widths. Collapsing a short panel while a tall one stands runs the
   * page longer across the whole narrow-desktop band, on both fixtures — default dims @742.4
   * messages +314.4 / roles +490.9, @900 messages +419.5, @1000 messages +148.5; live dims @742.4
   * messages +333.3 / roles +292.1, @1000 users +365.9. Recorded here because the sweep above
   * asserts fill, not height, and this is the only place the evidence lives in the repo.
   */
  it('runs 39.3px TALLER than the all-open page in the messages+roles state', () => {
    expect(openHeight).toBeCloseTo(1567.7, 1);
    expect(pageHeight(MESSAGES_ROLES)).toBeCloseTo(1607.0, 1);
  });

  /**
   * The worst case, one width down from the max desktop body. Here the rejected composition does
   * not merely re-balance the row — it pushes Client Galleries out of it entirely, and a
   * 1728×2500 cover alone in a 1174.4px row renders 1468px tall. 1567.7 → 2683.6px, a 71% longer
   * page than leaving the panels open and 80% longer than the same collapse produced before
   * `e2328f6`.
   */
  it('runs 1115.9px taller in the messages+roles state at 1174.4px, stranding the cover', () => {
    expect(pageHeight(STATES[0]![1], 1174.4)).toBeCloseTo(1567.7, 1);
    expect(pageHeight(MESSAGES_ROLES, 1174.4)).toBeCloseTo(2683.6, 1);
  });
});
