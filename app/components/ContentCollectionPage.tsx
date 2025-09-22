import { Suspense } from 'react';

import { type HomeCardModel } from '@/types/HomeCardModel';

import { CardsGrid } from './CardsGrid';
import { CardsGridSkeleton } from './CardsGridSkeleton';
import styles from './ContentCollectionPage.module.scss';
import SiteHeader from './site-header';

interface ContentCollectionContentProps {
  cardsPromise: Promise<HomeCardModel[] | null>;
}

// Async component for content collection data
async function ContentCollectionContent({ cardsPromise }: ContentCollectionContentProps) {
  let cards: HomeCardModel[] = [];

  try {
    const result = await cardsPromise;
    if (result && result.length > 0) {
      cards = result;
    }
  } catch (error) {
    console.log('Error loading content collection data:', error);
    // Continue with empty array - graceful degradation
  }

  if (cards.length === 0) {
    return <CardsGridSkeleton />;
  }

  return <CardsGrid cards={cards} />;
}

interface ContentCollectionPageProps {
  cardsPromise: Promise<HomeCardModel[] | null>;
}

// Main content collection page component
export default function ContentCollectionPage({ cardsPromise }: ContentCollectionPageProps) {
  return (
    <div className={styles.container}>
      <SiteHeader />
      <main className={styles.main}>
        <Suspense fallback={<CardsGridSkeleton />}>
          <ContentCollectionContent cardsPromise={cardsPromise} />
        </Suspense>
      </main>
    </div>
  );
}