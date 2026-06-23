import { ApiError, fetchReadApi } from '@/app/lib/api/core';
import { type CollectionModel } from '@/app/types/Collection';

/**
 * The signed-in user's synthetic collection (galleries + tagged content) from
 * `GET /api/read/user/me/page`. Personal data — never cached. Returns null on 401 (no/revoked
 * session) so a render resolves to `notFound()` instead of surfacing an error — covering the race
 * where the session is revoked between the page's `meServer()` check and this fetch.
 */
export async function getUserPage(): Promise<CollectionModel | null> {
  try {
    return await fetchReadApi<CollectionModel>('user/me/page', { cache: 'no-store' });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
}
