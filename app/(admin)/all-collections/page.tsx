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

// Force dynamic rendering - admin pages should never be statically generated
export const dynamic = 'force-dynamic';

export default async function AllCollectionsPage() {
  try {
    const allCollections = await getAllCollectionsAdmin();
    return <CollectionPage collection={allCollections ?? []} />;
  } catch (error) {
    // Handle 404s using structured ApiError status when available
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }

    // Re-throw other errors for admin visibility
    throw error;
  }
}
