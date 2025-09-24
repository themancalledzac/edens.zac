import { Suspense } from 'react';

import { type HomeCardModel } from '@/app/types/HomeCardModel';

import { CardsGrid } from '../CardsGrid/CardsGrid';
import { CardsGridSkeleton } from '../CardsGrid/CardsGridSkeleton';
import SiteHeader from '../SiteHeader/SiteHeader';
import styles from './ContentCollectionPage.module.scss';

interface ContentCollectionContentProps {
  cardsPromise: Promise<HomeCardModel[] | null>;
}

/**
 * Content Collection Content
 *
 * Async server component that resolves card data promise and renders
 * appropriate content or fallback states based on data availability.
 */
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

/**
 * Content Collection Page
 *
 * Main page component that displays collections of content cards with
 * streaming support. Handles async data loading with Suspense boundaries
 * and graceful error handling for failed data fetches.
 *
 * @dependencies
 * - React Suspense for streaming and loading states
 * - HomeCardModel type for card data structure
 * - CardsGrid component for rendering card collections
 * - CardsGridSkeleton for loading state
 * - SiteHeader for page navigation
 *
 * @param cardsPromise - Promise resolving to array of home card data
 * @returns Server component with streamed content loading
 */
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