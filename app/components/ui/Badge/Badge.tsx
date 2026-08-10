import { type ReactElement } from 'react';

import { tagNameToSlug } from '@/app/utils/tagUtils';

import styles from './Badge.module.scss';

export type BadgeTone = 'card' | 'date';

export interface BadgeProps {
  /** Text to display. When null, the badge renders nothing. */
  label: string | null;
  /** Visual treatment: `card` (uppercase type chip) or `date`. Default `date`. */
  tone?: BadgeTone;
}

/**
 * The collection fields the public badge derives its label from. Structural so any
 * collection-shaped payload can be passed directly. Tags arrive either as models
 * ({ slug }) or as raw NAMES (`CollectionModel.tags`), so strings are normalized
 * through {@link tagNameToSlug} — idempotent, so slug-shaped strings match too.
 */
export interface CollectionBadgeFields {
  isBlog?: boolean;
  tags?: ReadonlyArray<string | { slug?: string } | null | undefined>;
}

/**
 * Curated public labels keyed by tag slug, in precedence order — the first entry
 * whose slug the collection carries wins, so multi-tag collections get a declared
 * label rather than one decided by tag array order.
 *
 * The "Gallery" badge derives from an ordinary `art-gallery` tag, applied by hand.
 * Backend V50 briefly backfilled that tag onto the former ART_GALLERY collections,
 * but V51 deleted it again (decision D6): the grouping was dropped, not converted to
 * tags. So this entry maps a tag an operator chooses to apply — it is not a survivor
 * of the deleted type enum, and nothing backfills it.
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

/**
 * Canonical overlay badge: a label chip whose corner follows its tone — `card`
 * pins to the top-left, `date` to the top-right.
 */
export function Badge({ label, tone = 'date' }: BadgeProps): ReactElement | null {
  if (label === null) {
    return null;
  }
  const corner = tone === 'card' ? styles.start : styles.end;
  const classes = [styles.badge, styles[tone], corner].filter(Boolean).join(' ');
  return <span className={classes}>{label}</span>;
}

export default Badge;
