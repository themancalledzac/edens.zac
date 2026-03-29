import { notFound } from 'next/navigation';

import CollectionPage from '@/app/components/ContentCollection/CollectionPage';
import { getAllCollectionsAdmin } from '@/app/lib/api/collections';
import { ApiError } from '@/app/lib/api/core';

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

export const dynamic = 'force-dynamic';

export default async function AllCollectionsPage() {
  try {
    const allCollections = await getAllCollectionsAdmin();
    return <CollectionPage collection={allCollections ?? []} />;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}
