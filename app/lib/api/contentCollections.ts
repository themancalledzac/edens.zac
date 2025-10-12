/**
 * Content Collections API (RSC Read Layer)
 *
 * Purpose
 * - Provides React Server Component–friendly read functions for the ContentCollection system.
 * - Applies Next.js caching with hourly revalidation and cache tags for targeted invalidation.
 * - Contains no secrets and can be safely imported by Server Components and route handlers.
 *
 * When to use
 * - Use from server components/pages to fetch data (reads) that can be cached and revalidated.
 * - Do NOT put mutating operations here; see `lib/server/collections.ts` for server-only writes.
 *
 * Caching Strategy
 * - Each read uses `{ next: { revalidate: 3600, tags: [...] } }`.
 * - Tag scheme:
 *   - `collection-${slug}` for collection detail pages
 *   - `collections-index` for the collections index/listing
 *   - `collections-type-${type}` for per-type listings
 *
 * Error Handling
 * - Normalizes non-OK responses to Error; 404 triggers Next.js `notFound()` for RSC-compatible 404s.
 * - Guards against non-JSON responses for reads.
 */
import { notFound } from 'next/navigation';

import { PAGINATION, TIMING } from '@/app/constants';
import { type ContentBlock, type ImageContentBlock } from '@/app/types/ContentBlock';
import { type CollectionType, type DisplayMode } from '@/app/types/ContentCollection';
import { type HomeCardModel } from '@/app/types/HomeCardModel';
import { isProduction } from '@/app/utils/environment';

export interface ConfigJson {
  showDates: boolean;
  displayMode: string;
}

/**
 * Fully-hydrated collection returned from the backend read endpoints.
 */
export interface ContentCollection {
  id: number;
  type: CollectionType;
  title: string;
  slug: string;
  description?: string;
  location?: string;
  collectionDate?: string;
  visible?: boolean;
  priority?: number;
  // Legacy: coverImageUrl has been replaced by coverImage
  coverImageUrl?: string;
  coverImage?: ImageContentBlock | null;
  isPasswordProtected?: boolean;
  hasAccess?: boolean;
  displayMode?: DisplayMode;
  configJson?: ConfigJson | string;
  createdAt?: string;
  updatedAt?: string;
  blocksPerPage?: number;
  totalBlocks?: number;
  currentPage?: number;
  totalPages?: number;
  homeCardEnabled?: boolean;
  homeCardText?: string;
  contentBlocks: ContentBlock[];
}

/** Read-only fetch init with Next.js cache options. */
type ReadonlyFetchInit = Omit<RequestInit, 'body' | 'method'> & {
  next?: { revalidate?: number; tags?: string[] };
};

/**
 * Resolve the READ API base URL using the same logic as legacy core:
 * - Production: `${NEXT_PUBLIC_API_URL}/api/read`
 * - Local/dev:  `http://localhost:8080/api/read`
 * Never throws — always returns a usable base for server-side reads.
 */
function getReadBaseUrl(): string {
  const base = isProduction() && process.env.NEXT_PUBLIC_API_URL
    ? String(process.env.NEXT_PUBLIC_API_URL).replace(/\/+$/, '')
    : 'http://localhost:8080';
  return `${base}/api/read`;
}

/**
 * Build a full URL to the read API with optional query parameters.
 */
function toURL(path: string, params?: Record<string, string | number | boolean | undefined>) {
  const url = new URL(`${getReadBaseUrl()}${path.startsWith('/') ? path : '/' + path}`);
  if (params)
    for (const [k, v] of Object.entries(params))
      if (v !== undefined) url.searchParams.set(k, String(v));
  return url.toString();
}

/**
 * Ensure a successful JSON response.
 * - Throws on non-OK responses; triggers notFound() on 404 for RSC.
 * - Throws if response is not JSON for read operations.
 */
async function safeJson<T>(res: Response): Promise<T> {
  const ct = res.headers.get('content-type') || '';
  if (!res.ok) {
    let detail: unknown;
    try {
      detail = ct.includes('application/json') ? await res.json() : await res.text();
    } catch {
      detail = await res.text();
    }
    const message = typeof detail === 'string' ? detail : JSON.stringify(detail);
    if (res.status === 404) notFound();
    throw new Error(`API ${res.status}: ${message}`);
  }
  if (!ct.includes('application/json')) throw new Error('Unexpected non-JSON response from API');
  return res.json() as Promise<T>;
}

/**
 * Compute cache tag for a specific collection slug.
 */
function tagForSlug(slug: string) {
  return `collection-${slug}`;
}

/** Cache tag for the collections index. */
function tagForIndex() {
  return 'collections-index';
}

/** Cache tag for all collections belonging to a specific type. */
function tagForType(type: CollectionType) {
  return `collections-type-${type}`;
}

/**
 * Fetch a paginated list of collections.
 * Uses the collections-index cache tag.
 */
export async function fetchCollections(page = 0, size = PAGINATION.homePageSize): Promise<ContentCollection[]> {
  // Graceful degradation for local dev when backend is unavailable or misconfigured.
  // If NEXT_PUBLIC_API_URL is not set or the endpoint returns 404, return an empty list
  // instead of triggering a global 404 via notFound(). This keeps the home page usable.
  const url = toURL('/collections', { page, size });
  try {
    const res = await fetch(url, {
      next: { revalidate: TIMING.revalidateCache, tags: [tagForIndex()] },
    } as ReadonlyFetchInit);
    if (res.status === 404) return [];

    // Parse once, then normalize shape. Backend may return an array or a paginated object.
    const data = await safeJson<unknown>(res);

    // Dev-friendly logging without leaking secrets; helpful for shape debugging.
    try {
      const preview = typeof data === 'object' ? JSON.stringify(data).slice(0, 200) : String(data);
      console.debug('[collections] parsed body preview:', preview);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[collections] preview logging failed', error instanceof Error ? error.message : String(error));
      }
    }

    if (Array.isArray(data)) return data as ContentCollection[];
    if (data && typeof data === 'object') {
      const maybe = (data as Record<string, unknown>).content ?? (data as Record<string, unknown>).collections ?? (data as Record<string, unknown>).items ?? null;
      if (Array.isArray(maybe)) return maybe as ContentCollection[];
    }

    // Unknown shape; avoid crashing callers. Return empty list.
    return [];
  } catch {
    // Network or parsing failure — prefer empty state on home rather than crashing.
    return [];
  }
}

/**
 * Base model for public-facing collection display pages.
 * Contains only fields needed for rendering collection content.
 */
export interface ContentCollectionBase {
  id: number;
  title: string;
  description?: string;
  slug: string;
  location?: string;
  collectionDate?: string;
  type: CollectionType;
  // Legacy compatibility: keep coverImageUrl, but prefer coverImage object
  coverImageUrl?: string;
  coverImage?: ImageContentBlock | null;
  displayMode?: DisplayMode;
  blocks: ContentBlock[];
  pagination: { currentPage: number; totalPages: number; totalBlocks: number; pageSize: number };
}

/**
 * Full collection model matching the complete backend API response.
 * Used by admin interfaces with all management fields.
 */
export interface ContentCollectionModel extends ContentCollectionBase {
  visible?: boolean;
  priority?: number;
  isPasswordProtected?: boolean;
  hasAccess?: boolean;
  homeCardEnabled?: boolean;
  homeCardText?: string;
  createdAt?: string;
  updatedAt?: string;
  configJson?: ConfigJson | string;
  blocksPerPage?: number;
}

/** Convert backend collection to the full model shape. */
function toModel(c: ContentCollection): ContentCollectionModel {
  const cover = c.coverImage ?? null;
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    coverImageUrl: c.coverImageUrl,
    coverImage: cover,
    slug: c.slug,
    location: c.location,
    collectionDate: c.collectionDate,
    type: c.type,
    displayMode: c.displayMode,
    visible: c.visible,
    priority: c.priority,
    isPasswordProtected: c.isPasswordProtected,
    hasAccess: c.hasAccess,
    homeCardEnabled: c.homeCardEnabled,
    homeCardText: c.homeCardText,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    configJson: c.configJson,
    blocksPerPage: c.blocksPerPage,
    blocks: c.contentBlocks ?? [],
    pagination: {
      currentPage: c.currentPage ?? 0,
      totalPages: c.totalPages ?? 1,
      totalBlocks: c.totalBlocks ?? (c.contentBlocks?.length ?? 0),
      pageSize: c.blocksPerPage ?? PAGINATION.collectionPageSize,
    },
  };
}

/** Convert full model to base model by stripping admin-only fields. */
function toBase(model: ContentCollectionModel): ContentCollectionBase {
  return {
    id: model.id,
    title: model.title,
    description: model.description,
    slug: model.slug,
    location: model.location,
    collectionDate: model.collectionDate,
    type: model.type,
    coverImageUrl: model.coverImageUrl,
    coverImage: model.coverImage,
    displayMode: model.displayMode,
    blocks: model.blocks,
    pagination: model.pagination,
  };
}

/**
 * Fetch a single collection by slug for public display pages.
 * Enforces access control via hasAccess check.
 * Returns base model with only public-facing fields.
 * Tagged with the per-slug cache tag for targeted revalidation after writes.
 */
export async function fetchCollectionBySlug(
  slug: string,
  page = 0,
  size = PAGINATION.defaultPageSize
): Promise<ContentCollectionBase> {
  if (!slug) throw new Error('slug is required');
  const url = toURL(`/collections/${encodeURIComponent(slug)}`, { page, size });
  const res = await fetch(url, {
    next: { revalidate: 3600, tags: [tagForSlug(slug)] },
  } as ReadonlyFetchInit);
  const raw = await safeJson<ContentCollection>(res);
  const model = toModel(raw);

  // Security: Enforce access control for public pages
  if (!model.hasAccess) {
    notFound();
  }

  return toBase(model);
}

/**
 * Fetch a single collection by slug for admin pages.
 * No access control checks - admins can see everything.
 * Returns full model with all admin fields.
 * Tagged with the per-slug cache tag for targeted revalidation after writes.
 */
export async function fetchCollectionBySlugAdmin(
  slug: string,
  page = 0,
  size?: 50
): Promise<ContentCollectionModel> {
  if (!slug) throw new Error('slug is required');
  const url = toURL(`/collections/${encodeURIComponent(slug)}`, { page, size });
  const res = await fetch(url, {
    next: { revalidate: TIMING.revalidateCache, tags: [tagForSlug(slug)] },
  } as ReadonlyFetchInit);
  const raw = await safeJson<ContentCollection>(res);
  return toModel(raw);
}

/**
 * Fetch collections by type with pagination.
 * Tagged with `collections-type-${type}` for precise revalidation.
 */
export async function fetchCollectionsByType(
  type: CollectionType,
  page = 0,
  size = PAGINATION.collectionPageSize
): Promise<HomeCardModel[]> {
  if (!type) throw new Error('type is required');
  const url = toURL(`/collections/type/${type}`, { page, size });
  const res = await fetch(url, {
    next: { revalidate: TIMING.revalidateCache, tags: [tagForType(type)] },
  } as ReadonlyFetchInit);
  return safeJson<HomeCardModel[]>(res);
}

/** Response for client gallery access validation. */
export interface ClientGalleryAccess {
  hasAccess: boolean;
}

/**
 * Validate password-based access for a client gallery.
 * Uses no-store caching since the result is user-specific.
 */
export async function validateClientGalleryAccess(
  slug: string,
  password: string
): Promise<ClientGalleryAccess> {
  if (!slug) throw new Error('slug is required');
  if (!password) throw new Error('password is required');
  const url = toURL(`/collections/${encodeURIComponent(slug)}/access`);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ password }),
    cache: 'no-store',
  });
  return safeJson<ClientGalleryAccess>(res);
}

/** Export tag helpers for use by server-side mutation wrappers. */
export const collectionCacheTags = { tagForSlug, tagForIndex, tagForType };
