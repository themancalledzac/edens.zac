'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import ContentBlockComponent from '@/app/components/ContentBlock/ContentBlockComponent';
import ImageMetadataModal from '@/app/components/ImageMetadata/ImageMetadataModal';
import SiteHeader from '@/app/components/SiteHeader/SiteHeader';
import { useImageMetadataEditor } from '@/app/hooks/useImageMetadataEditor';
import { type ContentCollectionModel as ContentCollectionFullModel } from '@/app/lib/api/contentCollections';
import {
  addContentBlocks,
  createContentCollectionSimple,
  fetchCollectionBySlugAdmin,
  fetchCollectionUpdateMetadata,
  updateContentCollection,
} from '@/app/lib/api/home';
import { type AnyContentBlock, type ImageContentBlock } from '@/app/types/ContentBlock';
import {
  CollectionType,
  type ContentBlockReorderOperation,
  type ContentCollectionSimpleCreateDTO,
  type DisplayMode,
} from '@/app/types/ContentCollection';
import { type CollectionUpdateMetadata } from '@/app/types/ImageMetadata';

import pageStyles from '../../../../page.module.scss';
import styles from './ManageClient.module.scss';
import {
  buildUpdatePayload,
  COVER_IMAGE_FLASH_DURATION,
  getDisplayedCoverImage,
  handleApiError,
  initializeUpdateFormData,
  isImageContentBlock,
  type ManageFormData,
  normalizeCollectionResponse,
  syncCollectionState,
  validateCoverImageSelection,
} from './manageUtils';

interface ManageClientProps {
  initialCollection?: ContentCollectionFullModel | null;
}

export default function ManageClient({ initialCollection }: ManageClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collection, setCollection] = useState<ContentCollectionFullModel | null>(
    initialCollection || null
  );
  const [isSelectingCoverImage, setIsSelectingCoverImage] = useState(false);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [justClickedImageId, setJustClickedImageId] = useState<number | null>(null);
  const [selectedImageIds, setSelectedImageIds] = useState<number[]>([]);
  const [reorderOperations, setReorderOperations] = useState<ContentBlockReorderOperation[]>([]);
  const [contentBlockIdsToRemove, setContentBlockIdsToRemove] = useState<number[]>([]);
  const [createData, setCreateData] = useState<ContentCollectionSimpleCreateDTO>({
    type: CollectionType.portfolio,
    title: '',
  });
  const [updateData, setUpdateData] = useState<ManageFormData>(
    initializeUpdateFormData(initialCollection)
  );
  const [metadata, setMetadata] = useState<CollectionUpdateMetadata>({
    tags: [],
    people: [],
    cameras: [],
    lenses: [],
    filmTypes: [],
    filmFormats: [],
    collections: [],
  });

  const { editingImage, scrollPosition, openEditor, closeEditor: baseCloseEditor } = useImageMetadataEditor();

  // Wrap closeEditor to clear selectedImageIds when closing in single-edit mode
  const closeEditor = useCallback(() => {
    // If not in multi-select mode, clear selections when closing
    if (!isMultiSelectMode) {
      setSelectedImageIds([]);
    }
    baseCloseEditor();
  }, [isMultiSelectMode, baseCloseEditor]);

  // Derive imagesToEdit from selectedImageIds (always in sync)
  const imagesToEdit = useMemo(
    () =>
      collection?.blocks.filter(
        block => isImageContentBlock(block) && selectedImageIds.includes(block.id)
      ) as ImageContentBlock[] || [],
    [selectedImageIds, collection?.blocks]
  );

  const isCreateMode = !initialCollection;

  // Memoized derived values
  const hasMorePages = useMemo(
    () =>
      collection
        ? collection.pagination.currentPage + 1 < collection.pagination.totalPages
        : false,
    [collection]
  );

  const displayedCoverImage = useMemo(
    () => getDisplayedCoverImage(collection, updateData.coverImageId),
    [collection, updateData.coverImageId]
  );

  // Fetch metadata on mount when we have a collection
  useEffect(() => {
    if (!collection) return;

    // Create abort controller for race condition protection
    const abortController = new AbortController();
    let isMounted = true;

    const fetchMetadata = async () => {
      try {
        const response = await fetchCollectionUpdateMetadata(collection.slug);

        // Only update state if component is still mounted and request wasn't aborted
        if (isMounted && !abortController.signal.aborted) {
          setMetadata({
            tags: response.tags || [],
            people: response.people || [],
            cameras: response.cameras || [],
            lenses: response.lenses || [],
            collections: response.collections || [],
            filmTypes: response.filmTypes || [],
            filmFormats: response.filmFormats || [],
          });
        }
      } catch (error) {
        // Only set error if not aborted
        if (!abortController.signal.aborted && isMounted) {
          console.error('Error fetching metadata:', error);
          setError(handleApiError(error, 'Failed to load metadata options'));
        }
      }
    };

    fetchMetadata();

    // Cleanup function to abort request and prevent state updates
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [collection]);

  // Handle creating a new text block - immediately POST to backend
  const handleCreateNewTextBlock = async () => {
    if (!collection) return;

    const newText = prompt('Enter text for the new block:');
    if (!newText || !newText.trim()) return;

    try {
      setLoading(true);
      setError(null);

      // TODO: Replace with actual API call when backend endpoint is ready
      // For now, mock the response by adding a fake text block

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Create mock text block (matching TextContentBlock structure)
      const mockTextBlock = {
        id: Date.now(), // Temporary ID
        blockType: 'TEXT' as const,
        content: newText.trim(),
        format: 'plain' as const,
        align: 'left' as const,
        orderIndex: collection.blocks.length, // Add to end
        rating: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Add mock block to collection
      const updatedCollection = {
        ...collection,
        blocks: [...collection.blocks, mockTextBlock],
      };

      setCollection(updatedCollection);

      // TODO: When backend is ready, use this instead:
      // const formData = new FormData();
      // formData.append('textContent', newText.trim());
      // const response = await addContentBlocks(collection.id, formData);
      // const refreshedCollection = await fetchCollectionBySlugAdmin(collection.slug);
      // setCollection(refreshedCollection);
    } catch (error) {
      console.error('Error creating text block:', error);
      setError(handleApiError(error, 'Failed to create text block'));
    } finally {
      setLoading(false);
    }
  };

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

      const response = await createContentCollectionSimple(createData);

      // Convert response to full model format using utility function
      const normalizedCollection = normalizeCollectionResponse(response);

      setCollection(normalizedCollection);

      // Populate update form with created collection data using utility function
      setUpdateData(initializeUpdateFormData(normalizedCollection));

      // Update URL to reflect the new collection using Next.js router
      router.push(`/collection/manage/${response.slug}`);
    } catch (error: unknown) {
      console.error('Error creating collection:', error);
      setError(handleApiError(error, 'Failed to create collection'));
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

      // Build payload with only changed fields and content block operations
      const payload = buildUpdatePayload(
        updateData,
        collection,
        reorderOperations,
        contentBlockIdsToRemove
      );

      const response = await updateContentCollection(collection.id, payload);

      // If content block operations were performed, refetch to get updated blocks
      const hasContentBlockOperations =
        reorderOperations.length > 0 || contentBlockIdsToRemove.length > 0;

      if (hasContentBlockOperations) {
        // Refetch collection to get updated blocks with proper ordering
        const refreshedCollection = await fetchCollectionBySlugAdmin(collection.slug);
        setCollection(refreshedCollection);
      } else {
        // Just sync metadata changes if no block operations
        const updatedCollection = syncCollectionState(collection, response, updateData);
        setCollection(updatedCollection);
      }

      // Reset coverImageId and content block operations after successful update
      setUpdateData(prev => ({ ...prev, coverImageId: undefined }));
      setReorderOperations([]);
      setContentBlockIdsToRemove([]);
    } catch (error) {
      console.error('Error updating collection:', error);
      setError(handleApiError(error, 'Failed to update collection'));
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

      // Create FormData and append files
      const formData = new FormData();
      for (const file of files) {
        formData.append('files', file); // Backend expects 'files' field
      }

      await addContentBlocks(collection.id, formData);

      // Re-fetch collection to get updated full model format
      const refreshedCollection = await fetchCollectionBySlugAdmin(collection.slug);
      setCollection(refreshedCollection);

      // Clear the file input
      event.target.value = '';
    } catch (error) {
      console.error('Error uploading images:', error);
      setError(handleApiError(error, 'Failed to upload images'));
    } finally {
      setLoading(false);
    }
  };

  // Handle cover image selection
  const handleCoverImageClick = useCallback(
    (imageId: number) => {
      // Validate that the selected image exists and is an image block
      if (!validateCoverImageSelection(imageId, collection?.blocks as AnyContentBlock[])) {
        setError('Invalid cover image selection. Please try again.');
        return;
      }

      setUpdateData(prev => ({ ...prev, coverImageId: imageId }));
      setIsSelectingCoverImage(false);

      // Show temporary red overlay on newly selected image
      setJustClickedImageId(imageId);
      setTimeout(() => {
        setJustClickedImageId(null);
      }, COVER_IMAGE_FLASH_DURATION);
    },
    [collection?.blocks]
  );

  // Handle multi-select toggle
  const handleMultiSelectToggle = useCallback((imageId: number) => {
    setSelectedImageIds(prev => {
      if (prev.includes(imageId)) {
        // Deselect
        return prev.filter(id => id !== imageId);
      }
      // Select
      return [...prev, imageId];
    });
  }, []);

  // Handle bulk edit - open modal with selected images
  const handleBulkEdit = useCallback(() => {
    if (selectedImageIds.length === 0 || !collection) return;

    // Get all selected image blocks
    const selectedImages = collection.blocks.filter(
      block => isImageContentBlock(block) && selectedImageIds.includes(block.id)
    ) as ImageContentBlock[];

    const firstImage = selectedImages[0];
    if (firstImage) {
      // Open editor with first image as template
      openEditor(firstImage);
    }
  }, [selectedImageIds, collection, openEditor]);

  // Handle image click - either set cover, multi-select, or open metadata editor
  const handleImageClick = useCallback(
    (imageId: number) => {
      if (isSelectingCoverImage) {
        // Mode 1: Cover image selection
        handleCoverImageClick(imageId);
        return;
      }

      if (isMultiSelectMode) {
        // Mode 2: Multi-select toggle
        handleMultiSelectToggle(imageId);
      } else {
        // Mode 3: Single image edit
        const imageBlock = collection?.blocks.find(block => block.id === imageId);
        if (imageBlock && isImageContentBlock(imageBlock)) {
          // Set selectedImageIds for modal but stay in single-edit mode
          setSelectedImageIds([imageId]);
          setIsMultiSelectMode(false);
          openEditor(imageBlock);
        }
      }
    },
    [isSelectingCoverImage, isMultiSelectMode, handleCoverImageClick, handleMultiSelectToggle, collection?.blocks, openEditor]
  );

  // Handle successful metadata save - refresh collection and clear selections
  const handleMetadataSaveSuccess = useCallback(
    async (_updatedImage: ImageContentBlock) => {
      if (!collection) return;

      try {
        // Re-fetch collection to get updated metadata
        const refreshedCollection = await fetchCollectionBySlugAdmin(collection.slug);
        setCollection(refreshedCollection);

        // Also refresh metadata to include any new tags/people created
        const refreshedMetadata = await fetchCollectionUpdateMetadata(collection.slug);
        setMetadata(refreshedMetadata);

        // Clear selected images and exit multi-select mode after successful edit
        setSelectedImageIds([]);
        setIsMultiSelectMode(false);
      } catch (error) {
        console.error('Error refreshing collection after metadata update:', error);
        setError(handleApiError(error, 'Failed to refresh data. Try reloading the page.'));
      }
    },
    [collection]
  );

  // Handle loading more content blocks
  const handleLoadMore = async () => {
    if (!collection || !hasMorePages) return;

    try {
      setLoadingMore(true);
      setError(null);

      const nextPage = collection.pagination.currentPage + 1;
      const pageSize = collection.pagination.pageSize;

      // Fetch next page
      const nextPageData = await fetchCollectionBySlugAdmin(collection.slug, nextPage, pageSize);

      // Append new blocks to existing blocks
      const updatedCollection = {
        ...collection,
        blocks: [...collection.blocks, ...nextPageData.blocks],
        pagination: nextPageData.pagination,
      };

      setCollection(updatedCollection);
    } catch (error) {
      console.error('Error loading more content:', error);
      setError(handleApiError(error, 'Failed to load more content'));
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div>
      <SiteHeader pageType="manage" />
      <div className={pageStyles.contentPadding}>
        {/* CREATE MODE */}
        {isCreateMode && !collection && (
          <div className={styles.createContainer}>
            <h2 className={styles.createHeading}>Create New Collection</h2>

            {error && <div className={styles.errorMessage}>{error}</div>}

            <form onSubmit={handleCreate}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Collection Type *</label>
                <select
                  value={createData.type}
                  onChange={e =>
                    setCreateData(prev => ({ ...prev, type: e.target.value as CollectionType }))
                  }
                  className={styles.formSelect}
                  required
                >
                  <option value={CollectionType.portfolio}>Portfolio</option>
                  <option value={CollectionType['art-gallery']}>Art Gallery</option>
                  <option value={CollectionType.blogs}>Blog</option>
                  <option value={CollectionType['client-gallery']}>Client Gallery</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Title *</label>
                <input
                  type="text"
                  value={createData.title}
                  onChange={e => setCreateData(prev => ({ ...prev, title: e.target.value }))}
                  className={styles.formInput}
                  required
                  placeholder="e.g., Film Pack 002"
                />
              </div>

              <button type="submit" disabled={loading} className={styles.submitButton}>
                {loading ? 'Creating...' : 'Create Collection'}
              </button>
            </form>
          </div>
        )}

        {/* UPDATE MODE */}
        {collection && (
          <>
            <div className={styles.updateContainer}>
              <h2 className={styles.updateHeading}>Manage Collection: {collection.title}</h2>

              {error && <div className={styles.errorMessage}>{error}</div>}

              <div className={styles.mediaSection}>
                {/* Cover Image Section */}
                <div className={styles.coverImageSection}>
                  <label className={styles.formLabel}>Cover Image</label>
                  {displayedCoverImage && isImageContentBlock(displayedCoverImage) ? (
                    <div className={styles.coverImageWrapper}>
                      <img src={displayedCoverImage.imageUrlWeb} alt="Cover" />
                      <button
                        type="button"
                        onClick={() => setIsSelectingCoverImage(!isSelectingCoverImage)}
                        className={`${styles.coverImageButton} ${isSelectingCoverImage ? styles.selecting : ''}`}
                      >
                        {isSelectingCoverImage ? 'Cancel Selection' : 'Update Cover Image'}
                      </button>
                    </div>
                  ) : (
                    <div className={styles.noCoverImage}>No cover image</div>
                  )}
                </div>

                {/* Upload Images Section */}
                <div className={styles.uploadSection}>
                  <label className={styles.formLabel}>Upload Images</label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={loading}
                    className={styles.uploadInput}
                  />
                  {loading && <div className={styles.uploadingText}>Uploading...</div>}
                </div>

                {/* Add Text Block Section */}
                <div className={styles.textBlockSection}>
                  <label className={styles.formLabel}>Add Text Block</label>
                  <button
                    type="button"
                    onClick={handleCreateNewTextBlock}
                    disabled={loading}
                    className={styles.addTextBlockButton}
                  >
                    + Create New Text Block
                  </button>
                </div>
              </div>

              <form onSubmit={handleUpdate}>
                <div className={styles.formGrid2Col}>
                  <div>
                    <label className={styles.formLabel}>Collection Type</label>
                    <select
                      value={updateData.type}
                      onChange={e =>
                        setUpdateData(prev => ({ ...prev, type: e.target.value as CollectionType }))
                      }
                      className={styles.formSelect}
                    >
                      <option value={CollectionType.portfolio}>Portfolio</option>
                      <option value={CollectionType['art-gallery']}>Art Gallery</option>
                      <option value={CollectionType.blogs}>Blog</option>
                      <option value={CollectionType['client-gallery']}>Client Gallery</option>
                    </select>
                  </div>

                  <div>
                    <label className={styles.formLabel}>Items Per Page</label>
                    <input
                      type="number"
                      min="1"
                      max="200"
                      value={updateData.blocksPerPage}
                      onChange={e =>
                        setUpdateData(prev => ({ ...prev, blocksPerPage: Number(e.target.value) }))
                      }
                      className={styles.formInput}
                    />
                  </div>
                </div>

                <div className={styles.formGrid2Col}>
                  <div>
                    <label className={styles.formLabel}>Title</label>
                    <input
                      type="text"
                      value={updateData.title}
                      onChange={e => setUpdateData(prev => ({ ...prev, title: e.target.value }))}
                      className={styles.formInput}
                    />
                  </div>

                  <div>
                    <label className={styles.formLabel}>Location</label>
                    <input
                      type="text"
                      value={updateData.location}
                      onChange={e => setUpdateData(prev => ({ ...prev, location: e.target.value }))}
                      className={styles.formInput}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Description</label>
                  <textarea
                    value={updateData.description}
                    onChange={e =>
                      setUpdateData(prev => ({ ...prev, description: e.target.value }))
                    }
                    className={styles.formTextarea}
                  />
                </div>

                <div className={styles.formGrid3Col}>
                  <div>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={updateData.visible}
                        onChange={e =>
                          setUpdateData(prev => ({ ...prev, visible: e.target.checked }))
                        }
                      />
                      <span>Visible</span>
                    </label>
                  </div>

                  <div>
                    <label className={styles.formLabel}>Priority</label>
                    <select
                      value={updateData.priority}
                      onChange={e =>
                        setUpdateData(prev => ({ ...prev, priority: Number(e.target.value) }))
                      }
                      className={styles.formSelect}
                    >
                      <option value={1}>1 - Highest</option>
                      <option value={2}>2 - High</option>
                      <option value={3}>3 - Medium</option>
                      <option value={4}>4 - Low</option>
                    </select>
                  </div>

                  <div>
                    <label className={styles.formLabel}>Display Mode</label>
                    <select
                      value={updateData.displayMode}
                      onChange={e =>
                        setUpdateData(prev => ({
                          ...prev,
                          displayMode: e.target.value as DisplayMode,
                        }))
                      }
                      className={styles.formSelect}
                    >
                      <option value="CHRONOLOGICAL">Chronological</option>
                      <option value="ORDERED">Ordered</option>
                    </select>
                  </div>
                </div>

                {/* Home Card Settings */}
                <fieldset className={styles.homeCardFieldset}>
                  <legend>Home Page Card Settings</legend>

                  <div className={styles.homeCardContent}>
                    <div className={styles.homeCardCheckbox}>
                      <label>
                        <input
                          type="checkbox"
                          checked={updateData.homeCardEnabled}
                          onChange={e =>
                            setUpdateData(prev => ({ ...prev, homeCardEnabled: e.target.checked }))
                          }
                        />
                        <span>Enable home page card</span>
                      </label>
                    </div>

                    <div className={styles.homeCardTextArea}>
                      <label>Home Card Text</label>
                      <textarea
                        value={updateData.homeCardText}
                        onChange={e =>
                          setUpdateData(prev => ({ ...prev, homeCardText: e.target.value }))
                        }
                        disabled={!updateData.homeCardEnabled}
                        placeholder="Text to display on the home page card"
                      />
                    </div>
                  </div>
                </fieldset>

                <button type="submit" disabled={loading} className={styles.submitButton}>
                  {loading ? 'Updating...' : 'Update Metadata'}
                </button>
              </form>
            </div>

            {/* Collection Content */}
            {collection.blocks && collection.blocks.length > 0 && (
              <div className={pageStyles.blockGroup}>
                <div className={styles.contentHeader}>
                  <h3 className={styles.contentHeading}>
                    Collection Content ({collection.blocks.length} of{' '}
                    {collection.pagination.totalBlocks} blocks)
                    {isSelectingCoverImage && (
                      <span className={styles.selectingNotice}>
                        (Click any image to set as cover)
                      </span>
                    )}
                    {selectedImageIds.length > 0 && (
                      <span className={styles.selectingNotice}>
                        ({selectedImageIds.length} image{selectedImageIds.length > 1 ? 's' : ''}{' '}
                        selected)
                      </span>
                    )}
                  </h3>
                  <div className={styles.bulkEditControls}>
                    {!isMultiSelectMode ? (
                      <button
                        type="button"
                        onClick={() => setIsMultiSelectMode(true)}
                        className={styles.startBulkEditButton}
                      >
                        Select Multiple Images
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={handleBulkEdit}
                          className={styles.bulkEditButton}
                          disabled={selectedImageIds.length === 0}
                        >
                          Edit {selectedImageIds.length} Image
                          {selectedImageIds.length > 1 ? 's' : ''}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedImageIds([]);
                            setIsMultiSelectMode(false);
                          }}
                          className={styles.cancelBulkEditButton}
                        >
                          Cancel Selection
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <ContentBlockComponent
                  blocks={collection.blocks as AnyContentBlock[]}
                  isSelectingCoverImage={isSelectingCoverImage}
                  currentCoverImageId={collection.coverImage?.id}
                  onImageClick={handleImageClick}
                  justClickedImageId={justClickedImageId}
                  selectedImageIds={isMultiSelectMode ? selectedImageIds : []}
                />

                {/* Load More Button */}
                {hasMorePages && (
                  <div className={styles.loadMoreContainer}>
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className={styles.loadMoreButton}
                    >
                      {loadingMore ? 'Loading...' : 'Load More'}
                    </button>
                    <div className={styles.paginationInfo}>
                      Page {collection.pagination.currentPage + 1} of{' '}
                      {collection.pagination.totalPages}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Image Metadata Editor Modal */}
      {editingImage && (
        <ImageMetadataModal
          scrollPosition={scrollPosition}
          onClose={closeEditor}
          onSaveSuccess={handleMetadataSaveSuccess}
          availableTags={metadata.tags}
          availablePeople={metadata.people}
          availableCameras={metadata.cameras}
          availableLenses={metadata.lenses}
          availableFilmTypes={metadata.filmTypes}
          availableFilmFormats={metadata.filmFormats}
          availableCollections={metadata.collections}
          selectedImageIds={selectedImageIds}
          allImages={imagesToEdit}
        />
      )}
    </div>
  );
}
