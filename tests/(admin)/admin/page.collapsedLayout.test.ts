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
 */
const DESKTOP = { contentWidth: 1174.4, viewportHeight: 900, isMobile: false };
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

const panelRows = (collapsed: Record<PanelType, boolean>) =>
  rowsFor(collapsed).filter(row => row.items.some(item => isPanelContent(item.content)));

const widthOf = (collapsed: Record<PanelType, boolean>, panelType: PanelType) => {
  for (const row of rowsFor(collapsed)) {
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
