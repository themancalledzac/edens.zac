/**
 * API functions for home-related operations
 */

import { fetchReadApi } from '@/lib/api/core';
import { type Blog } from '@/types/Blog';
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