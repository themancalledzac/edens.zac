// import type React from 'react';
//
// import { type PreviewImage } from '@/Components/Catalog/ImageUploadList';
// import { postImagesForCatalog } from '@/lib/api/catalogs';
// import { type Catalog, type CatalogCreateDTO } from '@/types/Catalog';
// import { type Image } from '@/types/Image';
//
// /**
//  * Catalog Object Template for Create page.
//  * @returns A new empty catalog object
//  */
// export const createEmptyCatalog = (): CatalogCreateDTO => ({
//   title: '',
//   location: '',
//   priority: 2, // default to medium priority
//   description: '',
//   isHomeCard: false,
// });
//
// export interface CatalogPageProps {
//   create: boolean;
//   catalog: Catalog | null;
// }
//
// /**
//  * Checks if a catalog has the minimum required fields
//  * @param catalog
//  */
// export const validateCatalog = (catalog: Catalog): boolean => {
//   return !(
//     (!!catalog.title && catalog.title.trim().length > 0) ||
//     (!!catalog.location && catalog.location.trim().length > 0) ||
//     (!!catalog.coverImageUrl && catalog.coverImageUrl.trim().length > 0)
//   );
// };
//
// export const formatCatalogDate = (dateString: string): string => {
//   if (!dateString) return '';
//
//   try {
//     const date = new Date(dateString);
//
//     if (Number.isNaN(date.getTime())) {
//       return dateString;
//     }
//     return new Intl.DateTimeFormat('en-US', {
//       year: 'numeric',
//       month: 'long',
//       day: 'numeric',
//     }).format(date);
//   } catch (error) {
//     console.error('Error formatting date:', error);
//     return dateString;
//   }
// };
//
// const validateFiles = (fileList: FileList): File[] | null => {
//   // const files = Array.from(e.target.files);
//   const files = Array.from(fileList).filter(file => {
//     const validTypes = ['image/jpeg', 'image/jpg', 'image/webp'];
//     return validTypes.includes(file.type);
//   });
//
//   if (files.length === 0) {
//     alert('Please select only JPG or WebP images.');
//     return null;
//   }
//   return files;
// };
//
// /**
//  * Handles file selection and creates previews for selected images
//  *
//  * @param {React.Dispatch<React.SetStateAction<File[]>>} setSelectedFiles - State setter for selected files
//  * @param {React.Dispatch<React.SetStateAction<PreviewImage[]>>} setPreviewData - State setter for preview data
//  * @param {FileList} fileList - The list of files from input element
//  */
// export const handleFileSelect = (
//   setSelectedFiles: React.Dispatch<React.SetStateAction<File[]>>,
//   setPreviewData: React.Dispatch<React.SetStateAction<PreviewImage[]>>,
//   fileList: FileList
// ) => {
//   if (!fileList) return;
//
//   // const files = Array.from(e.target.files);
//   const files = validateFiles(fileList);
//   if (!files) return;
//
//   // Update selectedFiles state
//   setSelectedFiles((prev: File[]) => [...prev, ...files]);
//
//   // Create preview data for each file
//   const newPreviews: PreviewImage[] = files.map(file => {
//     const previewUrl = URL.createObjectURL(file);
//
//     return {
//       id: `${file.name}-${Date.now()}`,
//       file: file,
//       preview: previewUrl,
//       metadata: {
//         title: file.name,
//       },
//     };
//   });
//   // send API call from here
//   // onImagesSelected(files);
//
//   setPreviewData((prev: PreviewImage[]) => [...prev, ...newPreviews]);
// };
//
// export const uploadSelectedFiles = async (
//   fileList: FileList,
//   catalogTitle: string
// ): Promise<Image[]> => {
//   if (!fileList) return [];
//
//   const files = validateFiles(fileList);
//   if (!files || files.length === 0) return [];
//
//   const catalogTitleFormatted = catalogTitle.replace(/\s/g, '_');
//   return await postImagesForCatalog(catalogTitleFormatted, files);
// };
