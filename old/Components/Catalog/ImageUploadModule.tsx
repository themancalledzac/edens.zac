// TODO:deprecate (Phase 5.2 end): Legacy Components retained during hybrid migration
// import React from 'react';
//
// import { type PreviewImage } from '@/Components/Catalog/ImageUploadList';
// import styles from '@/styles/Upload.module.scss';
//
// interface ImageUploadModuleProps {
//   selectedFiles: File[];
//   setSelectedFiles: React.Dispatch<React.SetStateAction<File[]>>;
//   previewData: PreviewImage[];
//   setPreviewData: React.Dispatch<React.SetStateAction<PreviewImage[]>>;
// }
//
// const ImageUploadModule: React.FC<ImageUploadModuleProps> = ({
//   setSelectedFiles,
//   setPreviewData,
// }) => {
//   const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
//     if (!e.target.files || e.target.files.length === 0) return;
//
//     // const files = Array.from(e.target.files);
//     const files = Array.from(e.target.files).filter(file => {
//       const validTypes = ['image/jpeg', 'image/jpg', 'image/webp'];
//       return validTypes.includes(file.type);
//     });
//
//     if (files.length === 0) {
//       alert('Please select only JPG or WebP images.');
//       return;
//     }
//
//     // Update selectedFiles state
//     setSelectedFiles(prev => [...prev, ...files]);
//
//     // Create preview data for each file
//     const newPreviews: PreviewImage[] = files.map(file => {
//       const previewUrl = URL.createObjectURL(file);
//
//       return {
//         id: `${file.name}-${Date.now()}`,
//         file: file,
//         preview: previewUrl,
//         metadata: {
//           title: file.name,
//         },
//       };
//     });
//     // send API call from here
//     // onImagesSelected(files);
//
//     setPreviewData(prev => [...prev, ...newPreviews]);
//   };
//
//   return (
//     <div className={styles.uploadZone}>
//       <div className={styles.container}>
//         <h1 className={styles.icon}>UPLOAD</h1>
//         <p className={styles.title}>Select images</p>
//         <p className={styles.subtitle}>Support for multiple files</p>
//
//         <input
//           type="file"
//           multiple
//           accept="image/jpeg,image/jpg,image/webp"
//           onChange={handleFileSelect}
//           className={styles.input}
//           id="file-upload"
//         />
//
//         <button
//           onClick={() => document.getElementById('file-upload')?.click()}
//           className={styles.button}
//         >
//           Select Images
//         </button>
//       </div>
//     </div>
//   );
// };
//
// export default ImageUploadModule;

// Keep module non-empty to satisfy linting without providing legacy Components.
export {};