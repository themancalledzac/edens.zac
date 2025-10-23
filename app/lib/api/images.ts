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

import { fetchPatchJsonApi } from './core';

/**
 * Request DTO for creating a new film type on the fly
 *
 * Backend auto-generates technical name from filmTypeName:
 * - filmTypeName: "Kodak Portra 400" → technical name: "KODAK_PORTRA_400"
 */
export interface NewFilmTypeRequest {
  /**
   * Human-readable film type name (e.g., "Kodak Portra 400")
   * Backend will auto-generate technical name from this
   */
  filmTypeName: string;

  /** Default ISO value for this film stock */
  defaultIso: number;
}

/**
 * DTO for updating an image
 * All fields are optional - only include fields you want to update
 */

export interface UpdateImageDTO {
  /** Image ID - required for backend to identify which image to update */
  id?: number;

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

  /**
   * Camera ID to associate with this image (select existing camera)
   * If both cameraId and cameraName are provided, cameraId takes precedence.
   */
  cameraId?: number | null;

  /**
   * Lens ID to associate with this image (select existing lens)
   * If both lensId and lensName are provided, lensId takes precedence.
   */
  lensId?: number | null;

  /** Lens name - will find existing or create new lens entity */
  lensName?: string | null;

  /** Focal length */
  focalLength?: string | null;

  /** Location where photo was taken */
  location?: string | null;

  /** F-stop value */
  fstop?: string | null;

  /** ISO value */
  iso?: number | null;

  /** Film type - enum name (e.g., "KODAK_PORTRA_400") - only used when isFilm is true */
  filmType?: string | null;

  /** Film type ID to associate with this image (only when isFilm is true) */
  filmTypeId?: number | null;

  /** New film type to create and associate with this image (takes precedence over filmTypeId) */
  newFilmType?: NewFilmTypeRequest | null;

  /** Film format - enum name (e.g., "MM_35") - only used when isFilm is true */
  filmFormat?: string | null;

  /** Tag IDs to associate with this image */
  tagIds?: number[] | null;

  /** Person IDs to associate with this image */
  personIds?: number[] | null;

  /** Camera model ID to associate with this image */
  cameraModelId?: number | null;

  /** Camera name - will find existing or create new camera entity */
  cameraName?: string | null;

  /** List of new tag names to create and associate with this image */
  newTags?: string[] | null;

  /** List of new person names to create and associate with this image */
  newPeople?: string[] | null;

  /**
   * List of collections this image belongs to
   * Each entry should include collectionId and collectionName
   * Backend will automatically set visible=true and assign orderIndex
   */
  collections?: ImageCollection[] | null;
}

/**
 * Update an image with partial data
 *
 * Note: The backend expects an array of image updates, so we wrap the single update in an array
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
 *   collections: [
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

  // Backend expects an array of updates and the imageId in the update object
  const updateWithId = { ...updates, id: imageId };
  const updateArray = [updateWithId];

  return await fetchPatchJsonApi<T>('/blocks/images', updateArray);
}

/**
 * Update multiple images with the same or different updates in a single API call
 *
 * @param imageUpdates - Array of objects containing imageId and updates for each image
 * @returns Promise that resolves when all updates complete
 * @throws ApiError if the request fails
 *
 * @example
 * // Update multiple images with same metadata
 * await updateMultipleImages([
 *   { imageId: 1, updates: { location: "New York", author: "John Doe" } },
 *   { imageId: 2, updates: { location: "New York", author: "John Doe" } },
 *   { imageId: 3, updates: { location: "New York", author: "John Doe" } }
 * ]);
 */
export async function updateMultipleImages(
  imageUpdates: Array<{ imageId: number; updates: UpdateImageDTO }>
): Promise<void> {
  if (!imageUpdates || imageUpdates.length === 0) {
    throw new Error('At least one image update is required');
  }

  // Build array of updates with IDs
  const updateArray = imageUpdates.map(({ imageId, updates }) => ({
    ...updates,
    id: imageId,
  }));

  return await fetchPatchJsonApi<void>('/blocks/images', updateArray);
}
