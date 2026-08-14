/**
 * Builds the AnyContentModel[] for the admin hub. Array order: panels first, then nav tiles.
 *
 * A panel's HEIGHT is content-derived, not shape-derived: `chrome + rowCount × rowHeight`, declared
 * to the layout engine as `minHeight === maxHeight` — a pin. The sizer models every block as
 * `H(W) = a·W + b` and reads a pin as `a = 0`, so a panel holding two messages reserves a
 * two-message box and a panel holding twelve users reserves a twelve-user box. See
 * {@link panelContentHeight}.
 *
 * That is only safe because a panel's height does not vary with its width, which is a measured
 * property and not an obvious one. Probing the real components against the live Inter font across
 * panel widths 400 → 610px: a Users row is 75.0px at every width, Messages 86.0px, Roles 36.5px.
 * The one thing that would break it is a row wrapping to a second line, and the Users row — the
 * tightest of the three — wraps at a panel width of **350px**, which {@link PANEL_MIN_WIDTH} keeps
 * 50px clear of. (An earlier revision of this docblock put that cliff at "roughly 430-450px". That
 * was an estimate, it was wrong, and it would have made this feature unshippable had it been true.)
 *
 * Width-independence is what separates this from the measured-footprint path that was reverted on
 * 2026-08-10: a row COUNT cannot change when the packer changes a panel's width, so there is no
 * measure → re-pack → re-measure cycle to converge. Counts are resolved server-side in `page.tsx`
 * before the first pack, so the first pack is the only pack.
 *
 * The declared `width`/`height` ratio still drives Stage-1 packing — width-cost, prominence and row
 * membership all read it — and only the rendered height comes from the pin. Keep that ratio
 * strictly taller than 1:2: `prominenceFactor` steps at `EXTREMENESS_RAMP_START` (2.0), so 600×1200
 * would jump a panel's prominence from 5.0 to 7.0 and re-solve width allocation for the whole hub.
 * 600×1100 is extremeness 1.83 and sits safely under it.
 *
 * Row composition, not rating, is the lever for a panel's width: the packer splits a row's budget
 * among whatever shares it, so a panel's width moves only when the number or shape of its
 * row-mates changes. Re-measured through `buildContentRows` at the 1274.4px max desktop content
 * width with 12/2/6 row counts: ratings 1 through 5 all render the three panels at 478.10px each
 * against the default cover shapes. (Against the live covers `page.collapseStates.test.ts`
 * carries, all five ratings give 700.00px — true but weaker evidence, since that is {@link
 * PANEL_MAX_WIDTH} binding rather than the solve landing in the same place.)
 *
 * That is why each panel declares {@link PANEL_MIN_WIDTH} rather than a higher rating: the minimum
 * acts on row MEMBERSHIP, and membership is still the lever that moves. `firstCleanExtension`
 * refuses to grow a row into a composition that starves a declared minimum, so the row closes
 * instead. At 1274.4px that no longer changes the outcome — the fill and shared-width predicates
 * bind first, and stripping `minWidth` off the three panels leaves every row's membership and
 * widths unchanged on all three fixtures below.
 *
 * Across the narrow-desktop band it is decisive, and decisive about MEMBERSHIP rather than about
 * width. At a 900px body with the live covers, WITH the minimum declared the three panels take two
 * rows — Users alone at 900.00px (one of the cases `LONE_PANEL_ROWS_TODAY` pins in
 * `page.collapseStates.test.ts`), then Messages and Roles sharing a second row at 542.89px each
 * beside two tiles. WITHOUT it they collapse into ONE row, all three squeezed to 347.02px, under
 * the 400px their chrome needs. The minimum did not widen anything; it closed a row.
 *
 * There is no single content width at which "three panels share a row" starts being true. An
 * earlier revision of this docblock put that threshold at 1232.0px; the claim predates two things.
 * The composer can now STACK panels into one column, so three panels fit a row far narrower than
 * three 400px columns would need, and the pinned-row membership predicates can reject a WIDER
 * arrangement that a narrower one satisfies. Membership is therefore non-monotonic in width, and
 * depends on the panels' content heights and the nav tiles' cover shapes as much as on the width.
 * Swept in 0.1px steps from 390 to 1300 and each transition bisected to four decimals through
 * `buildContentRows` — the recipe is to pack `withPanelFootprints(buildAdminHubContent(tiles,
 * counts), noneCollapsed)` at a given `contentWidth` and count the rows holding a panel:
 *
 * - live 2026-08-10 covers + 12/2/6 rows (what the real page packs): all three share ONE row
 *   between **903.23px and 1284.98px** — the entire desktop band up to the 1274.4px page cap.
 *   Below 903.23px they split.
 * - default cover shapes + 12/2/6 rows (the `page.collapsedLayout.test.ts` fixture): one row from
 *   **1134.72px** up.
 * - the zero-count fallback: one row from **712.80px**, split again from **1045.48px**, one row
 *   once more from **1232.00px**. That last figure is where the retired claim's number came from —
 *   one of three transitions in one fixture, not a page-wide threshold.
 *
 * Do NOT recompute any of these as 3 × 400 + 2 × gap = 1225.6px. That is the width at which three
 * SIDE-BY-SIDE 400px columns would first fit, and a flat three-column row is not the arrangement
 * the composer picks at any of the transitions above.
 */

import {
  panelChromeHeight,
  rowHeight,
  type RowShape,
} from '@/app/components/ListPanel/listPanelShape';
import type { AdminHomeTileApi } from '@/app/lib/api/adminHome';
import {
  type AnyContentModel,
  type ContentPanelModel,
  type PanelType,
  pinnedHeight,
} from '@/app/types/Content';
import { clampParallaxDimensions } from '@/app/utils/contentLayout';
import { isPanelContent } from '@/app/utils/contentTypeGuards';

import { ADMIN_TILES } from './adminTiles';

/**
 * Narrowest width, in CSS px, at which a panel still displays everything it holds.
 *
 * Set by the widest irreducible row of chrome, which is the Users panel's: a header
 * carrying the title, the "Show tag-only people" toggle and "+ New User", over body rows
 * carrying an identity plus "Update" and "Reset pw".
 *
 * The Users row wraps — `.rowActions` dropping below `.rowMain`, whose `flex: 1 1 220px` basis is
 * what sets the threshold — at a panel width of **350px**, measured against the live Inter font by
 * sweeping the real geometry from 300 to 600px. 400 keeps 50px clear of that, and is shared by all
 * three panels so the row solves symmetrically. Since the height model assumes a row never wraps,
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
 * What each panel's header and list rows are made of, as {@link RowShape} slot stacks.
 *
 * Replaces the measured `PANEL_ROW_HEIGHT` / `PANEL_CHROME.headerControl` /
 * `PANEL_HAS_HEADER_BUTTON` trio. Those encoded a panel's height as three numbers a human had to
 * keep in agreement with the stylesheet; this encodes what the panel RENDERS and lets
 * {@link rowHeight} and {@link panelChromeHeight} do the arithmetic. Registering a new panel is
 * now a declaration rather than a measurement -- which matters because the measurement was the one
 * registration step that failed silently (see the {@link panelContentHeight} docblock).
 *
 * The heights this produces are unchanged from the constants it replaces: 75 / 86 / 36.5 per row
 * and 86 / 79 / 86 of chrome. The row heights stay width-independent, as probed against the live
 * Inter font at panel widths 400, 430, 520 and 609.6px -- identical at all four, which is the
 * property {@link PANEL_MIN_WIDTH} exists to protect.
 *
 * Two row shapes carry a documented `heightAdjustment`; see `listPanelShape.ts` for why, and note
 * that both retire once those panels render through `ListPanel`.
 */
const PANEL_SHAPE: Record<PanelType, { header: RowShape; row: RowShape }> = {
  users: {
    header: { left: ['header'], right: ['button'] },
    row: { left: ['header', 'subheader'], right: ['button', 'button'] },
  },
  messages: {
    header: { left: ['header'], right: ['subheader'] },
    // +21: three blocks still stack in one column instead of splitting into two sections.
    row: {
      left: ['header', 'subheader'],
      right: ['subheader', 'button'],
      heightAdjustment: 21,
    },
  },
  roles: {
    header: { left: ['header'], right: ['button'] },
    // -7.5: padding lives in `.rowMain`, so the 32px `x` glyph loses to the padded name block.
    row: { left: ['header'], right: ['button'], heightAdjustment: -7.5 },
  },
};

/**
 * Floor and ceiling on a panel's reserved height.
 *
 * The floor is the 12rem that `AdminPanelRenderer.module.scss` used to hold as a `min-height`. It
 * moved here because this is where the row count is: a panel that is empty, loading or errored has
 * no rows to size from and would otherwise reserve only its chrome, so the floor is what keeps the
 * hub from reflowing as the three panels resolve. Expressed once, in the model — a CSS floor as
 * well would let the reserved box and the rendered box disagree, which is the whole class of bug
 * this change removes.
 *
 * The ceiling stops a large account list from reserving a page-tall row — past it `.body`'s
 * `overflow-y: auto` takes over and the panel scrolls internally, as every panel does today.
 */
const PANEL_HEIGHT_BOUNDS = { min: 192, max: 1000 } as const;

/** The row counts the hub needs before it can lay out. Resolved server-side in `page.tsx`. */
export interface AdminPanelCounts {
  users: number;
  messages: number;
  roles: number;
}

/**
 * Fraction of the viewport a panel may occupy. Below 1 so the page keeps a strip to scroll by --
 * a panel filling the whole viewport reads as the page rather than as one block on it, and leaves
 * no visual handle telling the reader there is more hub below.
 */
const VIEWPORT_HEIGHT_FRACTION = 0.9;

/**
 * The height a panel reserves for `rowCount` rows, bounded by {@link PANEL_HEIGHT_BOUNDS}.
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
  panelType: PanelType,
  rowCount: number,
  viewportHeight?: number
): number {
  const shape = PANEL_SHAPE[panelType];
  const raw = panelChromeHeight(shape.header) + Math.max(0, rowCount) * rowHeight(shape.row);
  const viewportCeiling =
    viewportHeight && viewportHeight > 0
      ? Math.min(PANEL_HEIGHT_BOUNDS.max, viewportHeight * VIEWPORT_HEIGHT_FRACTION)
      : PANEL_HEIGHT_BOUNDS.max;
  const ceiling = Math.max(PANEL_HEIGHT_BOUNDS.min, viewportCeiling);
  return Math.min(ceiling, Math.max(PANEL_HEIGHT_BOUNDS.min, raw));
}

/**
 * Counts used when the server-side lookup failed. Deliberately the floor rather than a guess at a
 * typical list: an under-reservation is corrected by the panel's own scroll, while an
 * over-reservation reintroduces exactly the blank well this feature exists to remove.
 */
const FALLBACK_COUNTS: AdminPanelCounts = { users: 0, messages: 0, roles: 0 };

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

  const usersHeight = panelContentHeight('users', counts.users, viewportHeight);
  const messagesHeight = panelContentHeight('messages', counts.messages, viewportHeight);
  const rolesHeight = panelContentHeight('roles', counts.roles, viewportHeight);

  const usersPanel: ContentPanelModel = {
    contentType: 'PANEL',
    panelType: 'users',
    id: 1001,
    rating: 5,
    title: 'Users',
    width: 600,
    height: 1100,
    minWidth: PANEL_MIN_WIDTH,
    maxWidth: PANEL_MAX_WIDTH,
    ...pinnedHeight(usersHeight),
    orderIndex: 100,
    visible: true,
  };

  const messagesPanel: ContentPanelModel = {
    contentType: 'PANEL',
    panelType: 'messages',
    id: 1002,
    rating: 5,
    title: 'Messages',
    width: 600,
    height: 1100,
    minWidth: PANEL_MIN_WIDTH,
    maxWidth: PANEL_MAX_WIDTH,
    ...pinnedHeight(messagesHeight),
    orderIndex: 101,
    visible: true,
  };

  const rolesPanel: ContentPanelModel = {
    contentType: 'PANEL',
    panelType: 'roles',
    id: 1003,
    rating: 5,
    title: 'Roles',
    width: 600,
    height: 1100,
    minWidth: PANEL_MIN_WIDTH,
    maxWidth: PANEL_MAX_WIDTH,
    ...pinnedHeight(rolesHeight),
    orderIndex: 102,
    visible: true,
  };

  return [usersPanel, messagesPanel, rolesPanel, ...tileModels];
}

/**
 * Visible height of the empty list body a COLLAPSED panel keeps showing, beyond its padding.
 *
 * Zac's round-3 review: a closed panel is not only its header — it shows a small strip of the
 * (empty) body surface, "as tall as the padding around it, maybe twice as tall". Body padding is
 * 32px total (the `bodyPadding` term inside {@link panelChromeHeight}), so the visible body lands
 * at 48px — inside his stated band. Mirrored in `AdminPanel.module.scss` by the `.isCollapsed::after`
 * strip, whose `min-height: var(--space-4)` (16px) inside `margin: var(--space-4)` (32px in total)
 * is the same 32 + 16 arithmetic; change the two together.
 */
const COLLAPSED_BODY_SLIVER = 16;

/**
 * The height a collapsed panel reserves and renders: full header chrome over the padded empty
 * body sliver. Derived through the same {@link panelChromeHeight} as the expanded model so a token
 * change moves both. Uses the with-button header for every panel — bars sit side by side, and a
 * uniform height is what keeps them reading as one system; the CSS stretches a text-only header's
 * panel to the same box. Hence the Users header shape rather than each panel's own.
 */
export const COLLAPSED_PANEL_HEIGHT =
  panelChromeHeight(PANEL_SHAPE.users.header) + COLLAPSED_BODY_SLIVER;

/**
 * Footprint a COLLAPSED panel reports to the layout packer: an ordinary small block.
 *
 * A collapsed panel is NOT a special case — open, a panel is a tall content block; closed, it is a
 * small one (Zac's framing: "think a '0-1 star horizontal' image"), and neither state gets its own
 * layout mechanism. An earlier revision declared 1200×56 here precisely so the ≈21:1 ratio would
 * clear both `isSoloHero` gates and claim the bar its own row, with `maxWidth` capping the render
 * at 400px. Review (Zac, 2026-08-10) rejected that: the bar sat alone in a full-width row with
 * ~874px of dead space to its right. The solo row WAS the bug, so nothing here may re-trip it.
 *
 * Each field enforces one piece of "just a small block":
 *
 * - `width`/`height` 180×102 — AR 1.76, under `EXTREMENESS_RAMP_START` (2.0), so `isSoloHero`'s
 *   extremeness gate can never fire and the bar goes through row composition like everything else.
 *   Same rule the header docblock sets for the expanded panels, horizontal edition.
 * - `rating: 1` — the "0-1 star" half. The point-balance split and the equity tiebreak read
 *   prominence, and a bar of chrome has almost none; rated 5 it would claim leaf area it cannot
 *   fill.
 * - `minWidth`, and deliberately NO `maxWidth` — a bar spans whatever column it lands in (Zac's
 *   round-3 review: bars rendering narrower than the tile stacked beneath them left a notch of
 *   dead space — "just make them the right width"). The floor is load-bearing twice over: a row
 *   holding any pinned member runs with the fill-cap stopping rules disabled (see
 *   `hasPinnedMember` in `buildRows`), so a declared minimum is the only thing stopping the
 *   packer squeezing the bar's still-visible header controls to nothing — the same reason nav
 *   tiles carry `TILE_MIN_WIDTH`. The expanded form's 700px legibility cap protects list ROWS
 *   from stretching into a sparse table; a bar has no list rows, so it has no cap to inherit.
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
 * Derive the content array the packer actually sees: each collapsed panel's block swapped for the
 * bar footprint, every other block untouched. `buildContentRows` is a pure function of these
 * models, so re-deriving the array IS how collapsing a panel re-packs the page.
 *
 * Deliberately the ONLY footprint rewrite. A measured-size path (each panel reporting its rendered
 * box, the hub re-packing to content-honest heights) was implemented and reverted on 2026-08-10:
 * width allocation depends on every panel's shape, so measure → re-pack → new width → new wrapped
 * height → re-pack oscillates, and since a re-pack remounts the panels it re-fired all three admin
 * fetches every cycle until the browser exhausted its socket pool. See `AdminPanelRenderer`.
 *
 * Returns a new array every call — memoize at the caller.
 */
export function withPanelFootprints(
  content: AnyContentModel[],
  collapsed: Readonly<Record<PanelType, boolean>>
): AnyContentModel[] {
  return content.map(item =>
    isPanelContent(item) && collapsed[item.panelType] ? { ...item, ...COLLAPSED_PANEL_SIZE } : item
  );
}
