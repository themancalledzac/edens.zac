'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { type EditBarCell, type EditBarTab } from '@/app/components/ui/EditBar/types';
import { type EditableContent, useMetadataEditor } from '@/app/hooks/useMetadataEditor';
import { useToggleTriple } from '@/app/hooks/useToggleTriple';
import {
  createChildCollection,
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
  type CollectionListModel,
  type CollectionModel,
  CollectionType,
  type CollectionUpdateRequest,
  type CollectionUpdateResponseDTO,
  type ContentPersonModel,
  type ContentTagModel,
  type LocationModel,
} from '@/app/types/Collection';
import { CollectionVisibility } from '@/app/types/CollectionVisibility';
import {
  type AnyContentModel,
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
import { logger } from '@/app/utils/logger';
import { buildTagsDiff, convertTagsToModels } from '@/app/utils/tagUtils';

import { buildImageUpdateDiff } from '../../Metadata/metadataUtils';
import {
  buildUpdatePayload,
  getDisplayedCoverImage,
  handleMultiSelectToggle as handleMultiSelectToggleUtil,
  mergeNewMetadata,
  refreshCollectionAfterOperation,
  revalidateCollectionCache,
  revalidateMetadataCache,
  toggleRelation,
} from './collectionEditUtils';
import { useCollectionRetype } from './hooks/useCollectionRetype';
import { useContentReordering } from './hooks/useContentReordering';
import { useCoverImageSelection } from './hooks/useCoverImageSelection';
import { useImageClickHandler } from './hooks/useImageClickHandler';

const ANIMATED_MEDIA_MIME_TYPES = new Set(['image/gif', 'video/mp4', 'video/quicktime']);
const ANIMATED_MEDIA_EXTENSION_REGEX = /\.(gif|mp4|mov)$/i;

function isAnimatedMediaFile(file: File): boolean {
  return ANIMATED_MEDIA_MIME_TYPES.has(file.type) || ANIMATED_MEDIA_EXTENSION_REGEX.test(file.name);
}

export type ManageMode = 'browse' | 'select' | 'reorder' | 'add' | 'edit';
export type CollectionEditTab = 'info' | 'tags' | 'structure';

export interface UseCollectionEditParams {
  /** The collection being edited (already fetched by the consumer). */
  collection: CollectionModel;
  /** Slug used for the cache-first metadata fetch and cache writes. */
  slug: string;
  /** When false the hook is inert — no fetch, browse defaults only. */
  enabled: boolean;
  /**
   * Optional exit-manage handler. When provided, a ✕ cell is appended to the BROWSE bottom bar
   * (Select · Reorder · Add · Edit · ✕) that calls this to leave the edit surface back to the
   * public view. Other modes have their own Cancel/Done, so the ✕ is browse-only.
   */
  onExitManage?: () => void;
}

export interface UseCollectionEditResult {
  manageMode: ManageMode;

  // Fetched metadata (tags/people/.../editable collection) — null until loaded or when disabled.
  currentState: CollectionUpdateResponseDTO | null;
  isLoadingState: boolean;

  // Grid wiring
  displayContent: AnyContentModel[];
  handleImageClick: (imageId: number) => void;
  reorder: {
    active: boolean;
    displayOrder: number[];
    moves: { imageId: number; toIndex: number }[];
    onArrowMove: (contentId: number, direction: -1 | 1) => void;
    onPickUp: (contentId: number) => void;
    onPlace: (targetId: number) => void;
    onCancelImageMove: (contentId: number) => void;
    pickedUpImageId: number | null;
  };
  isSelectingCoverImage: boolean;
  setIsSelectingCoverImage: (value: boolean) => void;
  handleCoverImageClick: (imageId: number) => void;
  justClickedImageId: number | null;
  currentCoverImageId?: number;
  /** The cover image to render in the Edit sheet — pending selection wins over the saved one. */
  displayedCoverImage: ContentImageModel | null | undefined;
  /** Child-collection images a PARENT picks its cover from. */
  childCollectionImages?: ContentImageModel[] | null;
  /** True for PARENT-type collections: hides density/display, shows the child cover picker. */
  isParent: boolean;

  // Selection
  selectedIds: number[];
  isMultiSelectMode: boolean;

  // Edit sheet
  editTab: CollectionEditTab;
  setEditTab: (tab: CollectionEditTab) => void;
  updateData: CollectionUpdateRequest;
  setUpdateField: <K extends keyof CollectionUpdateRequest>(
    key: K,
    value: CollectionUpdateRequest[K]
  ) => void;
  isUpdateDirty: boolean;
  saving: boolean;
  handleUpdate: () => Promise<void>;

  // People / access (separate-save handlers lifted as-is)
  collectionPeople: ContentPersonModel[];
  setCollectionPeople: (people: ContentPersonModel[]) => void;
  peopleSaving: boolean;
  peopleStatus: string | null;
  handleSavePeople: () => Promise<void>;
  handleRegeneratePeople: () => Promise<void>;
  galleryPassword: string;
  setGalleryPassword: (value: string) => void;
  galleryEmail: string;
  setGalleryEmail: (value: string) => void;
  gallerySaving: boolean;
  galleryStatus: string | null;
  handleSaveAccess: () => Promise<void>;
  handleClearPassword: () => Promise<void>;

  // Child-collection picker — original (pre-existing) surface, kept for back-compat.
  originalCollectionIds: Set<number>;
  handleCollectionToggle: (toggled: CollectionListModel) => void;

  // Structure tab — collection selectors (child / sibling / parent triples), retype, rating.
  /** Every collection in the system — the option list for the collection selectors. */
  allCollections: CollectionListModel[];
  /** Drag-to-retype a collection in the selector accordion. */
  handleChangeType: (collection: CollectionListModel, targetType: CollectionType) => Promise<void>;
  /** Child-collection (containment) triple. `saved` derives from content blocks. */
  childIds: { saved: Set<number>; pendingAdd: Set<number>; pendingRemove: Set<number> };
  handleChildToggle: (toggled: CollectionListModel) => void;
  handleAddNewChild: () => Promise<void>;
  /** Sibling-collection (mutual association) triple. */
  siblingIds: { saved: Set<number>; pendingAdd: Set<number>; pendingRemove: Set<number> };
  handleSiblingToggle: (toggled: CollectionListModel) => void;
  /** Parent-collection (inverse containment) triple. */
  parentIds: { saved: Set<number>; pendingAdd: Set<number>; pendingRemove: Set<number> };
  handleParentToggle: (toggled: CollectionListModel) => void;
  /** Rate a child collection inline (home collection only). Immediate — no save button. */
  updateCollectionRating: (id: number, rating: number | null) => Promise<void>;

  // Info tab — locations.
  currentLocations: LocationModel[];
  handleLocationsChange: (value: LocationModel | LocationModel[] | null) => void;

  // Tags tab — collection tags.
  currentTags: ContentTagModel[];
  handleTagsChange: (tags: ContentTagModel[]) => void;

  // Text-block create flow.
  isTextBlockModalOpen: boolean;
  closeTextBlockModal: () => void;
  handleTextBlockSubmit: (data: {
    content: string;
    format: 'plain' | 'markdown' | 'html';
    align: 'left' | 'center' | 'right';
  }) => Promise<void>;

  // Image modal
  editingContent: EditableContent | null;
  closeEditor: () => void;
  contentToEdit: EditableContent[];

  // Metadata-save success handlers
  handleMetadataSaveSuccess: (response: ContentImageUpdateResponse) => Promise<void>;
  handleGifSaveSuccess: (updated: ContentGifModel) => Promise<void>;
  handleDeleteSuccess: (deletedIds: number[]) => Promise<void>;

  // Mode transitions
  enterSelect: () => void;
  enterReorder: () => void;
  enterAdd: () => void;
  enterEdit: () => void;
  exitToBrowse: () => void;

  // EditBar config for the COLLECTION contexts (NOT the image modal).
  bottomBarTabs?: EditBarTab[];
  bottomBarCells: EditBarCell[];
  error: string | null;
}

/**
 * Faithful lift of ManageClient's collection-edit brain into a reusable hook.
 *
 * Owns the same `currentState` (full CollectionUpdateResponseDTO) source of truth that
 * ManageClient owns. When `enabled`, performs the same cache-first metadata fetch
 * (collectionStorage.getFull(slug) → getCollectionUpdateMetadata(slug)) ManageClient runs
 * via useCollectionData. When not enabled, it is inert: no fetch, browse defaults.
 *
 * The consumer-provided `collection` seeds all derived logic until the metadata fetch
 * resolves — internal `collection` = currentState?.collection ?? props.collection.
 */
export function useCollectionEdit({
  collection: seedCollection,
  slug,
  enabled,
  onExitManage,
}: UseCollectionEditParams): UseCollectionEditResult {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // Single source of truth: CollectionUpdateResponseDTO contains collection + all metadata.
  const [currentState, setCurrentState] = useState<CollectionUpdateResponseDTO | null>(null);

  // Separate loading state for operations (update, upload, etc.).
  const [operationLoading, setOperationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cache-first metadata fetch — lifted from useCollectionData. Inert when disabled.
  const [isLoadingState, setIsLoadingState] = useState(enabled);

  useEffect(() => {
    if (!enabled || !slug) {
      setIsLoadingState(false);
      return;
    }

    // Already loaded this slug — skip refetch (mirrors useCollectionData's currentSlug guard).
    if (currentState?.collection.slug === slug) {
      setIsLoadingState(false);
      return;
    }

    const abortController = new AbortController();
    let isMounted = true;

    const loadCollectionData = async () => {
      try {
        setIsLoadingState(true);
        setError(null);

        // Check full cache first for instant load (includes metadata arrays).
        const cachedResponse = collectionStorage.getFull(slug);
        if (cachedResponse) {
          if (isMounted && !abortController.signal.aborted) {
            setCurrentState(cachedResponse);
            setIsLoadingState(false);
          }
          return;
        }

        const response = await getCollectionUpdateMetadata(slug);
        if (isMounted && !abortController.signal.aborted && response !== null) {
          collectionStorage.update(slug, response.collection);
          collectionStorage.updateFull(slug, response);
          setCurrentState(response);
        }
      } catch (error_) {
        if (!abortController.signal.aborted && isMounted) {
          setError(handleApiError(error_, 'Failed to load collection data'));
        }
      } finally {
        if (isMounted) {
          setIsLoadingState(false);
        }
      }
    };

    loadCollectionData();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [enabled, slug, currentState?.collection.slug]);

  // Working collection: the fetched metadata's collection wins; otherwise the consumer seed.
  const collection = currentState?.collection ?? seedCollection;

  // All collections in the system — the option list for the Structure-tab collection selectors.
  // Inert when disabled (mirrors the metadata fetch above).
  const [allCollections, setAllCollections] = useState<CollectionListModel[]>([]);

  useEffect(() => {
    if (!enabled) return;
    getMetadata().then(meta => {
      if (meta !== null) setAllCollections(meta.collections);
    });
  }, [enabled]);

  // Drag-and-drop retype: drop a collection on a different type header to reassign its type.
  // Optimistically re-buckets it in the selector accordion; reverts on failure.
  const { handleChangeType } = useCollectionRetype({ setAllCollections, setError });

  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isTextBlockModalOpen, setIsTextBlockModalOpen] = useState(false);

  // Bottom-bar mode flags for the two modes with no pre-existing state of their own.
  const [isAddMode, setIsAddMode] = useState(false);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);

  // Active tab within the Edit sheet (Access tab removed — Info·Tags·Structure).
  const [editTab, setEditTab] = useState<CollectionEditTab>('info');

  const { editingContent, openEditor, closeEditor: baseCloseEditor } = useMetadataEditor();

  /**
   * Wraps `baseCloseEditor` to clear `selectedIds` when closing in single-edit mode.
   */
  const closeEditor = useCallback(() => {
    if (!isMultiSelectMode) {
      setSelectedIds([]);
    }
    baseCloseEditor();
  }, [isMultiSelectMode, baseCloseEditor]);

  useEffect(() => {
    if (!editingContent && !isMultiSelectMode) {
      setSelectedIds([]);
    }
  }, [editingContent, isMultiSelectMode]);

  const [updateData, setUpdateData] = useState<CollectionUpdateRequest>(() => ({
    id: collection.id,
    type: collection.type || CollectionType.PORTFOLIO,
    title: collection.title || '',
    description: collection.description || '',
    collectionDate: collection.collectionDate || '',
    visibility: collection.visibility ?? CollectionVisibility.HIDDEN,
    displayMode: collection.displayMode || 'CHRONOLOGICAL',
    rowsWide: collection.rowsWide ?? undefined,
  }));

  useEffect(() => {
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
  }, [collection]);

  const setUpdateField = useCallback(
    <K extends keyof CollectionUpdateRequest>(key: K, value: CollectionUpdateRequest[K]) => {
      setUpdateData(prev => ({ ...prev, [key]: value }));
    },
    []
  );

  // People — collection-level people list, edited inline. Saved/regenerated via their own
  // admin endpoints (separate from the metadata Update flow).
  const [collectionPeople, setCollectionPeopleState] = useState<ContentPersonModel[]>([]);
  const [peopleSaving, setPeopleSaving] = useState(false);
  const [peopleStatus, setPeopleStatus] = useState<string | null>(null);

  useEffect(() => {
    setCollectionPeopleState(collection.people ?? []);
    setPeopleStatus(null);
  }, [collection.id, collection.people]);

  /**
   * Save the current people list. Sends only existing person IDs; new people created inline
   * (id === 0) are skipped because the backend endpoint reconciles by ID.
   */
  const handleSavePeople = useCallback(async () => {
    if (!collection) return;
    setPeopleSaving(true);
    setPeopleStatus(null);
    try {
      const personIds = collectionPeople.filter(p => p.id > 0).map(p => p.id);
      await setCollectionPeople(collection.id, personIds);
      setPeopleStatus('People saved.');
    } catch (error_) {
      setPeopleStatus(handleApiError(error_, 'Failed to save people.'));
    } finally {
      setPeopleSaving(false);
    }
  }, [collection, collectionPeople]);

  /**
   * Regenerate the collection's people list from the union of all contained images' people.
   * Confirms first; reloads the page on success.
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
    } catch (error_) {
      setPeopleStatus(handleApiError(error_, 'Failed to regenerate people.'));
      setPeopleSaving(false);
    }
  }, [collection]);

  // Gallery Access — local state for the CLIENT_GALLERY password section.
  const [galleryPassword, setGalleryPasswordInput] = useState('');
  const [galleryEmail, setGalleryEmail] = useState('');
  const [galleryStatus, setGalleryStatus] = useState<string | null>(null);
  const [gallerySaving, setGallerySaving] = useState(false);

  useEffect(() => {
    setGalleryPasswordInput(collection.galleryPassword ?? '');
    setGalleryEmail(collection.recipientEmails?.join(', ') ?? '');
    setGalleryStatus(null);
  }, [collection.id, collection.galleryPassword, collection.recipientEmails]);

  const processedContent = useMemo(
    () =>
      processContentBlocks(collection.content ?? [], false, collection.id, collection.displayMode),
    [collection.content, collection.id, collection.displayMode]
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
      setSelectedIds([]);
    }, []),
  });

  /**
   * The active bottom-bar mode, derived from the underlying state so it can never desync.
   * Reorder wins over Select; Edit and Add are explicit.
   */
  const deriveManageMode = (): ManageMode => {
    if (reorderState.active) return 'reorder';
    if (isMultiSelectMode) return 'select';
    if (isEditSheetOpen) return 'edit';
    if (isAddMode) return 'add';
    return 'browse';
  };
  const manageMode = deriveManageMode();

  /**
   * Whether the collection-update form has unsaved changes. Reuses `buildUpdatePayload`;
   * a payload of just `{ id }` means nothing changed.
   */
  const isUpdateDirty = useMemo(
    () => (collection ? Object.keys(buildUpdatePayload(updateData, collection)).length > 1 : false),
    [updateData, collection]
  );

  /** Leave any non-browse mode and clear its transient state. */
  const resetToBrowse = useCallback(() => {
    setIsMultiSelectMode(false);
    setSelectedIds([]);
    setIsAddMode(false);
    setIsEditSheetOpen(false);
    if (isSelectingCoverImage) setIsSelectingCoverImage(false);
  }, [isSelectingCoverImage, setIsSelectingCoverImage]);

  // Leaving manage: the same CollectionPageClient instance stays mounted across the soft nav back
  // to the public view (the no-remount design), so this hook's mode state would otherwise persist
  // and a later re-entry would reopen the previously-open sub-view. Reset to browse on exit so
  // re-entering manage always starts on the manage page. The `!enabled` guard means this never
  // fires mid-session, only when manage is left.
  useEffect(() => {
    if (!enabled) resetToBrowse();
  }, [enabled, resetToBrowse]);

  /**
   * Content blocks the metadata modal should edit. Mixes images and GIFs; bulk-edit semantics
   * key off the IMAGE subset.
   */
  const contentToEdit = useMemo(
    () =>
      (collection.content?.filter(
        contentItem =>
          (isContentImage(contentItem) || isGifContent(contentItem)) &&
          selectedIds.includes(contentItem.id)
      ) as (ContentImageModel | ContentGifModel)[]) || [],
    [selectedIds, collection.content]
  );

  // PARENT-type collections hide the density/display controls and pick their cover from child
  // images instead of their own grid. Gated off the in-flight `updateData.type` (not the saved
  // type) so the controls react live as the user changes the type in the Structure tab.
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

  /**
   * Handle opening the text block creation modal.
   */
  const handleCreateNewTextBlock = useCallback(() => {
    if (!collection) return;
    setIsTextBlockModalOpen(true);
  }, [collection]);

  /**
   * Handle update form submission.
   */
  const handleUpdate = useCallback(async () => {
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
          // Renaming the slug: stay in edit mode on the new slug's /[slug] route via ?manage=1.
          router.replace(`/${response.collection.slug}?manage=1`);
        }

        // Location inheritance: if locations were just set (not all removed), apply them to
        // all images in this collection that have no locations.
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
                .catch((error_: unknown) => {
                  logger.error(
                    'useCollectionEdit',
                    'Failed to inherit locations to images',
                    error_
                  );
                  setError('Collection saved, but failed to inherit locations to images.');
                });
            }
          }
        }
      }

      setUpdateData(prev => ({ ...prev, coverImageId: undefined }));
    } catch (error_) {
      setError(handleApiError(error_, 'Failed to update collection'));
    } finally {
      setSaving(false);
    }
  }, [collection, currentState, updateData, router]);

  /**
   * Save gallery access. If a recipient email is provided, sets the password and emails it;
   * otherwise stores the password only.
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
      // PARENT collections can share their password with every child client gallery.
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
    } catch (error_) {
      setGalleryStatus(handleApiError(error_, 'Failed to save access settings.'));
    } finally {
      setGallerySaving(false);
    }
  }, [collection, galleryPassword, galleryEmail]);

  /**
   * "Clear Password" — sends null to the backend, which nulls out the password hash.
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
    } catch (error_) {
      setGalleryStatus(handleApiError(error_, 'Failed to clear password.'));
    } finally {
      setGallerySaving(false);
    }
  }, [collection]);

  /**
   * Handle media upload. Partitions selected files by type: gif/mp4/mov → gifs endpoint,
   * everything else → images endpoint.
   */
  const handleMediaUpload = useCallback(
    async (files: FileList) => {
      if (!collection || files.length === 0) return;

      try {
        setOperationLoading(true);
        setError(null);

        const fileArray = Array.from(files);
        const animatedFiles = fileArray.filter(isAnimatedMediaFile);
        const imageFiles = fileArray.filter(f => !isAnimatedMediaFile(f));
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
      } catch (error_) {
        setError(handleApiError(error_, 'Failed to upload media'));
      } finally {
        setOperationLoading(false);
      }
    },
    [collection]
  );

  /**
   * Handle text block creation (kept here for the Add-mode "Text" flow; the modal that
   * collects the body lives in the consumer).
   */
  const handleTextBlockSubmit = useCallback(
    async (data: {
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
      } catch (error_) {
        setError(handleApiError(error_, 'Failed to create text block'));
        throw error_;
      } finally {
        setOperationLoading(false);
      }
    },
    [collection]
  );
  const closeTextBlockModal = useCallback(() => setIsTextBlockModalOpen(false), []);

  /**
   * Handle multi-select toggle.
   */
  const handleMultiSelectToggle = useCallback((imageId: number) => {
    setSelectedIds(prev => handleMultiSelectToggleUtil(imageId, prev));
  }, []);

  /**
   * Handle bulk edit - open modal with selected images.
   */
  const handleBulkEdit = useCallback(() => {
    if (selectedIds.length === 0 || !collection?.content) return;

    const selectedImages = collection.content.filter(
      block => isContentImage(block) && selectedIds.includes(block.id)
    ) as ContentImageModel[];

    const firstImage = selectedImages[0];
    if (firstImage) {
      openEditor(firstImage);
      return;
    }

    // No images in the selection — fall back to editing the first selected GIF/MP4.
    const selectedGif = collection.content.find(
      (block): block is ContentGifModel => isGifContent(block) && selectedIds.includes(block.id)
    );
    const firstGif = selectedGif;
    if (firstGif) {
      openEditor(firstGif);
    }
  }, [selectedIds, collection, openEditor]);

  const { handleImageClick } = useImageClickHandler({
    isSelectingCoverImage,
    isMultiSelectMode,
    handleCoverImageClick,
    handleMultiSelectToggle,
    collection,
    processedContent,
    openEditor,
    setSelectedIds,
    setIsMultiSelectMode,
  });

  /**
   * Handle successful metadata save - updates currentState with API response.
   */
  const handleMetadataSaveSuccess = useCallback(
    async (response: ContentImageUpdateResponse) => {
      if (!currentState?.collection.content || !currentState.collection.slug) return;

      try {
        const stateSlug = currentState.collection.slug;

        if (response.updatedImages && response.updatedImages.length > 0) {
          collectionStorage.updateImagesInCache(stateSlug, response.updatedImages);
        }

        const fullResponse = await getCollectionUpdateMetadata(stateSlug);
        if (fullResponse !== null) {
          collectionStorage.update(stateSlug, fullResponse.collection);
          collectionStorage.updateFull(stateSlug, fullResponse);
          await revalidateCollectionCache(stateSlug);
          void revalidateMetadataCache();

          // Merge metadata into the fresh response using functional updater to avoid stale closure.
          setCurrentState(prev => {
            const base = fullResponse;
            const metadataUpdater = mergeNewMetadata(response, prev ?? base);
            return metadataUpdater ? metadataUpdater(base) : base;
          });
        }

        setSelectedIds([]);
        setIsMultiSelectMode(false);
      } catch (error_) {
        setError(handleApiError(error_, 'An error occurred. Try reloading the page.'));
      }
    },
    [currentState]
  );

  /**
   * Handle successful GIF metadata save — refreshes the collection so the new rating flows
   * into the layout.
   */
  const handleGifSaveSuccess = useCallback(
    async (updated: ContentGifModel) => {
      if (!currentState?.collection.slug) return;
      try {
        const stateSlug = currentState.collection.slug;
        const fullResponse = await getCollectionUpdateMetadata(stateSlug);
        if (fullResponse !== null) {
          setCurrentState(fullResponse);
          collectionStorage.update(stateSlug, fullResponse.collection);
          collectionStorage.updateFull(stateSlug, fullResponse);
          await revalidateCollectionCache(stateSlug);
        }
        setSelectedIds([]);
        setIsMultiSelectMode(false);
      } catch (error_) {
        setError(handleApiError(error_, `Failed to refresh after GIF ${updated.id} update`));
      }
    },
    [currentState]
  );

  /**
   * Handle successful image deletion - refreshes collection data.
   */
  const handleDeleteSuccess = useCallback(
    async (_deletedIds: number[]) => {
      if (!currentState?.collection.slug) {
        logger.warn(
          'useCollectionEdit',
          'handleDeleteSuccess: currentState or slug unavailable, cannot refresh collection'
        );
        setError('Unable to refresh collection after deletion — please reload the page.');
        return;
      }

      try {
        const stateSlug = currentState.collection.slug;

        const fullResponse = await getCollectionUpdateMetadata(stateSlug);
        if (fullResponse !== null) {
          setCurrentState(fullResponse);
          collectionStorage.update(stateSlug, fullResponse.collection);
          collectionStorage.updateFull(stateSlug, fullResponse);
          await revalidateCollectionCache(stateSlug);
          void revalidateMetadataCache();
        }

        setSelectedIds([]);
        setIsMultiSelectMode(false);
      } catch (error_) {
        setError(handleApiError(error_, 'Failed to refresh collection after deletion'));
      }
    },
    [currentState]
  );

  /**
   * Remove the selected images from THIS collection (non-destructive). Mirrors the metadata
   * editor's remove-from-collection.
   */
  const handleBulkRemove = useCallback(async () => {
    if (selectedIds.length === 0 || !collection) return;
    const imageSubset =
      (collection.content?.filter(
        block => isContentImage(block) && selectedIds.includes(block.id)
      ) as ContentImageModel[]) ?? [];
    if (imageSubset.length === 0) return;
    if (
      !window.confirm(
        `Remove ${imageSubset.length} image${imageSubset.length === 1 ? '' : 's'} from this collection? The image${imageSubset.length === 1 ? '' : 's'} and their metadata remain in the system.`
      )
    )
      return;
    try {
      setOperationLoading(true);
      setError(null);
      const imageUpdates: ContentImageUpdateRequest[] = imageSubset.map(img => {
        const trimmedCollections = (img.collections || []).filter(
          c => c.collectionId !== collection.id
        );
        return buildImageUpdateDiff(
          { id: img.id, collections: trimmedCollections },
          img,
          currentState?.filmTypes
        );
      });
      const response = await updateImages(imageUpdates);
      if (response !== null) {
        await handleDeleteSuccess(imageSubset.map(img => img.id));
      }
    } catch (error_) {
      setError(handleApiError(error_, 'Failed to remove images from collection.'));
    } finally {
      setOperationLoading(false);
    }
  }, [selectedIds, collection, currentState?.filmTypes, handleDeleteSuccess]);

  // Child-collection picker triple. Saved children come from the content blocks (containment);
  // pending add/remove come from the discrete `collections` update.
  const originalChildIds = useMemo(
    () =>
      (collection.content ?? [])
        .filter(isContentCollection)
        .map(block => block.referencedCollectionId),
    [collection.content]
  );
  const {
    savedIds: originalCollectionIds,
    pendingAddIds,
    pendingRemoveIds,
  } = useToggleTriple(
    originalChildIds,
    updateData.collections?.newValue,
    updateData.collections?.remove,
    child => child.collectionId
  );

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

    return convertLocationsToModels(collection.locations, availableLocations);
  }, [collection.locations, currentState?.locations, updateData.locations]);

  const originalLocations = useMemo(
    () => convertLocationsToModels(collection.locations, currentState?.locations || []),
    [collection.locations, currentState?.locations]
  );

  /**
   * Handle locations selection changes (multi-select). Diffs the new selection against the saved
   * baseline so deselecting a location emits `remove` — the backend reconciler only drops what is
   * in `remove`, never what's absent from `prev`.
   */
  const handleLocationsChange = useCallback(
    (value: LocationModel | LocationModel[] | null) => {
      let locations: LocationModel[] = [];
      if (Array.isArray(value)) locations = value;
      else if (value) locations = [value];

      setUpdateData(prev => ({
        ...prev,
        locations: buildLocationsDiff(locations, originalLocations),
      }));
    },
    [originalLocations]
  );

  /**
   * Derive current tags from `collection.tags` and `updateData.tags`. Mirrors `currentLocations`.
   *
   * Priority: pending `updateData.tags` overrides the saved collection tags. Saved tags arrive as
   * `string[]` names, so they are resolved against the available tag list to recover IDs.
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

    return convertTagsToModels(collection.tags, availableTags);
  }, [collection.tags, currentState?.tags, updateData.tags]);

  const originalTags = useMemo(
    () => convertTagsToModels(collection.tags, currentState?.tags || []),
    [collection.tags, currentState?.tags]
  );

  /**
   * Handle tags selection changes (multi-select). Mirrors `handleLocationsChange`: diffs against
   * the saved baseline so deselecting/clearing tags emits `remove` and actually persists.
   * `TagsSelector` already hands back a normalized `ContentTagModel[]`.
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
          (col, index) => ({
            collectionId: col.id,
            name: col.name,
            visible: true,
            orderIndex: index,
          })
        ),
      }));
    },
    [originalCollectionIds]
  );

  /**
   * Sibling-collection selection state — mirrors the child-collection state above, but the saved
   * IDs derive from `collection.siblings` (mutual association) rather than from `collection.content`
   * (containment).
   */
  const originalSiblingIdsArray = useMemo(
    () => (collection.siblings ?? []).map(sib => sib.id),
    [collection.siblings]
  );
  const {
    savedIds: originalSiblingIds,
    pendingAddIds: pendingAddSiblingIds,
    pendingRemoveIds: pendingRemoveSiblingIds,
  } = useToggleTriple(
    originalSiblingIdsArray,
    updateData.siblings?.newValue,
    updateData.siblings?.remove,
    sib => sib.collectionId
  );

  /**
   * Toggle a sibling link. Same engine as handleCollectionToggle, but sibling rows carry only
   * { collectionId, name } — no orderIndex/visible (siblings have neither).
   */
  const handleSiblingToggle = useCallback(
    (toggledCollection: CollectionListModel) => {
      setUpdateData(prev => ({
        ...prev,
        siblings: toggleRelation(prev.siblings, toggledCollection, originalSiblingIds, col => ({
          collectionId: col.id,
          name: col.name,
        })),
      }));
    },
    [originalSiblingIds]
  );

  /**
   * Parent-collection selection state — mirrors the sibling-collection state above, but the saved
   * IDs derive from `collection.parents` (the inverse of the child containment relation, surfaced
   * by admin/manage reads).
   */
  const originalParentIdsArray = useMemo(
    () => (collection.parents ?? []).map(parent => parent.id),
    [collection.parents]
  );
  const {
    savedIds: originalParentIds,
    pendingAddIds: pendingAddParentIds,
    pendingRemoveIds: pendingRemoveParentIds,
  } = useToggleTriple(
    originalParentIdsArray,
    updateData.parents?.newValue,
    updateData.parents?.remove,
    parent => parent.collectionId
  );

  /**
   * Toggle a parent link. Same engine as handleSiblingToggle; parent rows carry only
   * { collectionId, name } (parents have neither orderIndex nor visible here).
   */
  const handleParentToggle = useCallback(
    (toggledCollection: CollectionListModel) => {
      setUpdateData(prev => ({
        ...prev,
        parents: toggleRelation(prev.parents, toggledCollection, originalParentIds, col => ({
          collectionId: col.id,
          name: col.name,
        })),
      }));
    },
    [originalParentIds]
  );

  /**
   * Handle adding new child collection.
   */
  const handleAddNewChild = useCallback(async () => {
    if (!collection) {
      logger.warn(
        'useCollectionEdit',
        'handleAddNewChild: collection unavailable, cannot create child'
      );
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
        // New child opens in the edit surface on its own /[slug] route via ?manage=1.
        router.push(`/${response.collection.slug}?manage=1`);
      }
    } catch (error_) {
      setError(handleApiError(error_, 'Failed to create child collection'));
    } finally {
      setOperationLoading(false);
    }
  }, [collection, router]);

  // ── Mode transitions ──
  const enterSelect = useCallback(() => setIsMultiSelectMode(true), []);
  const enterReorder = useCallback(() => handleEnterReorderMode(), [handleEnterReorderMode]);
  const enterAdd = useCallback(() => setIsAddMode(true), []);
  const enterEdit = useCallback(() => setIsEditSheetOpen(true), []);
  const exitToBrowse = resetToBrowse;

  // ── EditBar config builders ──

  /**
   * Reproduce ManageClient.renderBottomBar's per-mode cell sets exactly, as EditBarCell[].
   */
  const isParentCollection = collection.type === CollectionType.PARENT;
  const isLoading = isLoadingState || operationLoading;

  const bottomBarCells = useMemo<EditBarCell[]>(() => {
    if (manageMode === 'reorder') {
      return [
        {
          key: 'done',
          label: 'Done',
          variant: 'primary',
          disabled: isLoading || reorderState.moves.length === 0,
          onClick: () => void handleSaveReorder(),
        },
        { key: 'cancel', label: 'Cancel', onClick: handleCancelReorder },
      ];
    }

    if (manageMode === 'select') {
      const cells: EditBarCell[] = [
        {
          key: 'all',
          label: 'All',
          onClick: () => {
            const allImageIds = collection.content?.filter(isContentImage).map(img => img.id) || [];
            setSelectedIds(allImageIds);
          },
        },
        {
          key: 'edit',
          label: `Edit${selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}`,
          variant: 'primary',
          disabled: selectedIds.length === 0,
          onClick: handleBulkEdit,
        },
      ];
      if (selectedIds.length === 1) {
        cells.push({
          key: 'set-cover',
          label: 'Set as cover',
          onClick: () => {
            const onlyId = selectedIds[0];
            if (onlyId !== undefined) handleCoverImageClick(onlyId);
            resetToBrowse();
          },
        });
      }
      cells.push(
        {
          key: 'remove',
          label: 'Remove',
          variant: 'danger',
          disabled: selectedIds.length === 0 || isLoading,
          onClick: () => void handleBulkRemove(),
        },
        { key: 'cancel', label: 'Cancel', onClick: resetToBrowse }
      );
      return cells;
    }

    if (manageMode === 'add') {
      return [
        {
          key: 'text',
          label: 'Text',
          onClick: () => {
            handleCreateNewTextBlock();
            setIsAddMode(false);
          },
        },
        {
          key: 'upload',
          label: 'Upload',
          disabled: isLoading,
          fileInput: {
            accept: 'image/*,video/mp4,video/quicktime,.gif,.mp4,.mov',
            multiple: true,
            onFiles: files => {
              void handleMediaUpload(files);
              setIsAddMode(false);
            },
          },
        },
        { key: 'cancel', label: 'Cancel', onClick: () => setIsAddMode(false) },
      ];
    }

    if (manageMode === 'edit') {
      return [
        {
          key: 'save',
          label: saving ? 'Saving…' : 'Save',
          variant: isUpdateDirty ? 'primary' : 'default',
          disabled: !isUpdateDirty || saving || isLoading,
          onClick: () => void handleUpdate(),
        },
        { key: 'close', label: 'Close', onClick: resetToBrowse },
      ];
    }

    // browse
    const cells: EditBarCell[] = [
      { key: 'select', label: 'Select', onClick: () => setIsMultiSelectMode(true) },
      {
        key: 'reorder',
        label: 'Reorder',
        disabled: collection.displayMode === 'CHRONOLOGICAL',
        onClick: handleEnterReorderMode,
      },
    ];
    if (!isParentCollection) {
      cells.push({ key: 'add', label: 'Add', onClick: () => setIsAddMode(true) });
    }
    cells.push({ key: 'edit', label: 'Edit', onClick: () => setIsEditSheetOpen(true) });
    // ✕ exits the manage surface back to the public view. Browse-only — other modes have Cancel.
    if (onExitManage) {
      cells.push({ key: 'exit', label: '✕', onClick: onExitManage });
    }
    return cells;
  }, [
    manageMode,
    isLoading,
    reorderState.moves.length,
    handleSaveReorder,
    handleCancelReorder,
    collection.content,
    collection.displayMode,
    selectedIds,
    handleBulkEdit,
    handleCoverImageClick,
    resetToBrowse,
    handleBulkRemove,
    handleCreateNewTextBlock,
    handleMediaUpload,
    saving,
    isUpdateDirty,
    handleUpdate,
    handleEnterReorderMode,
    isParentCollection,
    onExitManage,
  ]);

  const bottomBarTabs = useMemo<EditBarTab[] | undefined>(() => {
    if (manageMode !== 'edit') return;
    return [
      { id: 'info', label: 'Info' },
      { id: 'tags', label: 'Tags' },
      { id: 'structure', label: 'Structure' },
    ];
  }, [manageMode]);

  return {
    manageMode,

    currentState,
    isLoadingState,

    displayContent,
    handleImageClick,
    reorder: {
      active: reorderState.active,
      displayOrder: reorderDisplayOrder,
      moves: reorderState.moves,
      onArrowMove: handleArrowMove,
      onPickUp: handlePickUp,
      onPlace: handlePlace,
      onCancelImageMove: handleCancelImageMove,
      pickedUpImageId: reorderState.pickedUpImageId,
    },
    isSelectingCoverImage,
    setIsSelectingCoverImage,
    handleCoverImageClick,
    justClickedImageId,
    currentCoverImageId: collection.coverImage?.id,
    displayedCoverImage,
    childCollectionImages: currentState?.childCollectionImages,
    isParent,

    selectedIds,
    isMultiSelectMode,

    editTab,
    setEditTab,
    updateData,
    setUpdateField,
    isUpdateDirty,
    saving,
    handleUpdate,

    collectionPeople,
    setCollectionPeople: setCollectionPeopleState,
    peopleSaving,
    peopleStatus,
    handleSavePeople,
    handleRegeneratePeople,
    galleryPassword,
    setGalleryPassword: setGalleryPasswordInput,
    galleryEmail,
    setGalleryEmail,
    gallerySaving,
    galleryStatus,
    handleSaveAccess,
    handleClearPassword,

    originalCollectionIds,
    handleCollectionToggle,

    // Structure tab — collection selectors, retype, rating.
    allCollections,
    handleChangeType,
    childIds: {
      saved: originalCollectionIds,
      pendingAdd: pendingAddIds,
      pendingRemove: pendingRemoveIds,
    },
    handleChildToggle: handleCollectionToggle,
    handleAddNewChild,
    siblingIds: {
      saved: originalSiblingIds,
      pendingAdd: pendingAddSiblingIds,
      pendingRemove: pendingRemoveSiblingIds,
    },
    handleSiblingToggle,
    parentIds: {
      saved: originalParentIds,
      pendingAdd: pendingAddParentIds,
      pendingRemove: pendingRemoveParentIds,
    },
    handleParentToggle,
    updateCollectionRating,

    // Info / Tags tabs — locations + tags field wiring.
    currentLocations,
    handleLocationsChange,
    currentTags,
    handleTagsChange,

    isTextBlockModalOpen,
    closeTextBlockModal,
    handleTextBlockSubmit,

    editingContent,
    closeEditor,
    contentToEdit,

    handleMetadataSaveSuccess,
    handleGifSaveSuccess,
    handleDeleteSuccess,

    enterSelect,
    enterReorder,
    enterAdd,
    enterEdit,
    exitToBrowse,

    bottomBarTabs,
    bottomBarCells,
    error,
  };
}
