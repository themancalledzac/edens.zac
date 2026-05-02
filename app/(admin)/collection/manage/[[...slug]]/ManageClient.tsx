'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  type ChangeEvent,
  type SubmitEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

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
  getMetadata,
  saveGalleryAccess,
  updateCollection,
} from '@/app/lib/api/collections';
import { createImages, createTextContent, updateImages } from '@/app/lib/api/content';
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
import {
  type ContentImageModel,
  type ContentImageUpdateRequest,
  type ContentImageUpdateResponse,
} from '@/app/types/Content';
import { handleApiError } from '@/app/utils/apiUtils';
import { processContentBlocks } from '@/app/utils/contentLayout';
import { isContentCollection, isContentImage, isParentType } from '@/app/utils/contentTypeGuards';
import { convertLocationsToModels, createLocationsUpdate } from '@/app/utils/locationUtils';

import styles from './ManageClient.module.scss';
import {
  buildUpdatePayload,
  getDisplayedCoverImage,
  handleMultiSelectToggle as handleMultiSelectToggleUtil,
  mergeNewMetadata,
  refreshCollectionAfterOperation,
  revalidateCollectionCache,
  revalidateMetadataCache,
} from './manageUtils';
import { useContentReordering } from './useContentReordering';
import { useCoverImageSelection } from './useCoverImageSelection';
import { useImageClickHandler } from './useImageClickHandler';

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

  const [error, setError] = useState<string | null>(null);
  const displayError = error || loadError;

  const isLoading = loading || operationLoading;

  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedImageIds, setSelectedImageIds] = useState<number[]>([]);
  const [isTextBlockModalOpen, setIsTextBlockModalOpen] = useState(false);

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

  /**
   * Wraps `baseCloseEditor` to clear `selectedImageIds` when closing in single-edit mode.
   */
  const closeEditor = useCallback(() => {
    if (!isMultiSelectMode) {
      setSelectedImageIds([]);
    }
    baseCloseEditor();
  }, [isMultiSelectMode, baseCloseEditor]);

  useEffect(() => {
    if (!editingImage && !isMultiSelectMode) {
      setSelectedImageIds([]);
    }
  }, [editingImage, isMultiSelectMode]);

  const isCreateMode = !slug;
  const collection = currentState?.collection ?? null;

  // All collections in the system, used for the image metadata editor's collection selector
  const [allCollections, setAllCollections] = useState<CollectionListModel[]>([]);

  useEffect(() => {
    getMetadata().then(meta => {
      if (meta !== null) setAllCollections(meta.collections);
    });
  }, []);

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

  // Gallery Access — local state for the CLIENT_GALLERY password section.
  // Lives outside `updateData` because the workflow is a separate atomic
  // action (set + email in one POST), not part of the metadata save.
  const [galleryPassword, setGalleryPasswordInput] = useState('');
  const [galleryEmail, setGalleryEmail] = useState('');
  const [galleryStatus, setGalleryStatus] = useState<string | null>(null);
  const [gallerySaving, setGallerySaving] = useState(false);

  // Sync gallery fields from the loaded collection (and reset status).
  useEffect(() => {
    setGalleryPasswordInput(collection?.galleryPassword ?? '');
    setGalleryEmail(collection?.recipientEmails?.join(', ') ?? '');
    setGalleryStatus(null);
  }, [collection?.id, collection?.galleryPassword, collection?.recipientEmails]);

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

  const {
    isSelectingCoverImage,
    setIsSelectingCoverImage,
    justClickedImageId,
    handleCoverImageClick,
  } = useCoverImageSelection({
    collection,
    childCollectionImages: currentState?.childCollectionImages,
    setCurrentState,
    setOperationLoading,
    setError,
  });

  const {
    reorderState,
    reorderDisplayOrder,
    displayContent,
    handleEnterReorderMode,
    handleCancelReorder,
    handleSaveReorder,
    handleArrowMove,
    handlePickUp,
    handlePlace,
    handleCancelImageMove,
  } = useContentReordering({
    collection,
    currentState,
    processedContent,
    setCurrentState,
    setOperationLoading,
    setError,
    onExitMultiSelect: useCallback(() => {
      setIsMultiSelectMode(false);
      setSelectedImageIds([]);
    }, []),
  });

  const imagesToEdit = useMemo(
    () =>
      (collection?.content?.filter(
        contentItem => isContentImage(contentItem) && selectedImageIds.includes(contentItem.id)
      ) as ContentImageModel[]) || [],
    [selectedImageIds, collection?.content]
  );

  const isParent = isParentType(updateData.type);

  const displayedCoverImage = useMemo(
    () =>
      getDisplayedCoverImage(
        collection,
        updateData.coverImageId,
        currentState?.childCollectionImages
      ),
    [collection, updateData.coverImageId, currentState?.childCollectionImages]
  );

  const handleImageLoadError = useCallback((contentId: number) => {
    console.warn(`[ManageClient] Image failed to load: contentId=${contentId}`);
  }, []);

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

      setCurrentState(prev => ({
        ...prev!,
        collection: response.collection,
      }));

      setIsTextBlockModalOpen(false);
    } catch (error) {
      setError(handleApiError(error, 'Failed to create text block'));
      throw error; // Re-throw so modal can handle it
    } finally {
      setOperationLoading(false);
    }
  };

  /**
   * Handle create form submission
   */
  const handleCreate = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!createData.title.trim()) {
      setError('Title is required');
      return;
    }

    try {
      setOperationLoading(true);
      setError(null);

      const response = await createCollection(createData);

      if (response !== null) {
        setCurrentState(response);
        await revalidateCollectionCache(response.collection.slug);
        router.replace(`/collection/manage/${response.collection.slug}`);
      }
    } catch (error: unknown) {
      setError(handleApiError(error, 'Failed to create collection'));
    } finally {
      setOperationLoading(false);
    }
  };

  /**
   * Handle update form submission
   */
  const handleUpdate = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!collection || !currentState) return;

    try {
      setSaving(true);
      setError(null);

      const payload = buildUpdatePayload(updateData, collection);
      const response = await updateCollection(collection.id, payload);

      if (response !== null) {
        setCurrentState(response);
        collectionStorage.update(response.collection.slug, response.collection);
        collectionStorage.updateFull(response.collection.slug, response);
        void revalidateCollectionCache(response.collection.slug);

        if (response.collection.slug !== collection.slug) {
          router.replace(`/collection/manage/${response.collection.slug}`);
        }

        // Location inheritance: if locations were just set (not all removed),
        // apply them to all images in this collection that have no locations
        const locationsUpdate = payload.locations;
        if (
          locationsUpdate &&
          !locationsUpdate.remove?.length &&
          (locationsUpdate.prev?.length || locationsUpdate.newValue?.length)
        ) {
          const resolvedLocations = response.collection.locations ?? [];
          if (resolvedLocations.length > 0) {
            const imagesWithoutLocation = (collection.content ?? []).filter(
              (item): item is ContentImageModel =>
                item.contentType === 'IMAGE' && (!item.locations || item.locations.length === 0)
            );

            if (imagesWithoutLocation.length > 0) {
              const imageUpdates: ContentImageUpdateRequest[] = imagesWithoutLocation.map(img => ({
                id: img.id,
                locations: { prev: resolvedLocations.map(l => l.id) },
              }));
              updateImages(imageUpdates)
                .then(async () => {
                  const refreshed = await getCollectionUpdateMetadata(response.collection.slug);
                  if (refreshed) {
                    setCurrentState(refreshed);
                    collectionStorage.update(refreshed.collection.slug, refreshed.collection);
                    collectionStorage.updateFull(refreshed.collection.slug, refreshed);
                  }
                })
                .catch(error_ => {
                  console.error('Failed to inherit locations to images:', error_);
                  setError('Collection saved, but failed to inherit locations to images.');
                });
            }
          }
        }
      }

      setUpdateData(prev => ({ ...prev, coverImageId: undefined }));
    } catch (error) {
      setError(handleApiError(error, 'Failed to update collection'));
    } finally {
      setSaving(false);
    }
  };

  /**
   * Save gallery access. If a recipient email is provided, sets the password
   * and emails it; otherwise stores the password only.
   */
  const handleSaveAccess = useCallback(async () => {
    if (!collection) return;
    if (galleryPassword.length < 4) {
      setGalleryStatus('Password must be at least 4 characters.');
      return;
    }
    setGallerySaving(true);
    setGalleryStatus(null);
    try {
      const emails = galleryEmail.trim()
        ? galleryEmail
            .split(',')
            .map(e => e.trim())
            .filter(Boolean)
        : undefined;
      const result = await saveGalleryAccess(collection.id, { password: galleryPassword, emails });
      if (emails) {
        setGalleryStatus(
          result.emailsSent
            ? `Password saved and sent to ${result.emails.join(', ')}.`
            : `Password saved, email not sent${result.reason ? ` (${result.reason})` : ''}.`
        );
      } else {
        setGalleryStatus('Password saved. No email sent.');
      }
      setGalleryPasswordInput(result.password ?? '');
      setGalleryEmail(result.emails.join(', '));
    } catch (error) {
      setGalleryStatus(handleApiError(error, 'Failed to save access settings.'));
    } finally {
      setGallerySaving(false);
    }
  }, [collection, galleryPassword, galleryEmail]);

  /**
   * "Clear Password" — sends null to the backend, which nulls out the
   * password hash. Gallery becomes unprotected.
   */
  const handleClearPassword = useCallback(async () => {
    if (!collection) return;
    setGallerySaving(true);
    setGalleryStatus(null);
    try {
      const result = await saveGalleryAccess(collection.id, { password: null });
      setGalleryStatus('Password cleared. Gallery is now unprotected.');
      setGalleryPasswordInput(result.password ?? '');
      setGalleryEmail(result.emails.join(', '));
    } catch (error) {
      setGalleryStatus(handleApiError(error, 'Failed to clear password.'));
    } finally {
      setGallerySaving(false);
    }
  }, [collection]);

  /**
   * Handle image upload
   */
  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!collection || !event.target.files || event.target.files.length === 0) return;

    try {
      setOperationLoading(true);
      setError(null);

      const files = Array.from(event.target.files);

      const formData = new FormData();
      for (const file of files) {
        formData.append('files', file); // Backend expects 'files' field
      }

      const response = await refreshCollectionAfterOperation(
        collection.slug,
        async () => {
          await createImages(collection.id, formData);
        },
        getCollectionUpdateMetadata,
        collectionStorage
      );

      setCurrentState(prev => ({
        ...prev!,
        collection: response.collection,
      }));

      event.target.value = '';
    } catch (error) {
      setError(handleApiError(error, 'Failed to upload images'));
    } finally {
      setOperationLoading(false);
    }
  };

  /**
   * Handle multi-select toggle
   */
  const handleMultiSelectToggle = useCallback((imageId: number) => {
    setSelectedImageIds(prev => handleMultiSelectToggleUtil(imageId, prev));
  }, []);

  /**
   * Handle bulk edit - open modal with selected images
   */
  const handleBulkEdit = useCallback(() => {
    if (selectedImageIds.length === 0 || !collection?.content) return;

    const selectedImages = collection.content.filter(
      block => isContentImage(block) && selectedImageIds.includes(block.id)
    ) as ContentImageModel[];

    const firstImage = selectedImages[0];
    if (firstImage) {
      openEditor(firstImage);
    }
  }, [selectedImageIds, collection, openEditor]);

  const { handleImageClick } = useImageClickHandler({
    isSelectingCoverImage,
    isMultiSelectMode,
    handleCoverImageClick,
    handleMultiSelectToggle,
    collection,
    processedContent,
    openEditor,
    setSelectedImageIds,
    setIsMultiSelectMode,
  });

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

        if (response.updatedImages && response.updatedImages.length > 0) {
          collectionStorage.updateImagesInCache(slug, response.updatedImages);
        }

        const fullResponse = await getCollectionUpdateMetadata(slug);
        if (fullResponse !== null) {
          collectionStorage.update(slug, fullResponse.collection);
          collectionStorage.updateFull(slug, fullResponse);
          await revalidateCollectionCache(slug);
          void revalidateMetadataCache();

          // Merge metadata into the fresh response using functional updater to avoid stale closure
          setCurrentState(prev => {
            const base = fullResponse;
            const metadataUpdater = mergeNewMetadata(response, prev ?? base);
            return metadataUpdater ? metadataUpdater(base) : base;
          });
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
      if (!currentState?.collection.slug) {
        console.warn(
          'handleDeleteSuccess: currentState or slug unavailable, cannot refresh collection'
        );
        setError('Unable to refresh collection after deletion — please reload the page.');
        return;
      }

      try {
        const slug = currentState.collection.slug;

        const fullResponse = await getCollectionUpdateMetadata(slug);
        if (fullResponse !== null) {
          setCurrentState(fullResponse);
          collectionStorage.update(slug, fullResponse.collection);
          collectionStorage.updateFull(slug, fullResponse);
          await revalidateCollectionCache(slug);
          void revalidateMetadataCache();
        }

        setSelectedImageIds([]);
        setIsMultiSelectMode(false);
      } catch (error) {
        setError(handleApiError(error, 'Failed to refresh collection after deletion'));
      }
    },
    [currentState]
  );

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

  /**
   * Derive current locations from `collection.locations` and `updateData.locations`.
   *
   * Priority: pending `updateData.locations` overrides the saved collection locations.
   */
  const currentLocations: LocationModel[] = useMemo(() => {
    const availableLocations = currentState?.locations || [];

    const locationsUpdate = updateData.locations;
    if (locationsUpdate) {
      const result: LocationModel[] = [];
      // Resolve prev IDs to models
      for (const id of locationsUpdate.prev ?? []) {
        const found = availableLocations.find(loc => loc.id === id);
        if (found) result.push(found);
      }
      // Add new locations (not yet created)
      for (const name of locationsUpdate.newValue ?? []) {
        result.push({ id: 0, name, slug: '' });
      }
      return result;
    }

    return convertLocationsToModels(collection?.locations, availableLocations);
  }, [collection?.locations, currentState?.locations, updateData.locations]);

  /**
   * Handle locations selection changes (multi-select)
   */
  const handleLocationsChange = useCallback((value: LocationModel | LocationModel[] | null) => {
    const locations = Array.isArray(value) ? value : (value ? [value] : []);
    const locationsUpdate = createLocationsUpdate(locations);

    setUpdateData(prev => ({
      ...prev,
      locations: locationsUpdate,
    }));
  }, []);

  /**
   * Handle collection toggle from CollectionListSelector
   */
  const handleCollectionToggle = useCallback(
    (toggledCollection: CollectionListModel) => {
      setUpdateData(prev => {
        const currentRemove = new Set(prev.collections?.remove || []);
        const currentNewValue = prev.collections?.newValue || [];
        const isSaved = originalCollectionIds.has(toggledCollection.id);

        let newRemove: number[];
        if (!isSaved) {
          newRemove = [...currentRemove];
        } else if (currentRemove.has(toggledCollection.id)) {
          newRemove = [...currentRemove].filter(id => id !== toggledCollection.id);
        } else {
          newRemove = [...currentRemove, toggledCollection.id];
        }

        let newNewValue: typeof currentNewValue;
        if (isSaved) {
          newNewValue = [...currentNewValue];
        } else if (currentNewValue.some(c => c.collectionId === toggledCollection.id)) {
          newNewValue = currentNewValue.filter(c => c.collectionId !== toggledCollection.id);
        } else {
          newNewValue = [
            ...currentNewValue,
            {
              collectionId: toggledCollection.id,
              name: toggledCollection.name,
              visible: true,
              orderIndex: currentNewValue.length,
            },
          ];
        }

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

  /**
   * Handle adding new child collection
   */
  const handleAddNewChild = useCallback(async () => {
    if (!collection) {
      console.warn('handleAddNewChild: collection unavailable, cannot create child');
      setError('Collection data unavailable — please reload the page.');
      return;
    }

    try {
      setOperationLoading(true);
      setError(null);

      const response = await createChildCollection(collection.id, {
        type: CollectionType.PORTFOLIO,
        title: 'New Child Collection',
      });

      await revalidateCollectionCache(collection.slug);

      if (response !== null) {
        router.push(`/collection/manage/${response.collection.slug}`);
      }
    } catch (error) {
      setError(handleApiError(error, 'Failed to create child collection'));
    } finally {
      setOperationLoading(false);
    }
  }, [collection, router]);

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
            <button type="button" onClick={handleEnterReorderMode} className={styles.toolbarButton}>
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
                    <option value={CollectionType.PARENT}>Parent</option>
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
                          <button
                            type="submit"
                            disabled={saving || isLoading}
                            className={styles.headingSubmitButton}
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

                        {displayError && <div className={styles.errorMessage}>{displayError}</div>}

                        {/* Title + Visible */}
                        <div className={styles.titleRow}>
                          <div className={styles.titleInputWrapper}>
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
                          <div className={styles.visibleCheckboxWrapper}>
                            <label className={styles.formLabel}>Visible</label>
                            <label className={styles.visibleCheckboxLabel}>
                              <input
                                type="checkbox"
                                checked={updateData.visible}
                                onChange={e =>
                                  setUpdateData(prev => ({ ...prev, visible: e.target.checked }))
                                }
                              />
                              <span>{updateData.visible ? 'Yes' : 'No'}</span>
                            </label>
                          </div>
                        </div>

                        {/* Collection Date / Collection Type */}
                        <div className={styles.formGridHalf}>
                          <div>
                            <label className={styles.formLabel}>Collection Date</label>
                            <div className={styles.dateInputWrapper}>
                              <input
                                type="date"
                                value={updateData.collectionDate ?? ''}
                                onChange={e =>
                                  setUpdateData(prev => ({
                                    ...prev,
                                    collectionDate: e.target.value,
                                  }))
                                }
                                className={styles.formInput}
                              />
                              {updateData.collectionDate && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setUpdateData(prev => ({ ...prev, collectionDate: null }))
                                  }
                                  className={styles.dateClearButton}
                                  aria-label="Clear date"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
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

                        {/* Locations */}
                        <UnifiedMetadataSelector<LocationModel>
                          label="Locations"
                          multiSelect
                          options={currentState?.locations || []}
                          selectedValues={currentLocations}
                          onChange={handleLocationsChange}
                          allowAddNew
                          onAddNew={data => {
                            const newLoc: LocationModel = {
                              id: 0,
                              name: data.name as string,
                              slug: '',
                            };
                            handleLocationsChange([...currentLocations, newLoc]);
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
                          emptyText="No locations set"
                        />

                        {/* Display Mode / Row Length — hidden for parent-type collections */}
                        {!isParent && (
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
                                  aria-label="Decrease rows wide"
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
                                      e.target.value === ''
                                        ? undefined
                                        : Number.parseInt(e.target.value);
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
                                  aria-label="Increase rows wide"
                                >
                                  →
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

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

                        {/* Gallery Access — only meaningful for CLIENT_GALLERY */}
                        {updateData.type === CollectionType.CLIENT_GALLERY && (
                          <section
                            aria-labelledby="gallery-access-heading"
                            className={styles.formGroup}
                          >
                            <h3
                              id="gallery-access-heading"
                              className={styles.formLabel}
                              style={{ marginBottom: '8px' }}
                            >
                              Gallery Access
                            </h3>
                            <p
                              className={styles.formLabelHint}
                              style={{ marginTop: 0, marginBottom: '12px' }}
                            >
                              {collection.isPasswordProtected
                                ? 'Password is set. Saving a new password replaces the existing one.'
                                : 'No password set. This gallery is currently unprotected.'}
                            </p>
                            <div className={styles.formGridHalf}>
                              <div>
                                <label
                                  htmlFor="gallery-password-input"
                                  className={styles.formLabel}
                                >
                                  Password
                                </label>
                                {/* Backend stores plaintext (admin-only field) so the photographer can see and re-share the current password. */}
                                <input
                                  id="gallery-password-input"
                                  type="text"
                                  minLength={4}
                                  value={galleryPassword}
                                  onChange={e => setGalleryPasswordInput(e.target.value)}
                                  className={styles.formInput}
                                  placeholder="At least 4 characters"
                                  disabled={gallerySaving}
                                  autoComplete="off"
                                />
                              </div>
                              <div>
                                <label htmlFor="gallery-email-input" className={styles.formLabel}>
                                  Recipient email
                                </label>
                                {/* TODO: pre-populate with collection.recipientEmail when backend returns it */}
                                <input
                                  id="gallery-email-input"
                                  type="email"
                                  multiple
                                  value={galleryEmail}
                                  onChange={e => setGalleryEmail(e.target.value)}
                                  className={styles.formInput}
                                  placeholder="client@example.com, other@example.com"
                                  disabled={gallerySaving}
                                  autoComplete="off"
                                />
                              </div>
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '8px',
                                marginTop: '12px',
                              }}
                            >
                              <button
                                type="button"
                                onClick={handleSaveAccess}
                                disabled={gallerySaving || galleryPassword.length === 0}
                                className={styles.submitButton}
                              >
                                {gallerySaving ? 'Saving…' : 'Save'}
                              </button>
                              {collection.isPasswordProtected && (
                                <button
                                  type="button"
                                  onClick={handleClearPassword}
                                  disabled={gallerySaving}
                                  className={styles.submitButton}
                                >
                                  Clear Password
                                </button>
                              )}
                            </div>
                            {galleryStatus && (
                              <p
                                role="status"
                                style={{ marginTop: '12px' }}
                                className={styles.formLabelHint}
                              >
                                {galleryStatus}
                              </p>
                            )}
                          </section>
                        )}

                        {/* Cover Image + media row (non-parent: side by side; parent: stacked) */}
                        <div className={!isParent ? styles.coverAndMediaRow : undefined}>
                          <div className={styles.coverImageSection}>
                            <label className={styles.formLabel}>Cover Image</label>
                            {displayedCoverImage && isContentImage(displayedCoverImage) ? (
                              <div className={styles.coverImageWrapper}>
                                <Image
                                  src={displayedCoverImage.imageUrl}
                                  alt="Cover"
                                  width={400}
                                  height={300}
                                />
                              </div>
                            ) : (
                              <div className={styles.noCoverImage}>No cover image</div>
                            )}
                            <button
                              type="button"
                              onClick={() => setIsSelectingCoverImage(!isSelectingCoverImage)}
                              className={`${styles.coverImageButton} ${isSelectingCoverImage ? styles.selecting : ''}`}
                            >
                              {isSelectingCoverImage ? 'Cancel' : 'Select'}
                            </button>
                          </div>

                          {/* Picker grid — parent only */}
                          {isParent && isSelectingCoverImage && (
                            <div className={styles.coverImagePickerGrid}>
                              {currentState?.childCollectionImages &&
                              currentState.childCollectionImages.length > 0 ? (
                                currentState.childCollectionImages.map(img => (
                                  <div
                                    key={img.id}
                                    className={styles.coverImagePickerItem}
                                    onClick={() => handleCoverImageClick(img.id)}
                                  >
                                    <Image
                                      src={img.imageUrl}
                                      alt={img.title || ''}
                                      width={120}
                                      height={90}
                                    />
                                  </div>
                                ))
                              ) : (
                                <div className={styles.noCoverImage}>
                                  Add child collections with images to select a cover image.
                                </div>
                              )}
                            </div>
                          )}

                          {/* Upload Images + Add Text Block — non-parent only */}
                          {!isParent && (
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
                                {isLoading && (
                                  <div className={styles.uploadingText}>Uploading...</div>
                                )}
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
                          )}
                        </div>
                      </div>

                      {/* RIGHT SECTION */}
                      <div className={styles.rightSection}>
                        <CollectionListSelector
                          allCollections={allCollections}
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
                          label="Collections"
                          excludeCollectionId={collection.id}
                        />
                      </div>
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
                {/* Image Grid — inside wrapper so toolbar can stick over it */}
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
                    onImageLoadError={handleImageLoadError}
                  />
                )}
              </div>
              {/* close updateAndToolbarWrapper */}
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
          availableCollections={allCollections}
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
