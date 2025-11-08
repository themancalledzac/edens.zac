'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import ContentBlockWithFullScreen from '@/app/components/Content/ContentBlockWithFullScreen';
import ImageMetadataModal from '@/app/components/ImageMetadata/ImageMetadataModal';
import UnifiedMetadataSelector from '@/app/components/ImageMetadata/UnifiedMetadataSelector';
import { LoadingSpinner } from '@/app/components/LoadingSpinner/LoadingSpinner';
import SiteHeader from '@/app/components/SiteHeader/SiteHeader';
import { useImageMetadataEditor } from '@/app/hooks/useImageMetadataEditor';
import {
  createCollection,
  getCollectionUpdateMetadata,
  updateCollection,
} from '@/app/lib/api/collections.new';
import { createImages, createTextContent } from '@/app/lib/api/content';
import { collectionStorage } from '@/app/lib/storage/collectionStorage';
import {
  type CollectionCreateRequest,
  type CollectionListModel,
  CollectionType,
  type CollectionUpdateRequest,
  type CollectionUpdateResponseDTO,
  type DisplayMode,
} from '@/app/types/Collection';
import {
  type AnyContentModel,
  type CollectionContentModel,
  type ContentImageUpdateResponse,
  type ImageContentModel,
} from '@/app/types/Content';
import { convertCollectionContentToImage } from '@/app/utils/contentLayout';
import { isCollectionContent, isContentImage } from '@/app/utils/contentTypeGuards';

import pageStyles from '../../../../page.module.scss';
import styles from './ManageClient.module.scss';
import {
  buildCollectionsUpdate,
  buildUpdatePayload,
  COVER_IMAGE_FLASH_DURATION,
  getCollectionContentAsSelections,
  getDisplayedCoverImage,
  handleApiError,
  isImageContentBlock,
  validateCoverImageSelection,
} from './manageUtils';

interface ManageClientProps {
  slug?: string; // Collection slug for UPDATE mode, undefined for CREATE mode
}

export default function ManageClient({ slug }: ManageClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(!!slug);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Single source of truth: CollectionUpdateResponseDTO contains collection + all metadata
  const [currentState, setCurrentState] = useState<CollectionUpdateResponseDTO | null>(null);

  const [isSelectingCoverImage, setIsSelectingCoverImage] = useState(false);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [justClickedImageId, setJustClickedImageId] = useState<number | null>(null);
  const [selectedImageIds, setSelectedImageIds] = useState<number[]>([]);

  const [createData, setCreateData] = useState<CollectionCreateRequest>({
    type: CollectionType.PORTFOLIO,
    title: '',
  });

  const {
    editingImage,
    scrollPosition,
    openEditor,
    closeEditor: baseCloseEditor,
  } = useImageMetadataEditor();

  // Wrap closeEditor to clear selectedImageIds when closing in single-edit mode
  const closeEditor = useCallback(() => {
    // If not in multi-select mode, clear selections when closing
    if (!isMultiSelectMode) {
      setSelectedImageIds([]);
    }
    baseCloseEditor();
  }, [isMultiSelectMode, baseCloseEditor]);

  const isCreateMode = !slug;
  const collection = currentState?.collection ?? null;

  // Update state: starts as copy of collection data
  const [updateData, setUpdateData] = useState<CollectionUpdateRequest>(() => {
    if (collection) {
      return {
        id: collection.id,
        type: collection.type || CollectionType.PORTFOLIO,
        title: collection.title || '',
        description: collection.description || '',
        location: collection.location || '',
        collectionDate: collection.collectionDate || '',
        visible: collection.visible ?? true,
        displayMode: collection.displayMode || 'CHRONOLOGICAL',
      };
    }
    return {
      id: 0,
      type: CollectionType.PORTFOLIO,
      title: '',
      description: '',
      location: '',
      collectionDate: '',
      visible: true,
      displayMode: 'CHRONOLOGICAL',
    };
  });

  // Reset updateData when collection loads/changes
  useEffect(() => {
    if (collection) {
      setUpdateData({
        id: collection.id,
        type: collection.type || CollectionType.PORTFOLIO,
        title: collection.title || '',
        description: collection.description || '',
        location: collection.location || '',
        collectionDate: collection.collectionDate || '',
        visible: collection.visible ?? true,
        displayMode: collection.displayMode || 'CHRONOLOGICAL',
      });
    }
  }, [collection]);

  // Convert CollectionContentModel blocks to ImageContentModel for rendering on manage page
  // Apply collection-specific orderIndex and sort, similar to processContentBlocks
  const processedContent = useMemo(() => {
    if (!collection?.content) return [];
    return collection.content
      .map(block => {
        if (isCollectionContent(block)) {
          return convertCollectionContentToImage(block);
        }
        // For images, update orderIndex from collection-specific entry
        if (block.contentType === 'IMAGE' && collection.id) {
          const imageBlock = block as ImageContentModel;
          const collectionEntry = imageBlock.collections?.find(
            c => c.collectionId === collection.id
          );
          if (collectionEntry?.orderIndex !== undefined) {
            return {
              ...imageBlock,
              orderIndex: collectionEntry.orderIndex,
            };
          }
        }
        return block;
      })
      .sort((a, b) => {
        // Sort by orderIndex (collection-specific for images)
        return (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
      });
  }, [collection?.content, collection?.id]);

  // Derive imagesToEdit from selectedImageIds
  const imagesToEdit = useMemo(
    () =>
      (collection?.content?.filter(
        contentItem => isContentImage(contentItem) && selectedImageIds.includes(contentItem.id)
      ) as ImageContentModel[]) || [],
    [selectedImageIds, collection?.content]
  );

  const displayedCoverImage = useMemo(
    () => getDisplayedCoverImage(collection, updateData.coverImageId),
    [collection, updateData.coverImageId]
  );

  // Load collection data for UPDATE mode
  useEffect(() => {
    if (!slug) return; // CREATE mode - no data to fetch

    // Skip fetch if we already have this exact collection loaded
    if (currentState?.collection.slug === slug) {
      return;
    }

    const abortController = new AbortController();
    let isMounted = true;

    const loadCollectionData = async () => {
      try {
        setLoading(true);

        // Always fetch fresh data in manage page to ensure we have complete collection data
        // (including collections arrays on content items)
        const response = await getCollectionUpdateMetadata(slug);

        if (isMounted && !abortController.signal.aborted) {
          setCurrentState(response);

          // Update cache with complete data (includes collections arrays on content items)
          collectionStorage.update(slug, response.collection);
        }
      } catch (error) {
        if (!abortController.signal.aborted && isMounted) {
          setError(handleApiError(error, 'Failed to load collection data'));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadCollectionData();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [slug, currentState?.collection.slug]);

  // Handle creating a new text block - immediately POST to backend
  const handleCreateNewTextBlock = async () => {
    if (!collection) return;

    const newText = prompt('Enter text for the new block:');
    if (!newText || !newText.trim()) return;

    try {
      setLoading(true);
      setError(null);

      // Create text content via API
      await createTextContent({
        collectionId: collection.id,
        content: newText.trim(),
        format: 'plain',
        align: 'left',
      });

      // Re-fetch collection using admin endpoint to get full data with collections arrays
      const response = await getCollectionUpdateMetadata(collection.slug);

      // Update currentState with refreshed collection (keep existing metadata)
      setCurrentState(prev => ({
        ...prev!,
        collection: response.collection,
      }));

      // Update cache with full admin data (includes collections arrays)
      collectionStorage.update(collection.slug, response.collection);
    } catch (error) {
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

      // Create endpoint returns CollectionUpdateResponseDTO
      const response = await createCollection(createData);

      // Set current state (contains collection + metadata)
      setCurrentState(response);

      // Update URL to reflect the new collection
      router.replace(`/collection/manage/${response.collection.slug}`);
    } catch (error: unknown) {
      setError(handleApiError(error, 'Failed to create collection'));
    } finally {
      setLoading(false);
    }
  };

  // Handle update form submission
  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();

    if (!collection || !currentState) return;

    try {
      setSaving(true);
      setError(null);

      // Build payload with only changed fields
      const payload = buildUpdatePayload(updateData, collection);

      await updateCollection(collection.id, payload);

      // Re-fetch using admin endpoint to get full data with collections arrays
      const response = await getCollectionUpdateMetadata(collection.slug);

      // Update currentState with response (merge with existing metadata)
      setCurrentState(prev => ({
        ...prev!,
        collection: response.collection,
      }));

      // Update cache with full admin data (includes collections arrays)
      collectionStorage.update(collection.slug, response.collection);

      // Reset coverImageId after successful update
      setUpdateData(prev => ({ ...prev, coverImageId: undefined }));
    } catch (error) {
      setError(handleApiError(error, 'Failed to update collection'));
    } finally {
      setSaving(false);
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

      await createImages(collection.id, formData);

      // Re-fetch collection using admin endpoint to get full data with collections arrays
      const response = await getCollectionUpdateMetadata(collection.slug);

      // Update currentState with refreshed collection (keep existing metadata)
      setCurrentState(prev => ({
        ...prev!,
        collection: response.collection,
      }));

      // Update cache with full admin data (includes collections arrays)
      collectionStorage.update(collection.slug, response.collection);

      // Clear the file input
      event.target.value = '';
    } catch (error) {
      setError(handleApiError(error, 'Failed to upload images'));
    } finally {
      setLoading(false);
    }
  };

  // Handle cover image selection
  const handleCoverImageClick = useCallback(
    (imageId: number) => {
      // Validate that the selected image exists and is an image block
      if (!validateCoverImageSelection(imageId, collection?.content as AnyContentModel[])) {
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
    [collection?.content]
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
    if (selectedImageIds.length === 0 || !collection?.content) return;

    // Get all selected image blocks
    const selectedImages = collection.content.filter(
      block => isImageContentBlock(block) && selectedImageIds.includes(block.id)
    ) as ImageContentModel[];

    const firstImage = selectedImages[0];
    if (firstImage) {
      // Open editor with first image as template
      openEditor(firstImage);
    }
  }, [selectedImageIds, collection, openEditor]);

  // Handle image click - either set cover, multi-select, open metadata editor, or navigate to collection
  const handleImageClick = useCallback(
    (imageId: number) => {
      if (isSelectingCoverImage) {
        // Mode 1: Cover image selection
        handleCoverImageClick(imageId);
        return;
      }

      // Check if this is a collection block (converted to ImageContentModel in processedContent)
      // If so, navigate to that collection's manage page instead of editing
      const originalBlock = collection?.content?.find(block => block.id === imageId);
      if (originalBlock && isCollectionContent(originalBlock)) {
        const collectionBlock = originalBlock as CollectionContentModel;
        router.push(`/collection/manage/${collectionBlock.slug}`);
        return;
      }

      if (isMultiSelectMode) {
        // Mode 2: Multi-select toggle
        handleMultiSelectToggle(imageId);
      } else {
        // Mode 3: Single image edit
        // Find block in original content or processed content
        const imageBlock =
          collection?.content?.find(block => block.id === imageId) ||
          processedContent.find(block => block.id === imageId);
        if (imageBlock && isImageContentBlock(imageBlock)) {
          // Set selectedImageIds for modal but stay in single-edit mode
          setSelectedImageIds([imageId]);
          setIsMultiSelectMode(false);
          openEditor(imageBlock);
        }
      }
    },
    [
      isSelectingCoverImage,
      isMultiSelectMode,
      handleCoverImageClick,
      handleMultiSelectToggle,
      collection?.content,
      processedContent,
      openEditor,
      router,
    ]
  );

  // Handle successful metadata save - update currentState with API response
  const handleMetadataSaveSuccess = useCallback(
    async (response: ContentImageUpdateResponse) => {
      if (!currentState?.collection.content || !currentState.collection.slug) return;

      try {
        // Re-fetch using admin endpoint to get full data with collections arrays
        const fullResponse = await getCollectionUpdateMetadata(currentState.collection.slug);

        // Update currentState with full response (includes collections arrays)
        setCurrentState(prev => ({
          ...prev!,
          collection: fullResponse.collection,
        }));

        // Update cache with full admin data (includes collections arrays)
        collectionStorage.update(currentState.collection.slug, fullResponse.collection);

        // Revalidate Next.js cache
        try {
          await fetch('/api/revalidate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tag: `collection-${currentState.collection.slug}`,
              path: `/${currentState.collection.slug}`,
            }),
          });
        } catch (error) {
          console.warn('[ManageClient] Failed to revalidate cache:', error);
        }

        // Add new metadata entities to currentState
        const { newMetadata } = response;
        if (newMetadata && Object.values(newMetadata).some(arr => arr && arr.length > 0)) {
          setCurrentState(prev => ({
            ...prev!,
            tags: [...(prev?.tags || []), ...(newMetadata.tags || [])],
            people: [...(prev?.people || []), ...(newMetadata.people || [])],
            cameras: [...(prev?.cameras || []), ...(newMetadata.cameras || [])],
            lenses: [...(prev?.lenses || []), ...(newMetadata.lenses || [])],
            filmTypes: [...(prev?.filmTypes || []), ...(newMetadata.filmTypes || [])],
          }));
        }

        // Clear selected images and exit multi-select mode
        setSelectedImageIds([]);
        setIsMultiSelectMode(false);
      } catch (error) {
        setError(handleApiError(error, 'An error occurred. Try reloading the page.'));
      }
    },
    [currentState]
  );

  // Derive original collection IDs from currentState
  const originalCollectionIds = useMemo(() => {
    const ids = new Set<number>();
    if (collection?.content) {
      for (const block of collection.content) {
        if (isCollectionContent(block)) {
          ids.add(block.id);
        }
      }
    }
    return ids;
  }, [collection?.content]);

  // Derive current selected collections by applying changes to original collection
  const currentSelectedCollections: CollectionListModel[] = useMemo(() => {
    const selected = getCollectionContentAsSelections(collection?.content);
    const removeIds = new Set(updateData.collections?.remove || []);
    const filtered = selected.filter(c => !removeIds.has(c.id));

    const newCollections = updateData.collections?.newValue || [];
    for (const newCollection of newCollections) {
      if (!filtered.some(c => c.id === newCollection.collectionId)) {
        filtered.push({
          id: newCollection.collectionId,
          name: newCollection.name || '',
        });
      }
    }

    return filtered;
  }, [updateData.collections, collection?.content]);

  // Handle collections selection changes - simple toggle logic
  const handleCollectionsChange = useCallback(
    (value: { id: number; name: string } | Array<{ id: number; name: string }> | null) => {
      // UnifiedMetadataSelector always passes array for multiSelect
      const selectedCollections = Array.isArray(value) ? value : [];

      // Build the collections update using utility function
      const collectionsUpdate = buildCollectionsUpdate(
        selectedCollections,
        originalCollectionIds,
        updateData.collections
      );

      setUpdateData(prev => ({
        ...prev,
        collections: collectionsUpdate,
      }));
    },
    [originalCollectionIds, updateData.collections]
  );

  return (
    <div>
      <div className={pageStyles.contentPadding}>
        <SiteHeader pageType="manage" />
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
                  <option value={CollectionType.PORTFOLIO}>Portfolio</option>
                  <option value={CollectionType.ART_GALLERY}>Art Gallery</option>
                  <option value={CollectionType.BLOG}>Blog</option>
                  <option value={CollectionType.CLIENT_GALLERY}>Client Gallery</option>
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
              <h2
                className={styles.updateHeading}
                onClick={() => router.push(`/${collection.slug}`)}
              >
                {collection.title}
              </h2>

              {error && <div className={styles.errorMessage}>{error}</div>}

              <form onSubmit={handleUpdate}>
                <div className={styles.updateFormLayout}>
                  {/* LEFT SECTION */}
                  <div className={styles.leftSection}>
                    {/* Title */}
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Title</label>
                      <input
                        type="text"
                        value={updateData.title}
                        onChange={e => setUpdateData(prev => ({ ...prev, title: e.target.value }))}
                        className={styles.formInput}
                      />
                    </div>

                    {/* Collection Date / Collection Type */}
                    <div className={styles.formGridHalf}>
                      <div>
                        <label className={styles.formLabel}>Collection Date</label>
                        <input
                          type="date"
                          value={updateData.collectionDate}
                          onChange={e =>
                            setUpdateData(prev => ({ ...prev, collectionDate: e.target.value }))
                          }
                          className={styles.formInput}
                        />
                      </div>

                      <div>
                        <label className={styles.formLabel}>Collection Type</label>
                        <select
                          value={updateData.type}
                          onChange={e =>
                            setUpdateData(prev => ({
                              ...prev,
                              type: e.target.value as CollectionType,
                            }))
                          }
                          className={styles.formSelect}
                        >
                          <option value={CollectionType.PORTFOLIO}>Portfolio</option>
                          <option value={CollectionType.ART_GALLERY}>Art Gallery</option>
                          <option value={CollectionType.BLOG}>Blog</option>
                          <option value={CollectionType.CLIENT_GALLERY}>Client Gallery</option>
                        </select>
                      </div>
                    </div>

                    {/* Location */}
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Location</label>
                      <input
                        type="text"
                        value={updateData.location}
                        onChange={e =>
                          setUpdateData(prev => ({ ...prev, location: e.target.value }))
                        }
                        className={styles.formInput}
                      />
                    </div>

                    {/* Visible Checkbox / Display Mode */}
                    <div className={styles.formGridHalf}>
                      <div className={styles.checkboxGroup}>
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

                    {/* Description */}
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
                  </div>

                  {/* RIGHT SECTION */}
                  <div className={styles.rightSection}>
                    {/* Cover Image */}
                    <div className={styles.coverImageSection}>
                      <label className={styles.formLabel}>Cover Image</label>
                      {displayedCoverImage && isImageContentBlock(displayedCoverImage) ? (
                        <div className={styles.coverImageWrapper}>
                          <img src={displayedCoverImage.imageUrl} alt="Cover" />
                          <button
                            type="button"
                            onClick={() => setIsSelectingCoverImage(!isSelectingCoverImage)}
                            className={`${styles.coverImageButton} ${isSelectingCoverImage ? styles.selecting : ''}`}
                          >
                            {isSelectingCoverImage ? 'Cancel Selection' : 'Update Cover Image'}
                          </button>
                        </div>
                      ) : (
                        <div className={styles.noCoverImage}>
                          <div>No cover image</div>
                          <button
                            type="button"
                            onClick={() => setIsSelectingCoverImage(!isSelectingCoverImage)}
                            className={`${styles.coverImageButton} ${isSelectingCoverImage ? styles.selecting : ''}`}
                          >
                            {isSelectingCoverImage ? 'Cancel Selection' : 'Select Cover Image'}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Upload Images / Add Text Block */}
                    <div className={styles.mediaSection}>
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
                    <div className={styles.formSection}>
                      <h3 className={styles.sectionHeading}>Child Collections</h3>

                      <UnifiedMetadataSelector<{ id: number; name: string }>
                        label="Collections"
                        multiSelect
                        options={currentState?.collections || []}
                        selectedValues={currentSelectedCollections}
                        onChange={handleCollectionsChange}
                        allowAddNew={false}
                        getDisplayName={collectionItem => collectionItem.name}
                        changeButtonText="Select More ▼"
                        emptyText="No child collections"
                      />
                    </div>
                  </div>
                </div>

                <div className={styles.formActions}>
                  <button
                    type="submit"
                    disabled={saving || loading}
                    className={styles.submitButton}
                  >
                    {saving ? (
                      <>
                        <LoadingSpinner size="small" color="white" />
                        <span style={{ marginLeft: '8px' }}>Updating...</span>
                      </>
                    ) : (
                      'Update Metadata'
                    )}
                  </button>

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
              </form>
            </div>

            {/* Collection Content */}
            {processedContent && processedContent.length > 0 && (
              <div className={pageStyles.blockGroup}>
                <div className={styles.contentHeader}>
                  <h3 className={styles.contentHeading}>
                    Collection Content ({processedContent.length} items)
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
                </div>
                <ContentBlockWithFullScreen
                  content={processedContent}
                  priorityBlockIndex={0}
                  enableFullScreenView={false}
                  isSelectingCoverImage={isSelectingCoverImage}
                  currentCoverImageId={collection.coverImage?.id}
                  onImageClick={handleImageClick}
                  justClickedImageId={justClickedImageId}
                  selectedImageIds={isMultiSelectMode ? selectedImageIds : []}
                  currentCollectionId={collection.id}
                  collectionSlug={collection.slug}
                  collectionData={collection}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Image Metadata Editor Modal */}
      {editingImage && imagesToEdit && imagesToEdit.length > 0 && (
        <ImageMetadataModal
          scrollPosition={scrollPosition}
          onClose={closeEditor}
          onSaveSuccess={handleMetadataSaveSuccess}
          availableTags={currentState?.tags || []}
          availablePeople={currentState?.people || []}
          availableCameras={currentState?.cameras || []}
          availableLenses={currentState?.lenses || []}
          availableFilmTypes={currentState?.filmTypes || []}
          availableFilmFormats={currentState?.filmFormats || []}
          availableCollections={currentState?.collections || []}
          selectedImageIds={selectedImageIds}
          selectedImages={imagesToEdit}
          currentCollectionId={collection?.id}
        />
      )}
    </div>
  );
}
