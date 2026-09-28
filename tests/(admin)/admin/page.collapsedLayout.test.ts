import {
  buildAdminHubContent,
  COLLAPSED_PANEL_SIZE,
  tabbedPanelHeight,
  withPanelFootprints,
} from '@/app/(admin)/admin/adminHubContent';
import { buildContentRows } from '@/app/components/Content/componentUtils';
import { LAYOUT } from '@/app/constants';
import { isPanelContent } from '@/app/utils/contentTypeGuards';
import { measureRow } from '@/app/utils/layoutDebug';

/**
 * Collapsing the hub's list panel has to move the LAYOUT, not just the panel's own rendering — and
 * it has to move it the way ANY block would. The collapsed footprint is an ordinary small pinned
 * block (Zac's 2026-08-10 review: a collapsed panel is "STILL a part of the atomic design as a
 * whole … think a '0-1 star horizontal'"): under the extremeness ramp, rated low, carrying the
 * same width floor as its expanded form. So it shares rows, stacks into columns, and renders
 * exactly `COLLAPSED_PANEL_HEIGHT` (102px, summed from the panel's own chrome tokens) tall at every
 * viewport.
 *
 * DESKTOP is the real max desktop content width (`getContentWidth()` = pageMaxWidth 1300 −
 * desktopPadding 25.6), not a round number. NARROW_DESKTOP is one step under it.
 */
const DESKTOP = { contentWidth: 1274.4, viewportHeight: 900, isMobile: false };
const NARROW_DESKTOP = { contentWidth: 1174.4, viewportHeight: 900, isMobile: false };
const MOBILE = { contentWidth: 390, viewportHeight: 844, isMobile: true };

/**
 * The live hub's row counts, so these rows are packed against heights the real page produces
 * rather than the zero-count floor.
 */
const COUNTS = { users: 12, messages: 2, roles: 6, collections: 8 };

const rowsFor = (collapsed: boolean, viewport = DESKTOP) =>
  buildContentRows(
    withPanelFootprints(buildAdminHubContent([], COUNTS, viewport.viewportHeight), collapsed),
    undefined,
    viewport,
    LAYOUT.defaultChunkSize,
    viewport.isMobile ? 1 : undefined
  ).rows;

const panelItem = (collapsed: boolean, viewport = DESKTOP) => {
  for (const row of rowsFor(collapsed, viewport)) {
    const item = row.items.find(i => isPanelContent(i.content));
    if (item) return { item, row };
  }
  throw new Error('no panel in the layout');
};

describe('admin hub collapsed layout', () => {
  it.each([
    ['desktop', DESKTOP],
    ['narrow desktop', NARROW_DESKTOP],
    ['phone', MOBILE],
  ])('pins the collapsed bar to its declared bar height — %s', (_label, viewport) => {
    expect(panelItem(true, viewport).item.height).toBeCloseTo(COLLAPSED_PANEL_SIZE.minHeight, 3);
  });

  it('keeps the collapsed bar full-width on a phone, where the row is narrower than the cap', () => {
    const { item } = panelItem(true, MOBILE);
    expect(Math.round(item.width)).toBe(MOBILE.contentWidth);
  });

  /**
   * A bar alone in a full-width row is ~874px of dead space beside it, the failure this footprint
   * exists to avoid. At desktop widths it composes into a row with the tiles.
   */
  it.each([
    ['desktop', DESKTOP],
    ['narrow desktop', NARROW_DESKTOP],
  ])('shares a row with the tiles once collapsed — %s', (_label, viewport) => {
    expect(panelItem(true, viewport).row.items.length).toBeGreaterThan(1);
  });

  it('leaves no vertical slack in the collapsed panel row', () => {
    const { row } = panelItem(true);
    const m = measureRow(row);
    expect(m.pocketPx2).toBeLessThanOrEqual(0.05 * m.spanPx * m.heightPx);
  });

  /**
   * Expanded, the panel reserves its TALLEST tab's height (here the twelve-user list, capped at 90%
   * of the viewport), so a tab switch has nothing to re-pack.
   */
  it('reserves the tallest tab, viewport-capped, when expanded', () => {
    const { item } = panelItem(false);
    expect(item.height).toBeCloseTo(tabbedPanelHeight(COUNTS, DESKTOP.viewportHeight), 3);
    expect(item.height).toBeLessThanOrEqual(DESKTOP.viewportHeight * 0.9);
  });

  it('renders the collapsed bar shorter than the expanded panel', () => {
    expect(panelItem(true).item.height).toBeLessThan(panelItem(false).item.height);
  });
});
