import React from 'react';

import { type CollectionType } from '@/app/types/Collection';

import cbStyles from './ContentComponent.module.scss';

// Content types that can display badges
export type BadgeContentType = 'collection' | 'content';

// Badge overlay props with simplified API
export interface BadgeOverlayProps {
  contentType: BadgeContentType;
  badgeValue: string | CollectionType | null;
}

/**
 * Reusable component for rendering badges with proper positioning
 * Automatically determines position based on badge value type
 */
export function BadgeOverlay({
  contentType = 'content',
  badgeValue,
}: BadgeOverlayProps): React.ReactElement | null {
  if (badgeValue === null) {
    return null;
  }

  return (
    <div className={contentType === 'content' ? cbStyles.dateBadge : cbStyles.cardTypeBadge}>
      {badgeValue}
    </div>
  );
}
