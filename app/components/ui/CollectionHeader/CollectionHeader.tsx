import Image from 'next/image';

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
}

/**
 * Canonical page header: title (real <h1>) + optional count + optional cover
 * thumbnail. Gives every page a real, orienting heading.
 */
export function CollectionHeader({ title, count, cover }: CollectionHeaderProps) {
  const info = (
    <div className={styles.info}>
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
