'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import CollectionListSelector from '@/app/components/CollectionListSelector/CollectionListSelector';
import ContentBlockWithFullScreen from '@/app/components/Content/ContentBlockWithFullScreen';
import ImageMetadataModal from '@/app/components/ImageMetadata/ImageMetadataModal';
import UnifiedMetadataSelector from '@/app/components/ImageMetadata/UnifiedMetadataSelector';
import { LoadingSpinner } from '@/app/components/LoadingSpinner/LoadingSpinner';
import SiteHeader from '@/app/components/SiteHeader/SiteHeader';
import TextBlockCreateModal from '@/app/components/TextBlockCreateModal/TextBlockCreateModal';
import { useCollectionData } from '@/app/hooks/useCollectionData';
import { useImageMetadataEditor } from '@/app/hooks/useImageMetadataEditor';
import {
  createChildCollection,
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
  applyArrowMove,
  applyPickAndPlace,
  applyReorderChangesOptimistically,
  buildReorderChangesFromFinalOrder,
  buildUpdatePayload,
  cancelImageMoves,
  COVER_IMAGE_FLASH_DURATION,
  executeReorderOperation,
  getDisplayedCoverImage,
  handleApiError,
  handleCollectionNavigation,
  handleCoverImageSelection,
  handleMultiSelectToggle as handleMultiSelectToggleUtil,
  handleSingleImageEdit,
  mergeNewMetadata,
  refreshCollectionAfterOperation,
  type ReorderMove,
  replayMoves,
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
  const [reorderState, setReorderState] = useState<{
    active: boolean;
    originalOrder: number[];
    moves: ReorderMove[];
    pickedUpImageId: number | null;
  }>({
    active: false,
    originalOrder: [],
    moves: [],
    pickedUpImageId: null,
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
        rowsWide: collection.rowsWide ?? undefined,
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
      rowsWide: undefined,
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
        rowsWide: collection.rowsWide ?? undefined,
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

  // Compute the current display order from reorder state
  const reorderDisplayOrder = useMemo(() => {
    if (!reorderState.active) return [];
    return replayMoves(reorderState.originalOrder, reorderState.moves);
  }, [reorderState.active, reorderState.originalOrder, reorderState.moves]);

  // When in reorder mode, reorder processedContent according to the replay order
  const displayContent = useMemo(() => {
    if (!reorderState.active || !processedContent) return processedContent;
    const orderMap = new Map(reorderDisplayOrder.map((id, i) => [id, i]));
    return [...processedContent].sort((a, b) => {
      const aIdx = orderMap.get(a.id) ?? Infinity;
      const bIdx = orderMap.get(b.id) ?? Infinity;
      return aIdx - bIdx;
    });
  }, [reorderState.active, processedContent, reorderDisplayOrder]);

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

      // Update collection - response includes full CollectionUpdateResponseDTO with updated slug and all metadata
      const response = await updateCollection(collection.id, payload);

      // Update currentState with response (includes collection + all metadata)
      setCurrentState(response);

      // Update both caches with full admin data
      collectionStorage.update(response.collection.slug, response.collection);
      collectionStorage.updateFull(response.collection.slug, response);

      // If slug changed, update URL to reflect new slug
      if (response.collection.slug !== collection.slug) {
        router.replace(`/collection/manage/${response.collection.slug}`);
      }

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

        // Update cover image - response includes full CollectionUpdateResponseDTO
        const response = await updateCollection(collection.id, {
          id: collection.id,
          coverImageId: result.coverImageId,
        });

        // Update currentState with response (includes collection + all metadata)
        setCurrentState(response);

        // Update both caches
        collectionStorage.update(response.collection.slug, response.collection);
        collectionStorage.updateFull(response.collection.slug, response);
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
        collectionStorage.updateFull(slug, fullResponse);
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

  /**
   * Handle successful image deletion - refreshes collection data
   *
   * Orchestrates the following steps in sequence:
   * 1. Re-fetch collection data with full metadata using admin endpoint
   * 2. Update currentState with full response
   * 3. Update sessionStorage cache with full admin data
   * 4. Revalidate Next.js cache for the collection
   * 5. Clear selected images and exit multi-select mode
   *
   * @param _deletedIds - Array of image IDs that were successfully deleted
   */
  const handleDeleteSuccess = useCallback(
    async (_deletedIds: number[]) => {
      if (!currentState?.collection.slug) return;

      try {
        const slug = currentState.collection.slug;

        // Re-fetch full collection for state consistency
        const fullResponse = await getCollectionUpdateMetadata(slug);
        setCurrentState(fullResponse);
        collectionStorage.update(slug, fullResponse.collection);
        collectionStorage.updateFull(slug, fullResponse);
        await revalidateCollectionCache(slug);

        setSelectedImageIds([]);
        setIsMultiSelectMode(false);
      } catch (error) {
        setError(handleApiError(error, 'Failed to refresh collection after deletion'));
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
          ids.add(block.referencedCollectionId);
        }
      }
    }
    return ids;
  }, [collection?.content]);

  // Derive pending add/remove sets for CollectionListSelector
  const pendingAddIds = useMemo(() => {
    const ids = new Set<number>();
    for (const child of updateData.collections?.newValue || []) {
      ids.add(child.collectionId);
    }
    return ids;
  }, [updateData.collections?.newValue]);

  const pendingRemoveIds = useMemo(() => {
    return new Set<number>(updateData.collections?.remove || []);
  }, [updateData.collections?.remove]);

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
    if (
      collectionLocation &&
      typeof collectionLocation === 'object' &&
      'id' in collectionLocation &&
      'name' in collectionLocation
    ) {
      // It's already a LocationModel - find it in availableLocations to ensure we have the correct reference
      const location = availableLocations.find(
        loc => loc.id === (collectionLocation as LocationModel).id
      );
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

  // Handle collection toggle from CollectionListSelector
  const handleCollectionToggle = useCallback(
    (toggledCollection: CollectionListModel) => {
      setUpdateData(prev => {
        const currentRemove = new Set(prev.collections?.remove || []);
        const currentNewValue = prev.collections?.newValue || [];
        const isSaved = originalCollectionIds.has(toggledCollection.id);

        const newRemove = isSaved
          ? (currentRemove.has(toggledCollection.id)
            ? [...currentRemove].filter(id => id !== toggledCollection.id)
            : [...currentRemove, toggledCollection.id])
          : [...currentRemove];

        const newNewValue = isSaved
          ? [...currentNewValue]
          : (currentNewValue.some(c => c.collectionId === toggledCollection.id)
            ? currentNewValue.filter(c => c.collectionId !== toggledCollection.id)
            : [
                ...currentNewValue,
                {
                  collectionId: toggledCollection.id,
                  name: toggledCollection.name,
                  visible: true,
                  orderIndex: currentNewValue.length,
                },
              ]);

        // Clean up: if both arrays are empty, clear collections entirely
        const hasChanges = newRemove.length > 0 || newNewValue.length > 0;
        return {
          ...prev,
          collections: hasChanges
            ? {
                ...prev.collections,
                remove: newRemove.length > 0 ? newRemove : undefined,
                newValue: newNewValue.length > 0 ? newNewValue : undefined,
              }
            : undefined,
        };
      });
    },
    [originalCollectionIds]
  );

  // Handle adding new child collection
  const handleAddNewChild = useCallback(async () => {
    if (!collection) return;

    try {
      setOperationLoading(true);
      setError(null);

      // Create child collection with default values
      const response = await createChildCollection(collection.id, {
        type: CollectionType.PORTFOLIO,
        title: 'New Child Collection',
      });

      // Navigate to the new child collection's manage page
      router.push(`/collection/manage/${response.collection.slug}`);
    } catch (error) {
      setError(handleApiError(error, 'Failed to create child collection'));
    } finally {
      setOperationLoading(false);
    }
  }, [collection, router]);

  // Enter reorder mode
  const handleEnterReorderMode = useCallback(() => {
    if (!processedContent) return;
    // Exit multi-select mode if active
    setIsMultiSelectMode(false);
    setSelectedImageIds([]);
    setReorderState({
      active: true,
      originalOrder: processedContent.map(c => c.id),
      moves: [],
      pickedUpImageId: null,
    });
  }, [processedContent]);

  // Cancel reorder mode (discard all changes)
  const handleCancelReorder = useCallback(() => {
    setReorderState({
      active: false,
      originalOrder: [],
      moves: [],
      pickedUpImageId: null,
    });
  }, []);

  // Save reorder changes to API
  const handleSaveReorder = useCallback(async () => {
    if (!collection || !currentState) return;
    const finalOrder = replayMoves(reorderState.originalOrder, reorderState.moves);
    const changes = buildReorderChangesFromFinalOrder(finalOrder, reorderState.originalOrder);

    if (changes.length === 0) {
      handleCancelReorder();
      return;
    }

    try {
      setOperationLoading(true);
      setError(null);

      // Apply optimistic update
      const optimisticallyUpdatedCollection = applyReorderChangesOptimistically(
        currentState.collection,
        changes
      );
      setCurrentState(prev =>
        prev ? { ...prev, collection: optimisticallyUpdatedCollection } : null
      );

      await executeReorderOperation(collection.id, changes, collection.slug);
      handleCancelReorder();
    } catch (error_) {
      setError(handleApiError(error_, 'Failed to reorder content.'));
      // Re-fetch to restore correct state
      try {
        const response = await getCollectionUpdateMetadata(collection.slug);
        setCurrentState(prev => (prev ? { ...prev, collection: response.collection } : null));
      } catch {
        // Silent fail
      }
    } finally {
      setOperationLoading(false);
    }
  }, [collection, currentState, reorderState, handleCancelReorder]);

  // Arrow move handler
  const handleArrowMove = useCallback(
    (contentId: number, direction: -1 | 1) => {
      const currentOrder = replayMoves(reorderState.originalOrder, reorderState.moves);
      const result = applyArrowMove(currentOrder, contentId, direction);
      if (!result) return;
      setReorderState(prev => ({
        ...prev,
        moves: [...prev.moves, result.move],
        pickedUpImageId: null,
      }));
    },
    [reorderState.originalOrder, reorderState.moves]
  );

  // Pick up handler
  const handlePickUp = useCallback((contentId: number) => {
    setReorderState(prev => ({
      ...prev,
      pickedUpImageId: prev.pickedUpImageId === contentId ? null : contentId,
    }));
  }, []);

  // Place handler (click on target while another image is picked up)
  const handlePlace = useCallback(
    (targetId: number) => {
      if (!reorderState.pickedUpImageId || reorderState.pickedUpImageId === targetId) return;
      const currentOrder = replayMoves(reorderState.originalOrder, reorderState.moves);
      const result = applyPickAndPlace(currentOrder, reorderState.pickedUpImageId, targetId);
      if (!result) return;
      setReorderState(prev => ({
        ...prev,
        moves: [...prev.moves, result.move],
        pickedUpImageId: null,
      }));
    },
    [reorderState.pickedUpImageId, reorderState.originalOrder, reorderState.moves]
  );

  // Cancel a single image's moves
  const handleCancelImageMove = useCallback((contentId: number) => {
    setReorderState(prev => ({
      ...prev,
      moves: cancelImageMoves(prev.moves, contentId),
      pickedUpImageId: null,
    }));
  }, []);

  const renderToolbarActions = () => {
    const divider = <span className={styles.toolbarDivider} />;

    if (reorderState.active) {
      return (
        <>
          {reorderState.moves.length > 0 && (
            <>
              <button
                type="button"
                onClick={handleSaveReorder}
                className={styles.toolbarButton}
                disabled={isLoading}
              >
                Save Order
              </button>
              {divider}
            </>
          )}
          <button type="button" onClick={handleCancelReorder} className={styles.toolbarButton}>
            Cancel
          </button>
        </>
      );
    }

    if (isMultiSelectMode) {
      return (
        <>
          <button
            type="button"
            onClick={() => {
              setSelectedImageIds([]);
              setIsMultiSelectMode(false);
            }}
            className={styles.toolbarButton}
          >
            Cancel
          </button>
          {divider}
          <button
            type="button"
            onClick={() => {
              const allImageIds =
                collection?.content?.filter(isContentImage).map(img => img.id) || [];
              setSelectedImageIds(allImageIds);
            }}
            className={styles.toolbarButton}
          >
            Select All
          </button>
          {divider}
          <button
            type="button"
            onClick={handleBulkEdit}
            className={styles.toolbarButton}
            disabled={selectedImageIds.length === 0}
          >
            Edit {selectedImageIds.length} Image
            {selectedImageIds.length !== 1 ? 's' : ''}
          </button>
        </>
      );
    }

    return (
      <>
        <button
          type="button"
          onClick={() => setIsMultiSelectMode(true)}
          className={styles.toolbarButton}
        >
          Select Multiple
        </button>
        {collection?.displayMode !== 'CHRONOLOGICAL' && (
          <>
            {divider}
            <button
              type="button"
              onClick={handleEnterReorderMode}
              className={styles.toolbarButton}
            >
              Reorder
            </button>
          </>
        )}
      </>
    );
  };

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
              <div className={styles.updateAndToolbarWrapper}>
              <div className={styles.updateContainer}>
                <form onSubmit={handleUpdate}>
                  <div className={styles.updateFormLayout}>
                    {/* LEFT SECTION */}
                    <div className={styles.leftSection}>
                      <div className={styles.headingRow}>
                        <h2
                          className={styles.updateHeading}
                          onClick={() => router.push(`/${collection.slug}`)}
                        >
                          {collection.title}
                        </h2>
                        <label className={styles.headingCheckboxLabel}>
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

                      {displayError && <div className={styles.errorMessage}>{displayError}</div>}

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

                      {/* Display Mode / Row Length */}
                      <div className={styles.formGridHalf}>
                        <div>
                          <label className={styles.formLabel}>Display</label>
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
                            <option value="ORDERED">Default</option>
                            <option value="CHRONOLOGICAL">Chronological</option>
                            <option value="FIXED">Fixed</option>
                          </select>
                        </div>

                        <div>
                          <label className={styles.formLabel}>
                            Row Length
                            <span className={styles.formLabelHint}> (Default: 4)</span>
                          </label>
                          <div className={styles.numberStepperWrapper}>
                            <button
                              type="button"
                              onClick={() =>
                                setUpdateData(prev => ({
                                  ...prev,
                                  rowsWide: Math.max(1, (prev.rowsWide ?? 4) - 1),
                                }))
                              }
                              className={styles.stepperButton}
                              disabled={(updateData.rowsWide ?? 4) <= 1}
                            >
                              ←
                            </button>
                            <input
                              type="number"
                              min="1"
                              max="6"
                              value={updateData.rowsWide ?? ''}
                              placeholder="4"
                              onChange={e => {
                                const value =
                                  e.target.value === '' ? undefined : Number.parseInt(e.target.value);
                                if (value === undefined || (value >= 1 && value <= 6)) {
                                  setUpdateData(prev => ({ ...prev, rowsWide: value }));
                                }
                              }}
                              className={styles.numberInput}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setUpdateData(prev => ({
                                  ...prev,
                                  rowsWide: Math.min(6, (prev.rowsWide ?? 4) + 1),
                                }))
                              }
                              className={styles.stepperButton}
                              disabled={(updateData.rowsWide ?? 4) >= 6}
                            >
                              →
                            </button>
                          </div>
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
                    </div>

                    {/* RIGHT SECTION */}
                    <div className={styles.rightSection}>
                      <CollectionListSelector
                        allCollections={currentState?.collections || []}
                        savedCollectionIds={originalCollectionIds}
                        pendingAddIds={pendingAddIds}
                        pendingRemoveIds={pendingRemoveIds}
                        onToggle={handleCollectionToggle}
                        onNavigate={col => {
                          if (col.slug) {
                            router.push(`/collection/manage/${col.slug}`);
                          } else {
                            console.error('Cannot navigate to collection: missing slug', col);
                            setError(`Cannot navigate to collection "${col.name}": missing slug`);
                          }
                        }}
                        onAddNewChild={handleAddNewChild}
                        label="Child Collections"
                        excludeCollectionId={collection.id}
                      />
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
                  </div>
                </form>
              </div>

              {/* Content Toolbar — inside wrapper so margin groups them */}
              {displayContent && displayContent.length > 0 && (
                <div className={styles.contentToolbar}>
                  <span className={styles.toolbarItemCount}>{displayContent.length}</span>
                  <span className={styles.toolbarDivider} />

                  <div className={styles.toolbarActions}>{renderToolbarActions()}</div>

                  {(isSelectingCoverImage ||
                    (isMultiSelectMode && selectedImageIds.length > 0) ||
                    reorderState.active) && (
                    <span className={styles.toolbarStatus}>
                      {isSelectingCoverImage && 'Click any image to set as cover'}
                      {isMultiSelectMode &&
                        selectedImageIds.length > 0 &&
                        `${selectedImageIds.length} image${selectedImageIds.length !== 1 ? 's' : ''} selected`}
                      {reorderState.active && 'Reorder mode \u2014 use arrows or pick and place'}
                    </span>
                  )}
                </div>
              )}
              </div>{/* close updateAndToolbarWrapper */}

              {/* Image Grid — outside wrapper */}
              {displayContent && displayContent.length > 0 && (
                <ContentBlockWithFullScreen
                  content={displayContent}
                  priorityBlockIndex={0}
                  enableFullScreenView={false}
                  isSelectingCoverImage={isSelectingCoverImage}
                  currentCoverImageId={collection.coverImage?.id}
                  onImageClick={reorderState.active ? undefined : handleImageClick}
                  justClickedImageId={justClickedImageId}
                  selectedImageIds={isMultiSelectMode ? selectedImageIds : []}
                  currentCollectionId={collection.id}
                  collectionSlug={collection.slug}
                  collectionData={collection}
                  isReorderMode={reorderState.active}
                  reorderMoves={reorderState.moves}
                  pickedUpImageId={reorderState.pickedUpImageId}
                  reorderDisplayOrder={reorderDisplayOrder}
                  onArrowMove={handleArrowMove}
                  onPickUp={handlePickUp}
                  onPlace={handlePlace}
                  onCancelImageMove={handleCancelImageMove}
                />
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
          onDeleteSuccess={handleDeleteSuccess}
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
