import { fetchAllCollections } from '@/app/lib/api/home';

import ContentCollectionPage from '../../components/ContentCollection/ContentCollectionPage';

/**
 * All Collections Page (Dev/Admin Only)
 *
 * Administrative page that displays ALL content collections regardless of
 * visibility, priority, or access control. Uses the dev-only write API endpoint.
 *
 * @dependencies
 * - fetchAllCollections - Dev API function for retrieving all collections
 * - ContentCollectionPage - Shared component for displaying content collections
 *
 * @returns React Server Component displaying all collections
 */
export default function AllCollectionsPage() {
  const allCardsPromise = fetchAllCollections();

  return <ContentCollectionPage cardsPromise={allCardsPromise} />;
}
