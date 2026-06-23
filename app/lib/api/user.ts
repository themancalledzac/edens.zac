import { fetchReadApi } from '@/app/lib/api/core';
import { type CollectionModel } from '@/app/types/Collection';

/**
 * The signed-in user's synthetic collection (galleries + tagged content) from
 * `GET /api/read/user/me/page`. Personal data — never cached. Returns null when anonymous (401).
 */
export async function getUserPage(): Promise<CollectionModel | null> {
  return fetchReadApi<CollectionModel>('user/me/page', { cache: 'no-store' });
}
