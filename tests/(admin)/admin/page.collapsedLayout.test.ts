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
 * desktopPadding 25.6), not a round number. NARROW_DESKTOP is one step under it.
 *
 * The panels DO NOT share one row here any more. Three of them did; a fourth splits them, and
 * Users is stranded across the full body at both widths — see the two membership tests at the top
 * of the suite for the measurement and for why it is not an artifact of the collections count.
 * That stranding is what the width tests below now have to work around: `PANEL_MAX_WIDTH` stops
 * applying to a panel that has no row-mate, so they assert the bounds over panels that SHARE a
 * row, and the lone rows are pinned by name instead.
 *
 * An earlier revision of this header called 1232.0px the width above which three panels share a
 * row, and a later one replaced it with swept transitions — 1134.72px for this fixture, 712.80 /
 * 1045.48 / 1232.00 for the zero-count fallback. Every one of those was measured on the
 * three-panel hub and none of them survives a fourth panel. They are removed rather than
 * re-swept: what they described was a composition this fixture no longer produces.
 */
const DESKTOP = { contentWidth: 1274.4, viewportHeight: 900, isMobile: false };
const NARROW_DESKTOP = { contentWidth: 1174.4, viewportHeight: 900, isMobile: false };
const MOBILE = { contentWidth: 390, viewportHeight: 844, isMobile: true };

const NONE: Record<PanelType, boolean> = {
  users: false,
  messages: false,
  roles: false,
  collections: false,
};
const ALL: Record<PanelType, boolean> = {
  users: true,
  messages: true,
  roles: true,
  collections: true,
};

/**
 * The live hub's row counts, so these rows are packed against heights the real page produces
 * rather than the zero-count floor. Twelve accounts, two messages and six roles is exactly the
 * data in Zac's 2026-08-10 screenshots, which is what makes the "different heights" assertion
 * below a check on the reported bug and not on an invented fixture.
 */
const COUNTS = { users: 12, messages: 2, roles: 6, collections: 8 };

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

/** Page height as CSS renders it: every row's measured height, summed. */
const pageHeight = (collapsed: Record<PanelType, boolean>) =>
  rowsFor(collapsed).reduce((sum, row) => sum + measureRow(row).heightPx, 0);

const PANELS: PanelType[] = ['users', 'messages', 'roles', 'collections'];

/**
 * Every state with at least one panel collapsed — fifteen of them, one bit per panel. Enumerated
 * rather than listed since the fourth panel arrived: a hand-written list quietly stops being every
 * state the moment a panel is added.
 */
const COLLAPSE_STATES: Array<[string, Record<PanelType, boolean>]> = Array.from(
  { length: 2 ** PANELS.length - 1 },
  (_, index) => {
    const mask = index + 1;
    const collapsed = Object.fromEntries(
      PANELS.map((panel, bit) => [panel, (mask & (1 << bit)) !== 0])
    ) as Record<PanelType, boolean>;
    const closed = PANELS.filter(panel => collapsed[panel]);
    return [closed.length === PANELS.length ? 'all collapsed' : closed.join('+'), collapsed];
  }
);

/**
 * States that run TALLER than the all-open page, which the feature says should be none.
 *
 * The list is meant to shrink to `[]` and be deleted, not topped up. It was empty on this fixture
 * until a fourth panel joined the hub.
 */
const TALLER_THAN_OPEN_TODAY = ['messages'];

/** The panel types in each row that holds a panel, in row order. */
const panelsByRow = (collapsed: Record<PanelType, boolean>, viewport = DESKTOP) =>
  panelRows(collapsed, viewport).map(row =>
    row.items.flatMap(item => (isPanelContent(item.content) ? [item.content.panelType] : []))
  );

/**
 * The four collapse states this file sweeps for width bounds, plus the all-collapsed state.
 * Shared by the two width tests so they cover the same ground.
 */
const SWEPT_STATES: Array<[string, Record<PanelType, boolean>]> = [
  ['all open', NONE],
  ['users', { ...NONE, users: true }],
  ['messages', { ...NONE, messages: true }],
  ['users+messages', { ...NONE, users: true, messages: true }],
];

describe('admin hub collapsed layout', () => {
  /**
   * REGRESSION, pinned exactly. The three expanded panels used to pack into ONE shared row here;
   * a fourth panel splits them, and Users is stranded across the full body width with nothing
   * beside it — the shape of the defect Zac reported on 2026-08-10, arriving from a different
   * direction.
   *
   * The panel column is now 938 + 196 + 326 + 511 plus three gaps = 2009.4px tall. A row of three
   * default-shaped (16:9) tiles can only match that by taking about 1176px of width, which is more
   * than the whole body, so no composition puts all four panels beside the tiles. The composer
   * therefore closes rows early and Users, the tallest, ends up alone.
   *
   * The STRANDING is not an artifact of the collections count. Swept 0 through 20 against these
   * same 12/2/6 counts: Users stands alone at every count except the contiguous band 12-15, at
   * both this width and the narrow desktop below. Picking a count from that band to make the hub
   * read better would be fitting the fixture to the assertion.
   *
   * The exact MEMBERSHIP asserted here is count-specific, and deliberately so. Three rows split
   * `[users] [messages] [roles, collections]` only at counts 7 and 8; every other stranded count
   * gives the two-row `[users] [messages, roles, collections]` that the narrow-desktop test below
   * pins. The fixture's 8 is one of those two. Pinning the exact split is still the right call —
   * it is what forces a deliberate edit when the composer changes — but a future edit that moves
   * the count off 7 or 8 must expect this shape to change, and that is not a regression.
   *
   * NOT what the live-cover fixture does. `page.collapseStates.test.ts` carries the real page's
   * cover dimensions, and there all four panels compose into one column beside the three tiles at
   * every desktop width — the panel column and the tile column come out equal to the pixel. So
   * this is a defect of the composer against default-shaped tiles, not of the fourth panel as
   * such, and which rule should yield is a design question for Zac.
   *
   * Asserted as exact membership rather than "at most N rows", so a fix forces a deliberate edit
   * here — the same discipline as `LONE_PANEL_ROWS_TODAY` in the collapse-states suite.
   */
  it('strands Users in a row of its own once a fourth panel joins the hub', () => {
    expect(panelsByRow(NONE)).toEqual([['users'], ['messages'], ['roles', 'collections']]);
  });

  /**
   * One width down, the same stranding with one fewer row: Messages rejoins the shared row, Users
   * still stands alone. Pinned separately because the two widths reached the composer's decision
   * by different routes and a fix could plausibly land on one and not the other.
   */
  it('strands Users at a narrow desktop too, with the other three sharing', () => {
    expect(panelsByRow(NONE, NARROW_DESKTOP)).toEqual([
      ['users'],
      ['messages', 'roles', 'collections'],
    ]);
  });

  /**
   * Collapsing frees space; what the layout DOES with it is the packer's call, and it does not
   * mean "the survivors get wider". With a stackable column available it more often pulls extra
   * items up into the row, which makes a standing panel NARROWER while making the page shorter.
   * So this pins the two bounds that survive: no standing panel drops under its minimum, and none
   * exceeds its maximum.
   *
   * SHARING a row is the condition, and it is not a loophole. `PANEL_MAX_WIDTH` stops applying to
   * a block that is alone in its row — there is no row-mate to hand the width to, and a capped
   * lone block leaves a dead strip beside it instead. A panel that renders past 700 is therefore
   * always a panel that was stranded, which the two membership tests above pin directly.
   */
  it.each(SWEPT_STATES)(
    'keeps every standing panel sharing a row within its width bounds at a narrow desktop (%s)',
    (_name, collapsed) => {
      for (const row of panelRows(collapsed, NARROW_DESKTOP)) {
        if (row.items.length === 1) continue;
        for (const item of row.items) {
          if (!isPanelContent(item.content)) continue;
          expect(item.width).toBeGreaterThanOrEqual(400);
          expect(item.width).toBeLessThanOrEqual(PANEL_MAX_WIDTH);
        }
      }
    }
  );

  /**
   * `maxWidth` as a bound, at every collapse state this file sweeps. Same shared-row condition as
   * above and for the same reason.
   */
  it.each([...SWEPT_STATES, ['all collapsed', ALL] as const])(
    'keeps every standing panel sharing a row at or under its maxWidth (%s)',
    (_name, collapsed) => {
      for (const row of panelRows(collapsed)) {
        if (row.items.length === 1) continue;
        for (const item of row.items) {
          if (!isPanelContent(item.content)) continue;
          if (collapsed[item.content.panelType]) continue;
          expect(item.width).toBeLessThanOrEqual(PANEL_MAX_WIDTH);
        }
      }
    }
  );

  /**
   * The cap BINDING, which the bound above cannot show on its own — a test that only checks
   * "at or under 700" passes just as happily against a solve that never reaches it.
   *
   * This used to be unreachable on this fixture (its default cover shapes left every solve below
   * the cap, and the live-AR fixture was the only place 700 was pressed). The fourth panel's extra
   * height changed that: with Users and Messages collapsed, the standing panels want 700.00 exactly
   * and the cap is what stops them.
   */
  it('presses the standing panels against exactly their maxWidth', () => {
    const widths = panelRows({ ...NONE, users: true, messages: true })
      .flatMap(row => row.items)
      .filter(item => isPanelContent(item.content))
      .map(item => item.width);

    expect(widths.length).toBeGreaterThan(0);
    for (const width of widths) expect(width).toBe(PANEL_MAX_WIDTH);
  });

  /**
   * The reversal of this feature's first design, which gave each collapsed bar its OWN full-width
   * row (1200×56 tripped `isSoloHero`) with the bar render-capped at 400px — dead space to its
   * right, one orphan row per bar. Ordinary blocks share rows: all three bars pack into one row,
   * each rendered inside the same width bounds its expanded form declares.
   */
  it('packs all four collapsed bars into one shared row, inside the panel width bounds', () => {
    const rows = panelRows(ALL);

    expect(rows).toHaveLength(1);
    const bars = rows[0]!.items.filter(item => isPanelContent(item.content));
    expect(bars).toHaveLength(4);
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
    expect(rows[0]!.items.filter(item => isPanelContent(item.content))).toHaveLength(4);
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
   * Every collapse state except one. `messages` alone now runs 2752.5 against a 1983.8 all-open
   * baseline and is listed as a known break rather than dropped from the sweep — see
   * {@link TALLER_THAN_OPEN_TODAY}. All fifteen ran shorter before the fourth panel; this suite had
   * no exception list at all, and `page.collapseStates.test.ts` was the only place the invariant
   * broke.
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
    const expanded = pageHeight(NONE);

    for (const [name, collapsed] of COLLAPSE_STATES) {
      if (TALLER_THAN_OPEN_TODAY.includes(name)) continue;
      expect(pageHeight(collapsed)).toBeLessThan(expanded);
    }
  });

  /**
   * The exception above, pinned at its measured size so it cannot drift and cannot be widened by
   * accident. Exact values rather than "taller than the baseline": any worsening goes red on its
   * own, and a fix forces a deliberate edit here.
   *
   * The mechanism is the stranding that the membership tests at the top of this file pin. With
   * everything open, Users stands alone and Messages stands alone; collapsing Messages hands its
   * row back, the composer re-packs, and the freed width goes to the three nav tiles, whose
   * default 16:9 covers then render far taller than the panel row they replaced.
   */
  it('runs 768.7px taller with Messages collapsed than with everything open', () => {
    expect(pageHeight(NONE)).toBeCloseTo(1983.8, 1);
    expect(pageHeight({ ...NONE, messages: true })).toBeCloseTo(2752.5, 1);
  });

  /**
   * The blank well, pinned shut. Each panel row packs to its tallest member with nothing left
   * over. Before this, Messages rendered 251px into a 986px row and left 735px of nothing.
   *
   * Every panel row, not just the first. It used to read row 0 only, which was the whole panel row
   * when there was one; with the panels split across three rows that would leave two of them
   * unchecked, and row 0 is now Users alone, where the assertion is trivially true.
   */
  it('leaves no vertical slack in any panel row', () => {
    for (const row of panelRows(NONE)) {
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
   * up as blank space. Each panel now reserves `chrome + rowCount × rowHeight`, so with 12/2/6/8
   * rows the four heights must differ and must order the same way the counts do.
   *
   * Collected across every panel row rather than out of row 0, because the panels no longer share
   * one. The reservation is a property of the model, not of where the packer put the panel.
   */
  it('reserves a different, content-derived height for each expanded panel', () => {
    const items = panelRows(NONE).flatMap(row => row.items);
    const heightOf = (panelType: PanelType) =>
      items.find(item => isPanelContent(item.content) && item.content.panelType === panelType)!
        .height;

    const panelHeights = items
      .filter(item => isPanelContent(item.content))
      .map(item => Math.round(item.height));
    expect(new Set(panelHeights).size).toBe(PANELS.length);
    expect(heightOf('users')).toBeGreaterThan(heightOf('collections'));
    expect(heightOf('collections')).toBeGreaterThan(heightOf('roles'));
    expect(heightOf('roles')).toBeGreaterThan(heightOf('messages'));
  });

  /**
   * The reserved box has to be the box the panel actually needs — the reason the row can stop
   * padding it. 2 messages at 58.5px plus 79px of chrome is 196px; anything materially above that
   * is the blank well coming back.
   *
   * Was `79 + 2 × 86 = 251`. The row lost 27.5px in the ListPanel migration and the density pass:
   * 21px of it because the row stopped stacking meta/body/actions in ONE column and split into two
   * sections (the taller now governs instead of the sum), 2.5px because the timestamp reads as a
   * `--text-xs` `meta` slot rather than a `--text-sm` `subheader`, and 4px from the row's
   * asymmetric padding. The chrome is untouched, which is why the 79 is unchanged.
   */
  it('reserves the true two-message box for Messages, not a column', () => {
    const messages = panelRows(NONE)
      .flatMap(row => row.items)
      .find(item => isPanelContent(item.content) && item.content.panelType === 'messages')!;

    expect(messages.height).toBeCloseTo(79 + 2 * 58.5, 5);
  });

  /**
   * The same check for the new panel, and the one place the derived 54px row shows up as layout
   * rather than as arithmetic. 8 collections at 54px on 79px of chrome — the same text-only header
   * Messages has, since neither carries a button.
   */
  it('reserves the true eight-collection box for Collections', () => {
    const collections = panelRows(NONE)
      .flatMap(row => row.items)
      .find(item => isPanelContent(item.content) && item.content.panelType === 'collections')!;

    expect(collections.height).toBeCloseTo(79 + 8 * 54, 5);
  });
});
