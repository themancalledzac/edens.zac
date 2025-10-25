/**
 * Image Metadata Types
 *
 * Types for image-related metadata including tags, people, cameras, and film metadata.
 * These correspond to the backend entities used for image management.
 */

/**
 * Base model for entities with id and name
 */
export interface IdNameModel {
  id: number;
  name: string;
}

/**
 * Content Tag - Used to categorize images
 */
export type ContentTagModel = IdNameModel

/**
 * Content Person - Represents people tagged in images
 */
export type ContentPersonModel = IdNameModel

/**
 * Content Camera - Camera equipment used for photos
 */
export type ContentCameraModel = IdNameModel

/**
 * Content Lens - Lens equipment used for photos
 */
export type ContentLensModel = IdNameModel

/**
 * Film Type - Represents film stock used
 */
export interface FilmTypeModel extends IdNameModel {
  defaultIso: number; // Default ISO for this film
}

/**
 * Film Format - Represents film format (35mm, 120, etc.)
 */
export interface FilmFormatModel {
  name: string; // Enum name (e.g., "MM_35")
  displayName: string; // Display name (e.g., "35mm")
}

/**
 * Collection List Model - Basic collection info for dropdown selection
 */
export type CollectionListModel = IdNameModel

/**
 * Collection Update Metadata Response
 * Response from the /api/write/collections/{slug}/update endpoint
 * Contains the collection plus all available metadata for dropdowns
 */
export interface CollectionUpdateMetadata {
  tags: ContentTagModel[];
  people: ContentPersonModel[];
  cameras: ContentCameraModel[];
  lenses: ContentLensModel[];
  filmTypes: FilmTypeModel[];
  filmFormats: FilmFormatModel[];
  collections: CollectionListModel[];
}