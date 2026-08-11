import {
  buildAdminHubContent,
  COLLAPSED_PANEL_SIZE,
  PANEL_MAX_WIDTH,
  withPanelFootprints,
} from '@/app/(admin)/admin/adminHubContent';
import { buildContentRows } from '@/app/components/Content/componentUtils';
import { LAYOUT } from '@/app/constants';
import type { PanelType } from '@/app/types/Content';
import { isPanelContent } from '@/app/utils/contentTypeGuards';
import { measureRow } from '@/app/utils/layoutDebug';

/**
 * Collapsing a hub panel has to move the LAYOUT, not just the panel's own rendering — and it has
 * to move it the way ANY block would. Both halves were learned the hard way. The roles branch made
 * a collapsed panel's own box shrink (max-height + align-self) while its row stood as tall as its
 * tallest sibling. The first fix over-corrected: a 1200×56 footprint tripped `isSoloHero`, and
 * each bar took a full-width row rendered at a 400px cap — one bar, ~874px of dead space (Zac's
 * 2026-08-10 review: a collapsed panel is "STILL a part of the atomic design as a whole … think a
 * '0-1 star horizontal'"). These pin the settled model: the collapsed footprint is an ordinary
 * small pinned block — under the extremeness ramp, rated low, carrying the same width floor as its
 * expanded form — so it shares rows, stacks into columns, and renders exactly
 * `COLLAPSED_PANEL_HEIGHT` (102px, summed from the panel's own chrome tokens) tall at every
 * viewport — asserted below by 'pins every collapsed bar to its declared bar height'.
 *
 * DESKTOP is the real max desktop content width (`getContentWidth()` = pageMaxWidth 1300 −
 * desktopPadding 25.6), not a round number. NARROW_DESKTOP is one step under it, and the test
 * below asserts the packer keeps all three panels in one row THERE too — by stacking two of them
 * into a column rather than by squeezing three 400px columns side by side.
 *
 * An earlier revision of this header called 1232.0px the width above which three panels share a
 * row, which the very next test contradicts. There is no such threshold: swept in 0.1px steps
 * through `buildContentRows`, this file's fixture (default cover shapes, 12/2/6 rows) packs all
 * three into one row from 1134.72px up, and the zero-count fallback shares from 712.80px, splits
 * again from 1045.48px, and shares once more from 1232.00px. Membership is non-monotonic in width
 * because a stacked column is available and the pinned-row predicates can reject a wider
 * arrangement a narrower one satisfies; the header docblock of `adminHubContent.ts` carries the
 * measured picture on all three fixtures.
 */
const DESKTOP = { contentWidth: 1274.4, viewportHeight: 900, isMobile: false };
const NARROW_DESKTOP = { contentWidth: 1174.4, viewportHeight: 900, isMobile: false };
const MOBILE = { contentWidth: 390, viewportHeight: 844, isMobile: true };

const NONE: Record<PanelType, boolean> = { users: false, messages: false, roles: false };
const ALL: Record<PanelType, boolean> = { users: true, messages: true, roles: true };

/**
 * The live hub's row counts, so these rows are packed against heights the real page produces
 * rather than the zero-count floor. Twelve accounts, two messages and six roles is exactly the
 * data in Zac's 2026-08-10 screenshots, which is what makes the "different heights" assertion
 * below a check on the reported bug and not on an invented fixture.
 */
const COUNTS = { users: 12, messages: 2, roles: 6 };

const rowsFor = (
  collapsed: Record<PanelType, boolean>,
  viewport = DESKTOP,
  mobileChunkSize?: number
) =>
  buildContentRows(
    withPanelFootprints(buildAdminHubContent([], COUNTS), collapsed),
    undefined,
    viewport,
    LAYOUT.defaultChunkSize,
    mobileChunkSize
  ).rows;

const panelRows = (collapsed: Record<PanelType, boolean>, viewport = DESKTOP) =>
  rowsFor(collapsed, viewport).filter(row => row.items.some(item => isPanelContent(item.content)));

describe('admin hub collapsed layout', () => {
  it('packs all three expanded panels into a single shared row', () => {
    const rows = panelRows(NONE);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.items.filter(item => isPanelContent(item.content))).toHaveLength(3);
  });

  /**
   * A narrow desktop no longer splits the panels across rows, and that is the feature working
   * rather than a regression. Three panels only ever needed three side-by-side 400px columns
   * because the composer could not stack them; now `roles` sits UNDER `messages` in one shared
   * column, so the row needs two columns instead of three and 1174.4px is ample. What still has
   * to hold at every viewport is the minimum itself.
   */
  it('keeps three panels in one row at a narrow desktop by stacking, not by squeezing', () => {
    const rows = panelRows(NONE, NARROW_DESKTOP);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.items.filter(item => isPanelContent(item.content))).toHaveLength(3);
    for (const item of rows[0]!.items) {
      if (isPanelContent(item.content)) expect(item.width).toBeGreaterThanOrEqual(400);
    }
  });

  /**
   * Collapsing frees space; what the layout DOES with it is now the packer's call, and it no
   * longer means "the survivors get wider". With a stackable column available it more often
   * pulls extra items up into the row, which makes a standing panel NARROWER while making the
   * page shorter — the outcome that actually matters. So this pins the two invariants that
   * survive: no standing panel drops under its minimum, and none exceeds its maximum.
   */
  it('keeps every standing panel within its width bounds through a narrow-desktop collapse', () => {
    const states = [
      NONE,
      { ...NONE, users: true },
      { ...NONE, messages: true },
      { ...NONE, users: true, messages: true },
    ];

    for (const collapsed of states) {
      for (const row of panelRows(collapsed, NARROW_DESKTOP)) {
        for (const item of row.items) {
          if (!isPanelContent(item.content)) continue;
          expect(item.width).toBeGreaterThanOrEqual(400);
          expect(item.width).toBeLessThanOrEqual(PANEL_MAX_WIDTH);
        }
      }
    }
  });

  /**
   * `maxWidth` as a bound, at every collapse state. Whether the cap BINDS depends on the tile
   * covers (this file's fixture declares none, and its solve rests below the cap; the live-AR
   * fixture in `page.collapseStates.test.ts` is where the all-open row presses Users against
   * exactly 700) — what holds universally is that no expanded panel ever exceeds it.
   */
  it('keeps every standing panel at or under its maxWidth in every state', () => {
    const states = [NONE, { ...NONE, users: true }, { ...NONE, users: true, messages: true }, ALL];
    for (const collapsed of states) {
      for (const row of panelRows(collapsed)) {
        for (const item of row.items) {
          if (!isPanelContent(item.content)) continue;
          if (collapsed[item.content.panelType]) continue;
          expect(item.width).toBeLessThanOrEqual(PANEL_MAX_WIDTH);
        }
      }
    }
  });

  /**
   * The reversal of this feature's first design, which gave each collapsed bar its OWN full-width
   * row (1200×56 tripped `isSoloHero`) with the bar render-capped at 400px — dead space to its
   * right, one orphan row per bar. Ordinary blocks share rows: all three bars pack into one row,
   * each rendered inside the same width bounds its expanded form declares.
   */
  it('packs all three collapsed bars into one shared row, inside the panel width bounds', () => {
    const rows = panelRows(ALL);

    expect(rows).toHaveLength(1);
    const bars = rows[0]!.items.filter(item => isPanelContent(item.content));
    expect(bars).toHaveLength(3);
    for (const bar of bars) {
      expect(bar.width).toBeGreaterThanOrEqual(COLLAPSED_PANEL_SIZE.minWidth);
      expect(bar.width).toBeLessThan(DESKTOP.contentWidth);
    }
  });

  /**
   * The bug as Zac measured it: collapse Users and the bar took a 1274.4×56 row of its own —
   * 400px of bar, 874px of nothing — before the standing panels started a second row. A single
   * collapsed bar belongs in the standing panels' row (the composer stacks it atop one of them).
   */
  it('keeps a single collapsed bar in the standing panels row — no orphan row', () => {
    const rows = panelRows({ ...NONE, users: true });

    expect(rows).toHaveLength(1);
    expect(rows[0]!.items.filter(item => isPanelContent(item.content))).toHaveLength(3);
  });

  /**
   * Bars are ordinary blocks, so the tiles pack WITH them rather than being pushed into rows of
   * their own — an earlier revision asserted the opposite (a panel-free tile row), which was the
   * solo-hero layout's segregation surviving as a test.
   */
  it('packs tiles into shared rows with the bars once every panel collapses', () => {
    const rows = rowsFor(ALL);
    const tileCount = rows.flatMap(row => row.items).filter(item => !isPanelContent(item.content));

    expect(tileCount.length).toBeGreaterThan(0);
    expect(
      rows.some(
        row =>
          row.items.some(item => isPanelContent(item.content)) &&
          row.items.some(item => !isPanelContent(item.content))
      )
    ).toBe(true);
  });

  /**
   * Collapse reclaims space AGAINST THE BASELINE, not stepwise. Per-step monotonicity was
   * abandoned by design in Zac's 2026-08-10 review rounds: filling the body width, uniform
   * column widths, and panels grouped in one column all outrank a shorter page, and honouring
   * them can re-compose a step taller than its predecessor. What must stay true is the feature's
   * point — a page with panels collapsed never runs TALLER than the all-open page.
   *
   * All SEVEN collapse states, not the three that used to be listed here. The missing four were
   * not arbitrary: `messages`, `roles` and `messages+roles` are the states that collapse a SHORT
   * panel and leave the tall one standing, which is where the freed width goes to the nav tiles
   * instead of to a shorter page. `page.collapseStates.test.ts` runs the same invariant over the
   * live-cover fixture, where `messages+roles` breaks it.
   *
   * The metric is `measureRow`, the same ruler the collapse-state suite and the development console
   * use. It used to be a bespoke tree walk here, which is the same arithmetic — but two earlier
   * metrics in this spot each inverted an assertion (`max(item.height)` reports a stacked row far
   * shorter than it renders; grouping items by rounded width merges two same-width columns standing
   * side by side and overstates it), so having exactly one measured definition of row height,
   * itself under test, is the point.
   *
   * NOT MONOTONIC IN ROW COUNT EITHER, and deliberately so. Collapsing a panel can ADD rows to the
   * hub, and which panel you collapse decides the direction. Measured through `rowsFor` at widths
   * this suite does not otherwise assert at — this same fixture at a 812.8px body packs 2 rows with
   * everything open, 1 row with `users` collapsed, and 3 rows with `messages` collapsed (4 with
   * `users+messages`); the live-cover fixture of `page.collapseStates.test.ts` goes 1 row → 2 rows
   * at a 1000px body when `users` alone collapses.
   *
   * Accepted, not a defect in the collapse mechanism. Collapse only swaps one block's footprint;
   * everything after that is ordinary composition, and the freed width is handed to the nav TILES,
   * whose covers then re-compose — a portrait cover that lands alone claims a row of its own. The
   * candidate fixes (a tile maxHeight, excluding low-rated items from the row-AR pull, changing
   * tile shape semantics) are all new design decisions with baseline-regression risk across every
   * collection page, so the behaviour is documented rather than tuned away. The height half of the
   * same phenomenon is pinned at exact values in `page.collapseStates.test.ts`.
   */
  it('never renders a collapsed state taller than the all-open page', () => {
    const totalHeight = (collapsed: Record<PanelType, boolean>) =>
      rowsFor(collapsed).reduce((sum, row) => sum + measureRow(row).heightPx, 0);

    const expanded = totalHeight(NONE);

    for (const collapsed of [
      { ...NONE, users: true },
      { ...NONE, messages: true },
      { ...NONE, roles: true },
      { ...NONE, users: true, messages: true },
      { ...NONE, users: true, roles: true },
      { ...NONE, messages: true, roles: true },
      ALL,
    ]) {
      expect(totalHeight(collapsed)).toBeLessThan(expanded);
    }
  });

  /**
   * The blank well, pinned shut. Row 0 packs to its tallest member with nothing left over: the
   * Messages/Roles column plus the tile pulled up beside them fills Users' full height. Before
   * this, Messages rendered 251px into a 986px row and left 735px of nothing.
   */
  it('leaves no vertical slack in the panel row', () => {
    const row = panelRows(NONE)[0]!;
    const rowHeight = Math.max(...row.items.map(item => item.height));
    const columns = new Map<number, number>();

    for (const item of row.items) {
      const x = Math.round(item.width);
      columns.set(x, (columns.get(x) ?? 0) + item.height);
    }

    // Every column either is the tallest member or stacks to within a gap of it.
    for (const stacked of columns.values()) {
      expect(stacked).toBeGreaterThan(rowHeight - 3 * LAYOUT.gridGap);
    }
  });

  it('pins every collapsed bar to its declared bar height at every viewport', () => {
    expect(panelRows(ALL)[0]?.items[0]?.height).toBe(COLLAPSED_PANEL_SIZE.minHeight);
    for (const row of rowsFor(ALL, MOBILE, 1)) {
      if (row.items.some(item => isPanelContent(item.content))) {
        expect(row.items[0]!.height).toBe(COLLAPSED_PANEL_SIZE.minHeight);
      }
    }
    expect(panelRows(NONE)[0]?.items[0]?.height).toBeGreaterThan(400);
  });

  it('keeps every collapsed bar full-width on a phone, where the row is narrower than the cap', () => {
    for (const row of rowsFor(ALL, MOBILE, 1)) {
      expect(row.items).toHaveLength(1);
      if (row.items.some(item => isPanelContent(item.content))) {
        expect(Math.round(row.items[0]!.width)).toBe(MOBILE.contentWidth);
      }
    }
  });

  /**
   * The gap Zac's 2026-08-10 review was about, now closed and pinned from the other side.
   *
   * Before this, the three expanded panels reserved one shared row of EQUAL height — a two-message
   * Messages panel got the same ~763px well as a twelve-user Users panel, and the difference showed
   * up as blank space. Each panel now reserves `chrome + rowCount × rowHeight`, so with 12/2/6 rows
   * the three heights must differ and must order the same way the counts do.
   */
  it('reserves a different, content-derived height for each expanded panel', () => {
    const items = panelRows(NONE)[0]!.items;
    const heightOf = (panelType: PanelType) =>
      items.find(item => isPanelContent(item.content) && item.content.panelType === panelType)!
        .height;

    expect(new Set(items.map(item => Math.round(item.height))).size).toBeGreaterThan(1);
    expect(heightOf('users')).toBeGreaterThan(heightOf('roles'));
    expect(heightOf('roles')).toBeGreaterThan(heightOf('messages'));
  });

  /**
   * The reserved box has to be the box the panel actually needs — the reason the row can stop
   * padding it. 2 messages at 86px plus 79px of chrome is 251px; anything materially above that is
   * the blank well coming back.
   */
  it('reserves the true two-message box for Messages, not a column', () => {
    const messages = panelRows(NONE)[0]!.items.find(
      item => isPanelContent(item.content) && item.content.panelType === 'messages'
    )!;

    expect(messages.height).toBeCloseTo(79 + 2 * 86, 5);
  });
});
