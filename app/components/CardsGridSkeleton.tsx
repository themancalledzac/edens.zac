import { type HomeCardModel } from '@/types/HomeCardModel';

import styles from '../page.module.scss';
import { GridSection } from './GridSection';

export function CardsGridSkeleton() {
  const skeletonCards: HomeCardModel[] = Array.from({ length: 6 }, (_, i) => ({
    id: i + 1,
    title: 'Loading...',
    cardType: 'catalog' as const,
    location: 'Loading...',
    priority: 1,
    coverImageUrl: '', // Empty since we'll show loading state
    slug: `loading-${i + 1}`
  }));

  return (
    <div className={styles.gridContainer}>
      {skeletonCards.map((card, i) => (
        <GridSection
          key={`skeleton-${i}`}
          card={card}
          desktopRowIndex={Math.floor(i / 2)}
          mobileRowIndex={i}
        />
      ))}
    </div>
  );
}