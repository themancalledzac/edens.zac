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

import { type ImageCollection, type ImageContentBlock } from '@/app/types/ContentBlock';
import type {
  ContentCameraModel,
  ContentLensModel,
  ContentPersonModel,
  ContentTagModel,
  FilmTypeModel,
} from '@/app/types/ImageMetadata';

import { fetchPatchJsonApi } from './core';

/**
 * Request DTO for creating a new film type on the fly
 */
export interface NewFilmTypeRequest {
  /**
   * Film type name (e.g., "Kodak Portra 400")
   */
  name: string;

  /** Default ISO value for this film stock */
  defaultIso: number;
}

// ============================================================================
// Update Pattern Types (prev/newValue/remove)
// ============================================================================

/**
 * Base update pattern for single-select entity (one-to-one relationship)
 * - prev: ID of existing entity to use
 * - newValue: Data for new entity to create
 * - remove: true to remove entity association
 */
export interface SingleEntityUpdate<T = string> {
  prev?: number;
  newValue?: T;
  remove?: boolean;
}

/**
 * Base update pattern for multi-select entities (many-to-many relationship)
 * - prev: List of existing entity IDs to keep/add
 * - newValue: List of data for new entities to create and add
 * - remove: List of entity IDs to remove
 */
export interface MultiEntityUpdate<T = string> {
  prev?: number[];
  newValue?: T[];
  remove?: number[];
}

/**
 * Camera update using prev/newValue/remove pattern
 * - prev: ID of existing camera to use
 * - newValue: Name of new camera to create
 * - remove: true to remove camera association
 */
export type CameraUpdate = SingleEntityUpdate;

/**
 * Lens update using prev/newValue/remove pattern
 * - prev: ID of existing lens to use
 * - newValue: Name of new lens to create
 * - remove: true to remove lens association
 */
export type LensUpdate = SingleEntityUpdate;

/**
 * Film type update using prev/newValue/remove pattern
 * - prev: ID of existing film type to use
 * - newValue: Film type request to create new type
 * - remove: true to remove film type association
 */
export type FilmTypeUpdate = SingleEntityUpdate<NewFilmTypeRequest>;

/**
 * Tag update using prev/newValue/remove pattern
 * - prev: List of existing tag IDs to keep/add
 * - newValue: List of new tag names to create and add
 * - remove: List of tag IDs to remove
 */
export type TagUpdate = MultiEntityUpdate;

/**
 * Person update using prev/newValue/remove pattern
 * - prev: List of existing person IDs to keep/add
 * - newValue: List of new person names to create and add
 * - remove: List of person IDs to remove
 */
export type PersonUpdate = MultiEntityUpdate;

/**
 * Collection update using prev/newValue/remove pattern
 * - prev: Collections to keep/update (with visibility/order)
 * - newValue: New collections to add
 * - remove: Collection IDs to remove image from
 */
export interface CollectionUpdate {
  prev?: ImageCollection[];
  newValue?: ImageCollection[];
  remove?: number[];
}

// ============================================================================
// Main DTO
// ============================================================================

/**
 * DTO for updating an image
 * All fields are optional - only include fields you want to update
 *
 * Uses prev/newValue/remove pattern for entity relationships:
 * - Simple fields (title, location, etc.) are updated directly
 * - Entity relationships use the update pattern objects
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

  /** Whether the image is black and white */
  blackAndWhite?: boolean | null;

  /** Whether the image is from film */
  isFilm?: boolean | null;

  /** Camera shutter speed */
  shutterSpeed?: string | null;

  /** Focal length */
  focalLength?: string | null;

  /** Location where photo was taken */
  location?: string | null;

  /** F-stop value */
  fStop?: string | null;

  /** ISO value */
  iso?: number | null;

  /** Film format - enum name (e.g., "MM_35") - only used when isFilm is true */
  filmFormat?: string | null;

  /** Date the image was created */
  createDate?: string | null;

  /** Camera update using prev/newValue/remove pattern */
  camera?: CameraUpdate;

  /** Lens update using prev/newValue/remove pattern */
  lens?: LensUpdate;

  /** Film type update using prev/newValue/remove pattern */
  filmType?: FilmTypeUpdate;

  /** Tag updates using prev/newValue/remove pattern */
  tags?: TagUpdate;

  /** Person updates using prev/newValue/remove pattern */
  people?: PersonUpdate;

  /** Collection updates using prev/newValue/remove pattern */
  collections?: CollectionUpdate;
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Response from updating image(s)
 * Returns the fully updated images plus any newly created metadata entities
 */
export interface UpdateImagesResponse {
  /**
   * The fully updated image blocks with all relationships resolved
   * - Includes server-side transformations (timestamps, computed fields)
   * - Relationships are populated (full camera object, not just ID)
   * - Same shape as GET endpoints for consistency
   */
  updatedImages: ImageContentBlock[];

  /**
   * NEW metadata entities created during this update
   * - Only includes entities that were created (had id: 0 in request)
   * - Client uses these to update dropdown options without full refetch
   * - Fields are null if no new entities of that type were created
   */
  newMetadata: {
    cameras: ContentCameraModel[] | null;
    lenses: ContentLensModel[] | null;
    tags: ContentTagModel[] | null;
    people: ContentPersonModel[] | null;
    filmTypes: FilmTypeModel[] | null;
  };

  /**
   * Validation or processing errors (if any)
   * - Empty array if all updates succeeded
   */
  errors: string[];
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
 *     { collectionId: 1, name: "Portfolio", visible: true, orderIndex: 0 },
 *     { collectionId: 2, name: "Landscapes", visible: true, orderIndex: 5 }
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
 * @returns Promise with updated images and newly created metadata entities
 * @throws ApiError if the request fails
 *
 * @example
 * // Update multiple images with same metadata
 * const response = await updateMultipleImages([
 *   { imageId: 1, updates: { location: "New York", author: "John Doe" } },
 *   { imageId: 2, updates: { location: "New York", author: "John Doe" } },
 *   { imageId: 3, updates: { location: "New York", author: "John Doe" } }
 * ]);
 * // response.updatedImages contains the fully updated ImageContentBlock objects
 * // response.newMetadata contains any newly created tags, cameras, etc.
 */
export async function updateMultipleImages(
  imageUpdates: Array<{ imageId: number; updates: UpdateImageDTO }>
): Promise<UpdateImagesResponse> {
  if (!imageUpdates || imageUpdates.length === 0) {
    throw new Error('At least one image update is required');
  }

  // Build array of updates with IDs
  const updateArray = imageUpdates.map(({ imageId, updates }) => ({
    ...updates,
    id: imageId,
  }));

  return await fetchPatchJsonApi<UpdateImagesResponse>('/blocks/images', updateArray);
}
