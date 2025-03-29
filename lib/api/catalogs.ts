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
        return fetchFromApi<Catalog>(`/catalog/byId/${title}`);
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

/**
 * Fetches a specific catalog by id
 *
 * @param id - The catalog id
 * @returns The catalog data
 */
export async function fetchCatalogById(id: string): Promise<Catalog> {
    try {
        return fetchFromApi<Catalog>(`/catalog/byId/${id}`);
    } catch (error) {
        console.error(`Error fetching catalog "${id}:`, error);
    }

    // Fallback to local data if API fails
    return {
        id: 1,
        title: 'failedUpload',
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

export async function fetchCatalogBySlug(slug: string): Promise<Catalog> {
    try {
        return fetchFromApi<Catalog>(`/catalog/bySlug/${slug}`);
    } catch (error) {
        console.error(`Error fetching catalog "${slug}:`, error);
    }
}

export const updateCatalog = async (catalog: Catalog): Promise<Catalog> => {
    try {
        const response = await fetch(`http://localhost:8080/api/v1/catalog/update/`, {
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
                updateHomeCard: true,
                images: catalog.images
            }),
        });
        return await response.json();
    } catch (error) {
        console.error(`Error fetching catalog "${catalog.id}:`, error);
        throw error;
    }
}
