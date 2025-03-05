/**
 * API functions for catalog-related operations
 */
import {Catalog} from "@/types/Catalog";
import {fetchFromApi} from "@/lib/api/core";

/** Fetches all catalogs for the home page
 *
 * @returns Array of catalog data
 */
export async function fetchAllCatalogs(): Promise<Catalog[]> {
    return fetchFromApi<Catalog[]>('/catalog/mainPageCatalogList');
}

/**
 * Fetches a specific catalog by title
 *
 * @param title - The catalog title/slug
 * @returns The catalog data
 */
export async function fetchCatalogByTitle(title: string): Promise<Catalog> {
    try {
        return fetchFromApi<Catalog>(`/catalog/${title}`);
    } catch (error) {
        console.error(`Error fetching catalog "${title}:`, error);
    }

    // Fallback to local data if API fails
    return {
        id: 1,
        title: title,
        location: '',
        priority: 3,
        coverImageUrl: '',
        people: [],
        tags: [],
        images: [],
        slug: '',
        date: ''
    }
}