import { CollectionType } from '@/app/types/ContentCollection';
import { type HomeCardModel } from '@/app/types/HomeCardModel';

import styles from '../../page.module.scss';
import { GridSection } from '../GridSection/GridSection';

/**
 * Cards Grid Skeleton
 *
 * Loading state component that displays placeholder cards while content
 * is being fetched. Creates mock card data to maintain grid layout and
 * provides visual feedback during data loading.
 *
 * @dependencies
 * - HomeCardModel type for consistent card structure
 * - GridSection component for rendering placeholder cards
 * - page.module.scss for grid container styling
 *
 * @returns React component displaying 6 skeleton loading cards
 */
export function CardsGridSkeleton() {
  const skeletonCards: HomeCardModel[] = Array.from({ length: 6 }, (_, i) => ({
    id: i + 1,
    title: 'Loading...',
    cardType: CollectionType.blogs, // Use proper CollectionType enum
    location: 'Loading...',
    priority: 1,
    coverImageUrl: '', // Empty since we'll show loading state
    slug: `loading-${i + 1}`
  }));

  return (
    <div className={styles.gridContainer}>
      {skeletonCards.map((card, i) => (
        <GridSection
          key={`skeleton-${card.id}`}
          card={card}
          desktopRowIndex={Math.floor(i / 2)}
          mobileRowIndex={i}
        />
      ))}
    </div>
  );
}