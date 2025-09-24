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

import { isProduction } from '@/utils/environment';

/** Distinct collection categories supported by the system. */
export type CollectionType = 'BLOG' | 'ART_GALLERY' | 'CLIENT_GALLERY' | 'PORTFOLIO';

/** Content block kinds supported by the frontend. */
export type ContentBlockType = 'IMAGE' | 'TEXT' | 'CODE' | 'GIF';

export interface ConfigJson {
  showDates: boolean;
  displayMode: string;
}

/** Base shape for all content blocks based on backend model. */
export interface BaseBlock {
  id: number;
  blockType: ContentBlockType;
  orderIndex: number;
  title?: string;
  caption?: string | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

/** Image content block (matches Data/getBlogById.json). */
export interface ImageBlock extends BaseBlock {
  blockType: 'IMAGE';
  imageUrlWeb: string;
  imageUrlRaw?: string | null;
  imageWidth?: number;
  imageHeight?: number;
  iso?: number;
  author?: string | null;
  rating?: number;
  lens?: string | null;
  blackAndWhite?: boolean;
  isFilm?: boolean;
  shutterSpeed?: string | null;
  rawFileName?: string | null;
  camera?: string | null;
  focalLength?: string | null;
  location?: string | null;
  createDate?: string | null;
  fstop?: string | null;
}

/** Text content block placeholder for future support. */
export interface TextBlock extends BaseBlock {
  blockType: 'TEXT';
  content?: string;
  format?: 'markdown' | 'html' | 'plain';
}

/** Code content block placeholder for future support. */
export interface CodeBlock extends BaseBlock {
  blockType: 'CODE';
  content?: string;
  language?: string;
}

/** GIF content block placeholder for future support. */
export interface GifBlock extends BaseBlock {
  blockType: 'GIF';
  imageUrlWeb: string;
  imageUrlRaw?: string | null;
}

/** Union of all supported content blocks. */
export type ContentBlock = ImageBlock | TextBlock | CodeBlock | GifBlock | BaseBlock;

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
  coverImage?: ContentBlock | null;
  isPasswordProtected?: boolean;
  hasAccess?: boolean;
  configJson?: ConfigJson | string;
  createdAt?: string;
  updatedAt?: string;
  blocksPerPage?: number;
  totalBlocks?: number;
  currentPage?: number;
  totalPages?: number;
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
  console.log(url.toString());
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
export async function fetchCollections(page = 0, size = 10): Promise<ContentCollection[]> {
  // Graceful degradation for local dev when backend is unavailable or misconfigured.
  // If NEXT_PUBLIC_API_URL is not set or the endpoint returns 404, return an empty list
  // instead of triggering a global 404 via notFound(). This keeps the home page usable.
  const url = toURL('/collections', { page, size });
  try {
    const res = await fetch(url, {
      next: { revalidate: 3600, tags: [tagForIndex()] },
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
 * Fetch Home Page collections using the new endpoint.
 * Accepts maxPriority (default 2) and an optional limit.
 * Uses the collections-index cache tag for revalidation.
 * TODO: Decide on where to keep the ACTUAL fetchHomePageCOllections
 */
// export async function fetchHomePageCollections(
//   { maxPriority = 1, limit }: { maxPriority?: number; limit?: number } = {}
// ): Promise<ContentCollection[]> {
//   // Endpoint should be /api/read/collections/homePage with optional query params
//   const url = toURL('/collections/homePage', { maxPriority, limit });
//   try {
//     const res = await fetch(url, {
//       next: { revalidate: 3600, tags: [tagForIndex()] },
//     } as ReadonlyFetchInit);
//     if (res.status === 404) return [];
//
//     const data = await safeJson<unknown>(res);
//
//     // Normalize possible shapes to an array
//     if (Array.isArray(data)) return data as ContentCollection[];
//     if (data && typeof data === 'object') {
//       const maybe = (data as Record<string, unknown>).content ?? (data as Record<string, unknown>).collections ?? (data as Record<string, unknown>).items ?? null;
//       if (Array.isArray(maybe)) return maybe as ContentCollection[];
//     }
//
//     return [];
//   } catch {
//     return [];
//   }
// }

/**
 * Normalized shape used by viewers to avoid leaking backend pagination internals.
 */
export interface ContentCollectionNormalized {
  id: number;
  title: string;
  description?: string;
  // Legacy compatibility: keep coverImageUrl, but prefer coverImage object
  coverImageUrl?: string;
  coverImage?: ContentBlock | null;
  slug: string;
  location?: string;
  collectionDate?: string;
  type: CollectionType;
  blocks: ContentBlock[];
  pagination: { currentPage: number; totalPages: number; totalBlocks: number; pageSize: number };
}

/** Convert backend collection to the normalized frontend shape. */
function toNormalized(c: ContentCollection): ContentCollectionNormalized {
  // coverImage is now always a ContentBlock object from the API
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
    blocks: c.contentBlocks ?? [],
    pagination: {
      currentPage: c.currentPage ?? 0,
      totalPages: c.totalPages ?? 1,
      totalBlocks: c.totalBlocks ?? (c.contentBlocks?.length ?? 0),
      pageSize: c.blocksPerPage ?? 30,
    },
  };
}

/**
 * Fetch a single collection by slug with pagination and return the normalized shape.
 * Tagged with the per-slug cache tag for targeted revalidation after writes.
 */
export async function fetchCollectionBySlug(
  slug: string,
  page = 0,
  size = 30
): Promise<ContentCollectionNormalized> {
  if (!slug) throw new Error('slug is required');
  const url = toURL(`/collections/${encodeURIComponent(slug)}`, { page, size });
  const res = await fetch(url, {
    next: { revalidate: 3600, tags: [tagForSlug(slug)] },
  } as ReadonlyFetchInit);
  const raw = await safeJson<ContentCollection>(res);
  return toNormalized(raw);
}

/**
 * Fetch collections by type with pagination.
 * Tagged with `collections-type-${type}` for precise revalidation.
 */
export async function fetchCollectionsByType(
  type: CollectionType,
  page = 0,
  size = 10
): Promise<ContentCollection[]> {
  if (!type) throw new Error('type is required');
  const url = toURL(`/collections/type/${type}`, { page, size });
  const res = await fetch(url, {
    next: { revalidate: 3600, tags: [tagForType(type)] },
  } as ReadonlyFetchInit);
  return safeJson<ContentCollection[]>(res);
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
