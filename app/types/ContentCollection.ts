/**
 * Types for Content Collections - matches backend models
 */

export enum CollectionType {
  portfolio = 'PORTFOLIO',
  catalog = 'CATALOG',
  blogs = 'BLOG',
  'client-gallery' = 'CLIENT_GALLERY'
}

/**
 * Base model containing common fields shared across all ContentCollection DTOs
 */
export interface ContentCollectionBaseModel {
  id?: number;
  type?: CollectionType;
  title?: string;
  slug?: string;
  description?: string;
  location?: string;
  collectionDate?: string; // ISO date string
  visible?: boolean;
  priority?: number; // 1-4, where 1 = best, 4 = worst
  // Legacy: url-only cover; replaced by coverImage object
  coverImageUrl?: string;
  coverImage?: { url: string; width?: number; height?: number } | null;
  isPasswordProtected?: boolean;
  hasAccess?: boolean;
  configJson?: string;
  createdAt?: string; // ISO date string
  updatedAt?: string; // ISO date string
}

/**
 * Simplified DTO for creating new content collections (matches backend ContentCollectionCreateRequest)
 */
export interface ContentCollectionSimpleCreateDTO {
  type: CollectionType;
  title: string;
}

/**
 * DTO for updating existing content collections (matches backend ContentCollectionUpdateDTO)
 */
export interface ContentCollectionUpdateDTO extends ContentCollectionBaseModel {
  // Password handling for client galleries
  password?: string; // Raw password, will be hashed (null = no change)

  // Pagination settings
  blocksPerPage?: number; // Min 1

  // Display mode
  displayMode?: 'CHRONOLOGICAL' | 'ORDERED';

  // Home page card settings (optional)
  homeCardEnabled?: boolean; // null = no change
  homeCardText?: string;

  coverImageId?: number;

  // Content block operations (processed separately in service layer)
  reorderOperations?: ContentBlockReorderOperation[];
  contentBlockIdsToRemove?: number[];
  newTextBlocks?: string[];
  newCodeBlocks?: string[];
}

/**
 * Content block reordering operation interface
 */
export interface ContentBlockReorderOperation {
  /**
   * Identifier of the block to move. Optional:
   * - Positive ID: refers to an existing block in the collection.
   * - Negative ID: placeholder mapping for newly added text blocks in this request.
   *   Use -1 for the first newTextBlocks entry, -2 for the second, etc.
   * - Null: when null, the block will be resolved by oldOrderIndex.
   */
  contentBlockId?: number;

  /**
   * The original order index of the block prior to reordering. Used when contentBlockId is null
   * or to double-check position in conflict scenarios.
   */
  oldOrderIndex?: number; // Min 0

  /**
   * The new position for this block.
   */
  newOrderIndex: number; // Min 0
}

/**
 * Response DTO for content collections
 */
export interface ContentCollectionModel extends ContentCollectionBaseModel {
  id: number;
  type: CollectionType;
  title: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}
