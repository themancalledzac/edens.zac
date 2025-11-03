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
import {
  type CollectionModel,
  type CollectionType,
} from '@/app/types/Collection';
import { isProduction } from '@/app/utils/environment';

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
export async function fetchCollections(page = 0, size = PAGINATION.homePageSize): Promise<CollectionModel[]> {
  const url = toURL('/collections', { page, size });
  try {
    const res = await fetch(url, {
      next: { revalidate: TIMING.revalidateCache, tags: [tagForIndex()] },
    } as ReadonlyFetchInit);
    if (res.status === 404) return [];

    const data = await safeJson<unknown>(res);

    if (Array.isArray(data)) return data as CollectionModel[];
    if (data && typeof data === 'object') {
      const maybe = (data as Record<string, unknown>).content ?? (data as Record<string, unknown>).collections ?? (data as Record<string, unknown>).items ?? null;
      if (Array.isArray(maybe)) return maybe as CollectionModel[];
    }

    return [];
  } catch {
    return [];
  }
}

/**
 * Fetch a single collection by slug for public display pages.
 * Enforces access control via hasAccess check.
 * Tagged with the per-slug cache tag for targeted revalidation after writes.
 */
export async function fetchCollectionBySlug(
  slug: string,
  page = 0,
  size: number = PAGINATION.defaultPageSize
): Promise<CollectionModel> {
  if (!slug) throw new Error('slug is required');
  const url = toURL(`/collections/${encodeURIComponent(slug)}`, { page, size });
  const res = await fetch(url, {
    next: { revalidate: 3600, tags: [tagForSlug(slug)] },
  } as ReadonlyFetchInit);
  const raw = await safeJson<CollectionModel>(res);

  // Security: Enforce access control for public pages
  const hasAccess = (raw as CollectionModel & { hasAccess?: boolean }).hasAccess;
  if (hasAccess === false) {
    notFound();
  }

  return raw;
}

/**
 * Fetch a single collection by slug for admin pages.
 * No access control checks - admins can see everything.
 * Tagged with the per-slug cache tag for targeted revalidation after writes.
 */
export async function fetchCollectionBySlugAdmin(
  slug: string,
  page = 0,
  size: number = PAGINATION.defaultPageSize
): Promise<CollectionModel> {
  if (!slug) throw new Error('slug is required');
  const url = toURL(`/collections/${encodeURIComponent(slug)}`, { page, size });
  const res = await fetch(url, {
    next: { revalidate: TIMING.revalidateCache, tags: [tagForSlug(slug)] },
  } as ReadonlyFetchInit);
  return safeJson<CollectionModel>(res);
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