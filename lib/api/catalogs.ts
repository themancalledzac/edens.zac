/**
 * API functions for catalog-related operations
 */
import { fetchFormDataApi, fetchFromApi, fetchJsonApi } from '@/lib/api/core';
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

  // const response = await fetch('http://localhost:8080/api/v1/catalog/update/', {
  return fetchJsonApi<Catalog>('/catalog/update/', {
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
  });
};

export const createCatalog = async (
  editCatalog: Catalog,
  selectedFiles: File[]): Promise<Catalog> => {

  const formData = new FormData();

  formData.append('catalogDTO', JSON.stringify({
    title: editCatalog.title,
    location: editCatalog.location ? editCatalog.location : '',
    priority: editCatalog.priority || 2,
    description: editCatalog.description ? editCatalog.description : '',
    isHomeCard: editCatalog.isHomeCard ? editCatalog.isHomeCard : false,
  }));

  // Add any selected files
  for (const file of selectedFiles) {
    formData.append('images', file);
  }

  return await fetchFormDataApi<Catalog>('/catalog/uploadCatalogWithImages', formData);

};
