/**
 * Builds the AnyContentModel[] for the admin hub. Array order: the one tabbed list panel first,
 * then the nav tiles.
 *
 * The panel's HEIGHT is content-derived, not shape-derived: `chrome + rowCount × rowHeight` for its
 * TALLEST tab, declared to the layout engine as `minHeight === maxHeight` — a pin. The sizer models
 * every block as `H(W) = a·W + b` and reads a pin as `a = 0`. See {@link tabbedPanelHeight}. Sizing
 * for the tallest tab rather than the active one is what lets a tab switch leave the page alone.
 *
 * That is only safe because a panel's height does not vary with its width, which is a measured
 * property and not an obvious one. Probing the real components against the live Inter font across
 * panel widths 400 → 610px: every row measures the same at every width (see the row heights in
 * {@link TAB_SHAPE}). The one thing that would break it is a row wrapping to a second line, and
 * the Users row — the tightest of them — wraps at a panel width of **350px**, which
 * {@link PANEL_MIN_WIDTH} keeps 50px clear of.
 *
 * Width-independence is also what keeps the pack single-pass: a row COUNT cannot change when the
 * packer changes a panel's width, so there is no measure → re-pack → re-measure cycle to converge.
 * Counts are resolved server-side in `page.tsx` before the first pack, so the first pack is the
 * only pack.
 *
 * The declared `width`/`height` ratio still drives Stage-1 packing — width-cost, prominence and row
 * membership all read it — and only the rendered height comes from the pin. Keep that ratio
 * strictly taller than 1:2: `prominenceFactor` steps at `EXTREMENESS_RAMP_START` (2.0), so 600×1200
 * would jump the panel's prominence from 5.0 to 7.0 and re-solve width allocation for the whole hub.
 * 600×1100 is extremeness 1.83 and sits safely under it.
 *
 * The panel declares {@link PANEL_MIN_WIDTH} rather than a higher rating: the minimum acts on row
 * MEMBERSHIP, which is the lever that moves a panel's width. `firstCleanExtension` refuses to grow a
 * row into a composition that starves a declared minimum, so the row closes instead. The measured
 * compositions are carried as assertions in `page.desktopLayout.test.tsx`,
 * `page.mobileLayout.test.tsx` and `page.collapsedLayout.test.ts` rather than restated here, where
 * they would go stale in silence.
 */

import { ADMIN_LIST_TABS, type AdminListTab } from '@/app/components/AdminLists/adminListTabs';
import {
  panelChromeHeight,
  rowHeight,
  type RowShape,
  type SectionShape,
} from '@/app/components/ListPanel/listPanelShape';
import type { AdminHomeTileApi } from '@/app/lib/api/adminHome';
import { type AnyContentModel, type ContentPanelModel, pinnedHeight } from '@/app/types/Content';
import { clampParallaxDimensions } from '@/app/utils/contentLayout';
import { isPanelContent } from '@/app/utils/contentTypeGuards';

import { ADMIN_TILES } from './adminTiles';

/**
 * Narrowest width, in CSS px, at which a panel still displays everything it holds.
 *
 * Set by the widest irreducible row of chrome, which is the Users tab's: body rows carrying an
 * identity plus "Update" and "Reset pw". The header's four tabs scroll sideways rather than wrap,
 * so they do not set a floor.
 *
 * The Users row wraps — `.rowActions` dropping below `.rowMain`, whose `flex: 1 1 220px` basis is
 * what sets the threshold — at a panel width of **350px**, measured against the live Inter font by
 * sweeping the real geometry from 300 to 600px. 400 keeps 50px clear of that. Since the height
 * model assumes a row never wraps,
 * this margin is now load-bearing for layout and not only for legibility.
 *
 * The packer treats this as a preference over ROW MEMBERSHIP, not a reservation of page
 * width: it evicts row-mates to honour it, and drops it when the item is alone in a row
 * narrower than 400px (see {@link Content.minWidth}). That is what keeps a phone from
 * getting a horizontally-overflowing panel — there the panel simply takes the full
 * viewport width, which is the widest it could ever be given.
 */
export const PANEL_MIN_WIDTH = 400;

/**
 * Widest a panel renders when it shares its row.
 *
 * The counterpart to {@link PANEL_MIN_WIDTH} and the other half of Zac's shape requirement: a
 * minimum keeps a panel's chrome legible, a maximum keeps it from "looking TOO wide, while still
 * being able to take up space if needed". A user list is a column of short rows — past roughly
 * 700px the identity and its two buttons are separated by a field of nothing, and it reads as a
 * stretched table rather than a panel.
 *
 * Unlike the minimum this never touches row membership. The sizer applies it at render time as
 * `min(rowWidth, maxWidth)` (see {@link Content.maxWidth}), so it cannot change which items share
 * a row. It also stops applying when the panel has no row-mate: a lone panel spans its row, since
 * the alternative is a dead strip beside it and no one to hand the width to. That case is real on
 * a narrow desktop — below `2 × PANEL_MIN_WIDTH + gap` a second panel column does not fit, so
 * panels legitimately take rows of their own.
 */
export const PANEL_MAX_WIDTH = 700;

/**
 * Narrowest a nav tile renders before its cover stops reading as a photograph.
 *
 * The tiles never needed a floor while the width-cost budget governed row membership — that
 * budget's whole job is keeping items at a consistent size, and it closed a row long before
 * anything got small. A row carrying a pinned panel does not use that budget (see the fill-cap
 * comment in `buildRows`), so without a floor here the packer will happily squeeze the three
 * tiles to 196px to fit them beside a stacked column of panels, which renders the overlay title
 * unreadable at container-query sizes.
 *
 * Declaring it is also the honest expression of the rule: a tile is a content component with a
 * shape, exactly like a panel, and this is the same `minWidth` mechanism rather than a second
 * one invented for tiles.
 */
const TILE_MIN_WIDTH = 300;

/**
 * The tabbed panel's header: tabs on the left, one action on the right, both `button`-slot tall.
 * Every tab shares it, which is why the header's height no longer depends on which panel it is.
 */
const HEADER_SHAPE: RowShape = { left: ['button'], right: ['button'] };

/**
 * What each tab's list rows are made of, as {@link RowShape} slot stacks, plus the body's first
 * line where a tab has one. {@link rowHeight} and {@link panelChromeHeight} do the arithmetic.
 *
 * Users, Messages and Roles derive their rendered row height to the pixel: 71 / 58.5 / 40, measured
 * in Chrome against the live Inter font at panel widths 400, 430, 520 and 610px -- identical at all
 * four, which is the property {@link PANEL_MIN_WIDTH} exists to protect. Collections was declared
 * before its panel existed (54px) and the panel built to it.
 *
 * Users is the one tab with a `toolbar`: its tag-only toggle is a `--text-sm` line on the body's
 * first line, a `subheader` slot.
 */
const TAB_SHAPE: Record<AdminListTab, { row: RowShape; toolbar?: SectionShape }> = {
  users: {
    row: { left: ['header', 'subheader'], right: ['button', 'button'] },
    toolbar: ['subheader'],
  },
  messages: {
    row: { left: ['subheader', 'subheader'], right: ['meta', 'button'] },
  },
  roles: {
    row: { left: ['header'], right: ['button'] },
  },
  collections: {
    row: { left: ['header', 'subheader'], right: [] },
  },
};

/**
 * Floor and ceiling on a panel's reserved height.
 *
 * The floor is the 12rem that `AdminPanelRenderer.module.scss` used to hold as a `min-height`. It
 * moved here because this is where the row count is: a panel that is empty, loading or errored has
 * no rows to size from and would otherwise reserve only its chrome, so the floor is what keeps the
 * hub from reflowing as the panels resolve. Expressed once, in the model — a CSS floor as
 * well would let the reserved box and the rendered box disagree, which is the whole class of bug
 * this change removes.
 *
 * The ceiling stops a large account list from reserving a page-tall row — past it `.body`'s
 * `overflow-y: auto` takes over and the panel scrolls internally, as every panel does today.
 */
const PANEL_HEIGHT_BOUNDS = { min: 192, max: 1000 } as const;

/** The row counts the hub needs before it can lay out. Resolved server-side in `page.tsx`. */
export type AdminPanelCounts = Record<AdminListTab, number>;

/**
 * Fraction of the viewport a panel may occupy. Below 1 so the page keeps a strip to scroll by --
 * a panel filling the whole viewport reads as the page rather than as one block on it, and leaves
 * no visual handle telling the reader there is more hub below.
 */
const VIEWPORT_HEIGHT_FRACTION = 0.9;

/**
 * The height one tab needs for `rowCount` rows, bounded by {@link PANEL_HEIGHT_BOUNDS}.
 *
 * Declared to the layout engine through {@link pinnedHeight}, whose equal `minHeight`/`maxHeight`
 * pair is what marks a block's height as independent of its width. Anything that makes a row's
 * height depend on the panel's width invalidates this: see the load-bearing CSS listed in
 * `AdminPanelRenderer`.
 *
 * `viewportHeight` tightens the ceiling to {@link VIEWPORT_HEIGHT_FRACTION} of the viewport, so a
 * long list scrolls inside its own `.body` instead of reserving more than the screen. It must come
 * from the SSR viewport resolved in `page.tsx` -- a value measured on the client after paint would
 * rewrite footprints and force the re-pack this whole design exists to avoid. Omitting it is
 * exactly the pre-existing behaviour, which is what keeps the hub fixtures valid.
 *
 * Order matters: the floor is applied to the content, then the ceiling, but the ceiling is itself
 * floored first. A viewport shorter than {@link PANEL_HEIGHT_BOUNDS}.min would otherwise reserve a
 * panel less height than its own chrome occupies -- the blank-well bug inverted, with the header
 * clipped instead of a gap left under it.
 */
export function panelContentHeight(
  tab: AdminListTab,
  rowCount: number,
  viewportHeight?: number
): number {
  const shape = TAB_SHAPE[tab];
  const raw =
    panelChromeHeight(HEADER_SHAPE, shape.toolbar) + Math.max(0, rowCount) * rowHeight(shape.row);
  const viewportCeiling =
    viewportHeight && viewportHeight > 0
      ? Math.min(PANEL_HEIGHT_BOUNDS.max, viewportHeight * VIEWPORT_HEIGHT_FRACTION)
      : PANEL_HEIGHT_BOUNDS.max;
  const ceiling = Math.max(PANEL_HEIGHT_BOUNDS.min, viewportCeiling);
  return Math.min(ceiling, Math.max(PANEL_HEIGHT_BOUNDS.min, raw));
}

/**
 * The height the tabbed panel reserves: its TALLEST tab's {@link panelContentHeight}.
 *
 * One box for every tab, rather than a footprint that follows the active tab, so switching tabs
 * never re-packs the page -- the list changes, the panel and everything around it stay put. A
 * shorter tab leaves the shell's surface showing below its list, which `ListPanel` fills.
 */
export function tabbedPanelHeight(counts: AdminPanelCounts, viewportHeight?: number): number {
  return Math.max(
    ...ADMIN_LIST_TABS.map(({ id }) => panelContentHeight(id, counts[id], viewportHeight))
  );
}

/**
 * Counts used when the server-side lookup failed. Deliberately the floor rather than a guess at a
 * typical list: an under-reservation is corrected by the panel's own scroll, while an
 * over-reservation reintroduces exactly the blank well this feature exists to remove.
 */
const FALLBACK_COUNTS: AdminPanelCounts = { users: 0, messages: 0, roles: 0, collections: 0 };

/** The panel's content id, clear of the nav tiles' `1..n`. */
const PANEL_ID = 1001;

/**
 * The panel's `orderIndex`, clear of the nav tiles' `0..n-1` run. Nothing on the admin path sorts
 * by it -- `buildAdminHubContent` puts the panel first in the array itself -- so it only has to stay
 * unique.
 */
const PANEL_ORDER_INDEX = 100;

/**
 * The width:height ratio the panel DECLARES — not the height it renders, which is the pin from
 * {@link tabbedPanelHeight}.
 *
 * NOT DEAD, despite `minHeight`/`maxHeight` overriding the rendered height. Stage-1 packing reads
 * this ratio for width-cost, prominence and row membership. See the module docblock for why it must stay strictly taller than 1:2: `prominenceFactor`
 * steps at `EXTREMENESS_RAMP_START` (2.0), so 600×1200 would jump a panel from 5.0 to 7.0 and
 * re-solve width allocation for the whole hub. 600×1100 is extremeness 1.83 and sits under it.
 */
const PANEL_DECLARED_WIDTH = 600;
const PANEL_DECLARED_HEIGHT = 1100;

/**
 * @param viewportHeight SSR-resolved viewport height, forwarded to {@link panelContentHeight} so a
 *   long list is capped rather than reserving more than the screen. Optional: omitted, every panel
 *   sizes exactly as it did before the cap existed.
 */
export function buildAdminHubContent(
  tiles: AdminHomeTileApi[],
  counts: AdminPanelCounts = FALLBACK_COUNTS,
  viewportHeight?: number
): AnyContentModel[] {
  const apiByKey = new Map(tiles.map(t => [t.tileKey, t]));

  const tileModels: AnyContentModel[] = ADMIN_TILES.map((config, i) => {
    const api = apiByKey.get(config.tileKey);
    const { imageWidth, imageHeight } = clampParallaxDimensions(
      api?.coverImageWidth ?? undefined,
      api?.coverImageHeight ?? undefined
    );

    return {
      contentType: 'IMAGE' as const,
      enableParallax: true as const,
      id: i + 1,
      title: config.label,
      slug: config.href.replace(/^\//, ''),
      imageUrl: api?.coverImageUrl ?? '',
      overlayText: config.label,
      imageWidth,
      imageHeight,
      width: imageWidth,
      height: imageHeight,
      rating: config.rating,
      minWidth: TILE_MIN_WIDTH,
      orderIndex: i,
      visible: true,
      locations: [],
    };
  });

  const panel: ContentPanelModel = {
    contentType: 'PANEL',
    id: PANEL_ID,
    rating: 5,
    title: 'Admin',
    width: PANEL_DECLARED_WIDTH,
    height: PANEL_DECLARED_HEIGHT,
    minWidth: PANEL_MIN_WIDTH,
    maxWidth: PANEL_MAX_WIDTH,
    ...pinnedHeight(tabbedPanelHeight(counts, viewportHeight)),
    orderIndex: PANEL_ORDER_INDEX,
    visible: true,
  };

  return [panel, ...tileModels];
}

/**
 * Visible height of the empty list body a COLLAPSED panel keeps showing, beyond its padding.
 *
 * Zac's round-3 review: a closed panel is not only its header — it shows a small strip of the
 * (empty) body surface, "as tall as the padding around it, maybe twice as tall". Body padding is
 * 32px total (the `bodyPadding` term inside {@link panelChromeHeight}), so the visible body lands
 * at 48px — inside his stated band. Mirrored in `ListPanel.module.scss` by the `.isCollapsed::after`
 * strip, whose `min-height: var(--space-4)` (16px) inside `margin: var(--space-4)` (32px in total)
 * is the same 32 + 16 arithmetic; change the two together.
 */
const COLLAPSED_BODY_SLIVER = 16;

/**
 * The height a collapsed panel reserves and renders: full header chrome over the padded empty
 * body sliver. Derived through the same {@link panelChromeHeight} as the expanded model so a token
 * change moves both. No toolbar term: the body, and its first line, unmount while collapsed.
 */
export const COLLAPSED_PANEL_HEIGHT = panelChromeHeight(HEADER_SHAPE) + COLLAPSED_BODY_SLIVER;

/**
 * Footprint a COLLAPSED panel reports to the layout packer: an ordinary small block.
 *
 * A collapsed panel is NOT a special case — open, a panel is a tall content block; closed, it is a
 * small one (think a "0-1 star horizontal" image), and neither state gets its own layout mechanism.
 * Nothing here may give the bar a solo row: alone in a full-width row it leaves ~874px of dead
 * space to its right, which is the failure this shape exists to avoid.
 *
 * Each field enforces one piece of "just a small block":
 *
 * - `width`/`height` 180×102 — AR 1.76, under `EXTREMENESS_RAMP_START` (2.0), so `isSoloHero`'s
 *   extremeness gate can never fire and the bar goes through row composition like everything else.
 *   Same rule the header docblock sets for the expanded panels, horizontal edition.
 * - `rating: 1` — the "0-1 star" half. The point-balance split and the equity tiebreak read
 *   prominence, and a bar of chrome has almost none; rated 5 it would claim leaf area it cannot
 *   fill.
 * - `minWidth`, and deliberately NO `maxWidth` — a bar spans whatever column it lands in, because
 *   one rendering narrower than the tile stacked beneath it leaves a notch of dead space. The floor
 *   matters because a row holding any pinned member runs with the fill-cap stopping rules disabled
 *   (see `hasPinnedMember` in `buildRows`), so a declared minimum is the only thing stopping the
 *   packer squeezing the bar's still-visible header controls to nothing — the same reason nav tiles
 *   carry `TILE_MIN_WIDTH`. The expanded form's 700px legibility cap protects list ROWS from
 *   stretching into a sparse table; a bar has no list rows, so it has no cap to inherit.
 * - `pinnedHeight(COLLAPSED_PANEL_HEIGHT)` — the pin. The sizer reads that equal pair
 *   as `a = 0` in `H(W) = a·W + b`, so the bar renders at exactly this height at every viewport
 *   regardless of its declared AR. The pin, not the ratio, is what makes it a bar.
 */
export const COLLAPSED_PANEL_SIZE = {
  width: 180,
  height: COLLAPSED_PANEL_HEIGHT,
  rating: 1,
  minWidth: PANEL_MIN_WIDTH,
  maxWidth: undefined,
  ...pinnedHeight(COLLAPSED_PANEL_HEIGHT),
} as const;

/**
 * Derive the content array the packer actually sees: the panel's block swapped for the bar
 * footprint while collapsed, every other block untouched. `buildContentRows` is a pure function of these
 * models, so re-deriving the array IS how collapsing a panel re-packs the page.
 *
 * Deliberately the ONLY footprint rewrite. A measured-size path (each panel reporting its rendered
 * box, the hub re-packing to content-honest heights) was implemented and reverted on 2026-08-10:
 * width allocation depends on every panel's shape, so measure → re-pack → new width → new wrapped
 * height → re-pack oscillates, and since a re-pack remounts the panels it re-fired all three admin
 * fetches every cycle until the browser exhausted its socket pool. See `AdminPanelRenderer`.
 *
 * Returns a new array whenever it rewrites anything — memoize at the caller.
 */
export function withPanelFootprints(
  content: AnyContentModel[],
  collapsed: boolean
): AnyContentModel[] {
  if (!collapsed) return content;
  return content.map(item => (isPanelContent(item) ? { ...item, ...COLLAPSED_PANEL_SIZE } : item));
}
