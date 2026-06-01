/**
 * Unified Content Model Type System
 *
 * Single source of truth for all Content types following proper inheritance hierarchy.
 * All models extend the base Content interface for consistent behavior.
 * Maps to backend Content with contentType discriminator for polymorphism.
 */

import type { SingleEntityUpdate } from '@/app/types/createTypes';

import type {
  ChildCollection,
  CollectionUpdate,
  LocationModel,
  LocationUpdate,
  PersonUpdate,
  TagUpdate,
} from './Collection';
import { type CollectionType } from './Collection';
import type {
  ContentCameraModel,
  ContentFilmTypeModel,
  ContentLensModel,
  ContentPersonModel,
  ContentTagModel,
} from './ImageMetadata';

/** Content type discriminator - maps to backend Content contentType field */
export type ContentType = 'IMAGE' | 'TEXT' | 'GIF' | 'COLLECTION';

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
export interface ContentImageModel extends Content {
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
  locations: LocationModel[];
  captureDate?: string | null;
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
export interface ContentParallaxImageModel extends Omit<ContentImageModel, 'contentType'> {
  contentType: 'IMAGE';
  collectionDate?: string;
  type?: string;
  enableParallax: true;
  parallaxSpeed?: number;
  // Optional fields for collection navigation (when converted from CollectionContentModel)
  slug?: string;
  collectionType?: CollectionType;
}

/**
 * Text block item - represents a single piece of structured text
 * Text blocks are composed of multiple items for semantic editing
 */
export interface TextBlockItem {
  type: 'date' | 'location' | 'description' | 'text' | 'tag';
  value: string;
  slug?: string; // URL slug for navigation (location and tag items)
  label?: string; // Optional display label (e.g., "Date:", "Location:")
}

/**
 * Text content model - displays structured text content as items
 * Each text block contains an array of items that can be individually styled/edited
 */
export interface ContentTextModel extends Content {
  contentType: 'TEXT';
  items: TextBlockItem[]; // Array of text items (required)
  format: 'plain' | 'markdown' | 'html'; // Frontend format type
  formatType?: 'plain' | 'markdown' | 'html' | 'js' | 'css' | 'json'; // Backend field (maps to format)
  align: 'left' | 'center' | 'right';
}

/**
 * GIF content model - displays animated GIFs
 * Matches backend ContentGifModel.java
 */
export interface ContentGifModel extends Content {
  contentType: 'GIF';
  gifUrl: string; // 2000px "full" master — used by the fullscreen viewer
  /**
   * 1080px "web" display variant — used in the row layout. Optional: pre-existing gifs and actual
   * image/gif uploads have no web variant, so consumers fall back to `gifUrl` (`gifUrlWeb ?? gifUrl`).
   * Mirrors backend ContentModels.Gif.gifUrlWeb.
   */
  gifUrlWeb?: string | null;
  thumbnailUrl?: string | null; // Backend field name (was imageUrlRaw)
  alt?: string;
  width?: number;
  height?: number;
  author?: string | null;
  createDate?: string | null;
  /**
   * Layout rating (0-5 or null). Drives slot-width selection in the row grid:
   * horizontal GIF rating >= 4 takes the full row; rating 3 takes half a row;
   * lower ratings take a single slot. New uploads default to 4. Vertical content
   * (AR <= 1) gets a -1 effective-rating penalty.
   */
  rating?: number | null;
  tags?: ContentTagModel[];
  /**
   * People associated with this GIF/MP4. Many-to-many via the content-level people join, mirroring
   * {@link ContentImageModel.people}. Used by the metadata modal's People selector so a GIF can be
   * tagged with the people in it.
   */
  people?: ContentPersonModel[];
  /**
   * Locations associated with this GIF/MP4. Many-to-many via the content-level location join,
   * mirroring {@link ContentImageModel.locations}. Used by the metadata modal's Location selector.
   */
  locations?: LocationModel[];
  /**
   * Collections this GIF/MP4 belongs to. Many-to-many via the same `collection_content` join
   * table that images use. Used by the metadata modal's collection selector so the admin can
   * surface a single GIF in multiple galleries.
   */
  collections?: ChildCollection[];
}

/**
 * Content Collection model - for hierarchical collections (collections containing other collections)
 * Extends Content to support nested collection structures
 * Includes full coverImage object with dimensions for proper rendering
 */
export interface ContentCollectionModel extends Content {
  contentType: 'COLLECTION';
  slug: string;
  collectionType: CollectionType;
  coverImage?: ContentImageModel | null; // Full image object with dimensions (matches CollectionModel.coverImage)
  referencedCollectionId: number; // ID of the actual collection being referenced
  /** Rating 0-5 of the referenced collection (nullable). Used by home manage page. */
  rating?: number | null;

  /**
   * Optional aggregated metadata of the referenced collection — surfaced on
   * collection-ref content blocks so synthetic PARENT pages (e.g. /all-blog)
   * can populate the filter bar without a separate per-collection fetch.
   *
   * Backend may omit any of these fields; consumers must treat them as
   * optional. Used by `extractFilterOptions` to aggregate filter dimensions
   * across child collections on collection-dominant pages.
   */
  tags?: ContentTagModel[];
  people?: ContentPersonModel[];
  locations?: LocationModel[];
}

/**
 * Union type of all supported content models
 * Use this for type-safe rendering and processing
 */
export type AnyContentModel =
  | ContentImageModel
  | ContentParallaxImageModel
  | ContentTextModel
  | ContentGifModel
  | ContentCollectionModel;

/**
 * Content blocks that participate in the click-to-fullscreen viewer: still images, parallax
 * images, and animated GIF/MP4 blocks. TEXT and COLLECTION blocks have their own click semantics
 * (collection navigation) and are excluded here. Use this everywhere a "viewable" content piece
 * flows through the fullscreen pipeline.
 */
export type ViewableContent = ContentImageModel | ContentParallaxImageModel | ContentGifModel;
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
 * - Simple fields (title, etc.) are updated directly
 * - Entity relationships (location, camera, lens, etc.) use the update pattern objects
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

  /** Locations update using prev/newValue/remove pattern (many-to-many) */
  locations?: LocationUpdate;

  /** F-stop value */
  fStop?: string | null;

  /** ISO value */
  iso?: number | null;

  /** Film format - enum name (e.g., "MM_35") - only used when isFilm is true */
  filmFormat?: string | null;

  /** Date the image was captured */
  captureDate?: string | null;

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
  updatedImages: ContentImageModel[];

  /** Metadata for newly created entities during the update operation */
  newMetadata: {
    tags?: ContentTagModel[];
    people?: ContentPersonModel[];
    locations?: LocationModel[];
    cameras?: ContentCameraModel[];
    lenses?: ContentLensModel[];
    filmTypes?: ContentFilmTypeModel[];
  };

  /** List of error messages if any updates failed */
  errors?: string[];
}
