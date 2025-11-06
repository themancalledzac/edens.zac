import { type CollectionContentModel } from '@/app/types/Content';

import styles from '../../page.module.scss';
import { GridSection } from '../GridSection/GridSection';

/**
 * Cards Grid Skeleton
 *
 * Loading state component that displays placeholder cards while content
 * is being fetched. Creates mock content blocks to maintain grid layout and
 * provides visual feedback during data loading.
 *
 * @dependencies
 * - CollectionContentModel type for consistent content structure
 * - GridSection component for rendering placeholder cards
 * - page.module.scss for grid container styling
 *
 * @returns React component displaying 6 skeleton loading cards
 */
export function CardsGridSkeleton() {
  const skeletonContent: CollectionContentModel[] = Array.from({ length: 6 }, (_, i) => ({
    contentType: 'COLLECTION' as const,
    id: i + 1,
    title: 'Loading...',
    slug: `loading-${i + 1}`,
    collectionType: 'BLOG',
    orderIndex: i,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    imageUrl: null,
    visible: true,
  }));

  return (
    <div className={styles.gridContainer}>
      {skeletonContent.map((content, i) => (
        <GridSection
          key={`skeleton-${content.id}`}
          content={content}
          desktopRowIndex={Math.floor(i / 2)}
          mobileRowIndex={i}
        />
      ))}
    </div>
  );
}