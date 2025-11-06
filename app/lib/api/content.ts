/**
 * Content API - Mirrors backend ContentController endpoints
 *
 * Read endpoints: /api/read/content (Production)
 * Admin endpoints: /api/admin/content (Dev only)
 */

import {
  fetchAdminFormDataApi,
  fetchAdminGetApi,
  fetchAdminPatchJsonApi,
  fetchAdminPostJsonApi,
  fetchReadApi,
} from '@/app/lib/api/core';
import { type ContentImageUpdateRequest, type ImageContentModel } from '@/app/types/Content';

// ============================================================================
// READ Endpoints (Production - /api/read/content)
// ============================================================================

/**
 * GET /api/read/content/tags
 * Get all tags (ordered alphabetically)
 */
export async function getAllTags(): Promise<Array<{ id: number; tagName: string }>> {
  return fetchReadApi('/content/tags', { next: { revalidate: 3600 } });
}

/**
 * GET /api/read/content/people
 * Get all people (ordered alphabetically)
 */
export async function getAllPeople(): Promise<Array<{ id: number; personName: string }>> {
  return fetchReadApi('/content/people', { next: { revalidate: 3600 } });
}

/**
 * GET /api/read/content/cameras
 * Get all cameras (ordered alphabetically)
 */
export async function getAllCameras(): Promise<Array<{ id: number; cameraName: string }>> {
  return fetchReadApi('/content/cameras', { next: { revalidate: 3600 } });
}

/**
 * GET /api/read/content/film-metadata
 * Get film metadata (film types and formats)
 */
export async function getFilmMetadata(): Promise<{
  filmTypes: Array<{ id: number; filmTypeName: string; defaultIso: number }>;
  filmFormats: Array<{ name: string; displayName: string }>;
}> {
  return fetchReadApi('/content/film-metadata', { next: { revalidate: 3600 } });
}

// ============================================================================
// ADMIN Endpoints (Dev only - /api/admin/content)
// ============================================================================

/**
 * POST /api/admin/content/images/{collectionId}
 * Create and upload images to a collection
 */
export async function createImages(
  collectionId: number,
  formData: FormData
): Promise<ImageContentModel[]> {
  return fetchAdminFormDataApi<ImageContentModel[]>(`/content/images/${collectionId}`, formData);
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
}): Promise<{ id: number; contentType: string }> {
  return fetchAdminPostJsonApi('/content/content', request);
}

/**
 * PATCH /api/admin/content/images
 * Update one or more images
 */
export async function updateImages(updates: ContentImageUpdateRequest[]): Promise<{
  updatedImages: ImageContentModel[];
  newMetadata?: {
    tags?: Array<{ id: number; tagName: string }>;
    people?: Array<{ id: number; personName: string }>;
    cameras?: Array<{ id: number; cameraName: string }>;
    lenses?: Array<{ id: number; lensName: string }>;
    filmTypes?: Array<{ id: number; filmTypeName: string; defaultIso: number }>;
  };
}> {
  return fetchAdminPatchJsonApi('/content/images', updates);
}

/**
 * GET /api/admin/content/images
 * Get all images ordered by date descending
 */
export async function getAllImages(): Promise<ImageContentModel[]> {
  return fetchAdminGetApi<ImageContentModel[]>('/content/images', { cache: 'no-store' });
}

/**
 * DELETE /api/admin/content/images
 * Delete one or more images
 */
export async function deleteImages(imageIds: number[]): Promise<{ deletedIds: number[] }> {
  return fetchAdminPostJsonApi('/content/images', { imageIds });
}

/**
 * POST /api/admin/content/tags
 * Create a new tag
 */
export async function createTag(request: {
  tagName: string;
}): Promise<{ id: number; tagName: string }> {
  return fetchAdminPostJsonApi('/content/tags', request);
}

/**
 * POST /api/admin/content/people
 * Create a new person
 */
export async function createPerson(request: {
  personName: string;
}): Promise<{ id: number; personName: string }> {
  return fetchAdminPostJsonApi('/content/people', request);
}
