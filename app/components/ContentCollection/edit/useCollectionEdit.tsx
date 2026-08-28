'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type EditBarCell, type EditBarTab } from '@/app/components/ui/EditBar/types';
import { type EditableContent, useMetadataEditor } from '@/app/hooks/useMetadataEditor';
import { useToggleTriple } from '@/app/hooks/useToggleTriple';
import {
  createChildCollection,
  deleteCollection,
  getCollectionUpdateMetadata,
  getMetadata,
  regenerateCollectionPeople,
  saveCollectionFromTag,
  saveGalleryAccess,
  setCollectionPeople,
  updateCollection,
  updateCollectionRating,
} from '@/app/lib/api/collections';
import {
  createGif,
  createImages,
  createTextContent,
  updateGif,
  updateImages,
} from '@/app/lib/api/content';
import { collectionStorage } from '@/app/lib/storage/collectionStorage';
import {
  type CollectionListModel,
  type CollectionModel,
  type CollectionUpdateRequest,
  type CollectionUpdateResponseDTO,
  type ContentPersonModel,
  type ContentTagModel,
  type LocationModel,
  type TagViewModel,
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
import { HOME_SLUG } from '@/app/utils/collectionSlugs';
import { processContentBlocks } from '@/app/utils/contentLayout';
import {
  isContentCollection,
  isContentImage,
  isGifContent,
  isParentCollection,
} from '@/app/utils/contentTypeGuards';
import { buildLocationsDiff, convertLocationsToModels } from '@/app/utils/locationUtils';
import { logger } from '@/app/utils/logger';
import { manageHref } from '@/app/utils/manageUrl';
import { hasObjectChanges } from '@/app/utils/objectComparison';
import { toChronologicalOrder } from '@/app/utils/sortByDate';
import { buildTagsDiff, convertTagsToModels } from '@/app/utils/tagUtils';

import { buildImageUpdateDiff } from '../../Metadata/metadataUtils';
import {
  buildUpdatePayload,
  executeReorderOperation,
  handleMultiSelectToggle as handleMultiSelectToggleUtil,
  mergeNewMetadata,
  refreshCollectionAfterOperation,
  revalidateCollectionCache,
  revalidateLocationCaches,
  revalidateMetadataCache,
  toggleRelation,
} from './collectionEditUtils';
import { useCaptureDateSelection } from './hooks/useCaptureDateSelection';
import { useContentReordering } from './hooks/useContentReordering';
import { useCoverImageSelection } from './hooks/useCoverImageSelection';
import { useImageClickHandler } from './hooks/useImageClickHandler';

const ANIMATED_MEDIA_MIME_TYPES = new Set(['image/gif', 'video/mp4', 'video/quicktime']);
const ANIMATED_MEDIA_EXTENSION_REGEX = /\.(gif|mp4|mov)$/i;

/** Stable empty content array so the public (disabled) path never re-runs the layout pass. */
const EMPTY_CONTENT: AnyContentModel[] = [];

function isAnimatedMediaFile(file: File): boolean {
  return ANIMATED_MEDIA_MIME_TYPES.has(file.type) || ANIMATED_MEDIA_EXTENSION_REGEX.test(file.name);
}

/**
 * Push a collection's locations down onto every piece of content that has none of its own.
 *
 * Giving a collection a location is a statement about where its content was shot, so anything in
 * it that is not already placed inherits that location. Content the admin has already located is
 * never touched — a per-image override outranks the collection-wide default.
 *
 * Images go out as one batched PATCH; GIF/MP4 blocks have no batch endpoint and are patched
 * individually. All requests are issued together, and a single rejection fails the whole call so
 * the caller can surface one error rather than a partial-success state.
 *
 * @param content - The collection's current content blocks.
 * @param locationIds - IDs of the collection's saved locations.
 * @returns True when at least one block was updated (the caller then refetches), false when
 *   everything already had a location and no request was made.
 */
async function inheritLocationsToContent(
  content: readonly AnyContentModel[],
  locationIds: number[]
): Promise<boolean> {
  const hasNoLocation = (item: { locations?: LocationModel[] | null }) => !item.locations?.length;

  const imagesWithoutLocation = content.filter(
    (item): item is ContentImageModel => isContentImage(item) && hasNoLocation(item)
  );
  const gifsWithoutLocation = content.filter(
    (item): item is ContentGifModel => isGifContent(item) && hasNoLocation(item)
  );

  if (imagesWithoutLocation.length === 0 && gifsWithoutLocation.length === 0) {
    return false;
  }

  const requests: Promise<unknown>[] = gifsWithoutLocation.map(gif =>
    updateGif(gif.id, { locations: { prev: locationIds } })
  );

  if (imagesWithoutLocation.length > 0) {
    const imageUpdates: ContentImageUpdateRequest[] = imagesWithoutLocation.map(img => ({
      id: img.id,
      locations: { prev: locationIds },
    }));
    requests.push(updateImages(imageUpdates));
  }

  await Promise.all(requests);
  return true;
}

export type ManageMode =
  | 'browse'
  | 'select'
  | 'reorder'
  | 'add'
  | 'edit'
  | 'pick-date'
  | 'pick-cover';
export type CollectionEditTab = 'info' | 'structure';

export interface UseCollectionEditParams {
  /** The collection being edited (already fetched by the consumer). */
  collection: CollectionModel;
  /** Slug used for the cache-first metadata fetch and cache writes. */
  slug: string;
  /** When false the hook is inert — no fetch, no layout pass, browse defaults only. */
  enabled: boolean;
  /** Optional exit-manage handler; appends the rightmost browse-bar Cancel that leaves to public. */
  onExitManage?: () => void;
}

export interface UseCollectionEditResult {
  manageMode: ManageMode;

  currentState: CollectionUpdateResponseDTO | null;
  isLoadingState: boolean;

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
  /** True while the grid is in cover-pick mode; surfaces as `manageMode === 'pick-cover'`. */
  isSelectingCoverImage: boolean;
  setIsSelectingCoverImage: (value: boolean) => void;
  /** Commits a cover pick immediately (no Save step) and leaves cover-pick mode. */
  handleCoverImageClick: (imageId: number) => void;
  justClickedImageId: number | null;
  currentCoverImageId?: number;
  /**
   * Images sourced from this collection's child collections. Since D3 this is one ARM of the
   * cover-candidate union every collection picks from — the other being the collection's own
   * images — not a parent-only substitute for them. Only this arm needs a picker of its own:
   * the collection's own images are already on the grid, where cover-pick mode makes them
   * clickable, while child-collection images are represented there only by their parent card.
   */
  childCollectionImages?: ContentImageModel[] | null;
  /**
   * True for parent collections (they hold child-collection refs). Server-derived when the
   * payload carries `hasChildren`, which covers the whole content graph; falls back to a scan
   * of the loaded content otherwise. The legacy PARENT enum arm is gone with the enum itself.
   *
   * Gates exactly two things: the Gallery Access section (in union with `updateData.isClient`)
   * and the password-propagate-to-children confirm. It does NOT gate density/display (D4) or
   * the cover picker's source pool (D3) — both are unconditional now, so do NOT reintroduce a
   * parent gate on them.
   */
  isParent: boolean;

  selectedIds: number[];
  isMultiSelectMode: boolean;

  editTab: CollectionEditTab;
  setEditTab: (tab: CollectionEditTab) => void;
  updateData: CollectionUpdateRequest;
  setUpdateField: <K extends keyof CollectionUpdateRequest>(
    key: K,
    value: CollectionUpdateRequest[K]
  ) => void;
  isUpdateDirty: boolean;
  saving: boolean;
  handleUpdate: (patch?: Partial<CollectionUpdateRequest>) => Promise<void>;
  deleting: boolean;
  handleDeleteCollection: () => Promise<void>;

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

  /** Every collection in the system — the option list for the collection selectors. */
  allCollections: CollectionListModel[];
  /** `allCollections` plus synthetic read-only tag-view rows (derived) for the manage selector. */
  allCollectionsWithTagViews: CollectionListModel[];
  /** Promote a tag view into a real collection, then navigate to its manage page. */
  saveTagAsCollection: (
    sourceTagId: number,
    body: { visibility: CollectionVisibility }
  ) => Promise<void>;
  /** Child-collection (containment) triple. `saved` is the server's child id list when sent. */
  childIds: { saved: Set<number>; pendingAdd: Set<number>; pendingRemove: Set<number> };
  handleChildToggle: (toggled: CollectionListModel) => void;
  handleAddNewChild: () => Promise<void>;
  siblingIds: { saved: Set<number>; pendingAdd: Set<number>; pendingRemove: Set<number> };
  handleSiblingToggle: (toggled: CollectionListModel) => void;
  parentIds: { saved: Set<number>; pendingAdd: Set<number>; pendingRemove: Set<number> };
  handleParentToggle: (toggled: CollectionListModel) => void;
  /**
   * Rate this collection, or a child inline on the home collection. Immediate — no save
   * button. Surfaces failures via `error` and rethrows so callers skip optimistic commits.
   */
  updateCollectionRating: (id: number, rating: number | null) => Promise<void>;

  currentLocations: LocationModel[];
  handleLocationsChange: (value: LocationModel | LocationModel[] | null) => void;

  currentTags: ContentTagModel[];
  handleTagsChange: (tags: ContentTagModel[]) => void;

  isTextBlockModalOpen: boolean;
  closeTextBlockModal: () => void;
  handleTextBlockSubmit: (data: {
    content: string;
    format: 'plain' | 'markdown' | 'html';
    align: 'left' | 'center' | 'right';
  }) => Promise<void>;

  editingContent: EditableContent | null;
  closeEditor: () => void;
  contentToEdit: EditableContent[];
  /**
   * Closes the metadata sheet and puts the grid into `pick-date` mode, where clicking a dated
   * image copies its capture date onto the GIF that was being edited. No-op unless the editor is
   * currently open on a GIF/MP4.
   */
  startCaptureDatePick: () => void;

  handleMetadataSaveSuccess: (response: ContentImageUpdateResponse) => Promise<void>;
  handleGifSaveSuccess: (updated: ContentGifModel) => Promise<void>;
  handleDeleteSuccess: (deletedIds: number[]) => Promise<void>;

  enterSelect: () => void;
  enterReorder: () => void;
  enterAdd: () => void;
  enterEdit: () => void;
  exitToBrowse: () => void;

  bottomBarTabs?: EditBarTab[];
  bottomBarCells: EditBarCell[];
  error: string | null;
  clearError: () => void;
}

/**
 * Collection-edit state and actions for the manage surface; inert when `enabled` is false.
 */
export function useCollectionEdit({
  collection: seedCollection,
  slug,
  enabled,
  onExitManage,
}: UseCollectionEditParams): UseCollectionEditResult {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [currentState, setCurrentState] = useState<CollectionUpdateResponseDTO | null>(null);

  const [operationLoading, setOperationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isLoadingState, setIsLoadingState] = useState(enabled);

  useEffect(() => {
    if (!enabled || !slug) {
      setIsLoadingState(false);
      return;
    }

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

        const cachedResponse = collectionStorage.getFull(slug);
        if (cachedResponse) {
          if (isMounted && !abortController.signal.aborted) {
            setCurrentState(cachedResponse);
            setIsLoadingState(false);
          }
          return;
        }

        const response = await getCollectionUpdateMetadata(slug);
        if (isMounted && !abortController.signal.aborted) {
          if (response === null) {
            setError('Failed to load collection data — editing is unavailable. Reload to retry.');
          } else {
            collectionStorage.update(slug, response.collection);
            collectionStorage.updateFull(slug, response);
            setCurrentState(response);
          }
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

  const collection = currentState?.collection ?? seedCollection;

  /** Stable ref so `resetToBrowse` can read the current collection without taking it as a dep. */
  const latestCollectionRef = useRef(collection);
  useEffect(() => {
    latestCollectionRef.current = collection;
  }, [collection]);

  const [allCollections, setAllCollections] = useState<CollectionListModel[]>([]);

  useEffect(() => {
    if (!enabled) return;
    getMetadata().then(meta => {
      if (meta !== null) setAllCollections(meta.collections);
    });
  }, [enabled]);

  /**
   * Synthetic read-only tag-view rows appended to the selector: one per tag on the current
   * collection. `id` is negated to avoid colliding with real collection ids; `sourceTagId`
   * carries the real tag id for the Save-as-Collection POST.
   */
  const tagViewRows = useMemo<TagViewModel[]>(
    () =>
      (currentState?.tags ?? []).map(tag => ({
        id: -tag.id,
        sourceTagId: tag.id,
        name: tag.name,
        slug: tag.slug,
        derived: true,
      })),
    [currentState?.tags]
  );

  const allCollectionsWithTagViews = useMemo<CollectionListModel[]>(
    () => (tagViewRows.length === 0 ? allCollections : [...allCollections, ...tagViewRows]),
    [allCollections, tagViewRows]
  );

  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isTextBlockModalOpen, setIsTextBlockModalOpen] = useState(false);

  const [isAddMode, setIsAddMode] = useState(false);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);

  const [editTab, setEditTab] = useState<CollectionEditTab>('info');

  const { editingContent, openEditor, closeEditor: baseCloseEditor } = useMetadataEditor();

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

  const seedUpdateData = useCallback(
    (source: CollectionModel): CollectionUpdateRequest => ({
      id: source.id,
      // Seeded (not left undefined) so buildUpdatePayload can tell "unchanged false" from
      // "not in the form" and the InfoTab checkboxes render the stored kind.
      isClient: source.isClient ?? false,
      isBlog: source.isBlog ?? false,
      title: source.title || '',
      description: source.description || '',
      collectionDate: source.collectionDate || '',
      collectionEndDate: source.collectionEndDate || '',
      visibility: source.visibility ?? CollectionVisibility.HIDDEN,
      displayMode: source.displayMode || 'CHRONOLOGICAL',
      rowsWide: source.rowsWide ?? undefined,
    }),
    []
  );

  const [updateData, setUpdateData] = useState<CollectionUpdateRequest>(() =>
    seedUpdateData(collection)
  );

  const seededCollectionIdRef = useRef(collection.id);
  /** True once the buffer has been seeded from the admin DTO (not the public seed prop). */
  const seededFromAdminRef = useRef(currentState !== null);

  const setUpdateField = useCallback(
    <K extends keyof CollectionUpdateRequest>(key: K, value: CollectionUpdateRequest[K]) => {
      setUpdateData(prev => ({ ...prev, [key]: value }));
    },
    []
  );

  const [collectionPeople, setCollectionPeopleState] = useState<ContentPersonModel[]>([]);
  const [peopleSaving, setPeopleSaving] = useState(false);
  const [peopleStatus, setPeopleStatus] = useState<string | null>(null);

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
      const refreshed = await getCollectionUpdateMetadata(collection.slug);
      if (refreshed !== null) {
        setCurrentState(refreshed);
        collectionStorage.update(refreshed.collection.slug, refreshed.collection);
        collectionStorage.updateFull(refreshed.collection.slug, refreshed);
        setCollectionPeopleState(refreshed.collection.people ?? []);
      }
      setPeopleStatus('People regenerated.');
    } catch (error_) {
      setPeopleStatus(handleApiError(error_, 'Failed to regenerate people.'));
    } finally {
      setPeopleSaving(false);
    }
  }, [collection]);

  const [galleryPassword, setGalleryPasswordInput] = useState('');
  const [galleryEmail, setGalleryEmail] = useState('');
  const [galleryStatus, setGalleryStatus] = useState<string | null>(null);
  const [gallerySaving, setGallerySaving] = useState(false);

  /** Identity gate for the staged-field seed below; mirrors the edit buffer's `seeded*` refs. */
  const seededStagedFieldsIdRef = useRef<number | null>(null);
  const seededStagedFieldsFromAdminRef = useRef(false);

  /**
   * Seed the staged People and gallery-access fields on collection identity change, on the
   * one-time admin-DTO adoption, and on re-entering edit mode — never on a background refresh.
   *
   * Keying off `collection.people` / `.galleryPassword` / `.recipientEmails` instead wiped
   * staged-but-unsaved edits. Every save path (inline title commit, cover pick, reorder save,
   * upload, metadata save) calls `setCurrentState` with a fresh DTO whose arrays are new
   * identities, so an unrelated save discarded a pending People or gallery change. The save
   * handlers re-seed these fields themselves from their own responses.
   */
  useEffect(() => {
    if (!enabled) {
      seededStagedFieldsIdRef.current = null;
      seededStagedFieldsFromAdminRef.current = false;
      return;
    }
    const identityChanged = collection.id !== seededStagedFieldsIdRef.current;
    const adoptingAdminDto =
      !identityChanged && !seededStagedFieldsFromAdminRef.current && currentState !== null;
    if (!identityChanged && !adoptingAdminDto) return;
    seededStagedFieldsIdRef.current = collection.id;
    seededStagedFieldsFromAdminRef.current = currentState !== null;
    setCollectionPeopleState(collection.people ?? []);
    setPeopleStatus(null);
    setGalleryPasswordInput(collection.galleryPassword ?? '');
    setGalleryEmail(collection.recipientEmails?.join(', ') ?? '');
    setGalleryStatus(null);
  }, [enabled, collection, currentState]);

  const processedContent = useMemo(
    () =>
      enabled
        ? processContentBlocks(
            collection.content ?? [],
            false,
            collection.id,
            collection.displayMode,
            true
          )
        : EMPTY_CONTENT,
    [enabled, collection.content, collection.id, collection.displayMode]
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

  const { captureDateTargetId, setCaptureDateTargetId, handleCaptureDateSourceClick } =
    useCaptureDateSelection({
      collection,
      setCurrentState,
      setOperationLoading,
      setError,
    });

  /**
   * Metadata sheet -> grid: close the sheet so the GIF's capture date can be sourced by clicking a
   * reference image. Multi-select is dropped explicitly (rather than relying on `closeEditor`,
   * whose clear is conditional on a value this render already invalidated) so the bar lands on
   * pick-date rather than falling back to select.
   */
  const startCaptureDatePick = useCallback(() => {
    if (!editingContent || !isGifContent(editingContent)) return;
    setCaptureDateTargetId(editingContent.id);
    setIsMultiSelectMode(false);
    setSelectedIds([]);
    closeEditor();
  }, [editingContent, closeEditor, setCaptureDateTargetId]);

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

  const deriveManageMode = (): ManageMode => {
    // Checked first: entering the pick clears every other mode flag, so nothing can outrank it.
    if (captureDateTargetId !== null) return 'pick-date';
    if (reorderState.active) return 'reorder';
    if (isMultiSelectMode) return 'select';
    // Outranks 'edit' so the sheet steps aside for the grid while a cover is being picked. The
    // sheet's own open flag is untouched, so cancelling the pick lands back on the sheet with the
    // edit buffer intact — entering the pick must never discard unsaved field edits.
    if (isSelectingCoverImage) return 'pick-cover';
    if (isEditSheetOpen) return 'edit';
    if (isAddMode) return 'add';
    return 'browse';
  };
  const manageMode = deriveManageMode();

  /**
   * Dirty = the payload we would send differs from the payload an *untouched* buffer would send.
   *
   * Deliberately not "the payload has any field beyond id". `seedUpdateData` fabricates defaults
   * for fields the API may not send — `displayMode` is nullable on the backend entity (no
   * @NotNull, no @Builder.Default) and the seed forces 'CHRONOLOGICAL' for it. `buildUpdatePayload`
   * then diffs that fabricated default against the null original, emits a `displayMode` key on
   * every render, and the collection reads dirty forever: Save sits enabled and primary on load,
   * and the exit button never relaxes to "Close".
   *
   * Re-baselining against the pristine seed cancels fabricated defaults out on both sides. It is
   * field-agnostic, so it also covers `visibility` (currently @NotNull, so safe today) and any
   * field dropped from the API later — this same trap previously fired through `type`, before the
   * typeless refactor removed that field.
   */
  const isUpdateDirty = useMemo(() => {
    if (!collection) return false;
    const pristine = buildUpdatePayload(seedUpdateData(collection), collection);
    const current = buildUpdatePayload(updateData, collection);
    return hasObjectChanges(current, pristine);
  }, [updateData, collection, seedUpdateData]);

  const resetToBrowse = useCallback(() => {
    setIsMultiSelectMode(false);
    setSelectedIds([]);
    setIsAddMode(false);
    setIsEditSheetOpen(false);
    if (isSelectingCoverImage) setIsSelectingCoverImage(false);
    setCaptureDateTargetId(null);
    handleCancelReorder();
    setUpdateData(seedUpdateData(latestCollectionRef.current));
  }, [
    isSelectingCoverImage,
    setIsSelectingCoverImage,
    setCaptureDateTargetId,
    handleCancelReorder,
    seedUpdateData,
  ]);

  useEffect(() => {
    if (!enabled) resetToBrowse();
  }, [enabled, resetToBrowse]);

  /**
   * Reseed the edit buffer on collection identity change or on first admin DTO arrival.
   * Background refreshes do NOT reseed to avoid wiping in-progress edits.
   */
  useEffect(() => {
    const identityChanged = collection.id !== seededCollectionIdRef.current;
    const adoptingAdminDto =
      !identityChanged && !seededFromAdminRef.current && currentState !== null;
    if (!identityChanged && !adoptingAdminDto) return;
    seededCollectionIdRef.current = collection.id;
    seededFromAdminRef.current = currentState !== null;
    setUpdateData(seedUpdateData(collection));
    if (identityChanged) {
      setSelectedIds([]);
      setEditTab('info');
      resetToBrowse();
    }
  }, [collection, currentState, seedUpdateData, resetToBrowse]);

  const contentToEdit = useMemo(
    () =>
      (collection.content?.filter(
        contentItem =>
          (isContentImage(contentItem) || isGifContent(contentItem)) &&
          selectedIds.includes(contentItem.id)
      ) as (ContentImageModel | ContentGifModel)[]) || [],
    [selectedIds, collection.content]
  );

  // One parent derivation for both of its consumers (the Gallery Access section and the
  // password-propagate confirm). The server boolean covers the whole content graph; the memoized
  // scan is the fallback and is O(n) over the 500 loaded blocks.
  const isParent = useMemo(
    () =>
      isParentCollection({ content: collection.content, hasChildren: currentState?.hasChildren }),
    [collection.content, currentState?.hasChildren]
  );

  const handleCreateNewTextBlock = useCallback(() => {
    if (!collection) return;
    setIsTextBlockModalOpen(true);
  }, [collection]);

  /**
   * Adopt a successful collection save into hook state and the client cache.
   *
   * Rebases the edit buffer on the saved baseline so the next diff is taken against what the server
   * actually stored, marks the buffer as admin-seeded so the reseed effect leaves it alone, mirrors
   * the response into `collectionStorage`, and revalidates the collection's server cache.
   *
   * Covers only the block the save paths share. Follow-up work that differs per caller — slug
   * redirects, location revalidation, reorder seeding — stays at the call site.
   */
  const adoptSaveResponse = useCallback(
    (response: CollectionUpdateResponseDTO) => {
      setCurrentState(response);
      setUpdateData(seedUpdateData(response.collection));
      seededCollectionIdRef.current = response.collection.id;
      seededFromAdminRef.current = true;
      collectionStorage.update(response.collection.slug, response.collection);
      collectionStorage.updateFull(response.collection.slug, response);
      void revalidateCollectionCache(response.collection.slug);
    },
    [seedUpdateData]
  );

  const handleUpdate = useCallback(
    async (patch?: Partial<CollectionUpdateRequest>) => {
      if (!collection || !currentState) {
        setError('Collection data has not loaded — your change was not saved.');
        return;
      }

      try {
        setSaving(true);
        setError(null);

        const payload = buildUpdatePayload({ ...updateData, ...patch }, collection);
        const response = await updateCollection(collection.id, payload);

        if (response !== null) {
          adoptSaveResponse(response);
          void revalidateLocationCaches(
            collection.locations ?? [],
            response.collection.locations ?? []
          );

          if (response.collection.slug !== collection.slug) {
            router.replace(manageHref(response.collection.slug));
          }

          const locationsUpdate = payload.locations;
          if (
            locationsUpdate &&
            !locationsUpdate.remove?.length &&
            (locationsUpdate.prev?.length || locationsUpdate.newValue?.length)
          ) {
            const resolvedLocationIds = (response.collection.locations ?? []).map(l => l.id);
            if (resolvedLocationIds.length > 0) {
              inheritLocationsToContent(collection.content ?? [], resolvedLocationIds)
                .then(async inherited => {
                  if (!inherited) return;
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
                    'Failed to inherit locations to content',
                    error_
                  );
                  setError('Collection saved, but failed to inherit locations to its content.');
                });
            }
          }
        }
      } catch (error_) {
        setError(handleApiError(error_, 'Failed to update collection'));
      } finally {
        setSaving(false);
      }
    },
    [collection, currentState, updateData, router, adoptSaveResponse]
  );

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
  }, [collection, isParent, galleryPassword, galleryEmail]);

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

  const handleMediaUpload = useCallback(
    async (files: FileList) => {
      if (!collection || files.length === 0) return;

      try {
        setOperationLoading(true);
        setError(null);

        const fileArray = Array.from(files);
        const animatedFiles = fileArray.filter(isAnimatedMediaFile);
        const imageFiles = fileArray.filter(f => !isAnimatedMediaFile(f));
        const uploadFailures: string[] = [];

        const response = await refreshCollectionAfterOperation(
          collection.slug,
          async () => {
            for (const file of imageFiles) {
              // one POST per file to stay under the proxy's multipart cap
              try {
                const formData = new FormData();
                formData.append('files', file);
                await createImages(collection.id, formData);
              } catch (imageError) {
                uploadFailures.push(`${file.name}: ${handleApiError(imageError, 'upload failed')}`);
              }
            }
            for (const file of animatedFiles) {
              try {
                await createGif(collection.id, file);
              } catch (gifError) {
                uploadFailures.push(`${file.name}: ${handleApiError(gifError, 'upload failed')}`);
              }
            }
          },
          getCollectionUpdateMetadata,
          collectionStorage
        );

        setCurrentState(response);

        if (uploadFailures.length > 0) {
          setError(`Some files failed to upload:\n${uploadFailures.join('\n')}`);
        }
      } catch (error_) {
        setError(handleApiError(error_, 'Failed to upload media'));
      } finally {
        setOperationLoading(false);
      }
    },
    [collection]
  );

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

        setCurrentState(response);

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

  const handleMultiSelectToggle = useCallback((imageId: number) => {
    setSelectedIds(prev => handleMultiSelectToggleUtil(imageId, prev));
  }, []);

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

    const selectedGif = collection.content.find(
      (block): block is ContentGifModel => isGifContent(block) && selectedIds.includes(block.id)
    );
    const firstGif = selectedGif;
    if (firstGif) {
      openEditor(firstGif);
    }
  }, [selectedIds, collection, openEditor]);

  const { handleImageClick } = useImageClickHandler({
    isPickingCaptureDate: captureDateTargetId !== null,
    handleCaptureDateSourceClick,
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

          const metadataUpdater = mergeNewMetadata(response);
          setCurrentState(metadataUpdater ? metadataUpdater(fullResponse) : fullResponse);
        }

        setSelectedIds([]);
        setIsMultiSelectMode(false);
      } catch (error_) {
        setError(handleApiError(error_, 'An error occurred. Try reloading the page.'));
      }
    },
    [currentState]
  );

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

  const handleDeleteCollection = useCallback(async () => {
    if (!collection) return;
    // Safety: the home system collection must never be deletable.
    if (collection.slug === HOME_SLUG) {
      setError('The home collection cannot be deleted.');
      return;
    }
    const confirmed = window.confirm(
      `Delete "${collection.title || collection.slug}"? This permanently removes the collection. ` +
        'Its images and their metadata remain in the system.'
    );
    if (!confirmed) return;

    try {
      setDeleting(true);
      setError(null);
      await deleteCollection(collection.id); // throws on failure

      collectionStorage.clear(collection.slug);
      collectionStorage.clearFull(collection.slug);

      const parentSlugs = (collection.parents ?? [])
        .map(parent => parent.slug)
        .filter((parentSlug): parentSlug is string => Boolean(parentSlug));
      await Promise.all([
        revalidateCollectionCache(collection.slug),
        ...parentSlugs.map(parentSlug => revalidateCollectionCache(parentSlug)),
      ]);
      void revalidateMetadataCache();

      router.push('/');
    } catch (error_) {
      setError(handleApiError(error_, 'Failed to delete collection'));
      setDeleting(false); // stay on the page to retry; success navigates away (unmounts)
    }
  }, [collection, router]);

  /**
   * The saved child ids every child toggle is classified against. Prefers the server-supplied
   * list, which is authoritative over the whole content graph rather than over whatever content
   * this client happens to be holding; the content scan is only a fallback for payloads that
   * predate the field and is bounded by `CollectionPageWrapper`'s 500-item fetch.
   *
   * The consequence of a short list is a misclassified toggle, not data loss: `toggleRelation`
   * only ever emits a `remove` for an id it already knows is saved, and `collections` is applied
   * by the backend as an incremental diff — never as a replace-set — so a truncated list can only
   * under-remove. What it actually breaks is unlinking: a child past the bound is absent from
   * `saved`, so the Structure tab paints it unchecked and clicking it stages an ADD (a spurious
   * re-link that also rewrites its `orderIndex`) instead of a REMOVE, making the child impossible
   * to unlink from the UI.
   *
   * `??`, not `||`: an empty server list means "no children", and must not fall through to the
   * scan.
   */
  const originalChildIds = useMemo(
    () =>
      currentState?.childCollectionIds ??
      (collection.content ?? [])
        .filter(isContentCollection)
        .map(block => block.referencedCollectionId),
    [currentState?.childCollectionIds, collection.content]
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

  const currentLocations: LocationModel[] = useMemo(() => {
    const availableLocations = currentState?.locations || [];

    const locationsUpdate = updateData.locations;
    if (locationsUpdate) {
      const result: LocationModel[] = [];
      for (const id of locationsUpdate.prev ?? []) {
        const found = availableLocations.find(loc => loc.id === id);
        if (found) result.push(found);
      }
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

  const currentTags: ContentTagModel[] = useMemo(() => {
    const availableTags = currentState?.tags || [];

    const tagsUpdate = updateData.tags;
    if (tagsUpdate) {
      const result: ContentTagModel[] = [];
      for (const id of tagsUpdate.prev ?? []) {
        const found = availableTags.find(tag => tag.id === id);
        if (found) result.push(found);
      }
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

  const handleTagsChange = useCallback(
    (tags: ContentTagModel[]) => {
      setUpdateData(prev => ({
        ...prev,
        tags: buildTagsDiff(tags, originalTags),
      }));
    },
    [originalTags]
  );

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
   * Rating writes are immediate (no save button), so the failure has to surface here —
   * the caller discards the promise. Rethrows after surfacing so the optimistic star
   * commit is skipped.
   */
  const handleRatingChange = useCallback(async (id: number, rating: number | null) => {
    try {
      setError(null);
      await updateCollectionRating(id, rating);
    } catch (error_) {
      logger.error('useCollectionEdit', `Failed to update rating for collection ${id}`, error_);
      setError(handleApiError(error_, 'Failed to update rating'));
      throw error_;
    }
  }, []);

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
        title: 'New Child Collection',
      });

      await revalidateCollectionCache(collection.slug);

      if (response !== null) {
        router.push(manageHref(response.collection.slug));
      }
    } catch (error_) {
      setError(handleApiError(error_, 'Failed to create child collection'));
    } finally {
      setOperationLoading(false);
    }
  }, [collection, router]);

  const saveTagAsCollection = useCallback(
    async (sourceTagId: number, body: { visibility: CollectionVisibility }) => {
      const response = await saveCollectionFromTag(sourceTagId, body);
      // A null response (204 from fetchBase) means the backend returned no collection to navigate
      // to. Throw so the caller's catch (SaveAsCollectionModal) surfaces it instead of silently
      // closing the modal with no navigation.
      if (response === null) {
        throw new Error('Save as Collection returned no collection');
      }
      void revalidateCollectionCache(response.collection.slug);
      router.push(manageHref(response.collection.slug));
    },
    [router]
  );

  const enterSelect = useCallback(() => setIsMultiSelectMode(true), []);

  const enterReorder = useCallback(() => {
    if (collection.displayMode !== 'CHRONOLOGICAL') {
      handleEnterReorderMode();
      return;
    }
    if (!currentState) {
      setError('Collection data has not loaded — reorder is unavailable.');
      return;
    }
    void (async () => {
      try {
        setOperationLoading(true);
        setError(null);

        // The true displayed (captureDate) order — what the viewer currently sees.
        const chronoIds = toChronologicalOrder(processedContent).map(c => c.id);

        // WRITE A: materialize the full order into orderIndex while still CHRONOLOGICAL. This is
        // harmless (chronological display ignores orderIndex) and makes cancel safe. Full
        // re-index (not a diff) so every unmoved item gets its true position persisted.
        if (chronoIds.length > 0) {
          const fullChanges = chronoIds.map((id, i) => ({ contentId: id, newOrderIndex: i }));
          await executeReorderOperation(collection.id, fullChanges, collection.slug);
        }

        // WRITE B: switch to ORDERED. Done second so a failure above leaves the collection
        // CHRONOLOGICAL and visually unchanged.
        const payload = buildUpdatePayload({ ...updateData, displayMode: 'ORDERED' }, collection);
        const response = await updateCollection(collection.id, payload);
        if (response !== null) {
          adoptSaveResponse(response);

          // Seed the reorder base from the order we just persisted (not the stale processedContent).
          handleEnterReorderMode(chronoIds);
        }
      } catch (error_) {
        setError(handleApiError(error_, 'Failed to switch to ordered mode.'));
      } finally {
        setOperationLoading(false);
      }
    })();
  }, [
    collection,
    currentState,
    updateData,
    processedContent,
    adoptSaveResponse,
    handleEnterReorderMode,
  ]);
  const enterAdd = useCallback(() => setIsAddMode(true), []);
  const enterEdit = useCallback(() => setIsEditSheetOpen(true), []);
  const exitToBrowse = resetToBrowse;

  const isLoading = isLoadingState || operationLoading;

  const bottomBarCells = useMemo<EditBarCell[]>(() => {
    // Pick-date is a one-action mode: the grid click IS the commit, so Cancel is the only cell.
    if (manageMode === 'pick-date') {
      return [{ key: 'cancel', label: 'Cancel', onClick: resetToBrowse }];
    }

    // Same shape as pick-date, but cancelling only drops the pick — resetToBrowse would also
    // close a sheet the pick was launched from and reseed its buffer.
    if (manageMode === 'pick-cover') {
      return [{ key: 'cancel', label: 'Cancel', onClick: () => setIsSelectingCoverImage(false) }];
    }

    if (manageMode === 'reorder') {
      return [
        {
          key: 'save',
          label: 'Save',
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
        {
          key: 'edit',
          label: `Edit${selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}`,
          variant: 'primary',
          disabled: selectedIds.length === 0,
          onClick: handleBulkEdit,
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
          label: operationLoading ? 'Uploading…' : 'Upload',
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
        {
          key: 'cancel',
          label: isUpdateDirty ? 'Cancel' : 'Close',
          onClick: resetToBrowse,
        },
      ];
    }

    // Disabled until admin DTO settles and no operation is in flight (including a mid-save state machine race).
    // TODO(A3): add a "Save as Collection" browse cell when collection.derived — needs admin metadata to resolve tag slugs (tag-view URLs render TaxonomyPage, not useCollectionEdit).
    const browseBusy = isLoading || saving;
    const cells: EditBarCell[] = [
      {
        key: 'select',
        label: 'Select',
        disabled: browseBusy,
        onClick: enterSelect,
      },
      {
        key: 'reorder',
        label: 'Reorder',
        disabled: browseBusy,
        onClick: enterReorder,
      },
      // Add is un-gated (D4): any collection may hold any mix of content, so holding a child
      // collection no longer removes the ability to add images.
      {
        key: 'add',
        label: operationLoading ? 'Uploading…' : 'Add',
        disabled: browseBusy,
        onClick: enterAdd,
      },
      {
        key: 'edit',
        label: 'Edit',
        disabled: browseBusy,
        onClick: () => setIsEditSheetOpen(true),
      },
    ];
    if (onExitManage) {
      // "Close" when nothing has been edited (nothing to discard); "Cancel" once there are
      // unsaved changes, signalling that leaving abandons them. Matches the metadata sheet.
      cells.push({
        key: 'cancel',
        label: isUpdateDirty ? 'Cancel' : 'Close',
        onClick: onExitManage,
      });
    }
    return cells;
  }, [
    manageMode,
    isLoading,
    operationLoading,
    reorderState.moves.length,
    handleSaveReorder,
    handleCancelReorder,
    collection.content,
    selectedIds,
    handleBulkEdit,
    handleCoverImageClick,
    setIsSelectingCoverImage,
    resetToBrowse,
    handleBulkRemove,
    handleCreateNewTextBlock,
    handleMediaUpload,
    saving,
    isUpdateDirty,
    handleUpdate,
    enterSelect,
    enterReorder,
    enterAdd,
    onExitManage,
  ]);

  const bottomBarTabs = useMemo<EditBarTab[] | undefined>(() => {
    if (manageMode !== 'edit') return;
    return [
      { id: 'info', label: 'Info' },
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
    deleting,
    handleDeleteCollection,

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

    allCollections,
    allCollectionsWithTagViews,
    saveTagAsCollection,
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
    updateCollectionRating: handleRatingChange,

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
    startCaptureDatePick,

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
    clearError: useCallback(() => setError(null), []),
  };
}
