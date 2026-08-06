'use client';

import { FollowButton } from '@/app/components/Personal/FollowButton';
import { CoverCard } from '@/app/components/ui/CoverCard/CoverCard';
import { type CollectionModel } from '@/app/types/Collection';
import { pickImageDimensions } from '@/app/utils/contentTypeGuards';

import styles from './LocationCollections.module.scss';

interface CollectionCardProps {
  collection: CollectionModel;
}

function CollectionCard({ collection }: CollectionCardProps) {
  const { width: coverWidth, height: coverHeight } = pickImageDimensions(collection.coverImage);

  return (
    <CoverCard
      className={styles.cardWrapper}
      href={`/${collection.slug}`}
      title={collection.title}
      imageUrl={collection.coverImage?.imageUrl}
      imageAlt={collection.title}
      width={coverWidth}
      height={coverHeight}
      sizes="(min-width: 768px) 200px, 140px"
    >
      <FollowButton collectionId={collection.id} />
    </CoverCard>
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
