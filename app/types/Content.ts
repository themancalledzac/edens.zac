/**
 * Unified Content Model Type System
 *
 * Single source of truth for all Content types following proper inheritance hierarchy.
 * All models extend the base Content interface for consistent behavior.
 * Maps to backend Content with contentType discriminator for polymorphism.
 */

import { fetchPatchJsonApi } from '@/app/lib/api/core';
import type { SingleEntityUpdate } from '@/app/types/createTypes';

import type { ChildCollection, CollectionUpdate, PersonUpdate, TagUpdate } from './Collection';
import type {
  ContentCameraModel,
  ContentFilmTypeModel,
  ContentLensModel,
  ContentPersonModel,
  ContentTagModel,
} from './ImageMetadata';

/** Content type discriminator - maps to backend Content contentType field */
export type ContentType = 'IMAGE' | 'TEXT' | 'GIF' | 'PARALLAX' | 'COLLECTION';

/**
 * Base Content interface - all content models extend this
 * Provides consistent shape for layout, rendering, and UI enhancements
 *
 * Maps to backend Content with contentType discriminator for polymorphism
 */
export interface Content {
  id: number;
  contentType: ContentType; // Discriminator for polymorphism (both frontend and backend)
  orderIndex: number;
  title?: string;
  caption?: string | null;
  description?: string | null; // Backend field (alias for caption in some contexts)
  imageUrl?: string | null; // Backend base field for content preview
  visible?: boolean; // Backend field for visibility control
  createdAt?: string;
  updatedAt?: string;

  // Layout properties for rendering
  width?: number;
  height?: number;

  // UI enhancements for cover images and display
  overlayText?: string;
  cardTypeBadge?: string;
  dateBadge?: string;
}

/**
 * Image content model - displays images from S3/CloudFront
 */
export interface ImageContentModel extends Content {
  contentType: 'IMAGE';
  imageUrl: string;
  imageUrlRaw?: string | null;
  imageWidth?: number;
  imageHeight?: number;
  iso?: number;
  author?: string | null;
  rating?: number;
  lens?: ContentLensModel | null; // Lens object with id and name
  blackAndWhite?: boolean;
  isFilm?: boolean;
  shutterSpeed?: string | null;
  rawFileName?: string | null;
  camera?: ContentCameraModel | null;
  focalLength?: string | null;
  location?: string | null;
  createDate?: string | null;
  fStop?: string | null;
  alt?: string;
  aspectRatio?: number;

  /**
   * Film-specific metadata - only used when isFilm is true
   */
  filmType?: string | null; // Enum name (e.g., "KODAK_PORTRA_400")
  filmFormat?: string | null; // Enum name (e.g., "MM_35")

  /**
   * Relationships to tags, people, camera, and lens
   */
  tags?: ContentTagModel[];
  people?: ContentPersonModel[];

  /**
   * List of collections this image belongs to
   * Each entry contains collection-specific metadata like visibility and order
   * Note: Backend returns this as 'collections' field
   * Matches backend ContentImageModel.java which uses List<ChildCollection>
   */
  collections?: ChildCollection[];
}

/**
 * Parallax-enabled image content model
 * Based on ImageContentModel with parallax functionality
 * Can optionally include slug and collectionType for collection navigation
 */
export interface ParallaxImageContentModel extends Omit<ImageContentModel, 'contentType'> {
  contentType: 'PARALLAX';
  collectionDate?: string;
  type?: string;
  enableParallax: true;
  parallaxSpeed?: number;
  // Optional fields for collection navigation (when converted from CollectionContentModel)
  slug?: string;
  collectionType?: 'BLOG' | 'PORTFOLIO' | 'ART_GALLERY' | 'CLIENT_GALLERY' | 'HOME' | 'MISC';
}

/**
 * Text content model - displays formatted text content
 */
export interface TextContentModel extends Content {
  contentType: 'TEXT';
  content: string; // Frontend field for text content
  textContent?: string; // Backend field name (maps to content during transformation)
  format: 'plain' | 'markdown' | 'html'; // Frontend format type
  formatType?: 'plain' | 'markdown' | 'html' | 'js' | 'css' | 'json'; // Backend field (maps to format)
  align: 'left' | 'center' | 'right';
}

/**
 * GIF content model - displays animated GIFs
 * Matches backend ContentGifModel.java
 */
export interface GifContentModel extends Content {
  contentType: 'GIF';
  gifUrl: string; // Backend field name (was imageUrlWeb)
  thumbnailUrl?: string | null; // Backend field name (was imageUrlRaw)
  alt?: string;
  width?: number;
  height?: number;
  author?: string | null;
  createDate?: string | null;
  tags?: ContentTagModel[];
}

/**
 * Collection content model - for hierarchical collections (collections containing other collections)
 * Extends Content to support nested collection structures
 * Includes full coverImage object with dimensions for proper rendering
 */
export interface CollectionContentModel extends Content {
  contentType: 'COLLECTION';
  slug: string;
  collectionType: 'BLOG' | 'PORTFOLIO' | 'ART_GALLERY' | 'CLIENT_GALLERY' | 'HOME' | 'MISC';
  coverImage?: ImageContentModel | null; // Full image object with dimensions (matches CollectionModel.coverImage)
}

/**
 * Union type of all supported content models
 * Use this for type-safe rendering and processing
 */
export type AnyContentModel =
  | ImageContentModel
  | ParallaxImageContentModel
  | TextContentModel
  | GifContentModel
  | CollectionContentModel;
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
 * Request DTO for creating a new film type on the fly
 * Matches backend NewFilmTypeRequest.java
 */
export interface NewFilmTypeRequest {
  /**
   * Film type name (e.g., "Kodak Portra 400")
   * Backend field name is filmTypeName
   */
  filmTypeName: string;

  /** Default ISO value for this film stock */
  defaultIso: number;
}

/**
 * Film type update using prev/newValue/remove pattern
 * - prev: ID of existing film type to use
 * - newValue: Film type request to create new type
 * - remove: true to remove film type association
 */
export type FilmTypeUpdate = SingleEntityUpdate<NewFilmTypeRequest>;

/**
 * Request DTO for updating image content blocks
 * All fields except 'id' are optional - only include fields you want to update
 *
 * Uses prev/newValue/remove pattern for entity relationships:
 * - Simple fields (title, location, etc.) are updated directly
 * - Entity relationships use the update pattern objects
 * Matches backend ContentImageUpdateRequest.java
 */
export interface ContentImageUpdateRequest {
  /** Image ID - REQUIRED for backend to identify which image to update */
  id: number; // Required (matches @NotNull in backend)

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

/**
 * Response DTO for batch image update operations
 * Matches backend ContentImageUpdateResponse.java
 */
export interface ContentImageUpdateResponse {
  /** Full image content blocks for all successfully updated images */
  updatedImages: ImageContentModel[];

  /** Metadata for newly created entities during the update operation */
  newMetadata: {
    tags?: ContentTagModel[];
    people?: ContentPersonModel[];
    cameras?: ContentCameraModel[];
    lenses?: ContentLensModel[];
    filmTypes?: ContentFilmTypeModel[];
  };

  /** List of error messages if any updates failed */
  errors?: string[];
}

/**
 * Update an image with partial data
 *
 * Note: The backend expects an array of image updates, so we wrap the single update in an array
 * The ContentImageUpdateRequest requires the id field, so ensure updates includes it
 *
 * @param updates - Object containing the image ID and fields to update
 * @returns The updated image data
 * @throws ApiError if the request fails
 *
 * @example
 * // Update image title and caption
 * await updateImage({
 *   id: 123,
 *   title: "Sunset over the mountains",
 *   caption: "A beautiful sunset captured in the Rockies"
 * });
 *
 * @example
 * // Update image collection associations
 * await updateImage({
 *   id: 123,
 *   collections: {
 *     newValue: [{ collectionId: 1, name: "Portfolio", visible: true, orderIndex: 0 }]
 *   }
 * });
 *
 * @example
 * // Remove a field by setting it to null
 * await updateImage({
 *   id: 123,
 *   caption: null
 * });
 */
export async function updateImage<T = unknown>(
  updates: ContentImageUpdateRequest
): Promise<T> {
  if (!updates.id || updates.id <= 0) {
    throw new Error('Valid id is required in updates object');
  }

  if (Object.keys(updates).length <= 1) {
    throw new Error('Updates object must contain at least one field to update besides id');
  }

  // Backend expects an array of updates
  const updateArray = [updates];

  return await fetchPatchJsonApi<T>('/content/images', updateArray);
}

/**
 * Update multiple images with the same or different updates in a single API call
 *
 * @param imageUpdates - Array of ContentImageUpdateRequest objects (each must include id)
 * @returns Promise with updated images and newly created metadata entities
 * @throws ApiError if the request fails
 *
 * @example
 * // Update multiple images with same metadata
 * const response = await updateMultipleImages([
 *   { id: 1, location: "New York", author: "John Doe" },
 *   { id: 2, location: "New York", author: "John Doe" },
 *   { id: 3, location: "New York", author: "John Doe" }
 * ]);
 * // response.updatedImages contains the fully updated ImageContentModel objects
 * // response.newMetadata contains any newly created tags, cameras, etc.
 */
export async function updateMultipleImages(
  imageUpdates: ContentImageUpdateRequest[]
): Promise<ContentImageUpdateResponse> {
  if (!imageUpdates || imageUpdates.length === 0) {
    throw new Error('At least one image update is required');
  }

  // Validate all updates have IDs
  for (const [index, update] of imageUpdates.entries()) {
    if (!update.id || update.id <= 0) {
      throw new Error(`Update at index ${index} is missing required id field`);
    }
  }

  return await fetchPatchJsonApi<ContentImageUpdateResponse>('/content/images', imageUpdates);
}
