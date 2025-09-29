'use client';

import { type FormEvent, useState } from 'react';

/**
 * TODO: Future Content Block Operations
 *
 * Add support for the following backend fields in updateData:
 *
 * Content block operations (processed separately in service layer):
 * - reorderOperations: Array<ContentBlockReorderOperation>
 * - contentBlockIdsToRemove: Array<number>
 * - newTextBlocks: Array<string>
 * - newCodeBlocks: Array<string>
 *
 * ContentBlockReorderOperation interface:
 * - contentBlockId?: number (positive for existing, negative for new placeholders)
 * - oldOrderIndex?: number (original position, min 0)
 * - newOrderIndex: number (new position, min 0)
 */
import ContentBlockComponent from '@/app/components/ContentBlock/ContentBlockComponent';
import SiteHeader from '@/app/components/SiteHeader/SiteHeader';
import { type ContentCollectionModel as ContentCollectionFullModel } from '@/app/lib/api/contentCollections';
import { addContentBlocks, createContentCollectionSimple, fetchCollectionBySlugAdmin, updateContentCollection } from '@/app/lib/api/home';
import { type AnyContentBlock } from '@/app/types/ContentBlock';
import { CollectionType, type ContentCollectionSimpleCreateDTO, type ContentCollectionUpdateDTO } from '@/app/types/ContentCollection';

import styles from '../../../../page.module.scss';

interface ManageClientProps {
  initialCollection?: ContentCollectionFullModel | null;
}

export default function ManageClient({ initialCollection }: ManageClientProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collection, setCollection] = useState<ContentCollectionFullModel | null>(initialCollection || null);
  const [isSelectingCoverImage, setIsSelectingCoverImage] = useState(false);
  const [justClickedImageId, setJustClickedImageId] = useState<number | null>(null);

  // Create form state
  const [createData, setCreateData] = useState<ContentCollectionSimpleCreateDTO>({
    type: CollectionType.portfolio,
    title: ''
  });

  // Update form state
  const [updateData, setUpdateData] = useState<ContentCollectionUpdateDTO>({
    title: initialCollection?.title || '',
    description: initialCollection?.description || '',
    location: initialCollection?.location || '',
    visible: initialCollection?.visible ?? true,
    priority: initialCollection?.priority ?? 2,
    displayMode: initialCollection?.displayMode ?? 'CHRONOLOGICAL',
    homeCardEnabled: initialCollection?.homeCardEnabled ?? false,
    homeCardText: initialCollection?.homeCardText || '',
    coverImageId: undefined
  });

  const isCreateMode = !initialCollection;

  // Handle create form submission
  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();

    if (!createData.title.trim()) {
      setError('Title is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('Creating collection:', createData);
      const response = await createContentCollectionSimple(createData);

      console.log('Collection created:', response);

      // Convert response to full model format and switch to update mode
      const normalizedCollection: ContentCollectionFullModel = {
        id: response.id,
        type: response.type,
        title: response.title,
        slug: response.slug,
        description: response.description || '',
        location: response.location || '',
        collectionDate: response.collectionDate,
        coverImageUrl: response.coverImageUrl,
        coverImage: null, // New collection has no cover image initially
        visible: true,
        priority: 2,
        isPasswordProtected: false,
        hasAccess: true,
        displayMode: 'CHRONOLOGICAL',
        homeCardEnabled: false,
        homeCardText: '',
        blocks: [], // New collection has no blocks initially
        pagination: {
          currentPage: 0,
          totalPages: 0,
          totalBlocks: 0,
          pageSize: 30
        }
      };

      setCollection(normalizedCollection);

      // Populate update form with created collection data
      setUpdateData({
        title: normalizedCollection.title,
        description: normalizedCollection.description || '',
        location: normalizedCollection.location || '',
        visible: true, // Default value
        priority: 2,   // Default value
        homeCardEnabled: false,
        homeCardText: '',
        coverImageId: undefined
      });

      // Update URL to reflect the new collection
      window.history.pushState({}, '', `/collection/manage/${response.slug}`);

    } catch (error_: unknown) {
      console.error('Error creating collection:', error_);
      const errorMessage = error_ instanceof Error ? error_.message : 'Failed to create collection';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle update form submission
  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();

    if (!collection) return;

    try {
      setLoading(true);
      setError(null);

      console.log('Updating collection:', collection.id, updateData);

      const response = await updateContentCollection(collection.id, updateData);

      console.log('Collection updated successfully:', response);

      // Update local collection state with response data
      const updatedCollection: ContentCollectionFullModel = {
        ...collection,
        title: response.title,
        description: response.description || '',
        location: response.location || ''
      };

      setCollection(updatedCollection);

    } catch (error) {
      console.error('Error updating collection:', error);
      setError(error instanceof Error ? error.message : 'Failed to update collection');
    } finally {
      setLoading(false);
    }
  };

  // Handle image upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!collection || !event.target.files || event.target.files.length === 0) return;

    try {
      setLoading(true);
      setError(null);

      const files = Array.from(event.target.files);
      console.log('Uploading images for collection:', collection.id, files.length, 'files');

      // Create FormData and append files
      const formData = new FormData();
      for (const file of files) {
        formData.append('files', file); // Backend expects 'files' field
      }

      const response = await addContentBlocks(collection.id, formData);

      console.log('Images uploaded successfully:', response);

      // Re-fetch collection to get updated full model format
      const refreshedCollection = await fetchCollectionBySlugAdmin(collection.slug);
      setCollection(refreshedCollection);

      // Clear the file input
      event.target.value = '';

    } catch (error) {
      console.error('Error uploading images:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload images');
    } finally {
      setLoading(false);
    }
  };

  // Handle cover image selection
  const handleCoverImageClick = (imageId: number) => {
    setUpdateData(prev => ({ ...prev, coverImageId: imageId }));
    setIsSelectingCoverImage(false);

    // Show temporary red overlay on newly selected image
    setJustClickedImageId(imageId);
    setTimeout(() => {
      setJustClickedImageId(null);
    }, 500);
  };

  // Get the displayed cover image (pending selection or current)
  // Cast blocks to AnyContentBlock since they come from the API properly typed
  const displayedCoverImage = updateData.coverImageId
    ? (collection?.blocks as AnyContentBlock[])?.find(block => block.id === updateData.coverImageId && 'imageUrlWeb' in block)
    : collection?.coverImage;

  // Type guard to check if it's an image block with imageUrlWeb
  const hasImageUrl = (block: unknown): block is { imageUrlWeb: string } => {
    return block !== null && block !== undefined && typeof block === 'object' && 'imageUrlWeb' in block;
  };

  return (
    <div>
      <SiteHeader pageType="manage" />
      <div className={styles.contentPadding}>

        {/* CREATE MODE */}
        {isCreateMode && !collection && (
          <div style={{
            background: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            padding: '1.5rem',
            marginBottom: '2rem'
          }}>
            <h2 style={{ marginBottom: '1.5rem', color: '#333' }}>Create New Collection</h2>

            {error && (
              <div style={{
                background: '#fee',
                border: '1px solid #fcc',
                padding: '1rem',
                borderRadius: '4px',
                marginBottom: '1rem',
                color: '#c33'
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Collection Type *
                </label>
                <select
                  value={createData.type}
                  onChange={(e) => setCreateData(prev => ({ ...prev, type: e.target.value as CollectionType }))}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                  }}
                  required
                >
                  <option value={CollectionType.portfolio}>Portfolio</option>
                  <option value={CollectionType.catalog}>Catalog</option>
                  <option value={CollectionType.blogs}>Blog</option>
                  <option value={CollectionType['client-gallery']}>Client Gallery</option>
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Title *
                </label>
                <input
                  type="text"
                  value={createData.title}
                  onChange={(e) => setCreateData(prev => ({ ...prev, title: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                  }}
                  required
                  placeholder="e.g., Film Pack 002"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: loading ? '#ccc' : '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '1rem'
                }}
              >
                {loading ? 'Creating...' : 'Create Collection'}
              </button>
            </form>
          </div>
        )}

        {/* UPDATE MODE */}
        {collection && (
          <>
            <div style={{
              background: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '8px',
              padding: '1.5rem',
              marginBottom: '2rem'
            }}>
              <h2 style={{ marginBottom: '1.5rem', color: '#333' }}>
                Manage Collection: {collection.title}
              </h2>

              {error && (
                <div style={{
                  background: '#fee',
                  border: '1px solid #fcc',
                  padding: '1rem',
                  borderRadius: '4px',
                  marginBottom: '1rem',
                  color: '#c33'
                }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem' }}>
                {/* Cover Image Section */}
                <div style={{ flex: '0 0 200px' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Cover Image
                  </label>
                  {hasImageUrl(displayedCoverImage) ? (
                    <div>
                      <img
                        src={displayedCoverImage.imageUrlWeb}
                        alt="Cover"
                        style={{
                          width: '100%',
                          height: 'auto',
                          maxHeight: '300px',
                          objectFit: 'contain',
                          borderRadius: '4px',
                          border: '1px solid #ccc',
                          marginBottom: '0.5rem'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setIsSelectingCoverImage(!isSelectingCoverImage)}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          background: isSelectingCoverImage ? '#dc3545' : '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: isSelectingCoverImage ? 'bold' : 'normal'
                        }}
                      >
                        {isSelectingCoverImage ? 'Cancel Selection' : 'Update Cover Image'}
                      </button>
                    </div>
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '150px',
                      border: '2px dashed #ccc',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#999',
                      fontSize: '0.875rem',
                      marginBottom: '0.5rem'
                    }}>
                      No cover image
                    </div>
                  )}
                </div>

                {/* Upload Images Section */}
                <div style={{ flex: '1' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Upload Images
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={loading}
                    style={{
                      padding: '0.5rem',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      width: '100%'
                    }}
                  />
                  {loading && <div style={{ marginTop: '0.5rem', color: '#666' }}>Uploading...</div>}
                </div>
              </div>

              <form onSubmit={handleUpdate}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      Title
                    </label>
                    <input
                      type="text"
                      value={updateData.title}
                      onChange={(e) => setUpdateData(prev => ({ ...prev, title: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #ccc',
                        borderRadius: '4px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      Location
                    </label>
                    <input
                      type="text"
                      value={updateData.location}
                      onChange={(e) => setUpdateData(prev => ({ ...prev, location: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #ccc',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Description
                  </label>
                  <textarea
                    value={updateData.description}
                    onChange={(e) => setUpdateData(prev => ({ ...prev, description: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      minHeight: '100px'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="checkbox"
                        checked={updateData.visible}
                        onChange={(e) => setUpdateData(prev => ({ ...prev, visible: e.target.checked }))}
                      />
                      <span style={{ fontWeight: 'bold' }}>Visible</span>
                    </label>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      Priority
                    </label>
                    <select
                      value={updateData.priority}
                      onChange={(e) => setUpdateData(prev => ({ ...prev, priority: Number(e.target.value) }))}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #ccc',
                        borderRadius: '4px'
                      }}
                    >
                      <option value={1}>1 - Highest</option>
                      <option value={2}>2 - High</option>
                      <option value={3}>3 - Medium</option>
                      <option value={4}>4 - Low</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      Display Mode
                    </label>
                    <select
                      value={updateData.displayMode}
                      onChange={(e) => setUpdateData(prev => ({ ...prev, displayMode: e.target.value as 'CHRONOLOGICAL' | 'ORDERED' }))}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #ccc',
                        borderRadius: '4px'
                      }}
                    >
                      <option value="CHRONOLOGICAL">Chronological</option>
                      <option value="ORDERED">Ordered</option>
                    </select>
                  </div>
                </div>

                {/* Home Card Settings */}
                <fieldset style={{
                  marginBottom: '1rem',
                  padding: '1rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px'
                }}>
                  <legend style={{ fontWeight: 'bold' }}>Home Page Card Settings</legend>

                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ flex: '0 0 auto' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="checkbox"
                          checked={updateData.homeCardEnabled}
                          onChange={(e) => setUpdateData(prev => ({ ...prev, homeCardEnabled: e.target.checked }))}
                        />
                        <span>Enable home page card</span>
                      </label>
                    </div>

                    <div style={{ flex: '1' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        Home Card Text
                      </label>
                      <textarea
                        value={updateData.homeCardText}
                        onChange={(e) => setUpdateData(prev => ({ ...prev, homeCardText: e.target.value }))}
                        disabled={!updateData.homeCardEnabled}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          minHeight: '60px',
                          opacity: updateData.homeCardEnabled ? 1 : 0.5,
                          cursor: updateData.homeCardEnabled ? 'text' : 'not-allowed'
                        }}
                        placeholder="Text to display on the home page card"
                      />
                    </div>
                  </div>
                </fieldset>


                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: loading ? '#ccc' : '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  {loading ? 'Updating...' : 'Update Metadata'}
                </button>
              </form>
            </div>

            {/* Collection Content */}
            {collection.blocks && collection.blocks.length > 0 && (
              <div className={styles.blockGroup}>
                <h3 style={{
                  marginBottom: '1rem',
                  padding: '1rem',
                  background: '#f8f9fa',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px'
                }}>
                  Collection Content ({collection.blocks.length} blocks)
                  {isSelectingCoverImage && (
                    <span style={{ marginLeft: '1rem', color: '#dc3545', fontWeight: 'bold' }}>
                      (Click any image to set as cover)
                    </span>
                  )}
                </h3>
                <ContentBlockComponent
                  blocks={collection.blocks as AnyContentBlock[]}
                  isSelectingCoverImage={isSelectingCoverImage}
                  currentCoverImageId={collection.coverImage?.id}
                  onImageClick={handleCoverImageClick}
                  justClickedImageId={justClickedImageId}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}