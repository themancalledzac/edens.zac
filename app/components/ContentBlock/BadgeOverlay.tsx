import React from 'react';

import { type CollectionType } from '@/app/types/ContentCollection';

import cbStyles from './ContentBlockComponent.module.scss';

// Content types that can display badges
export type BadgeContentType = 'collection' | 'contentBlock';

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
  contentType = 'contentBlock',
  badgeValue,
}: BadgeOverlayProps): React.ReactElement | null {
  if (badgeValue === null) {
    return null;
  }

  return (
    <div className={contentType === 'contentBlock' ? cbStyles.dateBadge : cbStyles.cardTypeBadge}>
      {badgeValue}
    </div>
  );
}
