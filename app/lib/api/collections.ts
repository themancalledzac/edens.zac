/**
 * Collections API - Mirrors backend CollectionController endpoints
 *
 * Read endpoints: /api/read/collections (Production)
 * Admin endpoints: /api/admin/collections (Dev only)
 */

import { notFound } from 'next/navigation';

import { PAGINATION, TIMING } from '@/app/constants';
import {
  ApiError,
  buildApiUrl,
  fetchAdminDeleteApi,
  fetchAdminGetApi,
  fetchAdminPostJsonApi,
  fetchAdminPutJsonApi,
  fetchReadApi,
} from '@/app/lib/api/core';
import {
  type CollectionCreateRequest,
  type CollectionModel,
  type CollectionType,
  type CollectionUpdateRequest,
  type CollectionUpdateResponseDTO,
  type GeneralMetadataDTO,
} from '@/app/types/Collection';
import { logger } from '@/app/utils/logger';

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
  try {
    const data = await fetchReadApi<unknown>(
      `/collections?page=${page}&size=${size}`,
      { next: { revalidate: TIMING.revalidateCache, tags: ['collections-index'] } }
    );
    return parseCollectionArrayResponse(data);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return [];
    logger.error('collections', 'Failed to fetch all collections', error);
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
  try {
    const result = await fetchReadApi<CollectionModel>(
      `/collections/${encodeURIComponent(slug)}?page=${page}&size=${size}`,
      { next: { revalidate: TIMING.revalidateCache, tags: [`collection-${slug}`] } }
    );
    if (result === null) notFound();
    return result;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
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
  try {
    const result = await fetchReadApi<CollectionModel[]>(
      `/collections/type/${type}?page=${page}&size=${size}`,
      { next: { revalidate: TIMING.revalidateCache, tags: [`collections-type-${type}`] } }
    );
    return result ?? [];
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
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
  if (!res.ok) {
    let detail: unknown;
    const ct = res.headers.get('content-type') || '';
    try {
      detail = ct.includes('application/json') ? await res.json() : await res.text();
    } catch {
      detail = await res.text();
    }
    const message = typeof detail === 'string' ? detail : JSON.stringify(detail);
    if (res.status === 404) notFound();
    throw new Error(`API ${res.status}: ${message}`);
  }
  return res.json() as Promise<{ hasAccess: boolean }>;
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
): Promise<CollectionUpdateResponseDTO | null> {
  return fetchAdminPostJsonApi<CollectionUpdateResponseDTO>(
    '/collections/createCollection',
    createRequest
  );
}

/**
 * PUT /api/admin/collections/{id}
 * Update collection metadata. Accepts partial updates
 * Returns full CollectionUpdateResponseDTO with collection and all metadata
 */
export async function updateCollection(
  id: number,
  updateData: CollectionUpdateRequest
): Promise<CollectionUpdateResponseDTO | null> {
  return fetchAdminPutJsonApi<CollectionUpdateResponseDTO>(`/collections/${id}`, updateData);
}

/**
 * DELETE /api/admin/collections/{id}
 * Delete a collection
 */
export async function deleteCollection(id: number): Promise<void | null> {
  return fetchAdminDeleteApi<void>(`/collections/${id}`);
}

/**
 * GET /api/admin/collections/all
 * Get all collections ordered by collection date (admin only)
 */
export async function getAllCollectionsAdmin(): Promise<CollectionModel[] | null> {
  return fetchAdminGetApi<CollectionModel[]>('/collections/all', { cache: 'no-store' });
}

/**
 * GET /api/admin/collections/{slug}/update
 * Get collection with all metadata for the update/manage page
 */
export async function getCollectionUpdateMetadata(
  slug: string
): Promise<CollectionUpdateResponseDTO | null> {
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
export async function getMetadata(): Promise<GeneralMetadataDTO | null> {
  return fetchAdminGetApi<GeneralMetadataDTO>('/collections/metadata', { cache: 'no-store' });
}

/**
 * POST /api/admin/collections/{collectionId}/reorder
 * Reorder content in a collection (supports all content types: IMAGE, COLLECTION, TEXT, GIF)
 */
export async function reorderCollectionContent(
  collectionId: number,
  reorders: Array<{ contentId: number; newOrderIndex: number }>
): Promise<CollectionModel | null> {
  return fetchAdminPostJsonApi<CollectionModel>(
    `/collections/${collectionId}/reorder`,
    { reorders }
  );
}

/**
 * POST /api/admin/collections/{parentId}/child
 * Create a new child collection and link it to parent
 */
export async function createChildCollection(
  parentId: number,
  createRequest: CollectionCreateRequest
): Promise<CollectionUpdateResponseDTO | null> {
  return fetchAdminPostJsonApi<CollectionUpdateResponseDTO>(
    `/collections/${parentId}/child`,
    createRequest
  );
}
