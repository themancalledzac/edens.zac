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
 *
 * KNOWN LIMITATION: `insideStack` is derived from the immediate parent's own direction, not from
 * whether any ancestor is a vbox. So a vbox reached through an intervening hbox (H-under-V) is
 * walked with `insideStack === false` and gets collected here as "outermost", even when an
 * ancestor vbox's gap absorption shortens its true rendered height below the model height this
 * function reports. Every fixture exercised by this suite happens not to hit that shape (all 80
 * combos green), so the bug is latent, not triggered — but if it ever is, the failure direction
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

describe('admin hub all-open baseline', () => {
  /**
   * The cap binding, pinned where it visibly happens: the live covers press Users against exactly
   * `PANEL_MAX_WIDTH` in the all-open layout. The default-dims fixture in
   * `page.collapsedLayout.test.ts` never reaches the cap, so this is the only place that proves
   * 700 is what stops the column.
   *
   * Asserted at 1240px rather than at `DESKTOP.contentWidth`, and the move is the point rather
   * than a convenience. The cap binds over a BAND of widths — the panel column's width is whatever
   * is left after the tile column beside it takes the width that makes the two columns the same
   * height, so where 700 binds depends on how tall the panel column is. The density pass took
   * 82px off that column (1567.6 → 1485.6 for 12/2/6 rows), which slid the band from
   * 1244.6-1274.4+ down to **1224.8-1256.6**, swept here in 0.2px steps. 1240 sits in the middle
   * of it. At 1274.4 the cap no longer binds at all: see the height block at the bottom of this
   * file for what the packer does there instead, which is the more interesting half of the story.
   */
  it('presses Users against exactly its maxWidth', () => {
    const rows = rowsFor({ users: false, messages: false, roles: false }, 1240);
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
 * It does not hold today, in one of the eighty width × state combinations swept, and this pins
 * exactly which. The check is exact in both directions on purpose: a new lone-panel row fails it,
 * and so does fixing one — the list is meant to shrink to `[]` and be deleted, not topped up.
 *
 * Down from three. The density pass shortened the panel column, and two of the three cases were
 * rows where a panel stood alone because nothing could be fitted beside it at that height:
 * '850px messages' and '900px all open' both now compose the panels WITH a tile column instead of
 * stranding Users across the full body. This list shrinking is the direction the block asks for.
 */
const LONE_PANEL_ROWS_TODAY = ['850px all open: users renders 850.0px wide, alone'];

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

  /**
   * Now unfiltered — every collapse state runs shorter than all-open at the max desktop body,
   * `messages+roles` included, where it used to be the one exception.
   *
   * Read that with the block below, not on its own. It holds partly because `messages+roles`
   * improved and partly because the ALL-OPEN baseline got worse at this particular width: the
   * stranded-cover composition moved from one state to the other. An `it.each` comparing states
   * to a baseline cannot see a baseline that regressed, which is exactly why the baseline is
   * pinned to the pixel below rather than left implicit here.
   */
  it.each(STATES.slice(1))(
    'runs shorter than the all-open page in the %s state',
    (_name, collapsed) => {
      expect(pageHeight(collapsed)).toBeLessThan(openHeight);
    }
  );

  /**
   * REGRESSION, pinned at its measured size — and note WHICH STATE it now lands in.
   *
   * The failure mode is stable and long-standing: `e2328f6`'s `pinnedWidthSpread` membership
   * predicate rejects a composition where panels would render at unequal widths, and when the
   * rejected composition was the one holding all three nav tiles, the re-pack strands Client
   * Galleries alone in a row where its 1728×2500 portrait cover renders full-bleed and enormous.
   * The predicate was added to fix a real defect (one panel at its 400px floor beside two collapsed
   * bars at 762px — Zac's third fill rule broken outright), and the trade looks intrinsic rather
   * than tunable: in that composition equal panel columns force unequal column heights, unequal
   * heights are a pocket, so shared-width and no-pocket cannot both hold. Which rule should yield
   * is a design question for Zac, not something to settle by loosening a tolerance here.
   *
   * What the ListPanel density pass changed is not WHETHER this happens but WHERE. It took 82px
   * off the panel column (12/2/6 rows: 1567.6 → 1485.6), and the composer's choice turns on
   * whether a tile column can be made the same height as the panel column at a width that leaves
   * the panels inside `PANEL_MAX_WIDTH`. At 1274.4px it now cannot — matching a 1485.6px panel
   * column needs the tiles at ~512px, which would leave the panels at 749.7px, past the 700 cap —
   * so the three-tile row is rejected and the cover is stranded. The state carrying the pathology
   * at this width therefore moved from `messages+roles` (1607.0, +39.3 over a 1567.7 baseline) to
   * `all open` (3078.6), while `messages+roles` fell to 1575.3.
   *
   * That the OLD numbers held was itself a coincidence of these row counts, not a property worth
   * preserving. Swept at 1274.4 all-open over users 8-20 × messages 1-4: 18 of 32 count
   * combinations strand the cover BEFORE this branch and 18 of 32 after — identical fragility,
   * different cells. The fixture's 12/2/6 sat on a good cell and now sits on a bad one. Chasing
   * the old figure by re-tuning `ROW_PADDING_Y` would be fitting the row padding to one row count
   * of one fixture, and the next content change would undo it.
   *
   * Away from this knife-edge the pass is an improvement, which is the other half of the honest
   * picture: all-open runs shorter at nine of the ten swept widths, including 900px, where it goes
   * 2680 → 1486 by composing into one row instead of three.
   *
   * Reproducible in one edit, the cheapest way to see the trade whole: set
   * `PINNED_WIDTH_SPREAD_GAPS` in `rowCombination.ts` from 1 to a large number (turning the
   * predicate off) and re-run this file — the stranding disappears and 'renders every panel in a
   * row at one shared width' fails in the same run. The short page and the shared width are
   * available one at a time.
   *
   * The values below are asserted EXACTLY, not as "taller than the baseline", so that any
   * worsening goes red on its own and any improvement forces a deliberate edit to this block —
   * the same discipline as {@link LONE_PANEL_ROWS_TODAY}.
   */
  it('strands the cover in the ALL-OPEN state at the max desktop body', () => {
    expect(openHeight).toBeCloseTo(3078.6, 1);
    expect(pageHeight(MESSAGES_ROLES)).toBeCloseTo(1575.3, 1);
  });

  /**
   * One width down from the max desktop body, where `messages+roles` is still the state that
   * strands the cover — so the two tests together pin the pathology in both of the states it
   * reaches, and neither can move without a deliberate edit here.
   *
   * Here the all-open row composes cleanly (1567.7 → 1485.7, the density pass's 82px arriving
   * intact), while collapsing messages and roles still pushes Client Galleries out of the row
   * entirely: 2683.6 → 2635.6, improved by the shorter panel column but nowhere near recovered.
   * A 1728×2500 cover alone in a 1174.4px row renders about 1468px tall, which is the whole
   * difference.
   */
  it('runs 1149.9px taller in the messages+roles state at 1174.4px, stranding the cover', () => {
    expect(pageHeight(STATES[0]![1], 1174.4)).toBeCloseTo(1485.7, 1);
    expect(pageHeight(MESSAGES_ROLES, 1174.4)).toBeCloseTo(2635.6, 1);
  });
});
