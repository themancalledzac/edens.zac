/**
 * API functions for home-related operations
 */

import { PAGINATION } from '@/app/constants';
import {
  type ContentCollectionBase,
  type ContentCollectionModel as ContentCollectionFullModel,
  fetchCollectionBySlug as fetchCollectionBySlugPublic,
  fetchCollectionBySlugAdmin as fetchCollectionBySlugAdminInternal,
  toModel,
} from '@/app/lib/api/contentCollections';
import { fetchFormDataApi, fetchPostJsonApi, fetchPutJsonApi, fetchReadApi } from '@/app/lib/api/core';
import {
  type ContentCollectionModel,
  type ContentCollectionSimpleCreateDTO,
  type ContentCollectionUpdateDTO,
} from '@/app/types/ContentCollection';
import { type HomeCardModel } from '@/app/types/HomeCardModel';
import { type CollectionUpdateMetadata } from '@/app/types/ImageMetadata';

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
 * Fetches a content collection by slug for public display pages.
 * Enforces access control and returns base model with public fields only.
 * Endpoint: GET /api/read/collections/{slug}
 *
 * @param slug - The collection slug
 * @param page - Page number (default: 0)
 * @param size - Page size (default: from PAGINATION.defaultPageSize)
 * @returns The collection data (base model)
 */
export async function fetchCollectionBySlug(
  slug: string,
  page = 0,
  size: number = PAGINATION.defaultPageSize
): Promise<ContentCollectionBase> {
  try {
    return await fetchCollectionBySlugPublic(slug, page, size);
  } catch (error) {
    console.error(`Error fetching collection "${slug}":`, error);
    throw error;
  }
}

/**
 * Fetches a content collection by slug for admin pages.
 * No access control checks - returns full model with all admin fields.
 * Endpoint: GET /api/read/collections/{slug}
 *
 * @param slug - The collection slug
 * @param page - Page number (default: 0)
 * @param size - Page size (default: from PAGINATION.defaultPageSize)
 * @returns The collection data (full model)
 */
export async function fetchCollectionBySlugAdmin(
  slug: string,
  page = 0,
  size: number = PAGINATION.defaultPageSize
): Promise<ContentCollectionFullModel> {
  try {
    return await fetchCollectionBySlugAdminInternal(slug, page, size);
  } catch (error) {
    console.error(`Error fetching collection "${slug}" (admin):`, error);
    throw error;
  }
}

/**
 * Creates a new content collection with simplified request (just type and title)
 * Endpoint: POST /api/write/collections/createCollection
 *
 * @param createData - The simplified collection creation data
 * @returns The created collection (full model with all fields)
 */
export async function createContentCollectionSimple(
  createData: ContentCollectionSimpleCreateDTO
): Promise<ContentCollectionFullModel> {
  try {
    return await fetchPostJsonApi<ContentCollectionFullModel>(
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

/**
 * Transform backend ContentCollectionModel to HomeCardModel
 * Maps collection data to the home card format with proper CollectionType
 */
function mapCollectionToHomeCard(collection: ContentCollectionModel): HomeCardModel {
  // Extract cover image URL from the nested coverImage object
  // Backend returns coverImage.imageUrlWeb (webP optimized) as the primary image
  const coverImageUrl =
    collection.coverImageUrl || // Legacy field
    (collection.coverImage as any)?.imageUrlWeb || // New format with webP
    (collection.coverImage as any)?.imageUrlFullSize || // Fallback to full size
    ''; // No image

  return {
    id: collection.id,
    title: collection.title,
    cardType: collection.type, // Use actual CollectionType enum value
    location: collection.location,
    date: collection.collectionDate,
    priority: collection.priority || 99,
    coverImageUrl,
    slug: collection.slug,
    text: collection.homeCardText,
  };
}

/**
 * Fetches all content collections (dev/admin only)
 * Endpoint: GET http://localhost:8080/api/write/collections/all
 *
 * Note: This is a dev-only endpoint that ALWAYS hits localhost.
 * Returns all collections regardless of visibility, priority, or access control.
 *
 * @returns All collections as home cards or null on failure
 */
export async function fetchAllCollections(): Promise<HomeCardModel[] | null> {
  try {
    // Dev-only: Always hit localhost
    const url = 'http://localhost:8080/api/write/collections/all';

    console.log('[fetchAllCollections] Fetching from:', url);

    const response = await fetch(url, {
      cache: 'no-store', // Dev endpoint, don't cache
    });

    console.log('[fetchAllCollections] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[fetchAllCollections] Error response:', errorText);
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const rawData = await response.json();
    console.log('[fetchAllCollections] Received data:', Array.isArray(rawData) ? `Array with ${rawData.length} items` : typeof rawData);

    let collections: ContentCollectionModel[] = [];

    // Handle both array and object responses
    if (Array.isArray(rawData)) {
      collections = rawData;
    } else if (rawData && typeof rawData === 'object') {
      const items = rawData.items || rawData.collections || rawData.content;
      if (Array.isArray(items)) {
        collections = items;
      }
    }

    // Debug: Log first collection to see its structure
    if (collections.length > 0) {
      console.log('[fetchAllCollections] Sample collection:', JSON.stringify(collections[0], null, 2));
    }

    // Transform ContentCollectionModel to HomeCardModel
    const homeCards = collections.map(mapCollectionToHomeCard);
    console.log('[fetchAllCollections] Transformed to', homeCards.length, 'home cards');

    // Debug: Log first transformed card
    if (homeCards.length > 0) {
      console.log('[fetchAllCollections] Sample home card:', JSON.stringify(homeCards[0], null, 2));
    }

    return homeCards;
  } catch (error) {
    console.error('[fetchAllCollections] Error:', error);
    return null;
  }
}

/**
 * Response structure for collection update metadata endpoint
 * Contains the collection plus all available metadata for dropdowns
 */
export interface CollectionUpdateResponse {
  collection: ContentCollectionFullModel;
  tags: CollectionUpdateMetadata['tags'];
  people: CollectionUpdateMetadata['people'];
  cameras: CollectionUpdateMetadata['cameras'];
  lenses: CollectionUpdateMetadata['lenses'];
  filmTypes: CollectionUpdateMetadata['filmTypes'];
  filmFormats: CollectionUpdateMetadata['filmFormats'];
  collections: CollectionUpdateMetadata['collections'];
}

/**
 * Fetches a collection with all metadata needed for the update/manage page.
 * Returns the collection along with all available tags, people, cameras, and film metadata.
 * This single endpoint provides everything needed for the image management UI.
 *
 * Endpoint: GET /api/write/collections/{slug}/update
 *
 * @param slug - The collection slug
 * @returns The collection and all metadata for dropdowns
 */
export async function fetchCollectionUpdateMetadata(
  slug: string
): Promise<CollectionUpdateResponse> {
  try {
    // This is a write API endpoint that includes all metadata
    const url = `http://localhost:8080/api/write/collections/${encodeURIComponent(slug)}/update`;

    console.log('[fetchCollectionUpdateMetadata] Fetching from:', url);

    const response = await fetch(url, {
      cache: 'no-store', // Don't cache admin/update endpoints
    });

    console.log('[fetchCollectionUpdateMetadata] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[fetchCollectionUpdateMetadata] Error response:', errorText);
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[fetchCollectionUpdateMetadata] Received metadata');

    // Transform backend collection to frontend model (contentBlocks → blocks, add pagination)
    return {
      collection: toModel(data.collection),
      tags: data.tags,
      people: data.people,
      cameras: data.cameras,
      lenses: data.lenses,
      filmTypes: data.filmTypes,
      filmFormats: data.filmFormats,
      collections: data.collections,
    };
  } catch (error) {
    console.error('[fetchCollectionUpdateMetadata] Error:', error);
    throw error;
  }
}
