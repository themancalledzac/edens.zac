/**
 * Builds the AnyContentModel[] for the admin hub. Array order: panels first, then nav tiles.
 *
 * A panel's width/height is an aspect ratio to the packer, and `AdminPanelRenderer` applies the
 * height it computes as a `max-height` — so 600×1100 is the panel's tallest allowed shape, not its
 * shape. A panel with little in it renders short; one with more scrolls internally at the cap.
 *
 * Keep that ratio strictly taller than 1:2. `prominenceFactor` steps at `EXTREMENESS_RAMP_START`
 * (2.0), so 600×1200 would jump a panel's prominence from 5.0 to 7.0 and re-solve width allocation
 * for the whole hub. 600×1100 is extremeness 1.83 and sits safely under it.
 *
 * Row composition, not rating, is the lever for a panel's width: the packer splits a row's budget
 * among whatever shares it, so a panel's width moves only when the number or shape of its
 * row-mates changes. Verified by measuring identical 298px panel widths at a 1274px content width
 * across rating 1, 2, and 3 alike, with row composition held fixed.
 */

import type { AdminHomeTileApi } from '@/app/lib/api/adminHome';
import type { AnyContentModel, ContentPanelModel, PanelType } from '@/app/types/Content';
import { clampParallaxDimensions } from '@/app/utils/contentLayout';
import { isPanelContent } from '@/app/utils/contentTypeGuards';

import { ADMIN_TILES } from './adminTiles';

export function buildAdminHubContent(tiles: AdminHomeTileApi[]): AnyContentModel[] {
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
      orderIndex: i,
      visible: true,
      locations: [],
    };
  });

  const usersPanel: ContentPanelModel = {
    contentType: 'PANEL',
    panelType: 'users',
    id: 1001,
    rating: 5,
    title: 'Users',
    width: 600,
    height: 1100,
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
    orderIndex: 102,
    visible: true,
  };

  return [usersPanel, messagesPanel, rolesPanel, ...tileModels];
}

/**
 * Footprint a COLLAPSED panel reports to the layout packer: a bar, not a column.
 *
 * This ratio deliberately breaks the "keep every panel strictly under 1:2" rule in this file's
 * header docblock, and has to. That rule protects the EXPANDED panels, whose relative widths are
 * re-solved the moment one of them crosses `EXTREMENESS_RAMP_START`. Crossing it is the entire
 * point here: at ≈21:1 a collapsed panel clears both gates in `isSoloHero` — extremeness ≥ 2.0,
 * and a width-cost above half the row budget — so it claims its own full-width row and everything
 * else on the hub re-packs into the space it gave up. The layout engine is untouched.
 *
 * The absolute numbers matter far less than the ratio, but they are not arbitrary either: this
 * resolves to ~55px at a 1174px content width, ~34.6px at 768px, and ~18.2px on a phone — always
 * UNDER a panel header's natural height (~51-56px). A `max-height` cap below the content's own
 * height DOES bind, clipping the header down to a sliver: the opposite of "not binding". That is
 * exactly why `AdminPanelRenderer` must not apply the packer's height as a `max-height` while
 * collapsed, and instead lets the bar size to its own header content. A ratio that resolved TALLER
 * than the header would be safe to cap, but this one deliberately does not.
 */
export const COLLAPSED_PANEL_SIZE = { width: 1200, height: 56 } as const;

/**
 * Swap in the collapsed footprint for each collapsed panel, leaving every other block untouched.
 *
 * `buildContentRows` is a pure function of these models, so re-deriving the array IS how
 * collapsing a panel re-packs the page. Returns a new array every call — memoize at the caller.
 */
export function withCollapsedPanels(
  content: AnyContentModel[],
  collapsed: Readonly<Record<PanelType, boolean>>
): AnyContentModel[] {
  return content.map(item =>
    isPanelContent(item) && collapsed[item.panelType] ? { ...item, ...COLLAPSED_PANEL_SIZE } : item
  );
}
