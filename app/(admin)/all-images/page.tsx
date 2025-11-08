import { getAllImages } from '@/app/lib/api/content';
import type { CollectionModel } from '@/app/types/Collection';
import { CollectionType } from '@/app/types/Collection';
import type { ImageContentModel } from '@/app/types/Content';

import CollectionPage from '../../components/ContentCollection/CollectionPage';

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

// Force dynamic rendering - admin pages should never be statically generated
export const dynamic = 'force-dynamic';

/**
 * Create a mock collection from the images list
 */
function createMockCollection(images: ImageContentModel[]): CollectionModel {
  return {
    id: 0, // Mock ID
    type: CollectionType.MISC,
    title: 'All Images',
    slug: 'all-images',
    description: 'All images ordered by date descending (newest first)',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    visible: true,
    content: images,
    contentCount: images.length,
  };
}

export default async function AllImagesPage() {
  const allImages = await getAllImages();

  // Create a mock collection structure that CollectionPage can process
  const mockCollection = createMockCollection(allImages);

  return <CollectionPage collection={mockCollection} />;
}

