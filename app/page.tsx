import { Suspense } from 'react';

import { fetchHomePage } from '@/lib/api/home';
import { type HomeCardModel } from '@/types/HomeCardModel';

import { GridSection } from './components/GridSection';
import SiteHeader from './components/site-header';
import styles from './page.module.scss';


// Loading component
// Reusable fallback card using local image
const FALLBACK_CARD: HomeCardModel = {
  id: 0,
  title: 'test catalog',
  cardType: 'catalog',
  location: 'seattle',
  priority: 1,
  coverImageUrl: '/img001.jpg',
  slug: 'test-catalog'
};

function HomeLoading() {
  const skeletonKeys = ['sk1','sk2','sk3','sk4','sk5','sk6'];
  return (
        <div className={styles.gridContainer}>
          {skeletonKeys.map((key, i) => (
            <GridSection
              key={`${key}-${i}`}
              card={{ ...FALLBACK_CARD, id: i + 1, slug: `${FALLBACK_CARD.slug}-${i + 1}` }}
              desktopRowIndex={Math.floor(i / 2)}
              mobileRowIndex={i}
            />
          ))}
        </div>
  );
}

// Home content component
async function HomeContent() {
  let homeCards: HomeCardModel[] = [];

  try {
    const result = await fetchHomePage({ maxPriority: 2, limit: 12 });
    if (result && result.length > 0) {
      // TODO:
      //  - Should we also look into saving this in browser memory/application/cookies/etc?
      //  - Check first if exists, if not, fetchHomePage
      //  - On Fetch, we save to short term memory, just a JSON object of HomePageContent objects, so fairly light.
      //  - Keep for say, 30min for a short term cache policy
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
          <HomeLoading />
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