/**
 * Per-user "Your Space" API — saved images + followed collections. Mirrors the raw-fetch idiom of
 * `app/lib/api/selects.ts`: `fetch` to `/api/proxy/api/read/user/...` with
 * `credentials: 'same-origin'` and `cache: 'no-store'`, throwing `ApiError` on any non-OK response.
 *
 * Distinct from Selects (per-gallery favorites): saves are cross-collection bookmarks available to
 * ANY logged-in user, and follows track whole collections. Both backend reads return `number[]`.
 */
import { ApiError, fetchReadApi } from '@/app/lib/api/core';
import { type ContentImageModel } from '@/app/types/Content';
import { type FollowedCollectionIds, type SavedImageIds } from '@/app/types/Personal';
import { logger } from '@/app/utils/logger';

const SAVES = '/api/proxy/api/read/user/saves';
const FOLLOWS = '/api/proxy/api/read/user/follows';

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

/** Bookmark an image for the current user. Resolves on 201. */
export async function addSave(imageId: number): Promise<void> {
  const res = await fetch(SAVES, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageId }),
    cache: 'no-store',
  });
  if (!res.ok) {
    await throwFromResponse(res);
  }
}

/** Remove a saved image for the current user. Resolves on 204. */
export async function removeSave(imageId: number): Promise<void> {
  const res = await fetch(`${SAVES}/${imageId}`, {
    method: 'DELETE',
    credentials: 'same-origin',
    cache: 'no-store',
  });
  if (!res.ok) {
    await throwFromResponse(res);
  }
}

/** Follow a collection for the current user. Resolves on 201. */
export async function addFollow(collectionId: number): Promise<void> {
  const res = await fetch(FOLLOWS, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ collectionId }),
    cache: 'no-store',
  });
  if (!res.ok) {
    await throwFromResponse(res);
  }
}

/** Unfollow a collection for the current user. Resolves on 204. */
export async function removeFollow(collectionId: number): Promise<void> {
  const res = await fetch(`${FOLLOWS}/${collectionId}`, {
    method: 'DELETE',
    credentials: 'same-origin',
    cache: 'no-store',
  });
  if (!res.ok) {
    await throwFromResponse(res);
  }
}

/**
 * Treat a failed personal read as "empty" without hiding real breakage: a 401 means the viewer is
 * anonymous (expected — return `[]` silently), while any other status (e.g. a 404 from a missing /
 * stale-backend endpoint) is logged as a warning so it is not silently rendered as "no data". The
 * page never 500s on these reads; it degrades to an empty section.
 */
function emptyOnError<T>(label: string, error: unknown): T[] {
  if (error instanceof ApiError && error.status === 401) {
    return [];
  }
  const status = error instanceof ApiError ? error.status : 'unknown';
  logger.warn('personal', `${label} read failed (status ${status}); rendering empty`, { error });
  return [];
}

/**
 * Server-side seed read of the viewer's saved image ids (newest-first). Uses `fetchReadApi`
 * (forwards request cookies) so a Server Component can prime the SavesProvider. Anonymous viewers
 * (401) get `[]` silently; other failures are logged and still degrade to `[]`.
 */
export async function listSavedImageIdsServer(): Promise<SavedImageIds> {
  try {
    const ids = await fetchReadApi<SavedImageIds>('/user/saves');
    return ids ?? [];
  } catch (error) {
    return emptyOnError('saved image ids', error);
  }
}

/**
 * Server-side read of the viewer's saved images as full {@link ContentImageModel}s (newest-first),
 * for rendering real tiles rather than bare ids. Cookie-forwarding via `fetchReadApi`. Anonymous
 * viewers (401) get `[]` silently; other failures are logged and still degrade to `[]`.
 */
export async function listSavedImagesServer(): Promise<ContentImageModel[]> {
  try {
    const images = await fetchReadApi<ContentImageModel[]>('/user/saves/images');
    return images ?? [];
  } catch (error) {
    return emptyOnError('saved images', error);
  }
}

/**
 * Server-side read of the viewer's followed collection ids. Mirrors {@link listSavedImageIdsServer}
 * (cookie-forwarding via `fetchReadApi`). Anonymous viewers (401) get `[]` silently; other failures
 * are logged and still degrade to `[]`.
 */
export async function listFollowedCollectionIdsServer(): Promise<FollowedCollectionIds> {
  try {
    const ids = await fetchReadApi<FollowedCollectionIds>('/user/follows');
    return ids ?? [];
  } catch (error) {
    return emptyOnError('followed collection ids', error);
  }
}
