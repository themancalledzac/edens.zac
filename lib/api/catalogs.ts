/**
 * API functions for catalog-related operations
 */
import { fetchFromApi } from '@/lib/api/core';
import { Catalog } from '@/types/Catalog';

/** Fetches all catalogs for the home page
 *
 * TODO: Update this for our CatalogAll page
 * @returns Array of catalog data
 */
export async function fetchAllCatalogs(): Promise<Catalog[]> {
  return fetchFromApi<Catalog[]>('/catalog/mainPageCatalogList');
}

export async function fetchCatalogBySlug(slug: string): Promise<Catalog> {
  try {
    return fetchFromApi<Catalog>(`/catalog/bySlug/${slug}`);
  } catch (error) {
    console.error(`Error fetching catalog "${slug}:`, error);
  }
}

export const updateCatalog = async (catalog: Catalog): Promise<Catalog> => {
  try {
    const response = await fetch('http://localhost:8080/api/v1/catalog/update/', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: catalog.id,
        title: catalog.title,
        location: catalog.location,
        priority: catalog.priority,
        coverImageUrl: catalog.coverImageUrl,
        people: catalog.people,
        tags: catalog.tags,
        slug: catalog.slug,
        date: catalog.date,
        isHomeCard: catalog.isHomeCard,
        images: catalog.images,
      }),
    });
    return await response.json();
  } catch (error) {
    console.error(`Error fetching catalog "${catalog.id}:`, error);
    throw error;
  }
};
