/**
 * Collections API - Mirrors backend CollectionController endpoints
 *
 * Read endpoints: /api/read/collections (Production)
 * Admin endpoints: /api/admin/collections (Dev only)
 */

import { notFound } from 'next/navigation';

import { PAGINATION, TIMING } from '@/app/constants';
import {
  buildApiUrl,
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

// ============================================================================
// URL Helpers
// ============================================================================

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
// Response Parsing Helpers
// ============================================================================

/**
 * Parse collection array response from API
 * Handles multiple response formats with fallback logic
 *
 * @param data - Raw response data from API (unknown type)
 * @returns Array of CollectionModel, or empty array if parsing fails
 *
 * @example
 * // Direct array response
 * parseCollectionArrayResponse([{ id: 1, ... }]) // Returns array
 *
 * // Wrapped in object
 * parseCollectionArrayResponse({ content: [{ id: 1, ... }] }) // Returns array
 * parseCollectionArrayResponse({ collections: [{ id: 1, ... }] }) // Returns array
 * parseCollectionArrayResponse({ items: [{ id: 1, ... }] }) // Returns array
 *
 * // Invalid formats
 * parseCollectionArrayResponse(null) // Returns []
 * parseCollectionArrayResponse({}) // Returns []
 */
export function parseCollectionArrayResponse(data: unknown): CollectionModel[] {
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
  const url = buildApiUrl('read', '/collections', { page, size });
  try {
    const res = await fetch(url, {
      next: { revalidate: TIMING.revalidateCache, tags: ['collections-index'] },
    });
    if (res.status === 404) return [];

    const data = await safeJson<unknown>(res);
    return parseCollectionArrayResponse(data);
  } catch {
    return [];
  }
}

/**
 * GET /api/read/collections/{slug}
 * Get collection by slug with paginated content
 * Note: Returns collection regardless of visible flag (visible only affects listings/searches)
 */
export async function getCollectionBySlug(
  slug: string,
  page = 0,
  size: number = PAGINATION.defaultPageSize
): Promise<CollectionModel> {
  if (!slug) throw new Error('slug is required');
  const url = buildApiUrl('read', `/collections/${encodeURIComponent(slug)}`, { page, size });
  const res = await fetch(url, {
    next: { revalidate: 3600, tags: [`collection-${slug}`] },
  });

  // Await the full JSON response - ensures data is fully parsed before returning
  return await safeJson<CollectionModel>(res);
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
  const url = buildApiUrl('read', `/collections/${encodeURIComponent(slug)}`, { page, size });
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
  const url = buildApiUrl('read', `/collections/type/${type}`, { page, size });
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
  const url = buildApiUrl('read', `/collections/${encodeURIComponent(slug)}/access`);
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

/**
 * POST /api/admin/collections/{collectionId}/reorder
 * Reorder content in a collection (supports all content types: IMAGE, COLLECTION, TEXT, GIF)
 */
export async function reorderCollectionContent(
  collectionId: number,
  reorders: Array<{ contentId: number; newOrderIndex: number }>
): Promise<CollectionModel> {
  return fetchAdminPostJsonApi<CollectionModel>(
    `/collections/${collectionId}/reorder`,
    { reorders }
  );
}
