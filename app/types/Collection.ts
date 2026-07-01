/**
 * Types for Content Collections - matches backend models exactly
 * Single source of truth for Collection types
 */

import { type CollectionVisibility } from './CollectionVisibility';
import type { AnyContentModel, ContentImageModel } from './Content';
import type { ContentCameraModel, ContentPersonModel, ContentTagModel } from './Metadata';

/**
 * Collection type enum - matches backend CollectionType
 */
export enum CollectionType {
  BLOG = 'BLOG',
  PORTFOLIO = 'PORTFOLIO',
  ART_GALLERY = 'ART_GALLERY',
  CLIENT_GALLERY = 'CLIENT_GALLERY',
  HOME = 'HOME',
  PARENT = 'PARENT',
  MISC = 'MISC',
}

/** Canonical display/accordion order for collection types (HOME first, MISC last). */
export const COLLECTION_TYPE_ORDER: CollectionType[] = [
  CollectionType.HOME,
  CollectionType.PARENT,
  CollectionType.CLIENT_GALLERY,
  CollectionType.ART_GALLERY,
  CollectionType.PORTFOLIO,
  CollectionType.BLOG,
  CollectionType.MISC,
];

/**
 * Collection types an admin can assign to a collection — the set the create/update
 * form selects offer and the valid drag-and-drop retype drop targets. Excludes
 * HOME (pinned singleton) and MISC (catch-all for unknown/missing types).
 */
export const ASSIGNABLE_COLLECTION_TYPES: CollectionType[] = [
  CollectionType.PORTFOLIO,
  CollectionType.ART_GALLERY,
  CollectionType.BLOG,
  CollectionType.CLIENT_GALLERY,
  CollectionType.PARENT,
];

/** Human-readable labels for every collection type (mirrors COLLECTION_VISIBILITY_LABELS). */
export const COLLECTION_TYPE_LABELS: Record<CollectionType, string> = {
  [CollectionType.HOME]: 'Home',
  [CollectionType.PARENT]: 'Parent',
  [CollectionType.CLIENT_GALLERY]: 'Client Gallery',
  [CollectionType.ART_GALLERY]: 'Art Gallery',
  [CollectionType.PORTFOLIO]: 'Portfolio',
  [CollectionType.BLOG]: 'Blog',
  [CollectionType.MISC]: 'Misc',
};

/**
 * Display mode for content collections
 * - CHRONOLOGICAL: Order blocks by creation date
 * - ORDERED: Manual ordering via orderIndex
 * Matches backend CollectionBaseModel.DisplayMode enum
 */
export type DisplayMode = 'CHRONOLOGICAL' | 'ORDERED' | 'FIXED';

/**
 * Common fields shared across all Collection DTOs.
 * Matches backend CollectionBaseModel.java
 */
export interface CollectionBaseModel {
  id?: number;
  type?: CollectionType;
  title?: string;
  slug?: string;
  description?: string;
  locations: LocationModel[];
  /**
   * ISO date. The full-detail model excludes `null` — the list model
   * (`CollectionListModel.collectionDate`) allows an explicit `null` from the backend.
   */
  collectionDate?: string;
  visibility?: CollectionVisibility;
  /** Rating 0-5, nullable. Used for ordering multi-collection list views. */
  rating?: number;
  displayMode?: DisplayMode;
  rowsWide?: number; // Number of items per row (chunk size for layout)
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Request DTO for creating new content collections
 * Matches backend CollectionCreateRequest.java
 */
export interface CollectionCreateRequest {
  type: CollectionType;
  title: string;
}

/**
 * Collection list model for dropdown selections and simple references
 * Matches backend CollectionListModel.java
 */
export interface CollectionListModel {
  id: number;
  name: string;
  slug?: string;
  type?: string;
  /** ISO date — used to sort BLOG group rows on the manage page. */
  collectionDate?: string | null;
  /**
   * Cover image URL (CloudFront). Populated by the backend on the public
   * sibling/related payload to render related collections as cover-image cards.
   * Absent until that backend change deploys — renderers must fall back to text
   * links when missing.
   */
  coverImageUrl?: string;
  /** True for synthetic tag-view rows (not a real collection yet). */
  derived?: boolean;
}

/**
 * Synthetic selector row for a tag "view" — a tag rendered read-only in the
 * collection selector until promoted to a real collection via Save as Collection.
 * `id` is synthetic (negated tag id); `sourceTagId` carries the real tag id for the POST.
 */
export interface TagViewModel extends CollectionListModel {
  derived: true;
  sourceTagId: number;
}

/**
 * ChildCollection DTO - represents relationship between child entity and parent collection
 * Matches backend ChildCollection.java
 */
export interface ChildCollection {
  collectionId: number;
  name?: string;
  slug?: string; // Add this field for navigation
  coverImageUrl?: string;
  visible?: boolean;
  orderIndex?: number;
}

/**
 * PersonUpdate - Update pattern for people associations (many-to-many)
 * Matches backend PersonUpdate.java
 *
 * - prev: List of existing person IDs to keep/add
 * - newValue: List of new person names to create and add
 * - remove: List of person IDs to remove
 */
export interface PersonUpdate {
  prev?: number[];
  newValue?: string[];
  remove?: number[];
}

/**
 * TagUpdate - Update pattern for tag associations (many-to-many)
 * Matches backend TagUpdate.java
 *
 * - prev: List of existing tag IDs to keep/add
 * - newValue: List of new tag names to create and add
 * - remove: List of tag IDs to remove
 */
export interface TagUpdate {
  prev?: number[];
  newValue?: string[];
  remove?: number[];
}

/**
 * CollectionUpdate - Update pattern for collection associations (many-to-many)
 * Matches backend CollectionUpdate.java
 *
 * - prev: Collections to keep/update (with visibility/order)
 * - newValue: New collections to add
 * - remove: Collection IDs to remove from
 */
export interface CollectionUpdate {
  prev?: ChildCollection[];
  newValue?: ChildCollection[];
  remove?: number[];
}

/**
 * CollectionUpdateRequest - DTO for updating existing content collections
 * Matches backend CollectionUpdateRequest.java
 * All fields except 'id' are optional to support partial updates.
 */
export interface CollectionUpdateRequest {
  id: number; // Required for updates
  type?: CollectionType;
  title?: string;
  slug?: string;
  description?: string;
  locations?: LocationUpdate;
  collectionDate?: string | null;
  clearCollectionDate?: boolean;
  visibility?: CollectionVisibility;
  /** Rating 0-5, nullable. `null` clears the rating. */
  rating?: number | null;
  displayMode?: DisplayMode;
  rowsWide?: number; // Number of items per row (chunk size for layout)
  password?: string;
  contentPerPage?: number;
  coverImageId?: number;
  tags?: TagUpdate;
  people?: PersonUpdate;
  collections?: CollectionUpdate;
  /**
   * Sibling-collection updates (mutual association). Reuses the `CollectionUpdate`
   * wire shape; backend honors only `newValue` (add) and `remove` (delete) — `prev`
   * and the `orderIndex`/`visible` fields of each `ChildCollection` are ignored.
   */
  siblings?: CollectionUpdate;
  /**
   * Parent-collection updates (hierarchical association). Reuses the `CollectionUpdate`
   * wire shape, mirroring `siblings`.
   */
  parents?: CollectionUpdate;
}

/**
 * Collection Model - extends base with pagination and content.
 * Matches backend CollectionModel.java
 */
export interface CollectionModel extends CollectionBaseModel {
  id: number;
  type: CollectionType;
  title: string;
  slug: string;
  createdAt: string;
  updatedAt: string;

  // Pagination metadata
  contentPerPage?: number;
  contentCount?: number;
  currentPage?: number;
  totalPages?: number;

  // Cover image
  coverImage?: ContentImageModel | null;

  // Tags
  tags?: string[];

  /**
   * People associated with this collection. Editable on the manage page; can be
   * regenerated as the union of every contained image's people via the
   * "Regenerate from contents" admin action.
   */
  people?: ContentPersonModel[];

  /**
   * Client gallery access control.
   * - `true`: password required — show locked UI
   * - `false`: no password needed — skip gate entirely
   * - `undefined`: unknown — probe backend to determine
   *
   * Only meaningful when `type === CollectionType.CLIENT_GALLERY`.
   */
  isPasswordProtected?: boolean;

  /** Admin-only: plaintext gallery password. Populated only in admin/manage responses. */
  galleryPassword?: string | null;

  /** Admin-only: recipient email addresses. Populated only in admin/manage responses. */
  recipientEmails?: string[];

  /**
   * Curated, mutual "sibling" collections (variant peers). Public reads return only
   * LISTED siblings; admin/manage reads return all. Rendered as `Related:` text links
   * in the metadata block. Mirrors backend CollectionModel.siblings (List<CollectionList>).
   */
  siblings?: CollectionListModel[];

  /**
   * Parent collections this collection belongs to (hierarchical association).
   * Mirrors `siblings`. Admin/manage reads populate this for the parent column.
   */
  parents?: CollectionListModel[];

  // Content
  content?: AnyContentModel[];

  /** True for synthetic tag-view collection payloads (not a persisted collection). */
  derived?: boolean;
}

/**
 * Enhanced collection page response with detailed pagination metadata (backend: CollectionPageDTO)
 * Includes navigation helpers and content type counts
 */
export interface CollectionPageDTO extends CollectionBaseModel {
  id: number;
  type: CollectionType;
  title: string;
  slug: string;

  // Enhanced pagination metadata
  currentPage: number; // Current page number (0-indexed)
  pageSize: number; // Items per page
  totalElements: number; // Total number of content items across all pages
  totalPages: number; // Total number of pages

  // Boolean flags for navigation
  hasPrevious: boolean;
  hasNext: boolean;
  isFirst: boolean;
  isLast: boolean;

  // Navigation helpers
  previousPage?: number; // Previous page number, null if isFirst
  nextPage?: number; // Next page number, null if isLast

  // Content type counts
  imageBlockCount: number;
  textBlockCount: number;
  gifBlockCount: number;

  // Content array
  content: AnyContentModel[];

  // Additional fields
  displayMode?: DisplayMode;
  coverImage?: ContentImageModel | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Re-export metadata types from Metadata for convenience
 * These are the source of truth - Collection.ts just re-exports them
 */
export type {
  ContentCameraModel,
  ContentFilmTypeModel,
  ContentLensModel,
  ContentPersonModel,
  ContentTagModel,
  FilmFormatDTO,
} from './Metadata';

/**
 * Re-export CollectionVisibility for callers importing from Collection.ts.
 */
export { CollectionVisibility } from './CollectionVisibility';

/**
 * Location Model - Represents a location that can be assigned to collections and content
 * Matches backend LocationModel.java
 */
export interface LocationModel {
  id: number;
  name: string;
  slug?: string;
}

/**
 * LocationUpdate - Update pattern for location associations (many-to-many)
 * Matches backend LocationUpdate.java
 *
 * - prev: List of existing location IDs to keep/add
 * - newValue: List of new location names to create and add
 * - remove: List of location IDs to remove
 */
export interface LocationUpdate {
  prev?: number[];
  newValue?: string[];
  remove?: number[];
}

/**
 * General metadata DTO containing all available metadata for dropdowns
 * Matches backend GeneralMetadataDTO.java
 */
export interface GeneralMetadataDTO {
  tags: ContentTagModel[];
  people: ContentPersonModel[];
  locations: LocationModel[];
  cameras: ContentCameraModel[];
  lenses: Array<{ id: number; name: string }>;
  filmTypes: Array<{
    id: number;
    filmTypeName?: string;
    name: string;
    defaultIso: number;
    contentImageIds?: number[];
  }>;
  filmFormats: Array<{ name: string; displayName: string }>;
  collections: CollectionListModel[];
}

/**
 * Response DTO for collection update/manage endpoint
 * Matches backend CollectionUpdateResponseDTO.java
 *
 * Backend returns a FLAT structure with metadata fields at root level (not nested):
 * {
 *   collection: {...},
 *   tags: [...],
 *   people: [...],
 *   locations: [...],
 *   collections: [...],
 *   cameras: [...],
 *   lenses: [...],
 *   filmTypes: [...],
 *   filmFormats: [...]
 * }
 */
export interface CollectionUpdateResponseDTO {
  collection: CollectionModel;
  // Metadata fields are at root level, not nested
  tags?: GeneralMetadataDTO['tags'];
  people?: GeneralMetadataDTO['people'];
  locations?: GeneralMetadataDTO['locations'];
  cameras?: GeneralMetadataDTO['cameras'];
  lenses?: GeneralMetadataDTO['lenses'];
  filmTypes?: GeneralMetadataDTO['filmTypes'];
  filmFormats?: GeneralMetadataDTO['filmFormats'];
  collections?: GeneralMetadataDTO['collections'];
  childCollectionImages?: ContentImageModel[] | null;
}
