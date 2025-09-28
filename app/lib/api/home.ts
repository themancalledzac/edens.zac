/**
 * API functions for home-related operations
 */

import {
  type ContentCollectionNormalized,
  fetchCollectionBySlug as fetchCollectionBySlugNormalized,
} from '@/app/lib/api/contentCollections';
import { fetchFormDataApi, fetchPostJsonApi, fetchPutJsonApi, fetchReadApi } from '@/app/lib/api/core';
import {
  type ContentCollectionModel,
  type ContentCollectionSimpleCreateDTO,
  type ContentCollectionUpdateDTO,
} from '@/app/types/ContentCollection';
import { type HomeCardModel } from '@/app/types/HomeCardModel';

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
 * Creates a new content collection with simplified request (just type and title)
 * Endpoint: POST /api/write/collections/createCollection
 *
 * @param createData - The simplified collection creation data
 * @returns The created collection
 */
export async function createContentCollectionSimple(
  createData: ContentCollectionSimpleCreateDTO
): Promise<ContentCollectionModel> {
  try {
    return await fetchPostJsonApi<ContentCollectionModel>(
      '/collections/createCollection',
      createData
    );
  } catch (error) {
    console.error('[createContentCollectionSimple] Error:', error);
    throw error;
  }
}

/**
 * Updates an existing content collection metadata
 * Endpoint: PUT /api/write/collections/{id}
 *
 * @param id - The collection ID
 * @param updateData - The collection update data
 * @returns The updated collection
 */
export async function updateContentCollection(
  id: number,
  updateData: ContentCollectionUpdateDTO
): Promise<ContentCollectionModel> {
  try {
    return await fetchPutJsonApi<ContentCollectionModel>(
      `/collections/${id}`,
      updateData
    );
  } catch (error) {
    console.error('[updateContentCollection] Error:', error);
    throw error;
  }
}

/**
 * Adds content blocks (images) to a collection
 * Endpoint: POST /api/write/collections/{id}/content
 *
 * @param id - The collection ID
 * @param formData - FormData containing image files
 * @returns The updated collection with new content blocks
 */
export async function addContentBlocks(
  id: number,
  formData: FormData
): Promise<ContentCollectionModel> {
  try {
    return await fetchFormDataApi<ContentCollectionModel>(
      `/collections/${id}/content`,
      formData
    );
  } catch (error) {
    console.error('[addContentBlocks] Error:', error);
    throw error;
  }
}
