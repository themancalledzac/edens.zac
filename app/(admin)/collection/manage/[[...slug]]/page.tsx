import { notFound } from 'next/navigation';

import { fetchCollectionBySlugAdmin } from '@/app/lib/api/home';

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
 * - If slug exists: Fetches collection data and shows update mode
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
    return <ManageClient />;
  }

  // UPDATE MODE: Slug provided, fetch collection data server-side (admin version)
  try {
    const collection = await fetchCollectionBySlugAdmin(slug);

    if (!collection) {
      return notFound();
    }

    return <ManageClient initialCollection={collection} />;
  } catch (error) {
    console.error('Error fetching collection for manage page:', error);
    return notFound();
  }
}