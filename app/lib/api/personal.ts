/**
 * Per-user "Your Space" API — saved images + followed collections. Mirrors the raw-fetch idiom of
 * `app/lib/api/selects.ts`: `fetch` to `/api/proxy/api/read/user/...` with
 * `credentials: 'same-origin'` and `cache: 'no-store'`, throwing `ApiError` on any non-OK response.
 *
 * Distinct from Selects (per-gallery favorites): saves are cross-collection bookmarks available to
 * ANY logged-in user, and follows track whole collections. Both backend reads return `number[]`.
 */
import { ApiError, fetchReadApi, throwFromResponse } from '@/app/lib/api/core';
import { type ContentImageModel } from '@/app/types/Content';
import { type FailSoftRead } from '@/app/types/FailSoftRead';
import { type FollowedCollectionIds, type SavedImageIds } from '@/app/types/Personal';
import { logger } from '@/app/utils/logger';

const SAVES = '/api/proxy/api/read/user/saves';
const FOLLOWS = '/api/proxy/api/read/user/follows';

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
 * Report a failed personal read, at the level the failure actually warrants.
 *
 * `warn`, not `error` — the same policy the admin twins in `app/lib/api/users.ts` follow. These
 * endpoints fail as a matter of course today (their admin counterparts are not on the deployed
 * backend at all), and a channel that carries expected outcomes stops being read. `error` is
 * reserved for failures that are not expected.
 *
 * A 401 is not logged at all: these reads only ever run for a signed-in viewer — `/user` 404s
 * anonymous callers before `loadUserSpace`, and `LocationPage` gates on `me` — so a 401 is a
 * session that lapsed mid-request. Expected and uninteresting. Any other status (e.g. a 404 from a
 * stale backend) is real breakage worth the warning.
 */
function logFailedRead(label: string, error: unknown): void {
  if (error instanceof ApiError && error.status === 401) return;
  const status = error instanceof ApiError ? error.status : 'unknown';
  logger.warn('personal', `${label} read failed (status ${status}); reporting unavailable`, {
    error,
  });
}

/**
 * Keep a failed personal read from 500-ing the page WITHOUT letting it pass as an answer.
 *
 * Every failure is `ok: false`, 401 included — the LOGGING branches on the status (see
 * {@link logFailedRead}), the reported outcome never does. A lapsed session is still not evidence
 * that the viewer has saved nothing.
 *
 * The admin-side twins in `app/lib/api/users.ts` report failure the same way; this is the
 * self-side half of that contract, so `loadUserSpace` can treat both modes identically.
 */
function unavailableOnError<T>(label: string, error: unknown): FailSoftRead<T> {
  logFailedRead(label, error);
  return { ok: false };
}

/**
 * Server-side seed read of the viewer's saved image ids (newest-first). Uses `fetchReadApi`
 * (forwards request cookies) so a Server Component can prime the SavesProvider.
 *
 * This one keeps the bare-array contract and reports no failure flag, unlike its two neighbours.
 * Seeding a provider makes no claim to the viewer: an unseeded heart just renders unlit, which is
 * indistinguishable from "not saved" and says nothing false. There is no copy here to be honest
 * about, so the caller (`CollectionPageWrapper`) would have nothing to do with a flag.
 *
 * The failure is still reported to the log — that is the ONLY thing wanted from the failure path
 * here, so it calls {@link logFailedRead} directly rather than building a {@link FailSoftRead} it
 * would immediately discard.
 */
export async function listSavedImageIdsServer(): Promise<SavedImageIds> {
  try {
    const ids = await fetchReadApi<SavedImageIds>('/user/saves');
    return ids ?? [];
  } catch (error) {
    logFailedRead('saved image ids', error);
    return [];
  }
}

/**
 * Server-side read of the viewer's saved images as full {@link ContentImageModel}s (newest-first),
 * for rendering real tiles rather than bare ids. Cookie-forwarding via `fetchReadApi`.
 *
 * Fail-soft but not silent: a failure resolves to `{ ok: false }` rather than `[]`, because `[]`
 * reaches `/user` as "You have not saved any images yet." — a claim about data nobody managed to
 * read. See {@link unavailableOnError}.
 */
export async function listSavedImagesServer(): Promise<FailSoftRead<ContentImageModel>> {
  try {
    const images = await fetchReadApi<ContentImageModel[]>('/user/saves/images');
    return { ok: true, items: images ?? [] };
  } catch (error) {
    return unavailableOnError<ContentImageModel>('saved images', error);
  }
}

/**
 * Server-side read of the viewer's followed collection ids. Mirrors {@link listSavedImagesServer}
 * (cookie-forwarding via `fetchReadApi`, `{ ok: false }` on failure rather than a bare `[]`).
 *
 * The flag exists for the callers that would otherwise print "not following anything" over a
 * failed read. A caller that only seeds tiles — `LocationPage`, priming `FollowsProvider` — makes
 * no claim either way and may flatten the failure, but it has to SAY `read.ok ? read.items : []`
 * to do it: the failure arm carries no `items` precisely so that flattening is a decision rather
 * than a slip.
 */
export async function listFollowedCollectionIdsServer(): Promise<FailSoftRead<number>> {
  try {
    const ids = await fetchReadApi<FollowedCollectionIds>('/user/follows');
    return { ok: true, items: ids ?? [] };
  } catch (error) {
    return unavailableOnError<number>('followed collection ids', error);
  }
}
