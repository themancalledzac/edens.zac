/**
 * Collections API - Mirrors backend CollectionController endpoints
 *
 * Read endpoints: /api/read/collections (Production)
 * Admin endpoints: /api/admin/collections (Dev only)
 */

import { notFound } from 'next/navigation';

import { PAGINATION, TIMING } from '@/app/constants';
import {
  fetchAdminDeleteApi,
  fetchAdminGetApi,
  fetchAdminPostJsonApi,
  fetchAdminPutJsonApi,
} from '@/app/lib/api/core';
import {
  type CollectionCreateRequest,
  type CollectionModel,
  type CollectionType,
  type CollectionUpdateRequest,
  type CollectionUpdateResponseDTO,
  type GeneralMetadataDTO,
} from '@/app/types/Collection';
import { isProduction } from '@/app/utils/environment';

// ============================================================================
// URL Helpers
// ============================================================================

function getReadBaseUrl(): string {
  const base =
    isProduction() && process.env.NEXT_PUBLIC_API_URL
      ? String(process.env.NEXT_PUBLIC_API_URL).replace(/\/+$/, '')
      : 'http://localhost:8080';
  return `${base}/api/read`;
}

function toURL(
  base: string,
  path: string,
  params?: Record<string, string | number | boolean | undefined>
) {
  const url = new URL(`${base}${path.startsWith('/') ? path : '/' + path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function safeJson<T>(res: Response): Promise<T> {
  const ct = res.headers.get('content-type') || '';
  if (!res.ok) {
    let detail: unknown;
    try {
      detail = ct.includes('application/json') ? await res.json() : await res.text();
    } catch {
      detail = await res.text();
    }
    const message = typeof detail === 'string' ? detail : JSON.stringify(detail);
    if (res.status === 404) notFound();
    throw new Error(`API ${res.status}: ${message}`);
  }
  if (!ct.includes('application/json')) throw new Error('Unexpected non-JSON response from API');
  
  // Ensure we fully await and parse the JSON response before returning
  // This prevents any race conditions where the component might render before data is ready
  const json = await res.json();
  return json as T;
}

// ============================================================================
// READ Endpoints (Production - /api/read/collections)
// ============================================================================

/**
 * GET /api/read/collections
 * Get all collections with basic info (paginated)
 */
export async function getAllCollections(
  page = 0,
  size = PAGINATION.homePageSize
): Promise<CollectionModel[]> {
  const url = toURL(getReadBaseUrl(), '/collections', { page, size });
  try {
    const res = await fetch(url, {
      next: { revalidate: TIMING.revalidateCache, tags: ['collections-index'] },
    });
    if (res.status === 404) return [];

    const data = await safeJson<unknown>(res);

    if (Array.isArray(data)) return data as CollectionModel[];
    if (data && typeof data === 'object') {
      const maybe =
        (data as Record<string, unknown>).content ??
        (data as Record<string, unknown>).collections ??
        (data as Record<string, unknown>).items ??
        null;
      if (Array.isArray(maybe)) return maybe as CollectionModel[];
    }

    return [];
  } catch {
    return [];
  }
}

/**
 * GET /api/read/collections/{slug}
 * Get collection by slug with paginated content (PUBLIC - enforces access control)
 */
export async function getCollectionBySlug(
  slug: string,
  page = 0,
  size: number = PAGINATION.defaultPageSize
): Promise<CollectionModel> {
  if (!slug) throw new Error('slug is required');
  const url = toURL(getReadBaseUrl(), `/collections/${encodeURIComponent(slug)}`, { page, size });
  const res = await fetch(url, {
    next: { revalidate: 3600, tags: [`collection-${slug}`] },
  });
  
  // Await the full JSON response - ensures data is fully parsed before returning
  const raw = await safeJson<CollectionModel>(res);

  // Security: Enforce access control for public pages
  const hasAccess = (raw as CollectionModel & { hasAccess?: boolean }).hasAccess;
  if (hasAccess === false) {
    notFound();
  }

  // Backend always returns complete data, so we can trust the structure
  return raw;
}

/**
 * GET /api/read/collections/{slug} (Admin version - no access control)
 * Get collection by slug for admin pages
 */
export async function getCollectionBySlugAdmin(
  slug: string,
  page = 0,
  size: number = PAGINATION.defaultPageSize
): Promise<CollectionModel> {
  if (!slug) throw new Error('slug is required');
  const url = toURL(getReadBaseUrl(), `/collections/${encodeURIComponent(slug)}`, { page, size });
  const res = await fetch(url, {
    next: { revalidate: TIMING.revalidateCache, tags: [`collection-${slug}`] },
  });
  return safeJson<CollectionModel>(res);
}

/**
 * GET /api/read/collections/type/{type}
 * Get visible collections by type ordered by collection date (newest first)
 */
export async function getCollectionsByType(
  type: CollectionType,
  page = 0,
  size = PAGINATION.collectionPageSize
): Promise<CollectionModel[]> {
  if (!type) throw new Error('type is required');
  const url = toURL(getReadBaseUrl(), `/collections/type/${type}`, { page, size });
  const res = await fetch(url, {
    next: { revalidate: TIMING.revalidateCache, tags: [`collections-type-${type}`] },
  });
  return safeJson<CollectionModel[]>(res);
}

/**
 * POST /api/read/collections/{slug}/access
 * Validate password-based access for a client gallery
 */
export async function validateClientGalleryAccess(
  slug: string,
  password: string
): Promise<{ hasAccess: boolean }> {
  if (!slug) throw new Error('slug is required');
  if (!password) throw new Error('password is required');
  const url = toURL(getReadBaseUrl(), `/collections/${encodeURIComponent(slug)}/access`);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ password }),
    cache: 'no-store',
  });
  return safeJson<{ hasAccess: boolean }>(res);
}

// ============================================================================
// ADMIN Endpoints (Dev only - /api/admin/collections)
// ============================================================================

/**
 * POST /api/admin/collections/createCollection
 * Create a new collection
 */
export async function createCollection(
  createRequest: CollectionCreateRequest
): Promise<CollectionUpdateResponseDTO> {
  return fetchAdminPostJsonApi<CollectionUpdateResponseDTO>(
    '/collections/createCollection',
    createRequest
  );
}

/**
 * PUT /api/admin/collections/{id}
 * Update collection metadata. Accepts partial updates
 */
export async function updateCollection(
  id: number,
  updateData: CollectionUpdateRequest
): Promise<CollectionModel> {
  return fetchAdminPutJsonApi<CollectionModel>(`/collections/${id}`, updateData);
}

/**
 * DELETE /api/admin/collections/{id}
 * Delete a collection
 */
export async function deleteCollection(id: number): Promise<void> {
  return fetchAdminDeleteApi<void>(`/collections/${id}`);
}

/**
 * GET /api/admin/collections/all
 * Get all collections ordered by collection date (admin only)
 */
export async function getAllCollectionsAdmin(): Promise<CollectionModel[]> {
  return fetchAdminGetApi<CollectionModel[]>('/collections/all', { cache: 'no-store' });
}

/**
 * GET /api/admin/collections/{slug}/update
 * Get collection with all metadata for the update/manage page
 */
export async function getCollectionUpdateMetadata(
  slug: string
): Promise<CollectionUpdateResponseDTO> {
  if (!slug) throw new Error('slug is required');
  return fetchAdminGetApi<CollectionUpdateResponseDTO>(
    `/collections/${encodeURIComponent(slug)}/update`,
    { cache: 'no-store' }
  );
}

/**
 * GET /api/admin/collections/metadata
 * Get general metadata without a specific collection
 */
export async function getMetadata(): Promise<GeneralMetadataDTO> {
  return fetchAdminGetApi<GeneralMetadataDTO>('/collections/metadata', { cache: 'no-store' });
}
