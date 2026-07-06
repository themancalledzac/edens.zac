// Admin = authenticated admin principal: the backend enforces hasRole('ADMIN') on
// /api/admin/** (see docs 009). Gating centralized in app/(admin)/layout.tsx via requireAdmin().
import { notFound } from 'next/navigation';

import AllImagesClient from '@/app/components/Admin/AllImagesClient';
import { getAllImages } from '@/app/lib/api/content';
import { ApiError } from '@/app/lib/api/core';
import { resolveSsrViewport } from '@/app/utils/ssrViewport';

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
    const [page0, ssrViewport] = await Promise.all([
      getAllImages({ page: 0, size: 150 }),
      resolveSsrViewport(),
    ]);
    return <AllImagesClient initial={page0} ssrViewport={ssrViewport} />;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}
