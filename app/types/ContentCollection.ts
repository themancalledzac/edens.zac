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
 * DTO for creating new content collections
 */
export interface ContentCollectionCreateDTO extends ContentCollectionBaseModel {
  // Required fields for creation
  type: CollectionType;
  title: string; // 3-100 characters
  
  // Optional fields
  visible?: boolean;
  password?: string; // 8-100 characters, only for client galleries
  blocksPerPage?: number; // >= 1
  
  // Home page card settings
  homeCardEnabled?: boolean; // defaults to false
  homeCardText?: string;
  homeCardCoverImageUrl?: string;
}

/**
 * Simplified DTO for creating new content collections (matches backend ContentCollectionCreateRequest)
 */
export interface ContentCollectionSimpleCreateDTO {
  type: CollectionType;
  title: string;
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
