/**
 * Content Collections — Client Helpers (via Next.js Proxy)
 *
 * Purpose
 * - Small set of client-safe helpers used by admin create/edit pages to talk to the backend
 *   through the local proxy route. Keeps CORS/simple origin and supports streaming uploads.
 *
 * Security & Usage
 * - Safe for client-side import; never embeds secrets. Uses relative /api/proxy path.
 * - All requests are cache: 'no-store' since they are mutating or user-specific reads.
 *
 * Exports
 * - fetchCollectionViaProxy: read a collection by slug with pagination.
 * - updateCollectionViaProxy: update collection metadata/content operations.
 * - uploadFilesViaProxy: upload media files which backend converts to blocks.
 */

import type { CollectionType } from '@/lib/api/contentCollections';
import type { CollectionRead, UpdateCollectionDTO } from '@/types/collection-edit';

/** Fetch a collection by slug through the proxy with pagination. */
export async function fetchCollectionViaProxy(slug: string, page = 0, size = 30): Promise<CollectionRead> {
  const res = await fetch(`/api/proxy/api/read/collections/${encodeURIComponent(slug)}?page=${page}&size=${size}`, {
    cache: 'no-store',
  });
  const ct = res.headers.get('content-type') || '';
  if (!res.ok) {
    const msg = ct.includes('application/json') ? JSON.stringify(await res.json()) : await res.text();
    throw new Error(msg || `Failed to load collection: ${res.status}`);
  }
  if (!ct.includes('application/json')) throw new Error('Unexpected non-JSON response');
  return (await res.json()) as CollectionRead;
}

/** Update a collection via proxy; returns id/slug/type when API returns JSON. */
export async function updateCollectionViaProxy(
  id: string,
  updates: UpdateCollectionDTO
): Promise<{ id: string; slug: string; type: CollectionType } | undefined> {
  const res = await fetch(`/api/proxy/api/write/collections/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(updates),
    cache: 'no-store',
  });
  const ct = res.headers.get('content-type') || '';
  if (!res.ok) {
    const msg = ct.includes('application/json') ? JSON.stringify(await res.json()) : await res.text();
    throw new Error(msg || `Update failed: ${res.status}`);
  }
  if (ct.includes('application/json')) {
    return res.json() as Promise<{ id: string; slug: string; type: CollectionType }>;
  }
  return undefined;
}

/** Upload one or more files; returns slug/type when API returns JSON. */
export async function uploadFilesViaProxy(
  collectionId: string,
  files: File[]
): Promise<{ slug: string; type: CollectionType } | undefined> {
  const form = new FormData();
  for (const file of files) form.append('files', file);
  const res = await fetch(`/api/proxy/api/write/collections/${encodeURIComponent(collectionId)}/content`, {
    method: 'POST',
    body: form,
    cache: 'no-store',
  });
  const ct = res.headers.get('content-type') || '';
  if (!res.ok) {
    const msg = ct.includes('application/json') ? JSON.stringify(await res.json()) : await res.text();
    throw new Error(msg || `Upload failed: ${res.status}`);
  }
  if (ct.includes('application/json')) {
    return res.json() as Promise<{ slug: string; type: CollectionType }>;
  }
  return undefined;
}
