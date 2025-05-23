/**
 * API functions for home-related operations
 */

import { fetchReadApi } from '@/lib/api/core';
import { Blog } from '@/types/Blog';
import { HomeCardModel } from '@/types/HomeCardModel';

/**
 * Fetches the latest home page
 *
 * @returns The latest home page
 */
export async function fetchHomePage(): Promise<HomeCardModel[]> {
  try {
    const homeLayout = await fetchReadApi<HomeCardModel[]>('/home/getHome');

    if (homeLayout && homeLayout.length > 0) {
      return homeLayout;
    }

    throw new Error('No home page found');
  } catch (error) {
    console.error('Error fetching home page:', error);

    // Fallback
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
