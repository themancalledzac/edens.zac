'use client';

import Image from 'next/image';
import Link from 'next/link';

import { useParallax } from '@/app/hooks/useParallax';
import { type CollectionModel } from '@/app/types/Collection';
import { pickImageDimensions } from '@/app/utils/contentTypeGuards';

import styles from './LocationCollections.module.scss';

interface CollectionCardProps {
  collection: CollectionModel;
}

function CollectionCard({ collection }: CollectionCardProps) {
  const parallaxRef = useParallax({ enableParallax: true });
  const { width: coverWidth, height: coverHeight } = pickImageDimensions(collection.coverImage);

  return (
    <div ref={parallaxRef} className={styles.cardWrapper}>
      <Link href={`/${collection.slug}`} className={styles.card}>
        <div className={styles.imageWrapper}>
          {collection.coverImage?.imageUrl ? (
            <Image
              src={collection.coverImage.imageUrl}
              alt={collection.title}
              width={coverWidth ?? 400}
              height={coverHeight ?? 225}
              sizes="(min-width: 768px) 200px, 140px"
              className={`${styles.cardImage} parallax-bg`}
            />
          ) : (
            <div className={`${styles.placeholder} parallax-bg`} />
          )}
        </div>
        <div className={styles.overlay}>
          <span className={styles.title}>{collection.title}</span>
        </div>
      </Link>
    </div>
  );
}

interface LocationCollectionsProps {
  collections: CollectionModel[];
}

export default function LocationCollections({ collections }: LocationCollectionsProps) {
  if (!Array.isArray(collections) || collections.length === 0) return null;

  return (
    <div className={styles.collectionsRow}>
      {collections.map(collection => (
        <CollectionCard key={collection.id} collection={collection} />
      ))}
    </div>
  );
}
