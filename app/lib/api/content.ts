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

// ============================================================================
// READ Endpoints (Production - /api/read/content)
// ============================================================================

/**
 * GET /api/read/content/tags
 * Get all tags (ordered alphabetically)
 */
export async function getAllTags(): Promise<Array<{ id: number; tagName: string }> | null> {
  return fetchReadApi('/content/tags', { next: { revalidate: TIMING.revalidateCache } });
}

/**
 * GET /api/read/content/people
 * Get all people (ordered alphabetically)
 */
export async function getAllPeople(): Promise<Array<{ id: number; personName: string }> | null> {
  return fetchReadApi('/content/people', { next: { revalidate: TIMING.revalidateCache } });
}

/**
 * GET /api/read/content/cameras
 * Get all cameras (ordered alphabetically)
 */
export async function getAllCameras(): Promise<Array<{ id: number; cameraName: string }> | null> {
  return fetchReadApi('/content/cameras', { next: { revalidate: TIMING.revalidateCache } });
}

/**
 * GET /api/read/content/film-metadata
 * Get film metadata (film types and formats)
 */
export async function getFilmMetadata(): Promise<{
  filmTypes: Array<{ id: number; filmTypeName: string; defaultIso: number }>;
  filmFormats: Array<{ name: string; displayName: string }>;
} | null> {
  return fetchReadApi('/content/film-metadata', { next: { revalidate: TIMING.revalidateCache } });
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
export async function createGif(
  collectionId: number,
  file: File
): Promise<ContentGifModel | null> {
  const formData = new FormData();
  formData.append('file', file);
  return fetchAdminFormDataApi<ContentGifModel>(`/${collectionId}/gifs`, formData);
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
    tags?: Array<{ id: number; tagName: string }>;
    people?: Array<{ id: number; personName: string }>;
    cameras?: Array<{ id: number; cameraName: string }>;
    lenses?: Array<{ id: number; lensName: string }>;
    filmTypes?: Array<{ id: number; filmTypeName: string; defaultIso: number }>;
  };
} | null> {
  const result = await fetchAdminPatchJsonApi<{
    updatedImages: ContentImageModel[];
    newMetadata?: {
      tags?: Array<{ id: number; tagName: string }>;
      people?: Array<{ id: number; personName: string }>;
      cameras?: Array<{ id: number; cameraName: string }>;
      lenses?: Array<{ id: number; lensName: string }>;
      filmTypes?: Array<{ id: number; filmTypeName: string; defaultIso: number }>;
    };
  }>('/content/images', updates);

  return result;
}

/**
 * GET /api/admin/content/images
 * Get all images ordered by date descending
 */
export async function getAllImages(): Promise<ContentImageModel[] | null> {
  return fetchAdminGetApi<ContentImageModel[]>('/content/images', { cache: 'no-store' });
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
