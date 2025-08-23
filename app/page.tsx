import { AlignJustify } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

import { fetchHomePage } from '@/lib/api/home';
import { type HomeCardModel } from '@/types/HomeCardModel';

import { GridSection } from './components/GridSection';
import styles from './page.module.scss';

// Simple Header component for temporary use
function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.navBarWrapper}>
        <div className={styles.navBarLeftWrapper}>
          <Link href="/" className={styles.title}>
            <h2>Zac Edens</h2>
          </Link>
        </div>
        <div className={styles.menuWrapper}>
          {/* TODO: Add dropdown menu functionality */}
          <AlignJustify className={styles.menu} />
        </div>
      </div>
    </header>
  );
}


// Loading component
function HomeLoading() {
  return (
    <div className={styles.container}>
      <Header />
      <main className={styles.main}>
        <div className={styles.gridContainer}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`${styles.gridSection} ${styles.loading}`}>
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

  return (
    <div className={styles.container}>
      <Header />
      <main className={styles.main}>
        {homeCards.length > 0 ? (
          <div className={styles.gridContainer}>
            {homeCards.map((card) => (
              <GridSection key={card.id} card={card} />
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