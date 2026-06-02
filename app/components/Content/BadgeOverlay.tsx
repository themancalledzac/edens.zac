import { type ReactElement } from 'react';

import { Badge, collectionTypeToPublicLabel } from '@/app/components/ui/Badge/Badge';
import { CollectionType } from '@/app/types/Collection';

export type BadgeContentType = 'collection' | 'content';

export interface BadgeOverlayProps {
  contentType: BadgeContentType;
  badgeValue: string | CollectionType | null;
}

/**
 * @deprecated Use <Badge> from app/components/ui/Badge directly. Retained as a
 * shim so existing call sites keep compiling; collection values are routed
 * through the curated public-label map (no raw enum reaches visitors).
 */
export function BadgeOverlay({ contentType, badgeValue }: BadgeOverlayProps): ReactElement | null {
  if (badgeValue === null) {
    return null;
  }
  const isCollection = contentType === 'collection';
  const label =
    isCollection && Object.values(CollectionType).includes(badgeValue as CollectionType)
      ? collectionTypeToPublicLabel(badgeValue as CollectionType)
      : String(badgeValue);
  return <Badge label={label} tone={isCollection ? 'card' : 'date'} />;
}

export default BadgeOverlay;
