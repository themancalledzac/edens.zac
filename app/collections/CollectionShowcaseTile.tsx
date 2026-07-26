'use client';

import { CoverCard } from '@/app/components/ui/CoverCard/CoverCard';
import { type ContentCollectionModel } from '@/app/types/Content';
import { pickImageDimensions } from '@/app/utils/contentTypeGuards';
import { formatDisplayDateRange } from '@/app/utils/formatDateRange';

interface CollectionShowcaseTileProps {
  collection: ContentCollectionModel;
  /** Eager-load the cover for above-the-fold tiles (LCP candidates). */
  priority?: boolean;
}

/**
 * A single cover tile for the public /collections showcase: the shared {@link CoverCard}
 * plus a date label from {@link formatDisplayDateRange}, so multi-day collections read as
 * exact ranges and single dates as `Mar 3, 2026` rather than raw ISO.
 */
export function CollectionShowcaseTile({
  collection,
  priority = false,
}: CollectionShowcaseTileProps) {
  const { width: coverWidth, height: coverHeight } = pickImageDimensions(collection.coverImage);

  return (
    <CoverCard
      href={`/${collection.slug}`}
      title={collection.title || collection.slug}
      imageUrl={collection.coverImage?.imageUrl}
      width={coverWidth}
      height={coverHeight}
      sizes="(min-width: 768px) 33vw, 45vw"
      priority={priority}
      subtitle={formatDisplayDateRange(collection.collectionDate, collection.collectionEndDate)}
    />
  );
}
