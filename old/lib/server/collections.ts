/**
 * Collections (Server-Only Mutations)
 *
 * Purpose
 * - Provides write/mutation wrappers for the ContentCollection system, runnable only on the server.
 * - Triggers targeted cache revalidation via Next.js `revalidateTag` and `revalidatePath` after mutations.
 * - Keeps secrets/env usage server-side by importing `server-only` and using internal API base URLs.
 *
 * When to use
 * - From Server Actions, Route Handlers, or server components that need to mutate data (create/update/delete/upload).
 * - Never import this module in client components; it is intentionally server-only and will fail client bundling.
 *
 * Environment
 * - INTERNAL_API_BASE_URL (preferred) or NEXT_PUBLIC_API_URL (fallback) to reach the backend.
 */
import 'server-only';

import { revalidatePath, revalidateTag } from 'next/cache';

import { collectionCacheTags, type CollectionType } from '@/app/lib/api/contentCollections';

const INTERNAL_API_BASE_URL = process.env.INTERNAL_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? '';

/** Resolve the internal API base URL and strip trailing slashes. */
function requireApiBase(): string {
  if (!INTERNAL_API_BASE_URL) throw new Error('INTERNAL_API_BASE_URL or NEXT_PUBLIC_API_URL must be set');
  return INTERNAL_API_BASE_URL.replace(/\/+$/, '');
}

/** Build a full URL to the write API with optional query parameters. */
function toURL(path: string, params?: Record<string, string | number | boolean | undefined>) {
  const url = new URL(`${requireApiBase()}/api${path.startsWith('/') ? path : '/' + path}`);
  if (params) for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, String(v));
  return url.toString();
}

/**
 * Ensure a successful response; parse JSON when available.
 * Mutation endpoints may return empty bodies; return an empty object of T in that case.
 */
async function safeJson<T>(res: Response): Promise<T> {
  const ct = res.headers.get('content-type') ?? '';
  if (!res.ok) {
    let msg: unknown;
    try { msg = ct.includes('application/json') ? await res.json() : await res.text(); } catch { msg = await res.text(); }
    throw new Error(`API ${res.status}: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
  }
  return (ct.includes('application/json') ? res.json() : ({} as T)) as Promise<T>;
}

/**
 * DTO to create a new collection. When `type` is CLIENT_GALLERY, `password` can be provided.
 */
export interface CreateCollectionDTO {
  title: string;
  slug?: string;
  type: CollectionType;
  description?: string;
  visibility?: 'PUBLIC' | 'PRIVATE';
  password?: string; // for client galleries
  blocksPerPage?: number;
  priority?: number;
  configJson?: unknown;
}

/**
 * DTO for partial collection updates, including block operations.
 */
export interface UpdateCollectionDTO {
  title?: string;
  description?: string;
  visibility?: 'PUBLIC' | 'PRIVATE';
  password?: string | null; // null clears
  priority?: number;
  blocksPerPage?: number;
  operations?: Array<
    | { op: 'reorder'; blockId: string; toIndex: number }
    | { op: 'remove'; blockId: string }
    | { op: 'addText'; afterBlockId?: string | null; content: string; format: 'markdown' | 'html' | 'plain' }
  >;
}

/**
 * Create a new collection.
 * Revalidates index, type, and slug tags; revalidates the collection page path.
 */
export async function createCollection(dto: CreateCollectionDTO) {
  if (!dto?.title) throw new Error('title is required');
  if (!dto?.type) throw new Error('type is required');

  const res = await fetch(toURL('/write/collections/createCollection'), {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(dto), cache: 'no-store',
  });

  const created = await safeJson<{ id: string; slug: string; type: CollectionType }>(res);

  revalidateTag(collectionCacheTags.tagForIndex());
  revalidateTag(collectionCacheTags.tagForType(created.type));
  revalidateTag(collectionCacheTags.tagForSlug(created.slug));
  revalidatePath(`/collection/${created.slug}`, 'page');

  return created;
}

/**
 * Update a collection (metadata and/or content operations).
 * Revalidates index, type, slug tags and the collection page path.
 */
export async function updateCollection(id: string, updates: UpdateCollectionDTO) {
  if (!id) throw new Error('id is required');

  const res = await fetch(toURL(`/write/collections/${encodeURIComponent(id)}`), {
    method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(updates), cache: 'no-store',
  });

  const updated = await safeJson<{ id: string; slug: string; type: CollectionType }>(res);

  revalidateTag(collectionCacheTags.tagForIndex());
  revalidateTag(collectionCacheTags.tagForType(updated.type));
  revalidateTag(collectionCacheTags.tagForSlug(updated.slug));
  revalidatePath(`/collection/${updated.slug}`, 'page');

  return updated;
}

/**
 * Delete a collection by ID.
 * Revalidates the collections index tag.
 */
export async function deleteCollection(id: string) {
  if (!id) throw new Error('id is required');

  const res = await fetch(toURL(`/write/collections/${encodeURIComponent(id)}`), { method: 'DELETE', cache: 'no-store' });
  await safeJson<unknown>(res);

  // Broad revalidation when slug/type are unknown from response
  revalidateTag(collectionCacheTags.tagForIndex());
}

/**
 * Upload one or more files to a collection; backend turns them into content blocks.
 * Revalidates slug and type tags; revalidates the collection layout path.
 */
export async function uploadContentFiles(collectionId: string, files: File[]) {
  if (!collectionId) throw new Error('collectionId is required');
  if (!files?.length) throw new Error('at least one file is required');

  const form = new FormData();
  for (const file of files) {
    form.append('files', file);
  }

  const res = await fetch(toURL(`/write/collections/${encodeURIComponent(collectionId)}/content`), {
    method: 'POST', body: form, cache: 'no-store',
  });

  const payload = await safeJson<{ slug: string; type: CollectionType }>(res);

  revalidateTag(collectionCacheTags.tagForSlug(payload.slug));
  revalidateTag(collectionCacheTags.tagForType(payload.type));
  revalidatePath(`/collection/${payload.slug}`, 'layout');

  return payload;
}
