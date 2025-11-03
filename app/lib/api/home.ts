/**
 * API functions for home-related operations
 */

import { PAGINATION } from '@/app/constants';
import {
  type CollectionBase,
  type CollectionModel as ContentCollectionFullModel,
  fetchCollectionBySlug as fetchCollectionBySlugPublic,
  fetchCollectionBySlugAdmin as fetchCollectionBySlugAdminInternal,
  toModel,
} from '@/app/lib/api/collections';
import {
  fetchAdminGetApi,
  fetchAdminPostJsonApi,
  fetchAdminPutJsonApi,
  fetchFormDataApi,
} from '@/app/lib/api/core';
import {
  type CollectionModel,
  type CollectionSimpleCreateDTO,
  type CollectionUpdateRequest,
} from '@/app/types/Collection';
import { type HomeCardModel } from '@/app/types/HomeCardModel';
import { type GeneralMetadataDTO as GeneralMetadata } from '@/app/types/ImageMetadata';

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
): Promise<CollectionBase> {
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
 * Endpoint: POST /api/admin/collections/createCollection
 *
 * @param createData - The simplified collection creation data
 * @returns The created collection with all metadata (CollectionUpdateResponse)
 */
export async function createContentCollectionSimple(
  createData: CollectionSimpleCreateDTO
): Promise<CollectionUpdateResponse> {
  try {
    const data = await fetchAdminPostJsonApi<any>(
      '/collections/createCollection',
      createData
    );

    // Transform backend response to match CollectionUpdateResponse format
    return {
      collection: toModel(data.collection),
      tags: data.tags || [],
      people: data.people || [],
      cameras: data.cameras || [],
      lenses: data.lenses || [],
      filmTypes: data.filmTypes || [],
      filmFormats: data.filmFormats || [],
      collections: data.collections || [],
    };
  } catch (error) {
    console.error('[createContentCollectionSimple] Error:', error);
    throw error;
  }
}

/**
 * Updates an existing content collection metadata
 * Endpoint: PUT /api/admin/collections/{id}
 *
 * @param id - The collection ID
 * @param updateData - The collection update data
 * @returns The updated collection
 */
export async function updateContentCollection(
  id: number,
  updateData: CollectionUpdateRequest
): Promise<CollectionModel> {
  try {
    return await fetchAdminPutJsonApi<CollectionModel>(
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
 * Endpoint: POST /api/write/content/images/{collectionId}
 *
 * @param id - The collection ID
 * @param formData - FormData containing image files
 * @returns Array of created image content blocks
 */
export async function addContentBlocks(
  id: number,
  formData: FormData
): Promise<any> {
  try {
    return await fetchFormDataApi<any>(
      `/content/images/${id}`,
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
function mapCollectionToHomeCard(collection: CollectionModel): HomeCardModel {
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
 * Endpoint: GET /api/admin/collections/all
 *
 * Note: This is a dev-only endpoint that ALWAYS hits localhost.
 * Returns all collections regardless of visibility, priority, or access control.
 *
 * @returns All collections as home cards or null on failure
 */
export async function fetchAllCollections(): Promise<HomeCardModel[] | null> {
  try {
    const rawData = await fetchAdminGetApi<CollectionModel[]>(
      '/collections/all',
      { cache: 'no-store' }
    );

    console.log('[fetchAllCollections] Received data:', Array.isArray(rawData) ? `Array with ${rawData.length} items` : typeof rawData);

    let collections: CollectionModel[] = [];

    // Handle both array and object responses
    if (Array.isArray(rawData)) {
      collections = rawData;
    } else if (rawData && typeof rawData === 'object') {
      const items = (rawData as any).items || (rawData as any).collections || (rawData as any).content;
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
 * Collection update response matching backend ContentCollectionUpdateResponseDTO
 * Contains the collection plus all metadata (unwrapped via @JsonUnwrapped on backend)
 * Now using GeneralMetadata imported from ImageMetadata types
 */
export interface CollectionUpdateResponse extends GeneralMetadata {
  /** The content collection with all its data */
  collection: ContentCollectionFullModel;
}

// Re-export GeneralMetadataDTO for backwards compatibility
export type { GeneralMetadata as GeneralMetadataDTO };

/**
 * Fetches ONLY metadata needed for manage page dropdowns (no collection data).
 * Much faster than fetchCollectionUpdateMetadata since it doesn't include collection.
 * Use this when you already have the collection cached client-side.
 *
 * Endpoint: GET /api/admin/collections/metadata
 *
 * @returns All metadata for dropdowns (tags, people, cameras, etc.)
 */
export async function fetchMetadataOnly(): Promise<GeneralMetadata> {
  try {
    const data = await fetchAdminGetApi<any>(
      '/collections/metadata',
      { cache: 'no-store' }
    );

    console.log('[fetchMetadataOnly] Received metadata');

    return {
      tags: data.tags,
      people: data.people,
      cameras: data.cameras,
      lenses: data.lenses,
      filmTypes: data.filmTypes,
      filmFormats: data.filmFormats,
      collections: data.collections,
    };
  } catch (error) {
    console.error('[fetchMetadataOnly] Error:', error);
    throw error;
  }
}

/**
 * Fetches a collection with all metadata needed for the update/manage page.
 * Returns the collection along with all available tags, people, cameras, and film metadata.
 * This single endpoint provides everything needed for the image management UI.
 *
 * Endpoint: GET /api/admin/collections/{slug}/update
 *
 * @param slug - The collection slug
 * @returns The collection and all metadata for dropdowns
 */
export async function fetchCollectionUpdateMetadata(
  slug: string
): Promise<CollectionUpdateResponse> {
  try {
    const data = await fetchAdminGetApi<any>(
      `/collections/${encodeURIComponent(slug)}/update`,
      { cache: 'no-store' }
    );

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
