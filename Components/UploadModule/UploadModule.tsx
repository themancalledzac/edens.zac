// TODO:deprecate (Phase 5.2 end): Legacy Components retained during hybrid migration
// import React, { ChangeEvent, useEffect } from 'react';
//
// import styles from '../../styles/Upload.module.scss';
//
// export default function UploadModule({ uploadQueue, dispatch, isSelected, setIsSelected }) {
//
//   const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
//     const files = Array.from(e.target.files || []);
//     console.log('Files selected:', files);
//
//     // Add files to queue immediately with 'processing' status
//     dispatch({
//       type: 'ADD_FILES',
//       files: files,
//     });
//
//     const formData = new FormData();
//
//     for (const file of files) {
//       console.log('Adding file:', file.name, file.type);
//       formData.append('images', file);
//     }
//
//     try {
//       const response = await fetch('/api/proxy/v1/image/getBatchImageMetadata', {
//         method: 'POST',
//         headers: {
//           'Accept': 'application/json',
//         },
//         credentials: 'include',
//         body: formData,
//       });
//
//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }
//
//       const metadataList = await response.json();
//       console.log(metadataList);
//       // Update metadata for each file
//       for (const [index, file] of files.entries()) {
//         const fileId = `${file.name}`;
//         dispatch({
//           type: 'UPDATE_METADATA',
//           id: fileId,
//           metadata: metadataList[index],
//         });
//       }
//       setIsSelected(true);
//     } catch (error) {
//       // Handle error for all files
//       for (const file of files) {
//         const fileId = `${file.name}-${Date.now()}`;
//         dispatch({
//           type: 'SET_ERROR',
//           id: fileId,
//         });
//       }
//       console.error('Error fetching metadata:', error);
//     }
//   };
//
//   useEffect(() => {
//
//     console.log(uploadQueue);
//
//   }, [uploadQueue]);
//
//   return (
//
//     <div className={!isSelected ? styles.uploadZone : styles.uploadZoneSmall}>
//       <div className={styles.container}>
//         {!isSelected &&
//           <>
//             <h1 className={styles.icon}>UPLOAD</h1>
//             <p className={styles.title}>Select images for upload</p>
//             <p className={styles.subtitle}>Support for batch uploads (up to 200 images)</p>
//           </>
//         }
//         <input
//           type="file"
//           multiple
//           accept="image/*"
//           onChange={handleFileSelect}
//           className={styles.input}
//           id="file-upload"
//         />
//         <button
//           onClick={() => document.getElementById('file-upload').click()}
//           className={styles.button}
//         >
//           Select Files
//         </button>
//       </div>
//     </div>
//   );
// };

// Keep module non-empty to satisfy linting without providing legacy Components.
export {};
