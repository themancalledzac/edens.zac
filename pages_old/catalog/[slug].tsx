// import React, { useEffect, useMemo, useState } from 'react';
//
// import CatalogMetadata from '@/Components/Catalog/CatalogMetadata';
// import ImageUploadList from '@/Components/Catalog/ImageUploadList';
// import { UpdateToolbar } from '@/Components/EditToolbar/UpdateToolbar';
// import { Header } from '@/Components/Header/Header';
// import { ImageFullScreen } from '@/Components/ImageFullScreen/ImageFullScreen';
// import { PhotoBlockComponent } from '@/Components/PhotoBlockComponent/PhotoBlockComponent';
// import { AppProvider, useAppContext } from '@/context/AppContext';
// import { EditProvider, useEditContext } from '@/context/EditContext';
// import { createCatalog, fetchCatalogBySlug, updateCatalog } from '@/lib/api/catalogs';
// import { type Catalog } from '@/types/Catalog';
// import { type Image } from '@/types/Image';
// import { type CatalogPageProps, createEmptyCatalog } from '@/utils/catalogUtils';
// import { chunkImages } from '@/utils/imageUtils';
//
// import styles from '../../styles/Catalog.module.scss';
//
// /**
//  * Photography Gallery Page.
//  */
// export async function getServerSideProps({ params }: { params: { slug: string } }) {
//   const { slug } = params;
//
//   if (slug === 'create') {
//     return {
//       props: {
//         create: true,
//         catalog: createEmptyCatalog(),
//       },
//     };
//   }
//
//   try {
//     const catalog: Catalog = await fetchCatalogBySlug(slug);
//     return {
//       props: {
//         create: false,
//         catalog,
//       },
//     };
//   } catch (error) {
//     console.error('Fetch error:', error);
//     return {
//       notFound: true,
//     };
//   }
// }
//
// /**
//  * The page component that renders the content for each title
//  *
//  * TODO: Add more space above Title, feels too crowded
//  *  - Verify 2 wide and pans also are still working
//  *  - blog single isn't full width fyi
//  *  - "Tab Enter" to accept, or, the ACCEPT button on the bottom right, next to CANCEL
//  */
// const CatalogPageInner: React.FC<CatalogPageProps> = ({ create, catalog }: CatalogPageProps) => {
//   const { isMobile, currentCatalog, setCurrentCatalog } = useAppContext();
//   const {
//     isEditMode,
//     setIsEditMode,
//     setIsCreateMode,
//     isCreateMode,
//     imageSelected,
//     setImageSelected,
//     editCatalog,
//     setEditCatalog,
//     handleCancelChanges,
//     selectedFiles,
//     setSelectedFiles,
//     previewData,
//     setPreviewData,
//   } = useEditContext();
//
//   const [contentWidth, setContentWidth] = useState(800);
//
//   const imageChunks = useMemo(() => {
//     // When editing, use editCatalog's images
//     const sourceImages = isEditMode && editCatalog ? editCatalog?.images : currentCatalog?.images;
//     return chunkImages(sourceImages, 3);
//   }, [currentCatalog, editCatalog, isEditMode]);
//
//   useEffect(() => {
//     if (create) {
//       setIsCreateMode(true);
//     } else if (catalog && (!currentCatalog || currentCatalog.id !== catalog.id)) {
//       // Only update if the catalog changed or is not yet set
//       setCurrentCatalog(catalog);
//     }
//   }, [catalog, create, currentCatalog, setCurrentCatalog, setIsCreateMode]);
//
//   /**
//    * Hook to handle Catalog in Update/Edit mode.
//    */
//   useEffect(() => {
//     if (isEditMode && currentCatalog) {
//       setEditCatalog({
//         ...currentCatalog,
//       });
//     }
//   }, [isEditMode, currentCatalog, setEditCatalog]);
//
//   /**
//    * Hook that updates the current catalog on load/update.
//    */
//   useEffect(() => {
//     if (catalog && (!currentCatalog || currentCatalog.id !== catalog.id)) {
//       setCurrentCatalog(catalog);
//     }
//   }, [catalog, currentCatalog]);
//
//   const handleSave = async () => {
//     try {
//       if (isCreateMode) {
//         // Leave create mode logic as is
//         if (!editCatalog) return;
//         const result = await createCatalog(editCatalog, selectedFiles);
//         window.location.href = `/catalog/${result.slug}`;
//       } else {
//         if (!editCatalog || !currentCatalog) return;
//
//         // Create a copy of editCatalog
//         const optimizedCatalog = { ...editCatalog };
//
//         // Use type assertion to tell TypeScript "trust me, this is valid"
//         optimizedCatalog.images = editCatalog.images?.map(img => ({
//           id: img.id,
//         })) as Image[];
//
//         const result = await updateCatalog(optimizedCatalog);
//         setCurrentCatalog(result);
//         setIsEditMode(false);
//         setEditCatalog(null);
//       }
//     } catch (error) {
//       console.error('Failed to save changes:', error);
//     }
//   };
//
//   /**
//    * ImageFullScreen Hook to handle arrow click.
//    */
//   useEffect(() => {
//     const handleKeyDown = (event: KeyboardEvent) => {
//       if (imageSelected === null) return;
//
//       const flattenedData = imageChunks.flat();
//       const currentIndex = flattenedData.findIndex(img => img.id === imageSelected.id);
//
//       if (event.key === 'ArrowRight') {
//         const nextIndex = (currentIndex + 1) % flattenedData.length;
//         const nextImage = flattenedData[nextIndex];
//         if (nextImage) setImageSelected(nextImage);
//       } else if (event.key === 'ArrowLeft') {
//         const prevIndex = (currentIndex - 1 + flattenedData.length) % flattenedData.length;
//         const prevImage = flattenedData[prevIndex];
//         if (prevImage) setImageSelected(prevImage);
//       }
//     };
//
//     window.addEventListener('keydown', handleKeyDown);
//
//     return () => {
//       window.removeEventListener('keydown', handleKeyDown);
//     };
//   }, [imageChunks, imageSelected, setImageSelected]);
//
//   /**
//    * Hook to calculate component width if Mobile view changes.
//    */
//   useEffect(() => {
//     const calculateComponentWidth = () => {
//       return isMobile ? window.innerWidth - 40 : Math.min(window.innerWidth * 0.8, 1200);
//     };
//
//     setContentWidth(calculateComponentWidth());
//
//     const handleResize = () => {
//       setContentWidth(calculateComponentWidth());
//     };
//
//     window.addEventListener('resize', handleResize);
//     return () => window.removeEventListener('resize', handleResize);
//   }, [isMobile]);
//
//   return (
//     <div className={styles.catalogPageMain}>
//       <Header />
//       <div
//         className={styles.catalogContent}
//         style={isMobile ? { width: '100%' } : { width: `${contentWidth}px`, margin: '0 auto' }}
//       >
//         <div className={styles.catalogHeader}>
//           <div>
//             <CatalogMetadata />
//             {(isEditMode || isCreateMode) && (
//               <UpdateToolbar
//                 contentWidth={contentWidth}
//                 isMobile={isMobile}
//                 handleCancelChanges={handleCancelChanges}
//                 handleSaveChanges={handleSave}
//               />
//             )}
//           </div>
//         </div>
//
//         {(isEditMode || isCreateMode) && (
//           <ImageUploadList
//             previewData={previewData}
//             setPreviewData={setPreviewData}
//             selectedFiles={selectedFiles}
//             setSelectedFiles={setSelectedFiles}
//           />
//         )}
//
//         {!isCreateMode && (
//           <div className={styles.photoBlockWrapper}>
//             {imageChunks && imageChunks.length > 0 ? (
//               imageChunks.map((photoPair, index) => (
//                 <PhotoBlockComponent
//                   key={photoPair[0]?.id || `chunk-${index}`}
//                   componentWidth={contentWidth}
//                   isMobile={isMobile}
//                   photos={photoPair}
//                 />
//               ))
//             ) : (
//               <div className={styles.emptyState}>
//                 <p>No images yet. Click "Upload Images" to add images.</p>
//               </div>
//             )}
//           </div>
//         )}
//       </div>
//
//       {imageSelected && (
//         <ImageFullScreen setImageSelected={setImageSelected} imageSelected={imageSelected} />
//       )}
//     </div>
//   );
// };
// const CatalogPage: React.FC<CatalogPageProps> = (props: CatalogPageProps) => (
//   <AppProvider>
//     <EditProvider>
//       <CatalogPageInner {...props} />
//     </EditProvider>
//   </AppProvider>
// );
// export default CatalogPage;
