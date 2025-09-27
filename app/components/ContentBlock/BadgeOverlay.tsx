import React from 'react';

import { type CollectionType } from '@/app/types/ContentCollection';

// Content types that can display badges
export type BadgeContentType = 'collection' | 'contentBlock';

// Badge overlay props with simplified API
export interface BadgeOverlayProps {
  contentType: BadgeContentType;
  badgeValue: string | CollectionType;
}

/**
 * Reusable component for rendering badges with proper positioning
 * Automatically determines position based on badge value type
 */
export function BadgeOverlay({
  contentType = 'contentBlock',
  badgeValue,
}: BadgeOverlayProps): React.ReactElement | null {
  return (
    <div className={contentType === 'contentBlock' ? 'dateBadge' : 'cardTypeBadge'}>
      {badgeValue}
    </div>
  );
}
