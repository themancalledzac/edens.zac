'use client';

import Image from 'next/image';
import Link from 'next/link';

import { useParallax } from '@/app/hooks/useParallax';
import { type ContentCollectionModel } from '@/app/types/Content';
import { pickImageDimensions } from '@/app/utils/contentTypeGuards';
import { formatDateRange } from '@/app/utils/formatDateRange';

import styles from './Collections.module.scss';

interface CollectionShowcaseTileProps {
  collection: ContentCollectionModel;
}

/**
 * A single parallax cover tile for the public /collections showcase.
 *
 * Mirrors the LocationCollections cover-card treatment (parallax-bg cover image,
 * title overlay, whole-card link to `/{slug}`) and adds a date label rendered via
 * {@link formatDateRange} so multi-day collections read as approximate ranges.
 */
export function CollectionShowcaseTile({ collection }: CollectionShowcaseTileProps) {
  const parallaxRef = useParallax({ enableParallax: true });
  const { width: coverWidth, height: coverHeight } = pickImageDimensions(collection.coverImage);
  const title = collection.title || collection.slug;
  const dateLabel = formatDateRange(collection.collectionDate, collection.collectionEndDate);

  return (
    <div ref={parallaxRef} className={styles.cardWrapper}>
      <Link href={`/${collection.slug}`} className={styles.card} aria-label={title}>
        <div className={styles.imageWrapper}>
          {collection.coverImage?.imageUrl ? (
            <Image
              src={collection.coverImage.imageUrl}
              alt={title}
              width={coverWidth ?? 400}
              height={coverHeight ?? 225}
              sizes="(min-width: 768px) 320px, 45vw"
              className={`${styles.cardImage} parallax-bg`}
            />
          ) : (
            <div className={`${styles.placeholder} parallax-bg`} />
          )}
        </div>
        <div className={styles.overlay}>
          <span className={styles.title}>{title}</span>
          {dateLabel ? <span className={styles.dateLabel}>{dateLabel}</span> : null}
        </div>
      </Link>
    </div>
  );
}

export default CollectionShowcaseTile;
