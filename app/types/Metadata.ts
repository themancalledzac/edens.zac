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
export interface ContentTagModel extends IdNameModel {
  slug: string;
}

/**
 * Content Person - Represents people tagged in images
 */
export interface ContentPersonModel extends IdNameModel {
  slug: string;
}

/**
 * Content Camera - Camera equipment used for photos.
 *
 * `isFilm` / `defaultFilmFormat` were added to support auto-toggling the
 * Film Photography + Film Format fields when a film body is selected in
 * the image-metadata editor. Optional so frontend code keeps compiling
 * against backends that haven't shipped the new columns yet.
 */
export interface ContentCameraModel extends IdNameModel {
  /** True if this camera is a film body */
  isFilm?: boolean;
  /** Default FilmFormat enum name (e.g. "MM_120"). Only meaningful when isFilm is true. */
  defaultFilmFormat?: string | null;
}

/**
 * Content Lens - Lens equipment used for photos
 */
export type ContentLensModel = IdNameModel;

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
