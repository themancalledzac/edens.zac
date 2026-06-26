/**
 * Per-user rating override client API. Mirrors the raw-fetch idiom of `app/lib/api/auth.ts`:
 * same-origin proxy, `credentials: 'same-origin'`, `cache: 'no-store'`, `ApiError` on non-OK.
 * These are authed-user (`read`) endpoints — a CLIENT-membership user writes/reads their own
 * overrides; the backend enforces membership. Admins do NOT use these (they edit the canonical
 * rating directly via editMode).
 */
import { ApiError } from '@/app/lib/api/core';

interface RatingOverrideItem {
  contentId: number;
  rating: number;
}

/** Upsert the viewer's override for one image. Resolves on 204; throws `ApiError` on non-OK. */
export async function upsertRatingOverride(
  collectionId: number,
  contentId: number,
  rating: number
): Promise<void> {
  const res = await fetch('/api/proxy/api/read/user/ratings', {
    method: 'PUT',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ collectionId, contentId, rating }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new ApiError(detail || `API error: ${res.status}`, res.status);
  }
}

/**
 * The viewer's overrides for a collection as a `contentId -> rating` Map. Returns an empty Map on
 * 401 (anonymous — "no overrides" is data, not an error); throws `ApiError` on any other non-OK.
 */
export async function listRatingOverrides(collectionId: number): Promise<Map<number, number>> {
  const res = await fetch(`/api/proxy/api/read/user/ratings?collectionId=${collectionId}`, {
    method: 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
  });
  if (res.status === 401) return new Map();
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new ApiError(detail || `API error: ${res.status}`, res.status);
  }
  const items = (await res.json()) as RatingOverrideItem[];
  return new Map(items.map(i => [i.contentId, i.rating]));
}
