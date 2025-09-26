import React from 'react';

// Badge configuration interface
export interface BadgeConfig {
  text: string;
  position: 'top-left' | 'top-right';
  className: string;
}

// Badge overlay props
export interface BadgeOverlayProps {
  badges: BadgeConfig[];
}

/**
 * Reusable component for rendering badges with proper positioning
 * Handles both cardType badges (top-left) and date badges (top-right)
 */
export function BadgeOverlay({ badges }: BadgeOverlayProps): React.ReactElement {
  return (
    <>
      {badges.map((badge) => (
        <div key={`badge-${badge.position}-${badge.text}`} className={badge.className}>
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