/**
 * Per-user Selects API — client mutations + reads through the BFF proxy. Mirrors the raw-fetch
 * idiom of `app/lib/api/auth.ts`: `fetch` to `/api/proxy/api/read/user/selects...` with
 * `credentials: 'same-origin'` and `cache: 'no-store'`, throwing `ApiError` on any non-OK
 * response. Distinct from the ephemeral download "select mode" (see `ClientGalleryDownloadContext`)
 * — these calls persist a user's favorites.
 */
import { ApiError, fetchReadApi } from '@/app/lib/api/core';
import { type SelectGroup } from '@/app/types/Selects';

const BASE = '/api/proxy/api/read/user/selects';

/** Throw an `ApiError` carrying the backend message (or a status fallback) for a non-OK response. */
async function throwFromResponse(res: Response): Promise<never> {
  let detail: unknown;
  const contentType = res.headers.get('content-type') || '';
  try {
    detail = contentType.includes('application/json') ? await res.json() : await res.text();
  } catch {
    detail = '';
  }
  const message =
    typeof detail === 'string' && detail
      ? detail
      : (detail && typeof detail === 'object'
        ? ((detail as { message?: string }).message ?? JSON.stringify(detail))
        : `API error: ${res.status}`);
  throw new ApiError(message, res.status);
}

/** Add an image to the current user's selects, scoped to a collection. Resolves on 201. */
export async function addSelect(collectionId: number, contentId: number): Promise<void> {
  const res = await fetch(BASE, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ collectionId, contentId }),
    cache: 'no-store',
  });
  if (!res.ok) {
    await throwFromResponse(res);
  }
}

/** Remove an image from the current user's selects. Resolves on 204. */
export async function removeSelect(contentId: number): Promise<void> {
  const res = await fetch(`${BASE}/${contentId}`, {
    method: 'DELETE',
    credentials: 'same-origin',
    cache: 'no-store',
  });
  if (!res.ok) {
    await throwFromResponse(res);
  }
}

/** The current user's selected image ids in one collection. */
export async function listSelectIds(collectionId: number): Promise<number[]> {
  const res = await fetch(`${BASE}?collectionId=${collectionId}`, {
    method: 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
  });
  if (!res.ok) {
    await throwFromResponse(res);
  }
  return (await res.json()) as number[];
}

/** Every select the current user holds, grouped by collection. Backs the `/user` page. */
export async function listAllSelects(): Promise<SelectGroup[]> {
  const res = await fetch(BASE, {
    method: 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
  });
  if (!res.ok) {
    await throwFromResponse(res);
  }
  return (await res.json()) as SelectGroup[];
}

/**
 * Server-side seed read of the viewer's selected image ids for one collection. Uses
 * `fetchReadApi` (forwards the request cookies server-side) so a Server Component can prime the
 * SelectsProvider. Returns `[]` when the viewer is anonymous or holds no selects (the backend
 * returns 401 for anonymous; we treat "no selects" as empty, never an error to the page).
 */
export async function listSelectIdsServer(collectionId: number): Promise<number[]> {
  try {
    const ids = await fetchReadApi<number[]>(`/user/selects?collectionId=${collectionId}`);
    return ids ?? [];
  } catch {
    // Anonymous (401) or any read failure must not break the gallery render — selects are additive.
    return [];
  }
}

/**
 * Server-side read of every select the viewer holds, grouped by collection. Mirrors
 * `listSelectIdsServer` (cookie-forwarding via `fetchReadApi`). Returns `[]` for anonymous viewers
 * or on any read failure — the `/user/selects` page handles the anonymous case via `meServer()`
 * first.
 */
export async function listAllSelectsServer(): Promise<SelectGroup[]> {
  try {
    const groups = await fetchReadApi<SelectGroup[]>('/user/selects');
    return groups ?? [];
  } catch {
    return [];
  }
}
