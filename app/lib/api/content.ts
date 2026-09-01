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
  fetchPublicRead,
} from '@/app/lib/api/core';
import {
  type CollectionUpdate,
  type LocationUpdate,
  type PersonUpdate,
  type TagUpdate,
} from '@/app/types/Collection';
import {
  type ContentGifModel,
  type ContentImageModel,
  type ContentImageUpdateRequest,
} from '@/app/types/Content';
import { type ContentTagModel } from '@/app/types/Metadata';
import { logger } from '@/app/utils/logger';

// ============================================================================
// READ Endpoints (Production - /api/read/content)
// ============================================================================

/**
 * GET /api/read/content/tags
 * Get all tags (ordered alphabetically)
 */
export async function getAllTags(): Promise<ContentTagModel[] | null> {
  const raw = await fetchPublicRead<Array<{ id: number; tagName: string; slug: string }>>(
    '/content/tags',
    { next: { revalidate: TIMING.revalidateCache, tags: ['content-tags'] } }
  );
  return raw?.map(t => ({ id: t.id, name: t.tagName, slug: t.slug })) ?? null;
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
  return fetchPublicRead('/content/locations', {
    next: { revalidate: TIMING.revalidateCache, tags: ['content-locations'] },
  });
}

/**
 * The filter dimensions the public search endpoint and the admin all-images endpoint share.
 * Within each dimension: OR logic (tagIds=1,2 means "tag 1 OR tag 2").
 * Across dimensions: AND logic (tagIds=1&cameraId=3 means "tag 1 AND camera 3").
 */
export interface ImageFilterParams {
  tagIds?: number[];
  personIds?: number[];
  cameraId?: number;
  locationId?: number;
  lensId?: number;
  /** Returns images with rating >= minRating (1-5). */
  minRating?: number;
  isFilm?: boolean;
  blackAndWhite?: boolean;
}

/**
 * Build the shared filter half of the query string for the two image endpoints.
 *
 * `listEncoding` is the one thing the two backends disagree on: the public search endpoint reads
 * `tagIds=1,2` as one comma-joined value, the admin endpoint reads `tagIds=1&tagIds=2` as repeats.
 * Getting that wrong returns the wrong photos rather than erroring, so it is an explicit argument
 * with no default.
 *
 * Pagination is deliberately excluded — search sends `page`/`size` only when given, admin always
 * sends them with defaults, and folding that difference in here would hide it.
 */
function buildImageFilterParams(
  params: ImageFilterParams,
  listEncoding: 'csv' | 'repeat'
): URLSearchParams {
  const search = new URLSearchParams();

  const appendList = (key: string, ids: number[] | undefined): void => {
    if (!ids?.length) return;
    if (listEncoding === 'csv') {
      search.set(key, ids.join(','));
      return;
    }
    for (const id of ids) search.append(key, String(id));
  };

  appendList('tagIds', params.tagIds);
  appendList('personIds', params.personIds);

  if (params.cameraId !== undefined) search.set('cameraId', String(params.cameraId));
  if (params.locationId !== undefined) search.set('locationId', String(params.locationId));
  if (params.lensId !== undefined) search.set('lensId', String(params.lensId));
  if (params.minRating !== undefined) search.set('minRating', String(params.minRating));
  if (params.isFilm !== undefined) search.set('isFilm', String(params.isFilm));
  if (params.blackAndWhite !== undefined) search.set('blackAndWhite', String(params.blackAndWhite));

  return search;
}

/** Search params for the image search endpoint. */
export interface SearchImagesParams extends ImageFilterParams {
  page?: number;
  size?: number;
}

/**
 * GET /api/read/content/images/search
 * Multi-dimensional image search with optional filters
 */
export async function searchImages(params: SearchImagesParams): Promise<ContentImageModel[]> {
  const searchParams = buildImageFilterParams(params, 'csv');

  if (params.page !== undefined) searchParams.set('page', String(params.page));
  if (params.size !== undefined) searchParams.set('size', String(params.size));

  const query = searchParams.toString();
  const endpoint = `/content/images/search${query ? `?${query}` : ''}`;

  const result = await fetchPublicRead<ContentImageModel[] | { content: ContentImageModel[] }>(
    endpoint,
    { next: { revalidate: TIMING.revalidateCache, tags: ['search-images'] } }
  );

  if (result === null) return [];
  // Handle both array response and paginated wrapper
  if (Array.isArray(result)) return result;
  if ('content' in result && Array.isArray(result.content)) return result.content;
  logger.error('searchImages', 'Unexpected response shape', undefined, {
    type: typeof result,
    keys: result !== null && typeof result === 'object' ? Object.keys(result) : [],
  });
  throw new Error(
    `[searchImages] Unexpected response shape: expected array or { content: [] }, got ${typeof result}`
  );
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
 * Patch payload for {@link updateGif}. Only non-null fields are applied on the backend.
 *
 * Mirrors the slice of {@link ContentImageUpdateRequest} that makes sense for animated content —
 * no EXIF/equipment fields. `tags`, `people`, `locations`, and `collections` use the
 * prev/newValue/remove pattern so a single request can add, remove, and re-order memberships at
 * once. People + locations are general relational metadata (not EXIF), so a GIF/MP4 can carry them
 * just like an image.
 */
export interface ContentGifUpdateRequest {
  title?: string;
  rating?: number;
  /** ISO capture date copied from a reference image; persisted to content_gif.capture_date. */
  captureDate?: string | null;
  tags?: TagUpdate;
  /** Person updates using prev/newValue/remove pattern (many-to-many) */
  people?: PersonUpdate;
  /** Location updates using prev/newValue/remove pattern (many-to-many) */
  locations?: LocationUpdate;
  collections?: CollectionUpdate;
}

/**
 * DELETE /api/admin/content/gifs/{id}
 * Delete a GIF/MP4 content block. Cleans up the S3 objects + DB rows. Returns the deleted id
 * on success, or `null` if the backend reported the GIF was not found. The endpoint takes the
 * id as a path param; the empty body satisfies the shared admin DELETE helper.
 */
export async function deleteGif(id: number): Promise<{ deletedId: number } | null> {
  return fetchAdminDeleteJsonApi<{ deletedId: number }>(`/content/gifs/${id}`, {});
}

/**
 * PATCH /api/admin/content/gifs/{id}
 * Update title/rating/tags/people/locations/collections on an existing GIF/MP4 content block. The
 * backend mirrors the IMAGE update slice that makes sense for animated content — no EXIF/equipment
 * fields.
 */
export async function updateGif(
  id: number,
  request: ContentGifUpdateRequest
): Promise<ContentGifModel | null> {
  return fetchAdminPatchJsonApi<ContentGifModel>(`/content/gifs/${id}`, request);
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
export interface GetAllImagesParams extends ImageFilterParams {
  page?: number;
  size?: number;
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
  const { page = 0, size = 50, captureStartDate, captureEndDate } = params;
  const search = new URLSearchParams();
  search.set('page', String(page));
  search.set('size', String(size));
  for (const [key, value] of buildImageFilterParams(params, 'repeat')) search.append(key, value);
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
        : size > 0
          ? Math.ceil(totalElements / size)
          : 1;
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
 * POST /api/admin/metadata/cameras
 * Create a new camera with optional film metadata
 */
export async function createCamera(request: {
  cameraName: string;
  isFilm?: boolean;
  defaultFilmFormat?: string | null;
}): Promise<{ id: number; cameraName: string; isFilm: boolean } | null> {
  return fetchAdminPostJsonApi('/metadata/cameras', request);
}
