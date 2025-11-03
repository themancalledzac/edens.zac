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
export interface ContentFilmTypeModel extends IdNameModel {
  filmTypeName?: string; // Technical name (e.g., "KODAK_PORTRA_400")
  defaultIso: number; // Default ISO for this film
  contentImageIds?: number[]; // List of content image IDs using this film type
}

/**
 * Film Format DTO - Represents film format (35mm, 120, etc.)
 * Matches backend FilmFormatDTO.java
 */
export interface FilmFormatDTO {
  name: string; // Enum name (e.g., "MM_35")
  displayName: string; // Display name (e.g., "35mm")
}