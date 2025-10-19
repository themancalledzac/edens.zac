/**
 * Images API (Write Layer)
 *
 * Purpose
 * - Provides functions for updating image metadata and collection relationships
 * - Uses the write API endpoints for mutating operations
 * - Supports partial updates - only send fields that need to be changed
 *
 * When to use
 * - Use for updating image properties, metadata, or collection associations
 * - Use for managing image visibility and ordering within collections
 *
 * Update Strategy
 * - Follows the same pattern as updateCollection
 * - Only fields included in the update DTO will be modified
 * - Null values indicate explicit clearing of a field
 * - Undefined/omitted fields remain unchanged
 */

import { type ImageCollection } from '@/app/types/ContentBlock';

import { fetchPutJsonApi } from './core';

/**
 * DTO for updating an image
 * All fields are optional - only include fields you want to update
 */
export interface UpdateImageDTO {
  /** Image title */
  title?: string | null;

  /** Image caption */
  caption?: string | null;

  /** Alt text for accessibility */
  alt?: string | null;

  /** Image author/photographer */
  author?: string | null;

  /** Image rating (1-5) */
  rating?: number | null;

  /** Camera lens used */
  lens?: string | null;

  /** Whether the image is black and white */
  blackAndWhite?: boolean | null;

  /** Whether the image is from film */
  isFilm?: boolean | null;

  /** Camera shutter speed */
  shutterSpeed?: string | null;

  /** Camera used */
  camera?: string | null;

  /** Focal length */
  focalLength?: string | null;

  /** Location where photo was taken */
  location?: string | null;

  /** F-stop value */
  fstop?: string | null;

  /** ISO value */
  iso?: number | null;

  /**
   * List of collections this image belongs to
   * Each entry should include collectionId, collectionName, visible, and orderIndex
   * Only include collections being added, updated, or removed
   */
  imageCollectionList?: ImageCollection[] | null;
}

/**
 * Update an image with partial data
 *
 * @param imageId - The ID of the image to update
 * @param updates - Object containing only the fields to update
 * @returns The updated image data
 * @throws ApiError if the request fails
 *
 * @example
 * // Update image title and caption
 * await updateImage(123, {
 *   title: "Sunset over the mountains",
 *   caption: "A beautiful sunset captured in the Rockies"
 * });
 *
 * @example
 * // Update image collection associations
 * await updateImage(123, {
 *   imageCollectionList: [
 *     { collectionId: 1, collectionName: "Portfolio", visible: true, orderIndex: 0 },
 *     { collectionId: 2, collectionName: "Landscapes", visible: true, orderIndex: 5 }
 *   ]
 * });
 *
 * @example
 * // Remove a field by setting it to null
 * await updateImage(123, {
 *   caption: null
 * });
 */
export async function updateImage<T = unknown>(imageId: number, updates: UpdateImageDTO): Promise<T> {
  if (!imageId || imageId <= 0) {
    throw new Error('Valid imageId is required');
  }

  if (!updates || Object.keys(updates).length === 0) {
    throw new Error('Updates object must contain at least one field to update');
  }

  return await fetchPutJsonApi<T>(`/images/${imageId}`, updates);
}
