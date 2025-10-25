/**
 * Image Metadata Types
 *
 * Types for image-related metadata including tags, people, cameras, and film metadata.
 * These correspond to the backend entities used for image management.
 */

/**
 * Content Tag - Used to categorize images
 */
export interface ContentTagModel {
  id: number;
  name: string;
}

/**
 * Content Person - Represents people tagged in images
 */
export interface ContentPersonModel {
  id: number;
  name: string;
}

/**
 * Content Camera - Camera equipment used for photos
 */
export interface ContentCameraModel {
  id: number;
  name: string;
}

/**
 * Content Lens - Lens equipment used for photos
 */
export interface ContentLensModel {
  id: number;
  name: string;
}

/**
 * Film Type - Represents film stock used
 */
export interface FilmTypeModel {
  id: number; // Film type ID
  name: string; // Display name (e.g., "Kodak Portra 400")
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
export interface CollectionListModel {
  id: number;
  name: string;
}

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