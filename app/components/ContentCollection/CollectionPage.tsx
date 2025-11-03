import { Suspense } from 'react';

import { type CollectionModel } from '@/app/types/Collection';
import { type AnyContentModel, type CollectionContentModel } from '@/app/types/Content';

import { CardsGridSkeleton } from '../CardsGrid/CardsGridSkeleton';
import { GridSection } from '../GridSection/GridSection';
import SiteHeader from '../SiteHeader/SiteHeader';
import styles from './ContentCollectionPage.module.scss';

interface ContentCollectionPageProps {
  collection: CollectionModel | CollectionModel[];
  collectionType?: string;
}

/**
 * Convert CollectionModel to CollectionContentModel
 * Minimal conversion that preserves only the fields needed for content display
 */
function collectionToContentModel(col: CollectionModel): CollectionContentModel {
  return {
    contentType: 'COLLECTION',
    id: col.id,
    title: col.title,
    slug: col.slug,
    collectionType: col.type,
    description: col.description ?? null,
    imageUrl: col.coverImage?.imageUrlWeb ?? null,
    orderIndex: 0,
    visible: col.visible ?? true,
    createdAt: col.createdAt,
    updatedAt: col.updatedAt,
  };
}

/**
 * Content Collection Page
 *
 * Consolidated component that displays content in a grid layout with
 * streaming support. Handles both:
 * - Array of CollectionModel: Converts to CollectionContentModel and displays as cards
 * - Single CollectionModel: Extracts and displays content blocks from collection.content
 *
 * @param collection - Single CollectionModel or array of CollectionModels
 * @param collectionType - Optional collection type for future customization
 * @returns Server component with streamed content loading
 */
export default async function CollectionPage({
  collection,
  collectionType: _collectionType,
}: ContentCollectionPageProps) {
  // Get content blocks to display
  const contentBlocks: AnyContentModel[] = Array.isArray(collection)
    ? collection.map(collectionToContentModel)
    : (collection.content ?? []);

  // Calculate row indices for both desktop and mobile
  const contentWithRows = contentBlocks.map((content, index) => ({
    content,
    desktopRowIndex: Math.floor(index / 2), // Desktop: 2 columns
    mobileRowIndex: index, // Mobile: 1 column (each item is its own row)
  }));

  return (
    <div className={styles.container}>
      <SiteHeader/>
      <main className={styles.main}>
        <Suspense fallback={<CardsGridSkeleton />}>
          {contentWithRows && contentWithRows.length > 0 ? (
            <div className={styles.gridContainer}>
              {contentWithRows.map(({ content, desktopRowIndex, mobileRowIndex }, index) => (
                <GridSection
                  key={content.id}
                  content={content}
                  desktopRowIndex={desktopRowIndex}
                  mobileRowIndex={mobileRowIndex}
                  priority={index < 2} // Priority load first 2 cards (first row on desktop)
                />
              ))}
            </div>
          ) : (
            <CardsGridSkeleton />
          )}
        </Suspense>
      </main>
    </div>
  );
}
