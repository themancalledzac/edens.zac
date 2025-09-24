/**
 * API functions for home-related operations
 */

import {
  type ContentCollectionNormalized,
  fetchCollectionBySlug as fetchCollectionBySlugNormalized,
} from '@/lib/api/contentCollections';
import { fetchPostJsonApi, fetchReadApi } from '@/lib/api/core';
import {
  type ContentCollectionCreateDTO,
  type ContentCollectionModel,
} from '@/types/ContentCollection';
import { type HomeCardModel } from '@/types/HomeCardModel';

/**
 * Backend response structure for home page
 */
interface HomePageResponse {
  items: HomeCardModel[];
  count: number;
  maxPriority: number;
  generatedAt: string;
}

/**
 * Fetches the latest home page collections
 * Endpoint: GET /api/read/collections/homePage
 * Optional query params: maxPriority, limit
 *
 * @param params - Optional filters for priority and limit
 * @returns The latest home page layout cards or null on failure
 */
export async function fetchHomePage(
  params: { maxPriority?: number; limit?: number } = {}
): Promise<HomeCardModel[] | null> {
  try {
    const { maxPriority = 2, limit } = params;
    const search = new URLSearchParams();
    if (maxPriority !== undefined) search.set('maxPriority', String(maxPriority));
    if (limit !== undefined) search.set('limit', String(limit));

    const endpoint = `/collections/homePage${search.toString() ? `?${search.toString()}` : ''}`;
    const response = await fetchReadApi<HomePageResponse>(endpoint);

    if (response && response.items && response.items.length > 0) {
      return response.items;
    }

    return [];
  } catch (error) {
    console.error('Error fetching home page:', error);
    return null;
  }
}

/**
 * Fetches a content collection by slug
 * Endpoint: GET /api/read/collections/{slug}
 *
 * @param slug - The collection slug
 * @returns The collection data
 */
export async function fetchCollectionBySlug(slug: string): Promise<ContentCollectionNormalized> {
  try {
    // Delegate to the normalized fetch in contentCollections to keep a single source of truth
    return await fetchCollectionBySlugNormalized(slug);
  } catch (error) {
    console.error(`Error fetching collection "${slug}":`, error);
    throw error;
  }
}

/**
 * Creates a new content collection
 * Endpoint: POST /api/write/collections/createCollection
 *
 * @param createData - The collection creation data
 * @returns The created collection
 */
export async function createContentCollection(
  createData: ContentCollectionCreateDTO
): Promise<ContentCollectionModel> {
  try {
    return await fetchPostJsonApi<ContentCollectionModel>(
      '/collections/createCollection',
      createData
    );
  } catch (error) {
    console.error('[createContentCollection] Error:', error);
    throw error;
  }
}
