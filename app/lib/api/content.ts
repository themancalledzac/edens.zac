/**
 * Content API - Mirrors backend ContentController endpoints
 *
 * Read endpoints: /api/read/content (Production)
 * Admin endpoints: /api/admin/content (Dev only)
 */

import { TIMING } from '@/app/constants';
import {
  fetchAdminDeleteJsonApi,
  fetchAdminFormDataApi,
  fetchAdminGetApi,
  fetchAdminPatchJsonApi,
  fetchAdminPostJsonApi,
  fetchReadApi,
} from '@/app/lib/api/core';
import {
  type ContentGifModel,
  type ContentImageModel,
  type ContentImageUpdateRequest,
} from '@/app/types/Content';
import { type ContentPersonModel, type ContentTagModel } from '@/app/types/ImageMetadata';

// ============================================================================
// READ Endpoints (Production - /api/read/content)
// ============================================================================

/**
 * GET /api/read/content/tags
 * Get all tags (ordered alphabetically)
 */
export async function getAllTags(): Promise<ContentTagModel[] | null> {
  const raw = await fetchReadApi<Array<{ id: number; tagName: string; slug: string }>>(
    '/content/tags',
    { next: { revalidate: TIMING.revalidateCache, tags: ['content-tags'] } }
  );
  return raw?.map(t => ({ id: t.id, name: t.tagName, slug: t.slug })) ?? null;
}

/**
 * GET /api/read/content/people
 * Get all people (ordered alphabetically)
 */
export async function getAllPeople(): Promise<ContentPersonModel[] | null> {
  const raw = await fetchReadApi<Array<{ id: number; personName: string; slug: string }>>(
    '/content/people',
    { next: { revalidate: TIMING.revalidateCache, tags: ['content-people'] } }
  );
  return raw?.map(p => ({ id: p.id, name: p.personName, slug: p.slug })) ?? null;
}

/**
 * GET /api/read/content/cameras
 * Get all cameras (ordered alphabetically)
 */
export async function getAllCameras(): Promise<Array<{ id: number; cameraName: string }> | null> {
  return fetchReadApi('/content/cameras', {
    next: { revalidate: TIMING.revalidateCache, tags: ['content-cameras'] },
  });
}

/**
 * GET /api/read/content/locations
 * Get all locations with image counts (ordered alphabetically)
 */
export async function getAllLocations(): Promise<Array<{
  id: number;
  name: string;
  slug: string;
  count?: number;
}> | null> {
  return fetchReadApi('/content/locations', {
    next: { revalidate: TIMING.revalidateCache, tags: ['content-locations'] },
  });
}

/**
 * GET /api/read/content/lenses
 * Get all lenses (ordered alphabetically)
 */
export async function getAllLenses(): Promise<Array<{ id: number; lensName: string }> | null> {
  return fetchReadApi('/content/lenses', {
    next: { revalidate: TIMING.revalidateCache, tags: ['content-lenses'] },
  });
}

/**
 * Search params for the image search endpoint.
 * Within each dimension: OR logic (tagIds=1,2 means "tag 1 OR tag 2").
 * Across dimensions: AND logic (tagIds=1&cameraId=3 means "tag 1 AND camera 3").
 */
export interface SearchImagesParams {
  tagIds?: number[];
  personIds?: number[];
  cameraId?: number;
  locationId?: number;
  lensId?: number;
  minRating?: number;
  isFilm?: boolean;
  blackAndWhite?: boolean;
  page?: number;
  size?: number;
}

/**
 * GET /api/read/content/images/search
 * Multi-dimensional image search with optional filters
 */
export async function searchImages(params: SearchImagesParams): Promise<ContentImageModel[]> {
  const searchParams = new URLSearchParams();

  if (params.tagIds?.length) searchParams.set('tagIds', params.tagIds.join(','));
  if (params.personIds?.length) searchParams.set('personIds', params.personIds.join(','));
  if (params.cameraId !== undefined) searchParams.set('cameraId', String(params.cameraId));
  if (params.locationId !== undefined) searchParams.set('locationId', String(params.locationId));
  if (params.lensId !== undefined) searchParams.set('lensId', String(params.lensId));
  if (params.minRating !== undefined) searchParams.set('minRating', String(params.minRating));
  if (params.isFilm !== undefined) searchParams.set('isFilm', String(params.isFilm));
  if (params.blackAndWhite !== undefined)
    searchParams.set('blackAndWhite', String(params.blackAndWhite));
  if (params.page !== undefined) searchParams.set('page', String(params.page));
  if (params.size !== undefined) searchParams.set('size', String(params.size));

  const query = searchParams.toString();
  const endpoint = `/content/images/search${query ? `?${query}` : ''}`;

  const result = await fetchReadApi<ContentImageModel[] | { content: ContentImageModel[] }>(
    endpoint,
    { next: { revalidate: TIMING.revalidateCache, tags: ['search-images'] } }
  );

  if (result === null) return [];
  // Handle both array response and paginated wrapper
  if (Array.isArray(result)) return result;
  if ('content' in result && Array.isArray(result.content)) return result.content;
  console.error(
    '[searchImages] Unexpected response shape:',
    typeof result,
    result !== null && typeof result === 'object' ? Object.keys(result) : ''
  );
  throw new Error(
    `[searchImages] Unexpected response shape: expected array or { content: [] }, got ${typeof result}`
  );
}

/**
 * GET /api/read/content/film-metadata
 * Get film metadata (film types and formats)
 */
export async function getFilmMetadata(): Promise<{
  filmTypes: Array<{ id: number; filmTypeName: string; defaultIso: number }>;
  filmFormats: Array<{ name: string; displayName: string }>;
} | null> {
  return fetchReadApi('/content/film-metadata', {
    next: { revalidate: TIMING.revalidateCache, tags: ['content-film-metadata'] },
  });
}

// ============================================================================
// ADMIN Endpoints (Dev only - /api/admin/content)
// ============================================================================

/**
 * Response shape for image upload operations.
 * Backend returns three arrays: successfully uploaded images, failed filenames, and skipped filenames.
 */
export interface ImageUploadResponse {
  successful: ContentImageModel[];
  failed: Array<{ filename: string; reason: string }>;
  skipped: Array<{ filename: string; reason: string }>;
}

/**
 * POST /api/admin/content/images/{collectionId}
 * Create and upload images to a collection
 */
export async function createImages(
  collectionId: number,
  formData: FormData
): Promise<ImageUploadResponse | null> {
  return fetchAdminFormDataApi<ImageUploadResponse>(`/content/images/${collectionId}`, formData);
}

/**
 * POST /api/admin/content/{collectionId}/gifs
 * Upload a single GIF or video file to a collection.
 * Accepted MIME types: video/mp4, video/quicktime, image/gif
 */
export async function createGif(collectionId: number, file: File): Promise<ContentGifModel | null> {
  const formData = new FormData();
  formData.append('file', file);
  return fetchAdminFormDataApi<ContentGifModel>(`/content/${collectionId}/gifs`, formData);
}

/**
 * POST /api/admin/content/content
 * Create text or code content
 */
export async function createTextContent(request: {
  collectionId: number;
  content: string;
  format?: 'plain' | 'markdown' | 'html';
  align?: 'left' | 'center' | 'right';
}): Promise<{ id: number; contentType: string } | null> {
  return fetchAdminPostJsonApi('/content/content', request);
}

/**
 * PATCH /api/admin/content/images
 * Update one or more images
 */
export async function updateImages(updates: ContentImageUpdateRequest[]): Promise<{
  updatedImages: ContentImageModel[];
  newMetadata?: {
    tags?: Array<{ id: number; tagName: string; slug: string }>;
    people?: Array<{ id: number; personName: string; slug: string }>;
    cameras?: Array<{ id: number; cameraName: string }>;
    lenses?: Array<{ id: number; lensName: string }>;
    filmTypes?: Array<{ id: number; filmTypeName: string; defaultIso: number }>;
  };
} | null> {
  const result = await fetchAdminPatchJsonApi<{
    updatedImages: ContentImageModel[];
    newMetadata?: {
      tags?: Array<{ id: number; tagName: string; slug: string }>;
      people?: Array<{ id: number; personName: string; slug: string }>;
      cameras?: Array<{ id: number; cameraName: string }>;
      lenses?: Array<{ id: number; lensName: string }>;
      filmTypes?: Array<{ id: number; filmTypeName: string; defaultIso: number }>;
    };
  }>('/content/images', updates);

  return result;
}

/**
 * Filter + pagination params for the admin /all-images endpoint.
 * All filter fields are optional; only set fields participate in the query.
 * Within each list dimension: OR logic. Across dimensions: AND logic.
 */
export interface GetAllImagesParams {
  page?: number;
  size?: number;
  locationId?: number;
  tagIds?: number[];
  personIds?: number[];
  cameraId?: number;
  lensId?: number;
  /** Returns images with rating >= minRating (1-5). */
  minRating?: number;
  isFilm?: boolean;
  blackAndWhite?: boolean;
  /** ISO YYYY-MM-DD; inclusive lower bound on capture_date. */
  captureStartDate?: string;
  /** ISO YYYY-MM-DD; inclusive upper bound on capture_date. */
  captureEndDate?: string;
}

/**
 * Paginated response shape used by the `/all-images` UI. Carries the items
 * for the requested page plus envelope metadata so the caller can advance the
 * cursor without a second round-trip.
 */
export interface PagedImages {
  items: ContentImageModel[];
  page: number;
  totalPages: number;
  totalElements: number;
  isLast: boolean;
}

/**
 * GET /api/admin/content/images
 * Get a single page of images (filtered + paginated). Backend returns a Spring
 * `Page<>` envelope (`{ content, totalElements, totalPages, last, number, ... }`),
 * which we unwrap into {@link PagedImages}. Tolerates a bare array fallback for
 * resilience against future shape changes.
 */
export async function getAllImages(params: GetAllImagesParams = {}): Promise<PagedImages> {
  const {
    page = 0,
    size = 50,
    locationId,
    tagIds,
    personIds,
    cameraId,
    lensId,
    minRating,
    isFilm,
    blackAndWhite,
    captureStartDate,
    captureEndDate,
  } = params;
  const search = new URLSearchParams();
  search.set('page', String(page));
  search.set('size', String(size));
  if (locationId !== undefined) search.set('locationId', String(locationId));
  if (tagIds?.length) {
    for (const id of tagIds) search.append('tagIds', String(id));
  }
  if (personIds?.length) {
    for (const id of personIds) search.append('personIds', String(id));
  }
  if (cameraId !== undefined) search.set('cameraId', String(cameraId));
  if (lensId !== undefined) search.set('lensId', String(lensId));
  if (minRating !== undefined) search.set('minRating', String(minRating));
  if (isFilm !== undefined) search.set('isFilm', String(isFilm));
  if (blackAndWhite !== undefined) search.set('blackAndWhite', String(blackAndWhite));
  if (captureStartDate) search.set('captureStartDate', captureStartDate);
  if (captureEndDate) search.set('captureEndDate', captureEndDate);

  const data = await fetchAdminGetApi<unknown>(`/content/images?${search.toString()}`, {
    cache: 'no-store',
  });

  if (data && typeof data === 'object') {
    const env = data as Record<string, unknown>;
    const items = Array.isArray(env.content) ? (env.content as ContentImageModel[]) : [];
    const totalElements = typeof env.totalElements === 'number' ? env.totalElements : items.length;
    const totalPages =
      typeof env.totalPages === 'number'
        ? env.totalPages
        : (size > 0 ? Math.ceil(totalElements / size) : 1);
    const number = typeof env.number === 'number' ? env.number : page;
    const last = typeof env.last === 'boolean' ? env.last : number >= totalPages - 1;
    return { items, page: number, totalPages, totalElements, isLast: last };
  }

  return { items: [], page, totalPages: 0, totalElements: 0, isLast: true };
}

/**
 * DELETE /api/admin/content/images
 * Delete one or more images (deletes from both S3 and database)
 */
export async function deleteImages(imageIds: number[]): Promise<{ deletedIds: number[] } | null> {
  return fetchAdminDeleteJsonApi('/content/images', { imageIds });
}

/**
 * POST /api/admin/content/tags
 * Create a new tag
 */
export async function createTag(request: {
  tagName: string;
}): Promise<{ id: number; tagName: string } | null> {
  return fetchAdminPostJsonApi('/content/tags', request);
}

/**
 * POST /api/admin/content/people
 * Create a new person
 */
export async function createPerson(request: {
  personName: string;
}): Promise<{ id: number; personName: string } | null> {
  return fetchAdminPostJsonApi('/content/people', request);
}
