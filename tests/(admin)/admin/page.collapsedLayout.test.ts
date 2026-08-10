import { buildAdminHubContent, withCollapsedPanels } from '@/app/(admin)/admin/adminHubContent';
import { buildContentRows } from '@/app/components/Content/componentUtils';
import { LAYOUT } from '@/app/constants';
import type { PanelType } from '@/app/types/Content';
import { isPanelContent } from '@/app/utils/contentTypeGuards';

/**
 * Collapsing a hub panel has to move the LAYOUT, not just the panel's own rendering. The roles
 * branch made a collapsed panel's own box shrink (max-height + align-self), but its row still
 * stood as tall as its tallest sibling and every other item kept its packer-assigned width. These
 * pin the part that closes that gap: the packer sees the collapsed footprint, gives the bar its own
 * full-width row, and re-solves widths for everything left.
 *
 * DESKTOP is the real max desktop content width (`getContentWidth()` = pageMaxWidth 1300 −
 * desktopPadding 25.6), not a round number. It has to be: each panel declares a 400px
 * {@link Content.minWidth}, and three of them share a row only at or above a measured 1232.0px of
 * content width. (Not 3×400 + 2×gap = 1225.6 — that is where the RENDERED width reaches 400, while
 * membership is decided from the packer's stricter share estimate; see the header docblock of
 * `adminHubContent.ts`.) NARROW_DESKTOP below sits deliberately under that threshold and pins what
 * the packer does there, so the difference between "the feature moved" and "the viewport is too
 * narrow for three panels" can never be confused again.
 */
const DESKTOP = { contentWidth: 1274.4, viewportHeight: 900, isMobile: false };
const NARROW_DESKTOP = { contentWidth: 1174.4, viewportHeight: 900, isMobile: false };
const MOBILE = { contentWidth: 390, viewportHeight: 844, isMobile: true };

const NONE: Record<PanelType, boolean> = { users: false, messages: false, roles: false };
const ALL: Record<PanelType, boolean> = { users: true, messages: true, roles: true };

const rowsFor = (
  collapsed: Record<PanelType, boolean>,
  viewport = DESKTOP,
  mobileChunkSize?: number
) =>
  buildContentRows(
    withCollapsedPanels(buildAdminHubContent([]), collapsed),
    undefined,
    viewport,
    LAYOUT.defaultChunkSize,
    mobileChunkSize
  ).rows;

const panelRows = (collapsed: Record<PanelType, boolean>, viewport = DESKTOP) =>
  rowsFor(collapsed, viewport).filter(row => row.items.some(item => isPanelContent(item.content)));

const widthOf = (
  collapsed: Record<PanelType, boolean>,
  panelType: PanelType,
  viewport = DESKTOP
) => {
  for (const row of rowsFor(collapsed, viewport)) {
    for (const item of row.items) {
      if (isPanelContent(item.content) && item.content.panelType === panelType) return item.width;
    }
  }
  throw new Error(`no ${panelType} panel in the layout`);
};

describe('admin hub collapsed layout', () => {
  it('packs all three expanded panels into a single shared row', () => {
    const rows = panelRows(NONE);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.items.filter(item => isPanelContent(item.content))).toHaveLength(3);
  });

  it('drops the third panel to its own row once the viewport cannot fit three minimums', () => {
    const rows = panelRows(NONE, NARROW_DESKTOP);

    expect(rows.map(row => row.items.length)).toEqual([2, 1]);
    for (const row of rows) {
      for (const item of row.items) {
        expect(item.width).toBeGreaterThanOrEqual(400);
      }
    }
  });

  /**
   * The narrow desktop is where the layout is most asymmetric and where collapsing therefore
   * behaves least like the marketing story, so it gets pinned rather than assumed. Collapsing the
   * FIRST panel does not widen `roles` — it narrows it, 1174.4 → 580.8, because `roles` was only
   * full-width as the odd one out of a 2+1 split, and freeing `users` lets `messages` join it.
   * Collapsing the second then hands `roles` the whole width. Both moves are correct; what must
   * hold throughout is that no standing panel is ever pushed under its declared minimum.
   */
  it('keeps every standing panel above its minimum through a narrow-desktop collapse', () => {
    const rolesExpanded = widthOf(NONE, 'roles', NARROW_DESKTOP);
    const rolesAfterOne = widthOf({ ...NONE, users: true }, 'roles', NARROW_DESKTOP);
    const rolesAfterTwo = widthOf(
      { ...NONE, users: true, messages: true },
      'roles',
      NARROW_DESKTOP
    );

    expect(rolesAfterOne).toBeLessThan(rolesExpanded);
    expect(rolesAfterOne).toBeGreaterThanOrEqual(400);
    expect(rolesAfterTwo).toBeGreaterThan(rolesAfterOne);
    expect(Math.round(rolesAfterTwo)).toBe(Math.round(NARROW_DESKTOP.contentWidth));

    for (const collapsed of [NONE, { ...NONE, users: true }, { ...NONE, messages: true }]) {
      for (const row of panelRows(collapsed, NARROW_DESKTOP)) {
        for (const item of row.items) {
          expect(item.width).toBeGreaterThanOrEqual(400);
        }
      }
    }
  });

  it('gives each collapsed panel its own full-width row', () => {
    const rows = panelRows(ALL);

    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row.items).toHaveLength(1);
      expect(Math.round(row.items[0]!.width)).toBe(Math.round(DESKTOP.contentWidth));
    }
  });

  it('re-packs the tiles into rows carrying no panel once every panel collapses', () => {
    const tileRows = rowsFor(ALL).filter(
      row => !row.items.some(item => isPanelContent(item.content))
    );

    expect(tileRows.length).toBeGreaterThan(0);
    expect(tileRows.flatMap(row => row.items).length).toBeGreaterThan(0);
  });

  it('widens the panels left standing — the point of the feature', () => {
    expect(widthOf({ ...NONE, users: true }, 'roles')).toBeGreaterThan(widthOf(NONE, 'roles'));
    expect(widthOf({ ...NONE, users: true, messages: true }, 'roles')).toBeGreaterThan(
      widthOf({ ...NONE, users: true }, 'roles')
    );
  });

  it('allocates a collapsed row far shorter than an expanded panel', () => {
    const collapsedBar = panelRows(ALL)[0]?.items[0];
    const expandedPanel = panelRows(NONE)[0]?.items[0];

    expect(collapsedBar?.height).toBeLessThan(60);
    expect(expandedPanel?.height).toBeGreaterThan(400);
  });

  it('keeps every collapsed bar full-width on a phone', () => {
    for (const row of rowsFor(ALL, MOBILE, 1)) {
      expect(row.items).toHaveLength(1);
      expect(Math.round(row.items[0]!.width)).toBe(MOBILE.contentWidth);
    }
  });
});
