import { fetchHomePage } from '@/lib/api/home';

import ContentCollectionPage from './components/ContentCollectionPage';

// Home page component
export default function HomePage() {
  const homeCardsPromise = fetchHomePage({ maxPriority: 2, limit: 12 });

  return <ContentCollectionPage cardsPromise={homeCardsPromise} />;
}
