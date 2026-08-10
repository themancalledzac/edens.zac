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
 * Panel rating is the lever for how much width the packer gives a panel relative to the nav tiles.
 */

import type { AdminHomeTileApi } from '@/app/lib/api/adminHome';
import type { AnyContentModel, ContentPanelModel } from '@/app/types/Content';
import { clampParallaxDimensions } from '@/app/utils/contentLayout';

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
