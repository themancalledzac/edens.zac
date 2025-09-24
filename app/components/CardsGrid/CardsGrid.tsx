import { type HomeCardModel } from '@/app/types/HomeCardModel';

import styles from '../../page.module.scss';
import { GridSection } from '../GridSection/GridSection';

interface CardsGridProps {
  cards: HomeCardModel[];
}

/**
 * Cards Grid
 *
 * Responsive grid component that displays home card collections with
 * different layouts for desktop (2 columns) and mobile (1 column).
 * Calculates row indices for each card to enable proper styling and animations.
 *
 * @dependencies
 * - HomeCardModel type for card data structure
 * - GridSection component for individual card rendering
 * - page.module.scss for grid container styling
 *
 * @param cards - Array of home card data to display in grid
 * @returns React component rendering responsive card grid
 */
export function CardsGrid({ cards }: CardsGridProps) {
  // Calculate row indices for both desktop and mobile
  const cardsWithRows = cards.map((card: HomeCardModel, index) => ({
    card,
    desktopRowIndex: Math.floor(index / 2), // Desktop: 2 columns
    mobileRowIndex: index // Mobile: 1 column (each item is its own row)
  }));

  return (
    <div className={styles.gridContainer}>
      {cardsWithRows.map(({ card, desktopRowIndex, mobileRowIndex }) => (
        <GridSection
          key={card.id}
          card={card}
          desktopRowIndex={desktopRowIndex}
          mobileRowIndex={mobileRowIndex}
        />
      ))}
    </div>
  );
}