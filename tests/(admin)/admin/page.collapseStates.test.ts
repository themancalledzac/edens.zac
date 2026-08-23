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
 * Width at which a second panel column becomes possible: `2 × PANEL_MIN_WIDTH + gridGap`. Above it
 * a panel sitting alone in a row is a layout choice rather than a necessity — see the lone-panel
 * guard below.
 */
const TWO_PANEL_COLUMNS = 2 * PANEL_MIN_WIDTH + LAYOUT.gridGap;

/** Right-edge tolerance: FILL_TOLERANCE_GAPS (2.5) × gridGap, the packer's own clean bar. */
const EDGE_TOLERANCE = 2.5 * LAYOUT.gridGap;

/** Pocket tolerance: POCKET_TOLERANCE (5%) of the row's bounding box, ditto. */
const POCKET_FRACTION = 0.05;

const PANELS: PanelType[] = ['users', 'messages', 'roles', 'collections'];

/**
 * Every combination of collapsed panels — 2^4 of them, one bit per panel.
 *
 * Enumerated rather than listed since the fourth panel arrived: a hand-written list quietly stops
 * being every state the moment a panel is added, and "every state" is what the invariants below
 * claim to hold across. Bit 0 is the first panel, so state 0 is all-open and the code below can
 * take `STATES[0]` as the baseline.
 */
const STATES: Array<[string, Record<PanelType, boolean>]> = Array.from(
  { length: 2 ** PANELS.length },
  (_, mask): [string, Record<PanelType, boolean>] => {
    const collapsed = Object.fromEntries(
      PANELS.map((panel, bit) => [panel, (mask & (1 << bit)) !== 0])
    ) as Record<PanelType, boolean>;
    const closed = PANELS.filter(panel => collapsed[panel]);
    const name =
      closed.length === 0
        ? 'all open'
        : closed.length === PANELS.length
          ? 'all collapsed'
          : closed.join('+');
    return [name, collapsed];
  }
);

const ALL_OPEN = STATES[0]![1];

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
 * function reports. Every fixture exercised by this suite happens not to hit that shape (all 160
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

describe('admin hub maxWidth binding', () => {
  /**
   * The cap binding, pinned where it visibly happens. A test that only checks "at or under 700"
   * passes just as happily against a solve that never reaches it, so somewhere has to press
   * against the cap for real.
   *
   * It is no longer the all-open state. Where the cap binds depends on how tall the panel column
   * is — the column's width is whatever is left after the tile column beside it takes the width
   * that makes the two columns the same height. A fourth panel makes that column taller in every
   * state where it stands, which narrows it and moves it off the cap: the all-open row at 1240px
   * used to press Users against exactly 700 and now solves at 534.8. Collapsing Collections takes
   * the fourth panel's height back out, and at the full desktop body the remaining three land on
   * the cap together.
   *
   * Swept across all ten widths and all sixteen states, the cap binds in exactly six places:
   * `1100px users+messages` (roles, collections), `1174.4px messages+roles+collections` (users),
   * and this one, `1274.4px collections` (users, messages, roles). This asserts the last because
   * it is at the real max desktop body and it presses three panels at once.
   */
  it('presses the standing panels against exactly their maxWidth', () => {
    const rows = rowsFor({ ...ALL_OPEN, collections: true });
    const standing = rows
      .flatMap(row => row.items)
      .filter(item => isPanelContent(item.content) && item.content.panelType !== 'collections');

    expect(standing).toHaveLength(3);
    for (const panel of standing) expect(panel.width).toBe(700);
  });
});

const CASES: Array<[number, string, Record<PanelType, boolean>]> = WIDTHS.flatMap(width =>
  STATES.map(([name, collapsed]): [number, string, Record<PanelType, boolean>] => [
    width,
    name,
    collapsed,
  ])
);

describe.each(CASES)('admin hub at %spx, collapse state: %s', (width, name, collapsed) => {
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
});

/**
 * The width × state combinations where panels sharing a row render at DIFFERENT widths.
 *
 * The single entry is a collapsed BAR beside two standing panels: at a 900px body with Collections
 * closed, Messages and Roles land at 447.8 and the bar at 439.4 — 8.4px narrower. A bar declares no
 * `maxWidth` (see `COLLAPSED_PANEL_SIZE`) while a standing panel caps at 700, so the two are not
 * solved against the same bound and the sizer has no reason to bring them level.
 *
 * Pinned exactly, in both directions: a new break fails this, and so does fixing this one. That
 * holds because the sweep below collects every break into one list and compares it whole — the
 * same discipline {@link LONE_PANEL_ROWS_TODAY} uses. An earlier form skipped the listed
 * combination from inside the parameterized `it`, which enforced the rule one way only: a new
 * break failed, but fixing the listed one left the test green and the entry sitting here forever.
 * The list is meant to shrink to `[]` and be deleted, not topped up.
 */
const WIDTH_SPREAD_BREAKS_TODAY = ['900px collections'];

describe('admin hub panel width spread', () => {
  it('renders every panel in a row at one shared width, outside the known break', () => {
    const spreads: string[] = [];

    for (const width of WIDTHS) {
      for (const [name, collapsed] of STATES) {
        for (const row of rowsFor(collapsed, width)) {
          const panelWidths = new Set(
            row.items
              .filter(item => isPanelContent(item.content))
              .map(item => Math.round(item.width))
          );
          if (panelWidths.size > 1) spreads.push(`${width}px ${name}`);
        }
      }
    }

    expect(spreads).toEqual(WIDTH_SPREAD_BREAKS_TODAY);
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
 * It does not hold today, in sixteen of the 160 width × state combinations swept, and this pins
 * exactly which. The check is exact in both directions on purpose: a new lone-panel row fails it,
 * and so does fixing one — the list is meant to shrink to `[]` and be deleted, not topped up.
 *
 * UP FROM ONE, which is the wrong direction and is the fourth panel's doing. Two separate causes,
 * and they are worth keeping apart:
 *
 * - TWELVE entries are in states that existed before, so they are the fourth panel repacking the
 *   hub: the 850, 900 and 1000px bodies now strand Users in every state where it stands, and at
 *   1274.4 collapsing Users alone strands Messages. A fourth tall panel makes the panel column
 *   taller than any composition of three nav tiles can match at those widths, so the composer
 *   closes the row early and the tallest standing panel is what gets left out.
 * - FOUR are in states only reachable now that Collections can be collapsed ('850px collections',
 *   '850px messages+collections', '900px collections', '1274.4px roles+collections'). The state
 *   sweep went from 8 combinations to 16 with the fourth panel; these are newly covered ground
 *   rather than newly broken behaviour.
 *
 * Whether four tall panels belong on one hub at these widths is a design question for Zac, not
 * something to settle by loosening this list. It is recorded rather than tuned away, on the same
 * terms as the stranded-cover block at the bottom of this file.
 */
const LONE_PANEL_ROWS_TODAY = [
  '850px all open: users renders 850.0px wide, alone',
  '850px messages: users renders 850.0px wide, alone',
  '850px roles: users renders 850.0px wide, alone',
  '850px messages+roles: users renders 850.0px wide, alone',
  '850px collections: users renders 850.0px wide, alone',
  '850px messages+collections: users renders 850.0px wide, alone',
  '900px all open: users renders 900.0px wide, alone',
  '900px messages: users renders 900.0px wide, alone',
  '900px roles: users renders 900.0px wide, alone',
  '900px messages+roles: users renders 900.0px wide, alone',
  '900px collections: users renders 900.0px wide, alone',
  '1000px all open: users renders 1000.0px wide, alone',
  '1000px messages: users renders 1000.0px wide, alone',
  '1274.4px users: users renders 1274.4px wide, alone',
  '1274.4px users: messages renders 1274.4px wide, alone',
  '1274.4px roles+collections: users renders 1274.4px wide, alone',
];

describe('admin hub panel legibility', () => {
  it('leaves a panel alone in a row wide enough for two only in the known cases', () => {
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

/**
 * The states where collapsing makes the page LONGER than leaving everything open, at the max
 * desktop body. All three collapse Messages or Roles while Collections is also closed.
 *
 * The list is meant to shrink to `[]` and be deleted, not topped up. It held at one entry
 * (`messages+roles`) before the ListPanel density pass, at zero after it, and at three now.
 */
const TALLER_THAN_OPEN_TODAY = [
  'messages+collections',
  'roles+collections',
  'messages+roles+collections',
];

/**
 * Collapsing panels must not make the page LONGER — the one height property that survived the
 * 2026-08-10 review rounds, since filling the body width, uniform column widths and grouping the
 * panels into one column all outrank a shorter page and can re-compose any single step taller than
 * its predecessor.
 *
 * `page.collapsedLayout.test.ts` asserts the same thing on the default-dims fixture, where it now
 * has one exception of its own. This is the live-cover fixture — All Collections 2079×2048, Client
 * Galleries portrait 1728×2500 — and the portrait cover is what breaks it, exactly as it has broken
 * every other hub invariant first.
 */
describe('admin hub page height against the all-open baseline', () => {
  const openHeight = pageHeight(ALL_OPEN);

  /**
   * Filtered again, by {@link TALLER_THAN_OPEN_TODAY}. It was unfiltered before the fourth panel,
   * but only because the ALL-OPEN baseline had itself regressed to 3078.6 — a state cannot fail to
   * run shorter than a baseline that is already stranding a cover. The baseline recovered to
   * 2009.5 with the fourth panel, and three states now stand above it for real.
   *
   * Read this with the block below, not on its own: an `it.each` comparing states to a baseline
   * cannot see a baseline that moved, which is why the baseline is pinned to the pixel there.
   */
  it.each(STATES.slice(1))(
    'runs shorter than the all-open page in the %s state',
    (name, collapsed) => {
      if (TALLER_THAN_OPEN_TODAY.includes(name)) return;
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
   * WHICH STATE strands the cover is not stable, and each pass has moved it. The composer's choice
   * turns on whether a tile column can be made the same height as the panel column at a width that
   * leaves the panels inside `PANEL_MAX_WIDTH`, so anything that changes the panel column's height
   * relocates the pathology.
   *
   * The fourth panel relocated it again, and at 1274.4px it took it OFF the all-open state. Four
   * panels stack to 938 + 196 + 326 + 511 plus three gaps = 2009.4px, and the three live covers
   * happen to match that at 692.4px wide with the panels at 569.2 — inside the cap. So the
   * three-tile row is accepted, the cover is not stranded, and all-open falls 3078.6 → 2009.5. It
   * now lands in the states that close Collections AND one of the short panels, which shortens the
   * panel column back into the range where no tile width matches it: `messages+collections` 3099.4
   * and `messages+roles+collections` 2875.4, plus `roles+collections` at 2023.1, barely over.
   *
   * Those three are exactly {@link TALLER_THAN_OPEN_TODAY}. `messages+roles`, which used to be the
   * one exception, now runs 1691.5 and is comfortably under.
   *
   * That the OLD numbers held was a coincidence of these row counts, not a property worth
   * preserving, and the same is true of the new ones. Chasing a figure by re-tuning the collections
   * count would be fitting the fixture to the assertion, and the next content change would undo it.
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
  it('strands the cover in the collections-closed states at the max desktop body', () => {
    expect(openHeight).toBeCloseTo(2009.5, 1);
    expect(pageHeight({ ...ALL_OPEN, messages: true, collections: true })).toBeCloseTo(3099.4, 1);
    expect(pageHeight({ ...ALL_OPEN, roles: true, collections: true })).toBeCloseTo(2023.1, 1);
    expect(pageHeight({ ...ALL_OPEN, messages: true, roles: true, collections: true })).toBeCloseTo(
      2875.4,
      1
    );
  });

  /**
   * One width down from the max desktop body, where the pathology sits in a DIFFERENT state again —
   * so the two tests together pin it wherever it reaches, and neither can move without a deliberate
   * edit here.
   *
   * At 1174.4 the all-open page composes the same clean four-panel column as at 1274.4 and measures
   * the same 2009.5. It is collapsing USERS alone that strands the cover here: taking 938px out of
   * the panel column leaves nothing a three-tile row can match, Client Galleries lands alone, and a
   * 1728×2500 cover alone in a 1174.4px row renders about 1468px tall. That is the whole difference.
   *
   * `messages+roles`, which carried the pathology at this width before the fourth panel (2635.6),
   * now runs 1691.5.
   */
  it('strands the cover in the users state at 1174.4px', () => {
    expect(pageHeight(ALL_OPEN, 1174.4)).toBeCloseTo(2009.5, 1);
    expect(pageHeight({ ...ALL_OPEN, users: true }, 1174.4)).toBeCloseTo(2641.4, 1);
    expect(pageHeight({ ...ALL_OPEN, messages: true, roles: true }, 1174.4)).toBeCloseTo(1691.5, 1);
  });
});
