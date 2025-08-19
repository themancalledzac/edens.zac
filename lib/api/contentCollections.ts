/**
 * Title: Content Collections API (Frontend)
 *
 * What this file is:
 * - TypeScript API utilities and types for the new ContentCollection system.
 * - Provides read helpers with pagination and a normalize() layer to absorb backend field variance.
 *
 * Replaces in the old code:
 * - Supersedes ad-hoc catalog/blog fetch patterns used via pages/ and lib/api/{catalogs,blogs}.ts for collections.
 * - Moves away from Pages Router-specific SSR patterns (getServerSideProps) in favor of direct RSC fetching.
 *
 * New Next.js features used:
 * - Designed for React Server Components (App Router) where fetch() is invoked directly in server components.
 * - Compatible with Next.js caching (revalidate/tags planned in Phase 5.6).
 *
 * TODOs / Improvements:
 * - Add next: { revalidate, tags } options and server-only wrappers (Phase 5.6).
 * - Expand type safety per block type (image/text/code/gif) once Phase 5.4 block components land.
 * - Unify error surfaces and telemetry for ApiError across the app.
 */
import { ApiError,fetchReadApi } from '@/lib/api/core';

export type CollectionType = 'BLOG' | 'ART_GALLERY' | 'CLIENT_GALLERY' | 'PORTFOLIO';
export type ContentBlockType = 'IMAGE' | 'TEXT' | 'CODE' | 'GIF';

export interface PageMetadata {
  currentPage: number;
  totalPages: number;
  totalBlocks: number;
  pageSize: number;
}

export interface BaseContentBlock {
  id: number;
  type: ContentBlockType;
  orderIndex: number;
  // Allow backend to send type-specific fields without breaking the UI
  [key: string]: unknown;
}

export interface ContentCollectionApiModel {
  id: number;
  title: string;
  description?: string;
  slug: string;
  type: CollectionType;
  contentBlocks?: BaseContentBlock[]; // preferred
  blocks?: BaseContentBlock[]; // fallback if backend uses different key
  currentPage?: number;
  totalPages?: number;
  totalBlocks?: number;
  blocksPerPage?: number;
}

export interface ContentCollectionNormalized {
  id: number;
  title: string;
  description?: string;
  slug: string;
  type: CollectionType;
  blocks: BaseContentBlock[];
  pagination: PageMetadata;
}

const normalize = (data: ContentCollectionApiModel): ContentCollectionNormalized => {
  const blocks = (data.contentBlocks ?? data.blocks ?? []) as BaseContentBlock[];
  const pageSize = typeof data.blocksPerPage === 'number' ? data.blocksPerPage : blocks.length || 30;

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    slug: data.slug,
    type: data.type,
    blocks,
    pagination: {
      currentPage: data.currentPage ?? 0,
      totalPages: data.totalPages ?? 1,
      totalBlocks: data.totalBlocks ?? blocks.length,
      pageSize,
    },
  };
};

/**
 * Fetch a collection by slug with pagination
 */
export async function fetchCollectionBySlug(slug: string, page = 0, size = 30): Promise<ContentCollectionNormalized> {
  // guard clauses
  if (!slug) {
    throw new ApiError('Missing collection slug', 400);
  }
  const safePage = Number.isFinite(page) && page >= 0 ? Math.floor(page) : 0;
  const safeSize = Number.isFinite(size) && size > 0 && size <= 100 ? Math.floor(size) : 30;

  const data = await fetchReadApi<ContentCollectionApiModel>(`/collections/${encodeURIComponent(slug)}?page=${safePage}&size=${safeSize}`);

  return normalize(data);
}

/**
 * Fetch multiple collections, optionally by type (not required for Phase 5.3)
 */
export async function fetchCollections(page = 0, size = 10, type?: CollectionType) {
  const safePage = Number.isFinite(page) && page >= 0 ? Math.floor(page) : 0;
  const safeSize = Number.isFinite(size) && size > 0 && size <= 100 ? Math.floor(size) : 10;

  const base = type ? `/collections/type/${type}` : '/collections';
  return fetchReadApi(`${base}?page=${safePage}&size=${safeSize}`);
}
