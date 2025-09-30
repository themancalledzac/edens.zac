import { Suspense } from 'react';

import { type HomeCardModel } from '@/app/types/HomeCardModel';

import { CardsGridSkeleton } from '../CardsGrid/CardsGridSkeleton';
import { GridSection } from '../GridSection/GridSection';
import SiteHeader from '../SiteHeader/SiteHeader';
import styles from './ContentCollectionPage.module.scss';

interface ContentCollectionPageProps {
  cardsPromise: Promise<HomeCardModel[] | null>;
  collectionType?: string;
}

/**
 * Content Collection Page
 *
 * Consolidated component that displays collections of content cards with
 * streaming support. Handles async data loading, layout, and grid rendering
 * all in one place with Suspense boundaries for loading states.
 *
 * @param cardsPromise - Promise resolving to array of home card data
 * @param collectionType - Optional collection type for future customization
 * @returns Server component with streamed content loading
 */
export default async function ContentCollectionPage({
  cardsPromise,
  collectionType: _collectionType,
}: ContentCollectionPageProps) {
  const cards = await cardsPromise;

  // Calculate row indices for both desktop and mobile
  const cardsWithRows = cards?.map((card: HomeCardModel, index) => ({
    card,
    desktopRowIndex: Math.floor(index / 2), // Desktop: 2 columns
    mobileRowIndex: index, // Mobile: 1 column (each item is its own row)
  }));

  return (
    <div className={styles.container}>
      <SiteHeader/>
      <main className={styles.main}>
        <Suspense fallback={<CardsGridSkeleton />}>
          {cardsWithRows && cardsWithRows.length > 0 ? (
            <div className={styles.gridContainer}>
              {cardsWithRows.map(({ card, desktopRowIndex, mobileRowIndex }, index) => (
                <GridSection
                  key={card.id}
                  card={card}
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
