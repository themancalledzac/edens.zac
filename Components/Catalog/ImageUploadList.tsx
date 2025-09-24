// TODO:deprecate (Phase 5.2 end): Legacy Components retained during hybrid migration
// import { X } from 'lucide-react';
// import React from 'react';
//
// import styles from '@/styles/Upload.module.scss';
//
// export interface PreviewImage {
//   id: string;
//   file: File;
//   preview: string;
//   metadata?: {
//     title: string;
//     [key: string]: any;
//   };
// }
//
// interface ImageUploadListProps {
//   previewData: PreviewImage[];
//   setPreviewData: React.Dispatch<React.SetStateAction<PreviewImage[]>>;
//   selectedFiles: File[];
//   setSelectedFiles: React.Dispatch<React.SetStateAction<File[]>>;
//   isUpdateMode?: boolean;
//   onUpload?: () => Promise<void>;
//   onCancel?: () => void;
// }
//
// const ImageUploadList: React.FC<ImageUploadListProps> = ({
//   previewData,
//   setPreviewData,
//   selectedFiles,
//   setSelectedFiles,
//   isUpdateMode = false,
//   onUpload,
//   onCancel,
// }) => {
//   const removeFile = (id: string) => {
//     // Find the preview to remove
//     const previewToRemove = previewData.find(p => p.id === id);
//     if (!previewToRemove) return;
//
//     // Remove from selected files
//     setSelectedFiles(selectedFiles.filter(f =>
//       f.name !== previewToRemove.file.name ||
//       f.lastModified !== previewToRemove.file.lastModified,
//     ));
//
//     // Remove from preview data
//     setPreviewData(previewData.filter(p => p.id !== id));
//   };
//
//   if (previewData.length === 0) {
//     return null;
//   }
//
//   return (
//     <div className={styles.queue}>
//       {isUpdateMode && (
//         <div className={styles.header}>
//           <div className={styles.info}>
//             <h2 className={styles.title}>Images to Upload</h2>
//             <p className={styles.count}>{selectedFiles.length} files selected</p>
//           </div>
//           <div>
//             <button
//               onClick={onUpload}
//               className={styles.uploadButton}
//             >
//               Upload Now
//             </button>
//             <button
//               onClick={onCancel}
//               className={styles.cancelButton}
//             >
//               Cancel
//             </button>
//           </div>
//         </div>
//       )}
//
//       <div className={styles.items}>
//         {previewData.map(item => (
//           <div
//             key={item.id}
//             className={styles.queueItem}
//           >
//             <div className={styles.content}>
//               <div className={styles.preview}>
//                 <img
//                   src={item.preview}
//                   alt=""
//                   className={styles.image}
//                 />
//               </div>
//               <div className={styles.info}>
//                 <p className={styles.filename}>{item.file.name}</p>
//                 <p className={styles.size}>
//                   {(item.file.size / 1024 / 1024).toFixed(2)} MB
//                 </p>
//               </div>
//             </div>
//
//             <button
//               onClick={() => removeFile(item.id)}
//               className={styles.remove}
//             >
//               <X className={styles.icon} />
//             </button>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };
//
// export default ImageUploadList;

// Keep module non-empty to satisfy linting without providing legacy Components.
export {};