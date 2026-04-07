import { notFound } from 'next/navigation';

import CollectionPage from '@/app/components/ContentCollection/CollectionPage';
import { getAllImages } from '@/app/lib/api/content';
import { ApiError } from '@/app/lib/api/core';
import type { CollectionModel } from '@/app/types/Collection';
import { CollectionType } from '@/app/types/Collection';
import type { ContentImageModel } from '@/app/types/Content';

/**
 * All Images Page (Dev/Admin Only)
 *
 * Administrative page that displays ALL images ordered by date descending (newest first).
 * Uses the admin-only endpoint GET /api/admin/content/images.
 *
 * This page "mocks" a collection by creating a minimal CollectionModel structure
 * that contains all images as content blocks, allowing reuse of the existing
 * CollectionPage component.
 *
 * @dependencies
 * - getAllImages - Admin API function for retrieving all images
 * - CollectionPage - Shared component for displaying content collections
 *
 * @returns React Server Component displaying all images
 */

export const dynamic = 'force-dynamic';

/**
 * Create a mock collection from the images list
 */
function createMockCollection(images: ContentImageModel[]): CollectionModel {
  return {
    id: 0,
    type: CollectionType.MISC,
    title: 'All Images',
    slug: 'all-images',
    description: 'All images ordered by date descending (newest first)',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    visible: true,
    displayMode: 'CHRONOLOGICAL',
    contentPerPage: 200,
    content: images,
    contentCount: images.length,
    locations: [],
  };
}

/**
 * @remarks Handles 404s via structured ApiError when available; re-throws all other errors.
 */
export default async function AllImagesPage() {
  try {
    const allImages = await getAllImages();
    const mockCollection = createMockCollection(allImages ?? []);
    return <CollectionPage collection={mockCollection} chunkSize={4} />;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}
