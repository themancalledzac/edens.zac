/**
 * Content API - Mirrors backend ContentController endpoints
 *
 * Read endpoints: /api/read/content (Production)
 * Write endpoints: /api/write/content (Dev only)
 */

import {
  fetchFormDataApi,
  fetchPatchJsonApi,
  fetchPostJsonApi,
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
// WRITE Endpoints (Dev only - /api/write/content)
// ============================================================================

/**
 * POST /api/write/content/images/{collectionId}
 * Create and upload images to a collection
 */
export async function createImages(
  collectionId: number,
  formData: FormData
): Promise<ImageContentModel[]> {
  return fetchFormDataApi<ImageContentModel[]>(`/content/images/${collectionId}`, formData);
}

/**
 * POST /api/write/content/content
 * Create text or code content
 */
export async function createTextContent(request: {
  collectionId: number;
  content: string;
  format?: 'plain' | 'markdown' | 'html';
  align?: 'left' | 'center' | 'right';
}): Promise<any> {
  return fetchPostJsonApi('/content/content', request);
}

/**
 * PATCH /api/write/content/images
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
  return fetchPatchJsonApi('/content/images', updates);
}

/**
 * GET /api/write/content/images
 * Get all images ordered by date descending
 */
export async function getAllImages(): Promise<ImageContentModel[]> {
  return fetchReadApi('/content/images', { cache: 'no-store' });
}

/**
 * DELETE /api/write/content/images
 * Delete one or more images
 */
export async function deleteImages(imageIds: number[]): Promise<{ deletedIds: number[] }> {
  return fetchPostJsonApi('/content/images', { imageIds });
}

/**
 * POST /api/write/content/tags
 * Create a new tag
 */
export async function createTag(request: {
  tagName: string;
}): Promise<{ id: number; tagName: string }> {
  return fetchPostJsonApi('/content/tags', request);
}

/**
 * POST /api/write/content/people
 * Create a new person
 */
export async function createPerson(request: {
  personName: string;
}): Promise<{ id: number; personName: string }> {
  return fetchPostJsonApi('/content/people', request);
}
