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
 * Matches backend ContentFilmTypeModel.java
 */
export interface FilmTypeModel extends IdNameModel {
  filmTypeName?: string; // Technical name (e.g., "KODAK_PORTRA_400")
  defaultIso: number; // Default ISO for this film
  contentImageIds?: number[]; // List of content image IDs using this film type
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
 * Collection Update Metadata Response (legacy naming)
 * Response from the /api/write/collections/{slug}/update endpoint
 * Contains the collection plus all available metadata for dropdowns
 * @deprecated Use GeneralMetadataDTO instead
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

/**
 * General metadata DTO (backend: GeneralMetadataDTO)
 * Contains all available metadata for dropdowns and selects
 */
export interface GeneralMetadataDTO {
  tags: ContentTagModel[];
  people: ContentPersonModel[];
  cameras: ContentCameraModel[];
  lenses: ContentLensModel[];
  filmTypes: FilmTypeModel[];
  filmFormats: FilmFormatModel[];
  collections: CollectionListModel[];
}

/**
 * Collection update response DTO (backend: CollectionUpdateResponseDTO)
 * Combines collection data with general metadata for admin/update pages
 * Note: In JSON response, metadata fields are unwrapped at top level
 */
export interface CollectionUpdateResponseDTO {
  collection: any; // CollectionModel from ContentCollection types
  metadata: GeneralMetadataDTO;
}