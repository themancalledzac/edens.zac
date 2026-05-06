import { notFound } from 'next/navigation';

import AllImagesClient from '@/app/components/Admin/AllImagesClient';
import { getAllImages } from '@/app/lib/api/content';
import { ApiError } from '@/app/lib/api/core';

/**
 * All Images Page (Dev/Admin Only)
 *
 * Renders every image in the database via the same {@link CollectionPage}
 * pipeline as every other collection page (header, filter bar, grid layout).
 * Pagination is layered on top by {@link AllImagesClient}: SSR delivers page 0
 * (50 oldest images) for fast paint, then a sentinel observer triggers
 * subsequent page fetches as the user scrolls.
 */
export const dynamic = 'force-dynamic';

export default async function AllImagesPage() {
  try {
    const page0 = await getAllImages({ page: 0, size: 50 });
    return <AllImagesClient initial={page0} />;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}
