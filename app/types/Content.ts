/**
 * Unified Content Model Type System
 *
 * Single source of truth for all Content types following proper inheritance hierarchy.
 * All models extend the base Content interface for consistent behavior.
 * Maps to backend Content with contentType discriminator for polymorphism.
 */

import type { CollectionVisibility } from '@/app/types/CollectionVisibility';
import type { SingleEntityUpdate } from '@/app/types/createTypes';

import type {
  ChildCollection,
  CollectionUpdate,
  LocationModel,
  LocationUpdate,
  PersonUpdate,
  TagUpdate,
} from './Collection';
import type {
  ContentCameraModel,
  ContentFilmTypeModel,
  ContentLensModel,
  ContentPersonModel,
  ContentTagModel,
} from './Metadata';

/** Content type discriminator - maps to backend Content contentType field */
export type ContentType = 'IMAGE' | 'TEXT' | 'GIF' | 'COLLECTION' | 'PANEL' | 'BLANK';

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

  /**
   * Minimum rendered width in CSS px, honoured by the row packer at composition time.
   *
   * A photograph is scale-free — it reads at any width — so image content leaves this
   * undefined and width-cost math alone decides its size. A UI block is not: an admin
   * panel carries irreducible chrome (a header row of controls, per-row action buttons)
   * that wraps and then clips below a certain width. Declaring `minWidth` tells
   * `buildRows` to close a row rather than admit a row-mate that would starve this item,
   * so the constraint costs width from its NEIGHBOURS, never from the page.
   *
   * It is a strong preference, not a hard guarantee, in two distinct ways:
   *
   * 1. **Unsatisfiable minimums degrade.** An item alone in a row narrower than its own
   *    minimum takes the full width available, because overflowing a phone would be worse
   *    than rendering cramped. A 400px panel on a 390px phone gets 390px.
   * 2. **Satisfiable minimums are honoured to within a few pixels.** The packer decides
   *    membership from a gap-aware estimate of each leaf's width, not from the sizer's
   *    exact equal-height solve (see `leafWidthShares` in rowCombination.ts), so a leaf
   *    can render marginally under its declared minimum. Measured over ~8000 multi-member
   *    rows: 21 leaves landed short, worst case 3.54px (1.63%). Size the value with that
   *    tolerance in mind — declare the width below which the block genuinely breaks, not
   *    the width at which it starts looking tight.
   *
   * Leave it undefined (not 0) for anything that scales: `undefined` is what keeps the
   * entire min-width path out of the layout engine's hot loops.
   */
  minWidth?: number;

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
  filmType?: string | null; // Display name (e.g., "Kodak Portra 400") — backend sends getDisplayName()
  filmFormat?: string | null; // Enum name (e.g., "MM_35") — label via formatFilmFormat()

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
 * Can optionally include a slug for collection navigation
 */
export interface ContentParallaxImageModel extends Omit<ContentImageModel, 'contentType'> {
  contentType: 'IMAGE';
  collectionDate?: string;
  enableParallax: true;
  parallaxSpeed?: number;
  /**
   * Set only when this block was converted from a collection (see
   * `convertCollectionContentToParallax` / `collectionToContentModel`). It is also the
   * live discriminant for "is this a collection card": {@link isCollectionCard} keys on
   * slug presence, and `normalizeContentToRendererProps` uses the same key to decide
   * whether the block gets a public badge.
   *
   * WARNING: stamping a slug onto a plain parallax image silently promotes it to a
   * collection card — fixed effective rating 4 in the layout algorithm, plus a card
   * badge derived from its own tags. Do not add a slug here for any other purpose.
   */
  slug?: string;
  /** Mirrors the source collection's booleans when converted from a collection card. */
  isClient?: boolean;
  isBlog?: boolean;
  /**
   * The COLLECTION this card stands for. Deliberately separate from `id`: for a child-collection
   * block `id` is the content-table row id (see `convertCollectionContentToParallax`), and for the
   * synthetic home tiles it is a negative sentinel. Only list-built cards happen to have the two
   * coincide. Anything keyed on the collection ENTITY — follows, and any future per-collection
   * viewer state — must read this and never `id`. Absent on synthetic tiles, which are not
   * followable collections.
   */
  collectionId?: number;
}

/**
 * Text block item - represents a single piece of structured text
 * Text blocks are composed of multiple items for semantic editing
 */
export interface TextBlockItem {
  type: 'date' | 'location' | 'description' | 'text' | 'collection';
  value: string;
  slug?: string; // URL slug for navigation (location and sibling-collection items)
  label?: string; // Optional display label (e.g., "Date:", "Location:")
  coverImageUrl?: string; // Cover image (CloudFront) for sibling-collection items — renders as a card; absent => text link
}

/**
 * Selectable text-block format options. Single source of truth for both the
 * `TextFormat` union below and the `<option>` ladder in `TextBlockCreateModal`.
 */
export const TEXT_FORMAT_OPTIONS = [
  { value: 'plain', label: 'Plain Text' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'html', label: 'HTML' },
] as const;

/** Frontend text-block format union, derived from {@link TEXT_FORMAT_OPTIONS}. */
export type TextFormat = (typeof TEXT_FORMAT_OPTIONS)[number]['value'];

/**
 * Selectable text-block alignment options. Single source of truth for both the
 * `TextAlign` union below and the `<option>` ladder in `TextBlockCreateModal`.
 */
export const TEXT_ALIGN_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
] as const;

/** Frontend text-block alignment union, derived from {@link TEXT_ALIGN_OPTIONS}. */
export type TextAlign = (typeof TEXT_ALIGN_OPTIONS)[number]['value'];

/**
 * Text content model - displays structured text content as items
 * Each text block contains an array of items that can be individually styled/edited
 */
export interface ContentTextModel extends Content {
  contentType: 'TEXT';
  items: TextBlockItem[]; // Array of text items (required)
  format: TextFormat; // Frontend format type
  formatType?: 'plain' | 'markdown' | 'html' | 'js' | 'css' | 'json'; // Backend field (maps to format)
  align: TextAlign;
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
   * Photographic capture time (ISO string), copied from a reference image so the GIF/MP4 sorts
   * chronologically alongside images. Null for GIFs the admin has not dated (they stay at the end
   * of a chronological collection). Mirrors backend ContentModels.Gif.captureDate.
   */
  captureDate?: string | null;
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
  /** True when the referenced collection is a client gallery. */
  isClient?: boolean;
  /** True when the referenced collection is a blog/story (drives the Story badge). */
  isBlog?: boolean;
  coverImage?: ContentImageModel | null; // Full image object with dimensions (matches CollectionModel.coverImage)
  referencedCollectionId: number; // ID of the actual collection being referenced
  /** Rating 0-5 of the referenced collection (nullable). Used by home manage page. */
  rating?: number | null;
  /**
   * ISO date of the referenced collection (nullable). Mirrors backend
   * `ContentModels.Collection.collectionDate`; threaded onto collection cards so a
   * downstream showcase page can group cards by date.
   */
  collectionDate?: string;
  /**
   * ISO end date of the referenced collection (nullable). Mirrors backend
   * `ContentModels.Collection.collectionEndDate`; pairs with `collectionDate` to render a
   * range (see `formatDateRange` and its display variant).
   */
  collectionEndDate?: string;

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

  /**
   * Visibility of the referenced collection. Optional because the backend only serializes it on
   * synthetic collection blocks as of the visibility-enrichment work; consumers must treat an
   * absent value as "unknown", never as `LISTED`.
   *
   * Only ever populated for a viewer the backend already scopes to — a non-admin session never
   * receives a `HIDDEN` collection in the first place, so the admin Hidden toggle is a view
   * control over data the viewer is already entitled to, not an access gate.
   */
  visibility?: CollectionVisibility;
}

/** The admin hub panels that can appear as a PANEL content block. */
export type PanelType = 'users' | 'messages' | 'roles';

/**
 * Panel content model - displays a UI panel (e.g. users or messages) as a rated content block
 */
export interface ContentPanelModel extends Content {
  contentType: 'PANEL';
  panelType: PanelType;
  rating: number;
}

/**
 * Blank spacer — a client-only synthetic block with no backend counterpart.
 *
 * Injected by the layout engine into an under-filled row's BoxTree so the real
 * items render at their honest proportional share of the row instead of being
 * scaled up to full width. Carries no media and is inert everywhere except
 * sizing and rendering: every positive type guard returns false for it.
 *
 * `width`/`height` encode the required aspect ratio (`width = blankAR`,
 * `height = 1`), which `getContentDimensions` picks up via its generic
 * width/height fallback.
 */
export interface ContentBlankModel extends Content {
  contentType: 'BLANK';
  width: number;
  height: number;
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
  | ContentCollectionModel
  | ContentPanelModel
  | ContentBlankModel;

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
