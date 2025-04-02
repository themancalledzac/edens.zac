// Basic API response wrapper
import { Catalog } from './Catalog';
import { Image } from './Image';

/**
 * API Interface
 *
 * @template T - data object
 * @property {number} status - success/fail
 * @property {string} message - message
 */
export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

// Error response
export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
}

// Pagination metadata ( ? thought )
export interface PaginationMetadata {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

// Paginated response
export interface PaginatedApiResponse<T> extends ApiResponse<T> {
  pagination: PaginationMetadata;
}

// Common response types:
export type ImageResponse = ApiResponse<Image>;
export type ImagesResponse = ApiResponse<Image[]>;
export type CatalogResponse = ApiResponse<Catalog>;
export type CatalogsResponse = ApiResponse<Catalog[]>;