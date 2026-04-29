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
    const data = await fetchReadApi<unknown>(`/collections?page=${page}&size=${size}`, {
      next: { revalidate: TIMING.revalidateCache, tags: ['collections-index'] },
    });
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
 * GET /api/read/collections/location/{slug}
 * Get visible collections for a location, ordered by collection date (newest first)
 */
export async function getCollectionsByLocation(
  slug: string,
  page = 0,
  size = PAGINATION.collectionPageSize
): Promise<CollectionModel[]> {
  if (!slug) throw new Error('location slug is required');
  try {
    const data = await fetchReadApi<unknown>(
      `/collections/location/${encodeURIComponent(slug)}?page=${page}&size=${size}`,
      { next: { revalidate: TIMING.revalidateCache, tags: [`collections-location-${slug}`] } }
    );
    return parseCollectionArrayResponse(data);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return [];
    throw error;
  }
}

/**
 * POST /api/read/collections/{slug}/access
 *
 * Validates password-based access for a client gallery. Routed through the BFF
 * proxy at `/api/proxy/api/read/...` so it inherits `X-Internal-Secret` injection
 * and Origin allowlist enforcement (matches the contact-messages template).
 *
 * On success, the backend sets an `HttpOnly; Secure; SameSite=Strict` access
 * cookie. The browser stores it transparently — `credentials: 'same-origin'`
 * ensures the cookie is accepted from the same-origin proxy response.
 *
 * Throws `ApiError` with status `429` when the rate limiter rejects the
 * request, so callers can surface a friendly "too many attempts" message.
 */
export async function validateClientGalleryAccess(
  slug: string,
  password: string
): Promise<{ hasAccess: boolean }> {
  if (!slug) throw new Error('slug is required');
  if (!password) throw new Error('password is required');
  const url = `/api/proxy/api/read/collections/${encodeURIComponent(slug)}/access`;
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
    cache: 'no-store',
  });
  if (!res.ok) {
    let detail: unknown;
    const contentType = res.headers.get('content-type') || '';
    try {
      detail = contentType.includes('application/json') ? await res.json() : await res.text();
    } catch {
      detail = '';
    }
    const message =
      typeof detail === 'string' && detail
        ? detail
        : (detail && typeof detail === 'object'
          ? ((detail as { message?: string }).message ?? JSON.stringify(detail))
          : `API error: ${res.status}`);
    if (res.status === 404) throw new ApiError('Gallery not found', 404);
    throw new ApiError(message, res.status);
  }
  // Runtime-validate the response shape — backend should always return
  // `{ hasAccess: boolean }` but a regression here would silently flip the gate
  // to "unlocked" without proof of access.
  const data: unknown = await res.json();
  if (
    typeof data !== 'object' ||
    data === null ||
    typeof (data as { hasAccess?: unknown }).hasAccess !== 'boolean'
  ) {
    throw new ApiError('Unexpected response shape from /access', res.status);
  }
  return { hasAccess: (data as { hasAccess: boolean }).hasAccess };
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
 * Response shape for `POST /api/admin/collections/{id}/send-password`.
 * Backend returns `{ sent: false, reason: 'email-disabled' }` when the SES
 * feature flag is off — the password is still stored, just not emailed.
 */
export interface SendGalleryPasswordResponse {
  sent: boolean;
  reason?: string;
}

/**
 * POST /api/admin/collections/{id}/send-password
 *
 * Sets a new password on a CLIENT_GALLERY collection AND emails the plaintext
 * to the recipient in a single atomic action. Plaintext is never persisted —
 * BCrypt is one-way, so this is the only way to deliver a password to the
 * client. If admin needs to resend, they set a new password.
 */
export async function sendGalleryPassword(
  id: number,
  password: string,
  email: string
): Promise<SendGalleryPasswordResponse | null> {
  return fetchAdminPostJsonApi<SendGalleryPasswordResponse>(`/collections/${id}/send-password`, {
    password,
    email,
  });
}

/**
 * Updates a CLIENT_GALLERY collection's password without sending an email.
 * An empty string clears the password (gallery becomes unprotected). Thin
 * wrapper over `updateCollection` so callers don't have to assemble the
 * partial-update payload themselves.
 */
export async function setGalleryPassword(id: number, password: string): Promise<void> {
  // updateCollection returns null on API failure — without this throw the admin UI
  // shows "Password set." even when the backend never persisted the new hash.
  const result = await updateCollection(id, { id, password });
  if (result === null) {
    throw new ApiError('Failed to update password — see network tab for details.', 500);
  }
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
  return fetchAdminPostJsonApi<CollectionModel>(`/collections/${collectionId}/reorder`, {
    reorders,
  });
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
