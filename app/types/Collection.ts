/**
 * Types for Content Collections - matches backend models exactly
 * Single source of truth for Collection types
 */

import type { AnyContentModel, ImageContentModel } from './Content';

/**
 * Collection type enum - matches backend CollectionType
 */
export enum CollectionType {
  BLOG = 'BLOG',
  PORTFOLIO = 'PORTFOLIO',
  ART_GALLERY = 'ART_GALLERY',
  CLIENT_GALLERY = 'CLIENT_GALLERY',
  HOME = 'HOME',
  MISC = 'MISC'
}

/**
 * Display mode for content collections
 * - CHRONOLOGICAL: Order blocks by creation date
 * - ORDERED: Manual ordering via orderIndex
 * Matches backend CollectionBaseModel.DisplayMode enum
 */
export type DisplayMode = 'CHRONOLOGICAL' | 'ORDERED';

/**
 * Base model containing common fields shared across all Collection DTOs.
 * This eliminates duplication between CollectionModel, CollectionPageDTO,
 * and CollectionUpdateRequest.
 * Matches backend CollectionBaseModel.java
 */
export interface CollectionBaseModel {
  id?: number;
  type?: CollectionType;
  title?: string;
  slug?: string;
  description?: string;
  location?: string;
  collectionDate?: string;
  visible?: boolean;
  displayMode?: DisplayMode;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Simplified DTO for creating new content collections (matches backend ContentCollectionCreateRequest)
 */
export interface CollectionSimpleCreateDTO {
  type: CollectionType;
  title: string;
}

/**
 * ChildCollection DTO - represents relationship between child entity and parent collection
 * Matches backend ChildCollection.java
 */
export interface ChildCollection {
  collectionId: number;
  name?: string;
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
  location?: string;
  collectionDate?: string;
  visible?: boolean;
  displayMode?: DisplayMode;
  password?: string;
  contentPerPage?: number;
  coverImageId?: number;
  tags?: TagUpdate;
  people?: PersonUpdate;
  collections?: CollectionUpdate;
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
  coverImage?: ImageContentModel | null;

  // Tags
  tags?: string[];

  // Content
  content?: AnyContentModel[];
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
  coverImage?: ImageContentModel | null;
  createdAt: string;
  updatedAt: string;
}
