import { type HomeCardModel } from '@/types/HomeCardModel';

import styles from '../page.module.scss';
import { GridSection } from './GridSection';

interface CardsGridProps {
  cards: HomeCardModel[];
}

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