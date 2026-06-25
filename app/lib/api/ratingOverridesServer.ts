/**
 * Server-side seed for per-user rating overrides. The page resolves this alongside `meServer()` so
 * a client's overrides are present on first paint (no client-side flash). Forwards the incoming
 * `ezac_session` cookie via `getServerCookieHeader()`. Returns an empty Map on 401 (anonymous — no
 * overrides is data, not an error); throws `ApiError` on any other non-OK. Server-only.
 */
import { ApiError, getApiBaseUrl, getServerCookieHeader } from '@/app/lib/api/core';

interface RatingOverrideItem {
  contentId: number;
  rating: number;
}

export async function listRatingOverridesServer(
  collectionId: number
): Promise<Map<number, number>> {
  const url = `${getApiBaseUrl('read')}/user/ratings?collectionId=${collectionId}`;
  const cookieHeader = await getServerCookieHeader();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cookieHeader) {
    headers.Cookie = cookieHeader;
  }

  const res = await fetch(url, { method: 'GET', headers, cache: 'no-store' });
  if (res.status === 401) return new Map();
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new ApiError(detail || `API error: ${res.status}`, res.status);
  }
  const items = (await res.json()) as RatingOverrideItem[];
  return new Map(items.map(i => [i.contentId, i.rating]));
}
