/**
 * Per-user Selects API — client mutations + reads through the BFF proxy. Mirrors the raw-fetch
 * idiom of `app/lib/api/auth.ts`: `fetch` to `/api/proxy/api/read/user/selects...` with
 * `credentials: 'same-origin'` and `cache: 'no-store'`, throwing `ApiError` on any non-OK
 * response. Distinct from the ephemeral download "select mode" (see `ClientGalleryDownloadContext`)
 * — these calls persist a user's favorites.
 */
import { ApiError, clientFetch, fetchReadApi } from '@/app/lib/api/core';
import { type SelectGroup } from '@/app/types/Selects';
import { logger } from '@/app/utils/logger';

const BASE = '/api/proxy/api/read/user/selects';

/** Add an image to the current user's selects, scoped to a collection. Resolves on 201. */
export async function addSelect(collectionId: number, contentId: number): Promise<void> {
  await clientFetch(BASE, { method: 'POST', json: { collectionId, contentId } });
}

/** Remove an image from the current user's selects. Resolves on 204. */
export async function removeSelect(contentId: number): Promise<void> {
  await clientFetch(`${BASE}/${contentId}`, { method: 'DELETE' });
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
  } catch (error) {
    // Anonymous (401) or any read failure must not break the gallery render — selects are
    // additive. Anything other than 401 is real breakage, so log rather than swallow it.
    if (!(error instanceof ApiError) || error.status !== 401) {
      const status = error instanceof ApiError ? error.status : 'unknown';
      logger.warn('selects', `seed read failed (status ${status}); rendering empty`, { error });
    }
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
  } catch (error) {
    // Same contract as `listSelectIdsServer`: 401 is the expected anonymous case, so it stays
    // quiet. Anything else is real breakage and must not vanish into an indistinguishable `[]`.
    if (!(error instanceof ApiError) || error.status !== 401) {
      logger.error('selects', 'Failed to fetch all selects; rendering empty', error);
    }
    return [];
  }
}
