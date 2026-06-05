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
import RatingStars from '@/app/components/RatingStars/RatingStars';
import SiteHeader from '@/app/components/SiteHeader/SiteHeader';
import TextBlockCreateModal from '@/app/components/TextBlockCreateModal/TextBlockCreateModal';
import { Button } from '@/app/components/ui/Button/Button';
import Dropdown from '@/app/components/ui/Dropdown/Dropdown';
import { SegmentedControl } from '@/app/components/ui/SegmentedControl/SegmentedControl';
import TagsSelector from '@/app/components/ui/TagsSelector/TagsSelector';
import { useCollectionData } from '@/app/hooks/useCollectionData';
import { useImageMetadataEditor } from '@/app/hooks/useImageMetadataEditor';
import {
  createChildCollection,
  createCollection,
  getCollectionUpdateMetadata,
  getMetadata,
  regenerateCollectionPeople,
  saveGalleryAccess,
  setCollectionPeople,
  updateCollection,
  updateCollectionRating,
} from '@/app/lib/api/collections';
import { createGif, createImages, createTextContent, updateImages } from '@/app/lib/api/content';
import { collectionStorage } from '@/app/lib/storage/collectionStorage';
import {
  type CollectionCreateRequest,
  type CollectionListModel,
  CollectionType,
  type CollectionUpdateRequest,
  type CollectionUpdateResponseDTO,
  type ContentPersonModel,
  type ContentTagModel,
  type DisplayMode,
  type LocationModel,
} from '@/app/types/Collection';
import {
  COLLECTION_VISIBILITY_DESCRIPTIONS,
  COLLECTION_VISIBILITY_LABELS,
  CollectionVisibility,
} from '@/app/types/CollectionVisibility';
import {
  type ContentGifModel,
  type ContentImageModel,
  type ContentImageUpdateRequest,
  type ContentImageUpdateResponse,
} from '@/app/types/Content';
import { handleApiError } from '@/app/utils/apiUtils';
import { processContentBlocks } from '@/app/utils/contentLayout';
import {
  isContentCollection,
  isContentImage,
  isGifContent,
  isParentType,
} from '@/app/utils/contentTypeGuards';
import { buildLocationsDiff, convertLocationsToModels } from '@/app/utils/locationUtils';
import { buildTagsDiff, convertTagsToModels } from '@/app/utils/tagUtils';

import styles from './ManageClient.module.scss';
import {
  buildUpdatePayload,
  getDisplayedCoverImage,
  handleMultiSelectToggle as handleMultiSelectToggleUtil,
  mergeNewMetadata,
  refreshCollectionAfterOperation,
  revalidateCollectionCache,
  revalidateMetadataCache,
  toggleRelation,
} from './manageUtils';
import { useCollectionRetype } from './useCollectionRetype';
import { useContentReordering } from './useContentReordering';
import { useCoverImageSelection } from './useCoverImageSelection';
import { useImageClickHandler } from './useImageClickHandler';

interface ManageClientProps {
  slug?: string; // Collection slug for UPDATE mode, undefined for CREATE mode
}

const ANIMATED_MEDIA_MIME_TYPES = new Set(['image/gif', 'video/mp4', 'video/quicktime']);
const ANIMATED_MEDIA_EXTENSION_REGEX = /\.(gif|mp4|mov)$/i;

function isAnimatedMediaFile(file: File): boolean {
  return ANIMATED_MEDIA_MIME_TYPES.has(file.type) || ANIMATED_MEDIA_EXTENSION_REGEX.test(file.name);
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

  const { editingContent, openEditor, closeEditor: baseCloseEditor } = useImageMetadataEditor();

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
    if (!editingContent && !isMultiSelectMode) {
      setSelectedImageIds([]);
    }
  }, [editingContent, isMultiSelectMode]);

  const isCreateMode = !slug;
  const collection = currentState?.collection ?? null;

  // All collections in the system, used for the image metadata editor's collection selector
  const [allCollections, setAllCollections] = useState<CollectionListModel[]>([]);

  useEffect(() => {
    getMetadata().then(meta => {
      if (meta !== null) setAllCollections(meta.collections);
    });
  }, []);

  // Drag-and-drop retype: drop a collection on a different type header to reassign
  // its type. Optimistically re-buckets it in the selector accordion; reverts on failure.
  const { handleChangeType } = useCollectionRetype({ setAllCollections, setError });

  const [updateData, setUpdateData] = useState<CollectionUpdateRequest>(() => {
    if (collection) {
      return {
        id: collection.id,
        type: collection.type || CollectionType.PORTFOLIO,
        title: collection.title || '',
        description: collection.description || '',
        collectionDate: collection.collectionDate || '',
        visibility: collection.visibility ?? CollectionVisibility.HIDDEN,
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
      visibility: CollectionVisibility.HIDDEN,
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
        visibility: collection.visibility ?? CollectionVisibility.HIDDEN,
        displayMode: collection.displayMode || 'CHRONOLOGICAL',
        rowsWide: collection.rowsWide ?? undefined,
      });
    }
  }, [collection]);

  // People — collection-level people list, edited inline. Saved/regenerated via
  // their own admin endpoints (separate from the metadata Update Metadata flow)
  // because the backend reconciles to an exact set of person IDs.
  const [collectionPeople, setCollectionPeopleState] = useState<ContentPersonModel[]>([]);
  const [peopleSaving, setPeopleSaving] = useState(false);
  const [peopleStatus, setPeopleStatus] = useState<string | null>(null);

  // Sync people from the loaded collection (and reset status when it changes).
  useEffect(() => {
    setCollectionPeopleState(collection?.people ?? []);
    setPeopleStatus(null);
  }, [collection?.id, collection?.people]);

  /**
   * Save the current people list. Sends only existing person IDs; new people
   * created inline via the picker (id === 0) are skipped because the backend
   * endpoint reconciles by ID — creation must happen elsewhere first.
   */
  const handleSavePeople = useCallback(async () => {
    if (!collection) return;
    setPeopleSaving(true);
    setPeopleStatus(null);
    try {
      const personIds = collectionPeople.filter(p => p.id > 0).map(p => p.id);
      await setCollectionPeople(collection.id, personIds);
      setPeopleStatus('People saved.');
    } catch (error) {
      setPeopleStatus(handleApiError(error, 'Failed to save people.'));
    } finally {
      setPeopleSaving(false);
    }
  }, [collection, collectionPeople]);

  /**
   * Regenerate the collection's people list from the union of all contained
   * images' people. Confirms first because it overwrites the current list.
   * Reloads the page on success so the refreshed list re-hydrates from the
   * server (simpler than re-fetching just the metadata payload).
   */
  const handleRegeneratePeople = useCallback(async () => {
    if (!collection) return;
    if (
      !window.confirm(
        "Replace this collection's people list with the union of all contained images' people?"
      )
    )
      return;
    setPeopleSaving(true);
    setPeopleStatus(null);
    try {
      await regenerateCollectionPeople(collection.id);
      setPeopleStatus('People regenerated. Reloading...');
      window.location.reload();
    } catch (error) {
      setPeopleStatus(handleApiError(error, 'Failed to regenerate people.'));
      setPeopleSaving(false);
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

  /**
   * Content blocks the metadata modal should edit. Mixes images and GIFs so the unified modal can
   * dispatch to the right backend endpoint based on the previewed type. Bulk-edit semantics still
   * key off the IMAGE subset — the modal greys out IMAGE-only fields when the previewed block is
   * a GIF.
   */
  const contentToEdit = useMemo(
    () =>
      (collection?.content?.filter(
        contentItem =>
          (isContentImage(contentItem) || isGifContent(contentItem)) &&
          selectedImageIds.includes(contentItem.id)
      ) as (ContentImageModel | ContentGifModel)[]) || [],
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

  // Images offered in the inline cover picker. Parent collections pick from their child
  // collections' images; every other type picks from its own image content. Same affordance
  // either way (replaces the old "enter select mode then click the grid below" flow).
  const coverPickerImages: ContentImageModel[] = useMemo(
    () =>
      isParent
        ? (currentState?.childCollectionImages ?? [])
        : (collection?.content?.filter(isContentImage) ?? []),
    [isParent, currentState?.childCollectionImages, collection?.content]
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
      // PARENT collections can share their password with every child client
      // gallery in one shot. Confirm with the user (default Yes) before flipping
      // the propagate flag — clearing a password never propagates.
      const isParent = collection.type === CollectionType.PARENT;
      const propagateToChildren = isParent
        ? window.confirm(
            'Share this password with all child client galleries? They will use the same password and one unlock will cover all of them.'
          )
        : false;
      const result = await saveGalleryAccess(collection.id, {
        password: galleryPassword,
        emails,
        propagateToChildren,
      });
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
   * Handle media upload. Partitions the selected files by type:
   *   - gif/mp4/mov → POST /content/{id}/gifs (one request per file)
   *   - everything else → POST /content/images/{id} (single multipart batch)
   *
   * The two pipelines exist because the backend stores animated media as a
   * GIF entity with an ffmpeg-extracted poster frame, while still images
   * run through the EXIF + dedupe pipeline.
   */
  const handleMediaUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!collection || !event.target.files || event.target.files.length === 0) return;

    try {
      setOperationLoading(true);
      setError(null);

      const files = Array.from(event.target.files);
      const animatedFiles = files.filter(isAnimatedMediaFile);
      const imageFiles = files.filter(f => !isAnimatedMediaFile(f));
      const gifFailures: string[] = [];

      const response = await refreshCollectionAfterOperation(
        collection.slug,
        async () => {
          if (imageFiles.length > 0) {
            const formData = new FormData();
            for (const file of imageFiles) {
              formData.append('files', file); // Backend expects 'files' field
            }
            await createImages(collection.id, formData);
          }
          for (const file of animatedFiles) {
            try {
              await createGif(collection.id, file);
            } catch (gifError) {
              gifFailures.push(`${file.name}: ${handleApiError(gifError, 'upload failed')}`);
            }
          }
        },
        getCollectionUpdateMetadata,
        collectionStorage
      );

      setCurrentState(prev => ({
        ...prev!,
        collection: response.collection,
      }));

      if (gifFailures.length > 0) {
        setError(`Some files failed to upload:\n${gifFailures.join('\n')}`);
      }

      event.target.value = '';
    } catch (error) {
      setError(handleApiError(error, 'Failed to upload media'));
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
      return;
    }

    // No images in the selection — fall back to editing the first selected GIF/MP4.
    // The GIF modal is single-content for now; a future phase will add a real bulk flow.
    const selectedGif = collection.content.find(
      (block): block is ContentGifModel =>
        isGifContent(block) && selectedImageIds.includes(block.id)
    );
    const firstGif = selectedGif;
    if (firstGif) {
      openEditor(firstGif);
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
   * Handle successful GIF metadata save — refreshes the collection so the new rating
   * flows into getSlotWidth and the row layout reflows.
   */
  const handleGifSaveSuccess = useCallback(
    async (updated: ContentGifModel) => {
      if (!currentState?.collection.slug) return;
      try {
        const slug = currentState.collection.slug;
        const fullResponse = await getCollectionUpdateMetadata(slug);
        if (fullResponse !== null) {
          setCurrentState(fullResponse);
          collectionStorage.update(slug, fullResponse.collection);
          collectionStorage.updateFull(slug, fullResponse);
          await revalidateCollectionCache(slug);
        }
        setSelectedImageIds([]);
        setIsMultiSelectMode(false);
      } catch (error) {
        setError(handleApiError(error, `Failed to refresh after GIF ${updated.id} update`));
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

  // Saved baseline used to diff selection changes into prev/newValue/**remove**.
  const originalLocations = useMemo(
    () => convertLocationsToModels(collection?.locations, currentState?.locations || []),
    [collection?.locations, currentState?.locations]
  );

  /**
   * Handle locations selection changes (multi-select). Diffs the new selection
   * against the saved baseline so deselecting a location emits `remove` — the
   * backend reconciler only drops what is in `remove`, never what's absent from
   * `prev`.
   */
  const handleLocationsChange = useCallback(
    (value: LocationModel | LocationModel[] | null) => {
      const locations = Array.isArray(value) ? value : (value ? [value] : []);
      setUpdateData(prev => ({
        ...prev,
        locations: buildLocationsDiff(locations, originalLocations),
      }));
    },
    [originalLocations]
  );

  /**
   * Derive current tags from `collection.tags` and `updateData.tags`. Mirrors
   * `currentLocations`.
   *
   * Priority: pending `updateData.tags` overrides the saved collection tags. Saved
   * tags arrive as `string[]` names, so they are resolved against the available tag
   * list to recover IDs.
   */
  const currentTags: ContentTagModel[] = useMemo(() => {
    const availableTags = currentState?.tags || [];

    const tagsUpdate = updateData.tags;
    if (tagsUpdate) {
      const result: ContentTagModel[] = [];
      // Resolve prev IDs to models
      for (const id of tagsUpdate.prev ?? []) {
        const found = availableTags.find(tag => tag.id === id);
        if (found) result.push(found);
      }
      // Add new tags (not yet created)
      for (const name of tagsUpdate.newValue ?? []) {
        result.push({ id: 0, name, slug: '' });
      }
      return result;
    }

    return convertTagsToModels(collection?.tags, availableTags);
  }, [collection?.tags, currentState?.tags, updateData.tags]);

  // Saved baseline used to diff tag changes into prev/newValue/**remove**.
  const originalTags = useMemo(
    () => convertTagsToModels(collection?.tags, currentState?.tags || []),
    [collection?.tags, currentState?.tags]
  );

  /**
   * Handle tags selection changes (multi-select). Mirrors `handleLocationsChange`:
   * diffs against the saved baseline so deselecting/clearing tags emits `remove`
   * and actually persists. `TagsSelector` already hands back a normalized
   * `ContentTagModel[]`.
   */
  const handleTagsChange = useCallback(
    (tags: ContentTagModel[]) => {
      setUpdateData(prev => ({
        ...prev,
        tags: buildTagsDiff(tags, originalTags),
      }));
    },
    [originalTags]
  );

  /**
   * Handle child-collection toggle from CollectionListSelector. Child rows carry
   * `visible`/`orderIndex` in their `newValue` entry (containment metadata).
   */
  const handleCollectionToggle = useCallback(
    (toggledCollection: CollectionListModel) => {
      setUpdateData(prev => ({
        ...prev,
        collections: toggleRelation(
          prev.collections,
          toggledCollection,
          originalCollectionIds,
          (collection, index) => ({
            collectionId: collection.id,
            name: collection.name,
            visible: true,
            orderIndex: index,
          })
        ),
      }));
    },
    [originalCollectionIds]
  );

  /**
   * Sibling-collection selection state — mirrors the child-collection state above,
   * but `originalSiblingIds` derives from `collection.siblings` (mutual association)
   * rather than from `collection.content` (containment).
   */
  const originalSiblingIds = useMemo(() => {
    const ids = new Set<number>();
    for (const sib of collection?.siblings ?? []) {
      ids.add(sib.id);
    }
    return ids;
  }, [collection?.siblings]);

  const pendingAddSiblingIds = useMemo(() => {
    const ids = new Set<number>();
    for (const sib of updateData.siblings?.newValue ?? []) {
      ids.add(sib.collectionId);
    }
    return ids;
  }, [updateData.siblings?.newValue]);

  const pendingRemoveSiblingIds = useMemo(() => {
    return new Set<number>(updateData.siblings?.remove ?? []);
  }, [updateData.siblings?.remove]);

  /**
   * Toggle a sibling link. Same engine as handleCollectionToggle, but sibling rows carry
   * only { collectionId, name } — no orderIndex/visible (siblings have neither).
   */
  const handleSiblingToggle = useCallback(
    (toggledCollection: CollectionListModel) => {
      setUpdateData(prev => ({
        ...prev,
        siblings: toggleRelation(
          prev.siblings,
          toggledCollection,
          originalSiblingIds,
          collection => ({
            collectionId: collection.id,
            name: collection.name,
          })
        ),
      }));
    },
    [originalSiblingIds]
  );

  /**
   * Parent-collection selection state — mirrors the sibling-collection state above,
   * but `originalParentIds` derives from `collection.parents` (the inverse of the
   * child containment relation, surfaced by admin/manage reads).
   */
  const originalParentIds = useMemo(() => {
    const ids = new Set<number>();
    for (const parent of collection?.parents ?? []) {
      ids.add(parent.id);
    }
    return ids;
  }, [collection?.parents]);

  const pendingAddParentIds = useMemo(() => {
    const ids = new Set<number>();
    for (const parent of updateData.parents?.newValue ?? []) {
      ids.add(parent.collectionId);
    }
    return ids;
  }, [updateData.parents?.newValue]);

  const pendingRemoveParentIds = useMemo(() => {
    return new Set<number>(updateData.parents?.remove ?? []);
  }, [updateData.parents?.remove]);

  /**
   * Toggle a parent link. Same engine as handleSiblingToggle; parent rows carry
   * only { collectionId, name } (parents have neither orderIndex nor visible here).
   */
  const handleParentToggle = useCallback(
    (toggledCollection: CollectionListModel) => {
      setUpdateData(prev => ({
        ...prev,
        parents: toggleRelation(prev.parents, toggledCollection, originalParentIds, collection => ({
          collectionId: collection.id,
          name: collection.name,
        })),
      }));
    },
    [originalParentIds]
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

                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Create Collection'}
                </Button>
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
                          <Button
                            variant="secondary"
                            type="submit"
                            loading={saving}
                            disabled={isLoading}
                            className={styles.headingSubmitButton}
                          >
                            {saving ? 'Saving…' : 'Save'}
                          </Button>
                        </div>

                        {displayError && <div className={styles.errorMessage}>{displayError}</div>}

                        <h3 className={styles.sectionTitle}>Details</h3>

                        {/* Title */}
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
                        </div>

                        {/* Visibility */}
                        <div className={styles.formGroup}>
                          <label className={styles.formLabel}>Visibility</label>
                          <SegmentedControl<CollectionVisibility>
                            ariaLabel="Visibility"
                            value={updateData.visibility ?? CollectionVisibility.HIDDEN}
                            onChange={v => setUpdateData(prev => ({ ...prev, visibility: v }))}
                            options={Object.values(CollectionVisibility).map(v => ({
                              value: v,
                              label: COLLECTION_VISIBILITY_LABELS[v],
                              description: COLLECTION_VISIBILITY_DESCRIPTIONS[v],
                            }))}
                            showDescription
                          />
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
                              <option value={CollectionType.PARENT}>Parent</option>
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

                        <h3 className={styles.sectionTitle}>Tags, people &amp; places</h3>

                        {/* Locations */}
                        <Dropdown<LocationModel>
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

                        {/* Tags — collection-level associations. Saved via the
                            "Update Metadata" payload (like Locations), not a
                            separate endpoint. Reuses the shared TagsSelector so the
                            picker matches the image editor. */}
                        <TagsSelector
                          selectedTags={currentTags}
                          availableTags={currentState?.tags || []}
                          onChange={handleTagsChange}
                          emptyText="No tags set"
                        />

                        {/* People — collection-level associations. Saved via
                            its own endpoint (separate from Update Metadata)
                            because the backend reconciles to an exact set of
                            IDs; "Regenerate" computes the union from contained
                            images' people. */}
                        <section
                          aria-labelledby="collection-people-heading"
                          className={styles.formGroup}
                        >
                          <h3 id="collection-people-heading" className={styles.formLabel}>
                            People
                          </h3>
                          <Dropdown<ContentPersonModel>
                            label=""
                            multiSelect
                            options={currentState?.people || []}
                            selectedValues={collectionPeople}
                            onChange={value => {
                              let next: ContentPersonModel[];
                              if (Array.isArray(value)) {
                                next = value;
                              } else if (value) {
                                next = [value];
                              } else {
                                next = [];
                              }
                              setCollectionPeopleState(next);
                            }}
                            allowAddNew
                            onAddNew={data => {
                              const newPerson: ContentPersonModel = {
                                id: 0,
                                name: data.name as string,
                                slug: '',
                              };
                              setCollectionPeopleState(prev => [...prev, newPerson]);
                            }}
                            addNewFields={[
                              {
                                name: 'name',
                                label: 'Person Name',
                                type: 'text',
                                placeholder: 'Enter person name',
                                required: true,
                              },
                            ]}
                            getDisplayName={person => person?.name || ''}
                            showNewIndicator
                            emptyText="No people set"
                          />
                          <div className={styles.actionRow}>
                            <Button onClick={handleSavePeople} disabled={peopleSaving}>
                              {peopleSaving ? 'Saving…' : 'Save People'}
                            </Button>
                            <Button onClick={handleRegeneratePeople} disabled={peopleSaving}>
                              Regenerate from contents
                            </Button>
                          </div>
                          {peopleStatus && (
                            <p
                              role="status"
                              className={`${styles.formLabelHint} ${styles.statusMessage}`}
                            >
                              {peopleStatus}
                            </p>
                          )}
                        </section>

                        {/* Presentation — image layout controls; hidden for parent-type collections */}
                        {!isParent && <h3 className={styles.sectionTitle}>Presentation</h3>}
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
                                Row Density
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
                                  aria-label="Decrease row density"
                                >
                                  −
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  max="10"
                                  value={updateData.rowsWide ?? ''}
                                  placeholder="4"
                                  onChange={e => {
                                    const value =
                                      e.target.value === ''
                                        ? undefined
                                        : Number.parseInt(e.target.value);
                                    if (value === undefined || (value >= 1 && value <= 10)) {
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
                                      rowsWide: Math.min(10, (prev.rowsWide ?? 4) + 1),
                                    }))
                                  }
                                  className={styles.stepperButton}
                                  disabled={(updateData.rowsWide ?? 4) >= 10}
                                  aria-label="Increase row density"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Gallery Access — meaningful for CLIENT_GALLERY and PARENT */}
                        {(updateData.type === CollectionType.CLIENT_GALLERY ||
                          updateData.type === CollectionType.PARENT) && (
                          <section
                            aria-labelledby="gallery-access-heading"
                            className={styles.formGroup}
                          >
                            <h3 id="gallery-access-heading" className={styles.sectionTitle}>
                              Gallery Access
                            </h3>
                            <p className={`${styles.formLabelHint} ${styles.fieldHeading}`}>
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
                            <div className={styles.actionRow}>
                              <Button
                                onClick={handleSaveAccess}
                                disabled={gallerySaving || galleryPassword.length === 0}
                              >
                                {gallerySaving ? 'Saving…' : 'Save access'}
                              </Button>
                              {collection.isPasswordProtected && (
                                <Button onClick={handleClearPassword} disabled={gallerySaving}>
                                  Clear Password
                                </Button>
                              )}
                            </div>
                            {galleryStatus && (
                              <p
                                role="status"
                                className={`${styles.formLabelHint} ${styles.statusMessage}`}
                              >
                                {galleryStatus}
                              </p>
                            )}
                          </section>
                        )}

                        <h3 className={styles.sectionTitle}>
                          {isParent ? 'Cover image' : 'Cover & content'}
                        </h3>

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
                            <Button
                              variant={isSelectingCoverImage ? 'danger' : 'secondary'}
                              onClick={() => setIsSelectingCoverImage(!isSelectingCoverImage)}
                              className={styles.coverImageButton}
                            >
                              {isSelectingCoverImage ? 'Cancel' : 'Select'}
                            </Button>
                          </div>

                          {/* Upload Media + Add Text Block — non-parent only */}
                          {!isParent && (
                            <div className={styles.mediaSection}>
                              <div className={styles.uploadSection}>
                                <label className={styles.formLabel}>Upload Media</label>
                                <input
                                  type="file"
                                  multiple
                                  accept="image/*,video/mp4,video/quicktime,.gif,.mp4,.mov"
                                  onChange={handleMediaUpload}
                                  disabled={isLoading}
                                  className={styles.uploadInput}
                                />
                                {isLoading && (
                                  <div className={styles.uploadingText}>Uploading...</div>
                                )}
                              </div>

                              <div className={styles.textBlockSection}>
                                <label className={styles.formLabel}>Add Text Block</label>
                                <Button
                                  variant="secondary"
                                  onClick={handleCreateNewTextBlock}
                                  disabled={isLoading}
                                  className={styles.addTextBlockButton}
                                >
                                  + Create New Text Block
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Inline cover picker — same affordance for parent and non-parent.
                            Pick a cover here instead of scrolling down to click the grid. */}
                        {isSelectingCoverImage && (
                          <div className={styles.coverImagePickerGrid}>
                            {coverPickerImages.length > 0 ? (
                              coverPickerImages.map(img => (
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
                                {isParent
                                  ? 'Add child collections with images to select a cover image.'
                                  : 'Add images to this collection to choose a cover.'}
                              </div>
                            )}
                          </div>
                        )}
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
                          currentCollectionId={collection.id}
                          siblingSavedIds={originalSiblingIds}
                          siblingPendingAddIds={pendingAddSiblingIds}
                          siblingPendingRemoveIds={pendingRemoveSiblingIds}
                          onToggleSibling={handleSiblingToggle}
                          parentSavedIds={originalParentIds}
                          parentPendingAddIds={pendingAddParentIds}
                          parentPendingRemoveIds={pendingRemoveParentIds}
                          onToggleParent={handleParentToggle}
                          onChangeType={handleChangeType}
                        />

                        {/* Home: rate child collections inline. Click is immediate (no save button). */}
                        {slug === 'home' &&
                          (collection.content?.some(isContentCollection) ?? false) && (
                            <section
                              aria-labelledby="children-rating-heading"
                              className={styles.formGroup}
                            >
                              <h3 id="children-rating-heading" className={styles.formLabel}>
                                Children (rating)
                              </h3>
                              <ul className={styles.plainList}>
                                {(collection.content ?? [])
                                  .filter(isContentCollection)
                                  .map(child => (
                                    <li key={child.id} className={styles.childRow}>
                                      <span>{child.title ?? child.slug}</span>
                                      <RatingStars
                                        initialRating={child.rating ?? null}
                                        onChange={async next => {
                                          await updateCollectionRating(
                                            child.referencedCollectionId,
                                            next
                                          );
                                        }}
                                        ariaLabel={`Rate ${child.title ?? child.slug}`}
                                      />
                                    </li>
                                  ))}
                              </ul>
                            </section>
                          )}
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

      {/* Unified metadata editor — handles IMAGE and GIF/MP4 content. The modal renders a
          <video> preview and dispatches save/delete to the GIF endpoints when the previewed
          block is a GIF; image-only fields are greyed out in that branch. */}
      {editingContent && contentToEdit.length > 0 && (
        <ImageMetadataModal
          onClose={closeEditor}
          onSaveSuccess={handleMetadataSaveSuccess}
          onGifSaveSuccess={handleGifSaveSuccess}
          onDeleteSuccess={handleDeleteSuccess}
          onRemoveFromCollectionSuccess={handleDeleteSuccess}
          availableTags={currentState?.tags || []}
          availablePeople={currentState?.people || []}
          availableCameras={currentState?.cameras || []}
          availableLenses={currentState?.lenses || []}
          availableFilmTypes={currentState?.filmTypes || []}
          availableFilmFormats={currentState?.filmFormats || []}
          availableCollections={allCollections}
          availableLocations={currentState?.locations || []}
          selectedImageIds={selectedImageIds}
          selectedImages={contentToEdit}
          currentCollectionId={collection?.id}
        />
      )}

      {/* Text Block Create Modal */}
      {isTextBlockModalOpen && (
        <TextBlockCreateModal
          onClose={() => setIsTextBlockModalOpen(false)}
          onSubmit={handleTextBlockSubmit}
        />
      )}
    </div>
  );
}
