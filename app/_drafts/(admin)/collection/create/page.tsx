// /**
//  * Create Collection Page
//  *
//  * Administrative form page for creating new content collections. Features
//  * comprehensive form validation, conditional fields based on collection type,
//  * and server-side creation with proper error handling and navigation.
//  *
//  * @dependencies
//  * - Next.js useRouter for navigation
//  * - React hooks for form state management
//  * - SiteHeader for consistent navigation
//  * - createContentCollection API function
//  * - ContentCollectionCreateDTO type for form data
//  * - CollectionType enum for type selection
//  *
//  * @returns Client component with collection creation form
//  */
// 'use client';
//
// import { useRouter } from 'next/navigation';
// import { type FormEvent, useState } from 'react';
//
// import SiteHeader from '@/app/components/site-header';
// import { createContentCollection } from '@/lib/api/home';
// import { CollectionType, type ContentCollectionCreateDTO } from '@/types/ContentCollection';
//
// import styles from './page.module.scss';
//
// export default function CreateCollectionPage() {
//   const router = useRouter();
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//
//   const [formData, setFormData] = useState<ContentCollectionCreateDTO>({
//     type: CollectionType.PORTFOLIO,
//     title: '',
//     description: '',
//     location: '',
//     priority: 2,
//     visible: true,
//     homeCardEnabled: false,
//     homeCardText: '',
//     homeCardCoverImageUrl: '',
//     blocksPerPage: 12
//   });
//
//   const handleInputChange = (field: keyof ContentCollectionCreateDTO, value: ContentCollectionCreateDTO[keyof ContentCollectionCreateDTO]) => {
//     setFormData(prev => ({
//       ...prev,
//       [field]: value
//     }));
//   };
//
//   const handleSubmit = async (e: FormEvent) => {
//     e.preventDefault();
//     setLoading(true);
//     setError(null);
//
//     try {
//       // Basic validation
//       if (!formData.title.trim()) {
//         throw new Error('Title is required');
//       }
//       if (formData.title.length < 3 || formData.title.length > 100) {
//         throw new Error('Title must be between 3 and 100 characters');
//       }
//
//       console.log('Submitting form data:', formData);
//       const result = await createContentCollection(formData);
//
//       console.log('Collection created successfully:', result);
//
//       // Redirect to the created collection
//       if (result.slug) {
//         router.push(`/${result.type}/${result.slug}`);
//       } else {
//         // Fallback if no slug
//         router.push('/');
//       }
//     } catch (error_: unknown) {
//       console.error('Error creating collection:', error_);
//       const errorMessage = error_ instanceof Error ? error_.message : 'Failed to create collection';
//       setError(errorMessage);
//     } finally {
//       setLoading(false);
//     }
//   };
//
//   return (
//     <div>
//       <SiteHeader />
//       <div className={styles.form}>
//         <h1>Create New Collection</h1>
//
//         {error && (
//         <div style={{
//           background: '#fee',
//           border: '1px solid #fcc',
//           padding: '1rem',
//           borderRadius: '4px',
//           marginBottom: '1rem',
//           color: '#c33'
//         }}>
//           {error}
//         </div>
//       )}
//
//       <form onSubmit={handleSubmit}>
//         {/* Collection Type */}
//         <div style={{ marginBottom: '1rem' }}>
//           <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
//             Collection Type *
//           </label>
//           <select
//             value={formData.type}
//             onChange={(e) => handleInputChange('type', e.target.value as CollectionType)}
//             style={{
//               width: '100%',
//               padding: '0.5rem',
//               border: '1px solid #ccc',
//               borderRadius: '4px'
//             }}
//             required
//           >
//             <option value={CollectionType.PORTFOLIO}>Portfolio</option>
//             <option value={CollectionType.CATALOG}>Catalog</option>
//             <option value={CollectionType.BLOG}>Blog</option>
//             <option value={CollectionType.CLIENT_GALLERY}>Client Gallery</option>
//           </select>
//         </div>
//
//         {/* Title */}
//         <div style={{ marginBottom: '1rem' }}>
//           <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
//             Title * (3-100 characters)
//           </label>
//           <input
//             type="text"
//             value={formData.title}
//             onChange={(e) => handleInputChange('title', e.target.value)}
//             style={{
//               width: '100%',
//               padding: '0.5rem',
//               border: '1px solid #ccc',
//               borderRadius: '4px'
//             }}
//             required
//             minLength={3}
//             maxLength={100}
//           />
//         </div>
//
//         {/* Description */}
//         <div style={{ marginBottom: '1rem' }}>
//           <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
//             Description (max 500 characters)
//           </label>
//           <textarea
//             value={formData.description}
//             onChange={(e) => handleInputChange('description', e.target.value)}
//             style={{
//               width: '100%',
//               padding: '0.5rem',
//               border: '1px solid #ccc',
//               borderRadius: '4px',
//               minHeight: '100px',
//               resize: 'vertical'
//             }}
//             maxLength={500}
//           />
//         </div>
//
//         {/* Location */}
//         <div style={{ marginBottom: '1rem' }}>
//           <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
//             Location (max 255 characters)
//           </label>
//           <input
//             type="text"
//             value={formData.location}
//             onChange={(e) => handleInputChange('location', e.target.value)}
//             style={{
//               width: '100%',
//               padding: '0.5rem',
//               border: '1px solid #ccc',
//               borderRadius: '4px'
//             }}
//             maxLength={255}
//           />
//         </div>
//
//         {/* Priority */}
//         <div style={{ marginBottom: '1rem' }}>
//           <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
//             Priority (1 = highest, 4 = lowest) - applies to both collection and home card
//           </label>
//           <select
//             value={formData.priority}
//             onChange={(e) => handleInputChange('priority', Number(e.target.value))}
//             style={{
//               width: '100%',
//               padding: '0.5rem',
//               border: '1px solid #ccc',
//               borderRadius: '4px'
//             }}
//           >
//             <option value={1}>1 - Highest</option>
//             <option value={2}>2 - High</option>
//             <option value={3}>3 - Medium</option>
//             <option value={4}>4 - Low</option>
//           </select>
//         </div>
//
//         {/* Visibility */}
//         <div style={{ marginBottom: '1rem' }}>
//           <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
//             <input
//               type="checkbox"
//               checked={formData.visible}
//               onChange={(e) => handleInputChange('visible', e.target.checked)}
//             />
//             <span style={{ fontWeight: 'bold' }}>Make collection visible</span>
//           </label>
//         </div>
//
//         {/* Client Gallery Password */}
//         {formData.type === CollectionType.CLIENT_GALLERY && (
//           <div style={{ marginBottom: '1rem' }}>
//             <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
//               Password (8-100 characters, required for client galleries)
//             </label>
//             <input
//               type="password"
//               value={formData.password || ''}
//               onChange={(e) => handleInputChange('password', e.target.value)}
//               style={{
//                 width: '100%',
//                 padding: '0.5rem',
//                 border: '1px solid #ccc',
//                 borderRadius: '4px'
//               }}
//               minLength={8}
//               maxLength={100}
//               required={formData.type === CollectionType.CLIENT_GALLERY}
//             />
//           </div>
//         )}
//
//         {/* Home Card Settings */}
//         <fieldset style={{
//           marginBottom: '1rem',
//           padding: '1rem',
//           border: '1px solid #ccc',
//           borderRadius: '4px'
//         }}>
//           <legend style={{ fontWeight: 'bold' }}>Home Page Card Settings</legend>
//
//           <div style={{ marginBottom: '1rem' }}>
//             <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
//               <input
//                 type="checkbox"
//                 checked={formData.homeCardEnabled}
//                 onChange={(e) => handleInputChange('homeCardEnabled', e.target.checked)}
//               />
//               <span>Enable home page card</span>
//             </label>
//           </div>
//
//           {formData.homeCardEnabled && (
//             <>
//               <div style={{ marginBottom: '1rem' }}>
//                 <label style={{ display: 'block', marginBottom: '0.5rem' }}>
//                   Home Card Text
//                 </label>
//                 <textarea
//                   value={formData.homeCardText}
//                   onChange={(e) => handleInputChange('homeCardText', e.target.value)}
//                   style={{
//                     width: '100%',
//                     padding: '0.5rem',
//                     border: '1px solid #ccc',
//                     borderRadius: '4px',
//                     minHeight: '60px'
//                   }}
//                 />
//               </div>
//
//               <div style={{ marginBottom: '1rem' }}>
//                 <label style={{ display: 'block', marginBottom: '0.5rem' }}>
//                   Home Card Cover Image URL
//                 </label>
//                 <input
//                   type="url"
//                   value={formData.homeCardCoverImageUrl}
//                   onChange={(e) => handleInputChange('homeCardCoverImageUrl', e.target.value)}
//                   style={{
//                     width: '100%',
//                     padding: '0.5rem',
//                     border: '1px solid #ccc',
//                     borderRadius: '4px'
//                   }}
//                 />
//               </div>
//             </>
//           )}
//         </fieldset>
//
//         {/* Submit Buttons */}
//         <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
//           <button
//             type="submit"
//             disabled={loading}
//             style={{
//               padding: '0.75rem 1.5rem',
//               background: loading ? '#ccc' : '#007bff',
//               color: 'white',
//               border: 'none',
//               borderRadius: '4px',
//               cursor: loading ? 'not-allowed' : 'pointer',
//               fontSize: '1rem'
//             }}
//           >
//             {loading ? 'Creating...' : 'Create Collection'}
//           </button>
//
//           <button
//             type="button"
//             onClick={() => router.back()}
//             style={{
//               padding: '0.75rem 1.5rem',
//               background: '#6c757d',
//               color: 'white',
//               border: 'none',
//               borderRadius: '4px',
//               cursor: 'pointer',
//               fontSize: '1rem'
//             }}
//           >
//             Cancel
//           </button>
//         </div>
//       </form>
//       </div>
//     </div>
//   );
// }