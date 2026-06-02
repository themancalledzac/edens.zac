import { type ReactElement } from 'react';

import { CollectionType } from '@/app/types/Collection';

import styles from './Badge.module.scss';

export type BadgeTone = 'card' | 'date';
export type BadgePosition = 'start' | 'end';

export interface BadgeProps {
  /** Text to display. When null, the badge renders nothing. */
  label: string | null;
  /** Visual treatment: `card` (uppercase type chip) or `date`. Default `date`. */
  tone?: BadgeTone;
  /** Corner: `start` (top-left) or `end` (top-right). Defaults from tone. */
  position?: BadgePosition;
}

/**
 * Curated public label for a CollectionType. Internal/organizational types
 * (PARENT, PORTFOLIO, HOME, CLIENT_GALLERY, MISC) return null so they are never
 * surfaced to visitors; only visitor-facing types map to a friendly label.
 */
export function collectionTypeToPublicLabel(type: CollectionType): string | null {
  switch (type) {
    case CollectionType.ART_GALLERY:
      return 'Gallery';
    case CollectionType.BLOG:
      return 'Story';
    case CollectionType.PARENT:
    case CollectionType.PORTFOLIO:
    case CollectionType.HOME:
    case CollectionType.CLIENT_GALLERY:
    case CollectionType.MISC:
      return null;
    default:
      return null;
  }
}

/** Canonical overlay badge: a positioned label chip (tone + corner). */
export function Badge({ label, tone = 'date', position }: BadgeProps): ReactElement | null {
  if (label === null) {
    return null;
  }
  const pos: BadgePosition = position ?? (tone === 'card' ? 'start' : 'end');
  const classes = [styles.badge, styles[tone], styles[pos]].filter(Boolean).join(' ');
  return <span className={classes}>{label}</span>;
}

export default Badge;
