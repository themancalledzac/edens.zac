/**
 * User share links — the "guest pass" a signed-in user hands to a friend, client or parent.
 *
 * Two audiences, two idioms, matching the rest of this directory:
 *
 * - Owner-side reads run server-side through `fetchReadApi` (session cookie forwarded), mirroring
 *   {@link getUserPage} including its "null on 401" contract.
 * - Owner-side mutations run client-side as raw `fetch` to `/api/proxy/api/read/user/share/...`,
 *   the same shape as `personal.ts` — these are POST/PUT/DELETE on the READ channel because the
 *   backend scopes them to the session principal rather than to the admin surface.
 */
import { ApiError, fetchReadApi, throwFromResponse } from '@/app/lib/api/core';
import { type CollectionModel } from '@/app/types/Collection';
import { logger } from '@/app/utils/logger';

const SHARE = '/api/proxy/api/read/user/share';

/** What a recipient sees: whose work it is, plus the page itself. */
export interface ShareView {
  ownerName: string | null;
  page: CollectionModel;
}

/** The owner's view of their own link. */
export interface ShareSettings {
  exists: boolean;
  /**
   * The live raw token, so the page can render a copyable link and re-send it.
   *
   * Null when it cannot be recovered — a link minted before the backend stored a decryptable copy.
   * That is NOT an error state: the link still works for whoever holds it, we simply cannot show
   * it, so the UI offers a reset rather than reporting a failure.
   */
  token: string | null;
  createdAt: string | null;
  rotatedAt: string | null;
  lastUsedAt: string | null;
  optedInCollectionIds: number[];
  candidateCollections: CollectionModel[];
}

export interface ShareEmailResult {
  sent: boolean;
  reason: string | null;
}

/**
 * The recipient view behind a share token.
 *
 * Returns null on 404, which covers an unknown token and a reset one alike — the backend cannot
 * tell them apart by design, and neither should the page.
 */
export async function getShareView(token: string): Promise<ShareView | null> {
  try {
    return await fetchReadApi<ShareView>(`share/${encodeURIComponent(token)}`, {
      cache: 'no-store',
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * The recipient view for a visitor who already holds the cookie — the "way back" after they have
 * walked off into a collection. Null when the cookie is absent or its link has since been reset.
 */
export async function getCurrentShareView(): Promise<ShareView | null> {
  try {
    return await fetchReadApi<ShareView>('share/view', { cache: 'no-store' });
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 404)) {
      return null;
    }
    throw error;
  }
}

/** The signed-in user's own link. Null on 401, matching {@link getUserPage}. Internal to this module — {@link readShareSettings} is the exported entry point. */
async function getShareSettings(): Promise<ShareSettings | null> {
  try {
    return await fetchReadApi<ShareSettings>('user/share', { cache: 'no-store' });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

/**
 * Outcome of the owner-side settings read.
 *
 * `{ ok: true, settings: null }` is a genuine "you have no link yet"; `{ ok: false }` is "the read
 * failed, so nothing is known". Same distinction {@link FailSoftRead} draws for the list reads, and
 * for the same reason: collapsing the two would have the Share card offer "Link to share" to
 * someone who already has one in circulation, which is a claim we cannot support from a failure.
 */
export type ShareSettingsRead = { ok: true; settings: ShareSettings | null } | { ok: false };

/**
 * Fail-soft wrapper for {@link getShareSettings}, so a share-read failure degrades one card rather
 * than taking down the whole `/user` page.
 */
export async function readShareSettings(): Promise<ShareSettingsRead> {
  try {
    return { ok: true, settings: await getShareSettings() };
  } catch (error) {
    logger.error('share', 'Could not load share settings', error);
    return { ok: false };
  }
}

/**
 * Plant the share cookie for a token that arrived in the URL, so the recipient keeps their view
 * while browsing the rest of the site.
 *
 * Runs from the browser on purpose. The backend owns the cookie's attributes (HttpOnly, Lax, the
 * rolling 30-day window) and sets them on this response; the BFF proxy forwards `Set-Cookie`
 * through. A Server Component cannot set cookies, and re-declaring those attributes in a Server
 * Action would duplicate them in a second place that could drift from the backend.
 */
export async function plantShareCookie(token: string): Promise<void> {
  const res = await fetch(`/api/proxy/api/read/share/${encodeURIComponent(token)}`, {
    credentials: 'same-origin',
    cache: 'no-store',
  });
  if (!res.ok) {
    await throwFromResponse(res);
  }
}

/**
 * Mint the link, or reset it.
 *
 * Destructive: anyone holding the previous link loses access immediately. Re-sending to a new
 * person does NOT need this — {@link getShareSettings} returns the live link precisely so that
 * sending it again is a copy rather than a reset.
 */
export async function rotateShareLink(): Promise<ShareSettings> {
  const res = await fetch(`${SHARE}/rotate`, {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
  });
  if (!res.ok) {
    await throwFromResponse(res);
  }
  return (await res.json()) as ShareSettings;
}

/**
 * Email the link that is already in circulation. Does not mint a new one, so emailing a second
 * person cannot cut off the first.
 */
export async function emailShareLink(toEmail: string): Promise<ShareEmailResult> {
  const res = await fetch(`${SHARE}/email`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toEmail }),
    cache: 'no-store',
  });
  if (!res.ok) {
    await throwFromResponse(res);
  }
  return (await res.json()) as ShareEmailResult;
}

/** Add a collection the user was granted access to into their shared view. */
export async function addShareCollection(collectionId: number): Promise<void> {
  const res = await fetch(`${SHARE}/collections/${collectionId}`, {
    method: 'PUT',
    credentials: 'same-origin',
    cache: 'no-store',
  });
  if (!res.ok) {
    await throwFromResponse(res);
  }
}

/** Take a collection back out of the shared view. */
export async function removeShareCollection(collectionId: number): Promise<void> {
  const res = await fetch(`${SHARE}/collections/${collectionId}`, {
    method: 'DELETE',
    credentials: 'same-origin',
    cache: 'no-store',
  });
  if (!res.ok) {
    await throwFromResponse(res);
  }
}

/** Build the shareable URL from a raw token, against the browser's own origin. */
export function buildShareUrl(token: string, origin: string): string {
  return `${origin.replace(/\/+$/, '')}/s/${token}`;
}
