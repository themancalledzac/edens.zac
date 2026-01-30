'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import ContentBlockWithFullScreen from '@/app/components/Content/ContentBlockWithFullScreen';
import ImageMetadataModal from '@/app/components/ImageMetadata/ImageMetadataModal';
import UnifiedMetadataSelector from '@/app/components/ImageMetadata/UnifiedMetadataSelector';
import { LoadingSpinner } from '@/app/components/LoadingSpinner/LoadingSpinner';
import SiteHeader from '@/app/components/SiteHeader/SiteHeader';
import TextBlockCreateModal from '@/app/components/TextBlockCreateModal/TextBlockCreateModal';
import { useCollectionData } from '@/app/hooks/useCollectionData';
import { useImageMetadataEditor } from '@/app/hooks/useImageMetadataEditor';
import {
  createCollection,
  getCollectionUpdateMetadata,
  updateCollection,
} from '@/app/lib/api/collections';
import { createImages, createTextContent } from '@/app/lib/api/content';
import { collectionStorage } from '@/app/lib/storage/collectionStorage';
import {
  type CollectionCreateRequest,
  type CollectionListModel,
  CollectionType,
  type CollectionUpdateRequest,
  type CollectionUpdateResponseDTO,
  type DisplayMode,
  type LocationModel,
} from '@/app/types/Collection';
import { type ContentImageModel, type ContentImageUpdateResponse } from '@/app/types/Content';
import { processContentBlocks } from '@/app/utils/contentLayout';
import { isContentCollection, isContentImage } from '@/app/utils/contentTypeGuards';
import {
  convertLocationStringToModel,
  createLocationUpdateFromModel,
} from '@/app/utils/locationUtils';

import styles from './ManageClient.module.scss';
import {
  applyReorderChangesOptimistically,
  buildCollectionsUpdate,
  buildUpdatePayload,
  calculateReorderChanges,
  COVER_IMAGE_FLASH_DURATION,
  executeReorderOperation,
  getCurrentSelectedCollections,
  getDisplayedCoverImage,
  handleApiError,
  handleCollectionNavigation,
  handleCoverImageSelection,
  handleMultiSelectToggle as handleMultiSelectToggleUtil,
  handleSingleImageEdit,
  mergeNewMetadata,
  refreshCollectionAfterOperation,
  revalidateCollectionCache,
} from './manageUtils';

interface ManageClientProps {
  slug?: string; // Collection slug for UPDATE mode, undefined for CREATE mode
}

export default function ManageClient({ slug }: ManageClientProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // Single source of truth: CollectionUpdateResponseDTO contains collection + all metadata
  const [currentState, setCurrentState] = useState<CollectionUpdateResponseDTO | null>(null);

  // Use custom hook for loading collection data
  const { loading, error: loadError } = useCollectionData(
    slug,
    currentState?.collection.slug,
    useCallback((data: CollectionUpdateResponseDTO) => {
      setCurrentState(data);
    }, [])
  );

  // Separate loading state for operations (create, update, upload, etc.)
  const [operationLoading, setOperationLoading] = useState(false);

  // Combine loading error with component error state
  const [error, setError] = useState<string | null>(null);
  const displayError = error || loadError;

  // Combined loading state (initial load or operation)
  const isLoading = loading || operationLoading;

  const [isSelectingCoverImage, setIsSelectingCoverImage] = useState(false);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [justClickedImageId, setJustClickedImageId] = useState<number | null>(null);
  const [selectedImageIds, setSelectedImageIds] = useState<number[]>([]);
  const [isTextBlockModalOpen, setIsTextBlockModalOpen] = useState(false);
  const [dragState, setDragState] = useState<{
    draggedId: number | null;
    dragOverId: number | null;
  }>({
    draggedId: null,
    dragOverId: null,
  });

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

  // Clear selectedImageIds when editor closes (handles Escape key and other close methods)
  useEffect(() => {
    if (!editingImage && !isMultiSelectMode) {
      setSelectedImageIds([]);
    }
  }, [editingImage, isMultiSelectMode]);

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
        collectionDate: collection.collectionDate || '',
        visible: collection.visible ?? true,
        displayMode: collection.displayMode || 'CHRONOLOGICAL',
      });
    }
  }, [collection]);

  // Process content blocks for display - same as collection page but without visibility filtering
  // Collections are converted to ParallaxImageContentModel, images get collection-specific orderIndex
  const processedContent = useMemo(
    () =>
      processContentBlocks(
        collection?.content ?? [],
        false,
        collection?.id,
        collection?.displayMode
      ),
    [collection?.content, collection?.id, collection?.displayMode]
  );

  // Derive imagesToEdit from selectedImageIds
  const imagesToEdit = useMemo(
    () =>
      (collection?.content?.filter(
        contentItem => isContentImage(contentItem) && selectedImageIds.includes(contentItem.id)
      ) as ContentImageModel[]) || [],
    [selectedImageIds, collection?.content]
  );

  const displayedCoverImage = useMemo(
    () => getDisplayedCoverImage(collection, updateData.coverImageId),
    [collection, updateData.coverImageId]
  );

  // Collection data loading is now handled by useCollectionData hook

  /**
   * Handle opening the text block creation modal
   */
  const handleCreateNewTextBlock = () => {
    if (!collection) return;
    setIsTextBlockModalOpen(true);
  };

  /**
   * Handle text block creation submission from modal
   */
  const handleTextBlockSubmit = async (data: {
    content: string;
    format: 'plain' | 'markdown' | 'html';
    align: 'left' | 'center' | 'right';
  }) => {
    if (!collection) return;

    try {
      setOperationLoading(true);
      setError(null);

      // Execute operation and refresh collection
      const response = await refreshCollectionAfterOperation(
        collection.slug,
        async () => {
          await createTextContent({
            collectionId: collection.id,
            content: data.content,
            format: data.format,
            align: data.align,
          });
        },
        getCollectionUpdateMetadata,
        collectionStorage
      );

      // Update currentState with refreshed collection (keep existing metadata)
      setCurrentState(prev => ({
        ...prev!,
        collection: response.collection,
      }));

      // Close modal after successful creation
      setIsTextBlockModalOpen(false);
    } catch (error) {
      setError(handleApiError(error, 'Failed to create text block'));
      throw error; // Re-throw so modal can handle it
    } finally {
      setOperationLoading(false);
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
      setOperationLoading(true);
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
      setOperationLoading(false);
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
      setOperationLoading(true);
      setError(null);

      const files = Array.from(event.target.files);

      // Create FormData and append files
      const formData = new FormData();
      for (const file of files) {
        formData.append('files', file); // Backend expects 'files' field
      }

      // Execute operation and refresh collection
      const response = await refreshCollectionAfterOperation(
        collection.slug,
        async () => {
          await createImages(collection.id, formData);
        },
        getCollectionUpdateMetadata,
        collectionStorage
      );

      // Update currentState with refreshed collection (keep existing metadata)
      setCurrentState(prev => ({
        ...prev!,
        collection: response.collection,
      }));

      // Clear the file input
      event.target.value = '';
    } catch (error) {
      setError(handleApiError(error, 'Failed to upload images'));
    } finally {
      setOperationLoading(false);
    }
  };

  // Handle cover image selection - makes immediate API call
  const handleCoverImageClick = useCallback(
    async (imageId: number) => {
      if (!collection) return;

      const result = handleCoverImageSelection(imageId, collection.content);

      if (!result.success) {
        setError(result.error);
        return;
      }

      // Show temporary overlay on newly selected image
      setJustClickedImageId(result.coverImageId);
      setIsSelectingCoverImage(false);

      // Make immediate API call to update cover image
      try {
        setOperationLoading(true);
        setError(null);

        await updateCollection(collection.id, {
          id: collection.id,
          coverImageId: result.coverImageId,
        });

        // Re-fetch collection to get updated cover image
        const response = await getCollectionUpdateMetadata(collection.slug);
        setCurrentState(prev => ({
          ...prev!,
          collection: response.collection,
        }));

        // Update cache
        collectionStorage.update(collection.slug, response.collection);
      } catch (error) {
        setError(handleApiError(error, 'Failed to update cover image'));
      } finally {
        setOperationLoading(false);
        setTimeout(() => {
          setJustClickedImageId(null);
        }, COVER_IMAGE_FLASH_DURATION);
      }
    },
    [collection]
  );

  // Handle multi-select toggle
  const handleMultiSelectToggle = useCallback((imageId: number) => {
    setSelectedImageIds(prev => handleMultiSelectToggleUtil(imageId, prev));
  }, []);

  // Handle bulk edit - open modal with selected images
  const handleBulkEdit = useCallback(() => {
    if (selectedImageIds.length === 0 || !collection?.content) return;

    // Get all selected image blocks
    const selectedImages = collection.content.filter(
      block => isContentImage(block) && selectedImageIds.includes(block.id)
    ) as ContentImageModel[];

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

      // Mode 2: Collection navigation
      const collectionSlug = handleCollectionNavigation(imageId, collection?.content);
      if (collectionSlug) {
        router.push(`/collection/manage/${collectionSlug}`);
        return;
      }

      if (isMultiSelectMode) {
        // Mode 3: Multi-select toggle
        handleMultiSelectToggle(imageId);
      } else {
        // Mode 4: Single image edit
        const imageBlock = handleSingleImageEdit(imageId, collection?.content, processedContent);
        if (imageBlock) {
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

  /**
   * Handle successful metadata save - updates currentState with API response
   *
   * Orchestrates the following steps in sequence:
   * 1. Immediately update cache with updated images (optimistic update)
   * 2. Re-fetch collection data with full metadata using admin endpoint
   * 3. Update currentState with full response (includes collections arrays)
   * 4. Update sessionStorage cache with full admin data (ensures consistency)
   * 5. Revalidate Next.js cache for the collection
   * 6. Merge new metadata entities (tags, people, cameras, lenses, filmTypes) into currentState
   * 7. Clear selected images and exit multi-select mode
   *
   * @param response - ContentImageUpdateResponse from image metadata update API
   */
  const handleMetadataSaveSuccess = useCallback(
    async (response: ContentImageUpdateResponse) => {
      if (!currentState?.collection.content || !currentState.collection.slug) return;

      try {
        const slug = currentState.collection.slug;

        // Optimistically update cache with changed images immediately
        if (response.updatedImages && response.updatedImages.length > 0) {
          collectionStorage.updateImagesInCache(slug, response.updatedImages);
        }

        // Re-fetch full collection for state consistency
        const fullResponse = await getCollectionUpdateMetadata(slug);
        setCurrentState(fullResponse);
        collectionStorage.update(slug, fullResponse.collection);
        await revalidateCollectionCache(slug);

        const metadataUpdater = mergeNewMetadata(response, currentState);
        if (metadataUpdater) {
          setCurrentState(metadataUpdater);
        }

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
        if (isContentCollection(block)) {
          ids.add(block.id);
        }
      }
    }
    return ids;
  }, [collection?.content]);

  // Derive current selected collections by applying changes to original collection
  const currentSelectedCollections: CollectionListModel[] = useMemo(
    () => getCurrentSelectedCollections(collection?.content, updateData.collections),
    [updateData.collections, collection?.content]
  );

  // Derive current location from collection.location string and updateData.location
  // Handles both original collection location and pending updates
  const currentLocation: LocationModel | null = useMemo(() => {
    const availableLocations = currentState?.locations || [];

    // If there's a pending update in updateData, use that
    const locationUpdate = updateData.location;
    if (locationUpdate) {
      if (locationUpdate.remove) {
        // Location is being removed
        return null;
      }
      if (locationUpdate.prev) {
        // Existing location selected by ID
        const location = availableLocations.find(loc => loc.id === locationUpdate.prev);
        return location || null;
      }
      if (locationUpdate.newValue) {
        // New location being created (temporary with id: 0)
        return { id: 0, name: locationUpdate.newValue };
      }
    }

    // No pending update - use original collection location
    // Handle both object format (new API) and string format (legacy)
    const collectionLocation = collection?.location;
    
    // If location is already an object with id and name, use it directly
    if (collectionLocation && typeof collectionLocation === 'object' && 'id' in collectionLocation && 'name' in collectionLocation) {
      // It's already a LocationModel - find it in availableLocations to ensure we have the correct reference
      const location = availableLocations.find(loc => loc.id === (collectionLocation as LocationModel).id);
      return location || (collectionLocation as LocationModel);
    }
    
    // Otherwise, treat it as a string and convert
    return convertLocationStringToModel(
      typeof collectionLocation === 'string' ? collectionLocation : null,
      availableLocations
    );
  }, [collection?.location, currentState?.locations, updateData.location]);

  // Handle location selection changes
  const handleLocationChange = useCallback((value: LocationModel | LocationModel[] | null) => {
    const location = Array.isArray(value) ? value[0] || null : value;
    const locationUpdate = createLocationUpdateFromModel(location);

    setUpdateData(prev => ({
      ...prev,
      location: locationUpdate,
    }));
  }, []);

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

  // Drag handlers for reordering (supports both IMAGE and COLLECTION content)
  const handleDragStart = useCallback(
    (contentId: number) => {
      if (!collection || collection.displayMode !== 'ORDERED') return;
      setDragState({ draggedId: contentId, dragOverId: null });
    },
    [collection]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, contentId: number) => {
      if (!collection || collection.displayMode !== 'ORDERED' || !dragState.draggedId) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragState(prev => ({ ...prev, dragOverId: contentId }));
    },
    [collection, dragState.draggedId]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent, targetContentId: number) => {
      e.preventDefault();
      if (
        !dragState.draggedId ||
        dragState.draggedId === targetContentId ||
        !collection ||
        !currentState
      ) {
        setDragState({ draggedId: null, dragOverId: null });
        return;
      }

      // Calculate which content items need to be reordered
      const reorderChanges = calculateReorderChanges(
        dragState.draggedId,
        targetContentId,
        currentState.collection
      );

      if (reorderChanges.length === 0) {
        setDragState({ draggedId: null, dragOverId: null });
        return;
      }

      // OPTIMISTIC UPDATE: Immediately update UI to show the new order
      const optimisticallyUpdatedCollection = applyReorderChangesOptimistically(
        currentState.collection,
        reorderChanges
      );

      setCurrentState(prev =>
        prev
          ? {
              ...prev,
              collection: optimisticallyUpdatedCollection,
            }
          : null
      );

      // Clear drag state immediately so UI updates
      setDragState({ draggedId: null, dragOverId: null });

      // Call API in the background - optimistic update is already showing the correct state
      try {
        setOperationLoading(true);
        setError(null);

        await executeReorderOperation(collection.id, reorderChanges, collection.slug);

        // Success - optimistic update is already correct, nothing more to do
      } catch (error) {
        setError(
          handleApiError(
            error,
            'Failed to reorder content. The server may not support reordering this content type.'
          )
        );

        // Re-fetch to restore correct state (reverts optimistic update)
        try {
          const response = await getCollectionUpdateMetadata(collection.slug);
          setCurrentState(prev => (prev ? { ...prev, collection: response.collection } : null));
        } catch {
          // Silent fail - user already sees the reorder error
        }
      } finally {
        setOperationLoading(false);
      }
    },
    [dragState.draggedId, collection, currentState]
  );

  const handleDragEnd = useCallback(() => {
    setDragState({ draggedId: null, dragOverId: null });
  }, []);

  return (
    <div>
      <div className={styles.container}>
        <main className={styles.main}>
          <SiteHeader pageType="manage" />
          {/* CREATE MODE */}
          {isCreateMode && !collection && (
            <div className={styles.createContainer}>
              <h2 className={styles.createHeading}>Create New Collection</h2>

              {displayError && <div className={styles.errorMessage}>{displayError}</div>}

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

                <button type="submit" disabled={isLoading} className={styles.submitButton}>
                  {isLoading ? 'Creating...' : 'Create Collection'}
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

                {displayError && <div className={styles.errorMessage}>{displayError}</div>}

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
                          onChange={e =>
                            setUpdateData(prev => ({ ...prev, title: e.target.value }))
                          }
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
                      <UnifiedMetadataSelector<LocationModel>
                        label="Location"
                        multiSelect={false}
                        options={currentState?.locations || []}
                        selectedValue={currentLocation}
                        onChange={handleLocationChange}
                        allowAddNew
                        onAddNew={data => {
                          handleLocationChange({ id: 0, name: data.name as string });
                        }}
                        addNewFields={[
                          {
                            name: 'name',
                            label: 'Location Name',
                            type: 'text',
                            placeholder: 'e.g., Seattle, WA',
                            required: true,
                          },
                        ]}
                        getDisplayName={location => location?.name || ''}
                        showNewIndicator
                        emptyText="No location set"
                      />

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
                        {displayedCoverImage && isContentImage(displayedCoverImage) ? (
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
                            disabled={isLoading}
                            className={styles.uploadInput}
                          />
                          {isLoading && <div className={styles.uploadingText}>Uploading...</div>}
                        </div>

                        <div className={styles.textBlockSection}>
                          <label className={styles.formLabel}>Add Text Block</label>
                          <button
                            type="button"
                            onClick={handleCreateNewTextBlock}
                            disabled={isLoading}
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
                          simpleChips
                        />
                      </div>
                    </div>
                  </div>

                  <div className={styles.formActions}>
                    <button
                      type="submit"
                      disabled={saving || isLoading}
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
                          Select Multiple
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              // Select all image IDs from collection content
                              const allImageIds = collection?.content
                                ?.filter(isContentImage)
                                .map(img => img.id) || [];
                              setSelectedImageIds(allImageIds);
                            }}
                            className={styles.startBulkEditButton}
                          >
                            Select All
                          </button>
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
                <>
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
                      {collection.displayMode === 'ORDERED' &&
                        !isSelectingCoverImage &&
                        selectedImageIds.length === 0 && (
                          <span className={styles.selectingNotice}>
                            (Drag and drop images to reorder)
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
                    enableDragAndDrop={collection.displayMode === 'ORDERED'}
                    draggedImageId={dragState.draggedId}
                    dragOverImageId={dragState.dragOverId}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onDragEnd={handleDragEnd}
                  />
                </>
              )}
            </>
          )}
        </main>
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
          availableLocations={currentState?.locations || []}
          selectedImageIds={selectedImageIds}
          selectedImages={imagesToEdit}
          currentCollectionId={collection?.id}
        />
      )}

      {/* Text Block Create Modal */}
      {isTextBlockModalOpen && (
        <TextBlockCreateModal
          scrollPosition={scrollPosition}
          onClose={() => setIsTextBlockModalOpen(false)}
          onSubmit={handleTextBlockSubmit}
        />
      )}
    </div>
  );
}
