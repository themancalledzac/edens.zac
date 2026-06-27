/**
 * Builds the AnyContentModel[] for the admin hub. Array order: panels first, then nav tiles.
 * Panel width/height (600×1100, AR≈0.55) and tile rating are tunable.
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

  return [usersPanel, messagesPanel, ...tileModels];
}
