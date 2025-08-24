/**
 * API functions for home-related operations
 */

import { fetchReadApi, fetchPostJsonApi } from '@/lib/api/core';
import { type Blog } from '@/types/Blog';
import { type HomeCardModel } from '@/types/HomeCardModel';
import { type ContentCollectionCreateDTO, type ContentCollectionModel } from '@/types/ContentCollection';

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
      console.log(`Found ${response.items.length} home page items`);
      return response.items;
    }

    console.log('No home page items found in response');
    return [];
  } catch (error) {
    console.error('Error fetching home page:', error);
    return null;
  }
}

/**
 * Fetches a specific blog by ID
 *
 * @param id - The blog id
 * @returns The blog data
 */
export async function fetchBlogById(id: string): Promise<Blog> {
  return fetchReadApi<Blog>(`/blog/byId/${id}`);
}

/**
 * Fetches a content collection by slug
 * Endpoint: GET /api/read/collections/{slug}
 *
 * @param slug - The collection slug
 * @returns The collection data
 */
export async function fetchCollectionBySlug(slug: string): Promise<any> {
  try {
    return await fetchReadApi<any>(`/collections/${slug}`);
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
    console.log('[createContentCollection] Input data:', createData);
    console.log('[createContentCollection] Calling POST /api/write/collections/createCollection');
    
    const result = await fetchPostJsonApi<ContentCollectionModel>('/collections/createCollection', createData);
    
    console.log('[createContentCollection] API response:', result);
    return result;
  } catch (error) {
    console.error('[createContentCollection] Error:', error);
    throw error;
  }
}