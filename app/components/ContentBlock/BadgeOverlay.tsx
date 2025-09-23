import React from 'react';

import { type BadgeOverlayProps } from './types';

/**
 * Reusable component for rendering badges with proper positioning
 * Handles both cardType badges (top-left) and date badges (top-right)
 */
export function BadgeOverlay({ badges }: BadgeOverlayProps): React.ReactElement {
  return (
    <>
      {badges.map((badge, index) => (
        <div key={`badge-${index}`} className={badge.className}>
          {badge.text}
        </div>
      ))}
    </>
  );
}

/**
 * Utility function to create badge configurations from block data
 */
export function createBadgeConfigs(
  cardTypeBadge?: string | undefined,
  dateBadge?: string | undefined
): Array<{ text: string; position: 'top-left' | 'top-right'; className: string }> {
  const badges: Array<{ text: string; position: 'top-left' | 'top-right'; className: string }> = [];

  if (cardTypeBadge) {
    badges.push({
      text: cardTypeBadge,
      position: 'top-left' as const,
      className: 'cardTypeBadge'
    });
  }

  if (dateBadge) {
    badges.push({
      text: dateBadge,
      position: 'top-right' as const,
      className: 'dateBadge'
    });
  }

  return badges;
}