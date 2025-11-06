import { getAllCollectionsAdmin } from '@/app/lib/api/collections.new';

import CollectionPage from '../../components/ContentCollection/CollectionPage';

/**
 * All Collections Page (Dev/Admin Only)
 *
 * Administrative page that displays ALL content collections regardless of
 * visibility, priority, or access control. Uses the dev-only write API endpoint.
 *
 * @dependencies
 * - getAllCollectionsAdmin - Dev API function for retrieving all collections
 * - CollectionPage - Shared component for displaying content collections
 *
 * @returns React Server Component displaying all collections
 */

// Force dynamic rendering - admin pages should never be statically generated
export const dynamic = 'force-dynamic';

export default async function AllCollectionsPage() {
  const allCollections = await getAllCollectionsAdmin();

  return <CollectionPage collection={allCollections} />;
}
