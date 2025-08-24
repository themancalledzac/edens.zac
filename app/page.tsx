import { Suspense } from 'react';

import { fetchHomePage } from '@/lib/api/home';
import { type HomeCardModel } from '@/types/HomeCardModel';

import { GridSection } from './components/GridSection';
import SiteHeader from './components/site-header';
import styles from './page.module.scss';


// Loading component
function HomeLoading() {
  const skeletonKeys = ['sk1','sk2','sk3','sk4','sk5','sk6'];
  return (
    <div className={styles.container}>
      <SiteHeader />
      <main className={styles.main}>
        <div className={styles.gridContainer}>
          {skeletonKeys.map((key) => (
            <div key={key} className={`${styles.gridSection} ${styles.loading}`}>
              <div className={styles.loadingSkeleton} />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

// Home content component
async function HomeContent() {
  let homeCards: HomeCardModel[] = [];

  try {
    const result = await fetchHomePage({ maxPriority: 2, limit: 12 });
    if (result && result.length > 0) {
      homeCards = result;
    }
  } catch (error) {
    console.log('Error loading home page data:', error);
    // Continue with empty array - graceful degradation
  }

  // Calculate row indices for both desktop and mobile
  // Since this is SSR, we'll calculate both and let the hook handle detection
  const cardsWithRows = homeCards.map((card, index) => ({
    card,
    desktopRowIndex: Math.floor(index / 2), // Desktop: 2 columns
    mobileRowIndex: index // Mobile: 1 column (each item is its own row)
  }));

  return (
    <div className={styles.container}>
      <SiteHeader />
      <main className={styles.main}>
        {cardsWithRows.length > 0 ? (
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
        ) : (
          <div className={styles.emptyState}>
            <h2>Welcome to Zac Edens Photography</h2>
            <p>Loading portfolio collections...</p>
          </div>
        )}
      </main>
    </div>
  );
}

// Main page component
export default function HomePage() {
  return (
    <Suspense fallback={<HomeLoading />}>
      <HomeContent />
    </Suspense>
  );
}