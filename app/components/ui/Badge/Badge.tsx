import { type ReactElement } from 'react';

import { tagNameToSlug } from '@/app/utils/tagUtils';

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
 * The collection fields the public badge derives its label from. Structural so
 * any collection-shaped payload (CollectionModel, ContentCollectionModel,
 * converted parallax cards) can be passed directly. Tags may arrive as full
 * models ({ slug }) or as raw strings. Raw strings are tag NAMES on
 * `CollectionModel.tags` (names only, no slugs — see tagUtils), so every string
 * is normalized through {@link tagNameToSlug} before the slug-keyed lookup;
 * the normalization is idempotent, so slug-shaped strings also match.
 */
export interface CollectionBadgeFields {
  isBlog?: boolean;
  tags?: ReadonlyArray<string | { slug?: string } | null | undefined>;
}

/**
 * Curated public labels keyed by tag slug, in precedence order — the first entry
 * whose slug the collection carries wins, so multi-tag collections get a declared
 * label rather than one decided by tag array order. The backend backfilled the
 * `art-gallery` tag onto former ART_GALLERY collections, so the "Gallery" badge
 * derives from that tag rather than the legacy type enum.
 */
const TAG_PUBLIC_LABELS: ReadonlyArray<readonly [slug: string, label: string]> = [
  ['art-gallery', 'Gallery'],
];

/**
 * Curated public label for a collection. Blogs surface as "Story"; collections
 * carrying a badge-mapped tag (e.g. `art-gallery`) surface that tag's label.
 * Everything else returns null so internal/organizational collections are
 * never labeled for visitors. Null/slugless tag entries degrade to no badge
 * rather than throwing during SSR.
 */
export function collectionPublicLabel(collection: CollectionBadgeFields): string | null {
  if (collection.isBlog === true) {
    return 'Story';
  }
  const slugs = new Set(
    (collection.tags ?? [])
      .map(tag => (typeof tag === 'string' ? tagNameToSlug(tag) : tag?.slug))
      .filter((slug): slug is string => Boolean(slug))
  );
  for (const [slug, label] of TAG_PUBLIC_LABELS) {
    if (slugs.has(slug)) {
      return label;
    }
  }
  return null;
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
