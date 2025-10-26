import { notFound } from 'next/navigation';

import { type CollectionUpdateResponse, fetchCollectionUpdateMetadata } from '@/app/lib/api/home';

import ManageClient from './ManageClient';

interface ManageCollectionPageProps {
  params: Promise<{
    slug?: string[];
  }>;
}

/**
 * Admin Collection Management Page (Server Component)
 *
 * Handles initial data fetching server-side and passes to client component.
 * - If no slug: Shows create mode
 * - If slug exists: Fetches collection + metadata in single call
 * - Proper 404 handling at server level
 *
 * @param params - Route parameters containing optional slug
 * @returns Server component with client component for UI logic
 */
export default async function ManageCollectionPage({ params }: ManageCollectionPageProps) {
  const { slug: slugArray } = await params;
  const slug = slugArray?.[0];

  // CREATE MODE: No slug provided
  if (!slug) {
    // Fallback to slug again
    return <ManageClient />;
  }

  // UPDATE MODE: Fetch both collection and metadata in a single server-side call
  try {
    const data: CollectionUpdateResponse = await fetchCollectionUpdateMetadata(slug);
    if (!data.collection) {
      return notFound();
    }

    if(data) {
      return <ManageClient initialData={data} />;
    }
  } catch (error) {
    console.error('Error fetching collection for manage page:', error);
    return notFound();
  }
}