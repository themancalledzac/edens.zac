import Image from 'next/image';
import { type ReactNode } from 'react';

import styles from './CollectionHeader.module.scss';

export interface CollectionHeaderCover {
  src: string;
  /** Optional override for the cover sizes attribute. */
  sizes?: string;
}

export interface CollectionHeaderProps {
  title: string;
  /** Photo count; rendered as "N photo(s)". Omitted when undefined. */
  count?: number;
  /** Optional cover thumbnail (location pages). Alt text is the title. */
  cover?: CollectionHeaderCover;
  /** Optional breadcrumb / "up to parent" affordance, rendered above the title. */
  breadcrumb?: ReactNode;
}

/**
 * Canonical page header: title (real <h1>) + optional count + optional cover
 * thumbnail + optional breadcrumb slot. Gives every page a real, orienting
 * heading.
 */
export function CollectionHeader({ title, count, cover, breadcrumb }: CollectionHeaderProps) {
  const info = (
    <div className={styles.info}>
      {breadcrumb && <div className={styles.breadcrumb}>{breadcrumb}</div>}
      <h1 className={styles.title}>{title}</h1>
      {count !== undefined && (
        <span className={styles.count}>
          {count} {count === 1 ? 'photo' : 'photos'}
        </span>
      )}
    </div>
  );

  if (!cover) {
    return <header className={styles.header}>{info}</header>;
  }

  return (
    <header className={`${styles.header} ${styles.withCover}`}>
      <div className={styles.coverWrapper}>
        <Image
          src={cover.src}
          alt={title}
          fill
          sizes={cover.sizes ?? '(min-width: 768px) 240px, 140px'}
          className={styles.cover}
          priority
        />
      </div>
      {info}
    </header>
  );
}

export default CollectionHeader;
