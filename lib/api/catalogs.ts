// /**
//  * API functions for catalog-related operations
//  */
// import { fetchFormDataApi, fetchJsonApi, fetchReadApi } from '@/lib/api/core';
// import { type Catalog } from '@/types/Catalog';
// import { type Image } from '@/types/Image';
//
// /** Fetches all catalogs for the home page
//  *
//  * TODO: Update this for our CatalogAll page
//  * @returns Array of catalog data
//  */
// export async function fetchAllCatalogs(): Promise<Catalog[]> {
//   return fetchReadApi<Catalog[]>('/catalog/mainPageCatalogList');
// }
//
// export async function fetchCatalogBySlug(slug: string): Promise<Catalog> {
//   try {
//     return fetchReadApi<Catalog>(`/catalog/bySlug/${slug}`);
//   } catch (error) {
//     console.error(`Error fetching catalog "${slug}:`, error);
//   }
// }
//
// export const updateCatalog = async (catalog: Catalog): Promise<Catalog> => {
//
//   return fetchJsonApi<Catalog>('/catalog/update/', {
//     id: catalog.id,
//     title: catalog.title,
//     location: catalog.location,
//     priority: catalog.priority,
//     coverImageUrl: catalog.coverImageUrl,
//     people: catalog.people,
//     tags: catalog.tags,
//     slug: catalog.slug,
//     date: catalog.date,
//     isHomeCard: catalog.isHomeCard,
//     images: catalog.images,
//   });
// };
//
// export const createCatalog = async (
//   editCatalog: Catalog,
//   selectedFiles: File[]): Promise<Catalog> => {
//
//   const formData = new FormData();
//
//   formData.append('catalogDTO', JSON.stringify({
//     title: editCatalog.title,
//     location: editCatalog.location ? editCatalog.location : '',
//     priority: editCatalog.priority || 2,
//     description: editCatalog.description ? editCatalog.description : '',
//     isHomeCard: editCatalog.isHomeCard ? editCatalog.isHomeCard : false,
//   }));
//
//   // Add any selected files
//   for (const file of selectedFiles) {
//     formData.append('images', file);
//   }
//
//   return await fetchFormDataApi<Catalog>('/catalog/uploadCatalogWithImages', formData);
//
// };
//
// export const postImagesForCatalog = async (
//   catalogTitle: string,
//   selectedFiles: File[]): Promise<Image[]> => {
//
//   const formData = new FormData();
//   for (const file of selectedFiles) {
//     formData.append('images', file);
//   }
//
//   return await fetchFormDataApi<Image[]>(`/image/postImagesForCatalog/${catalogTitle}`, formData);
// };

// TODO: Implement catalog API functions
export {};
