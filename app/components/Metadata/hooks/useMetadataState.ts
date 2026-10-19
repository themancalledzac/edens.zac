'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useToggleTriple } from '@/app/hooks/useToggleTriple';
import {
  type ChildCollection,
  type CollectionListModel,
  type CollectionUpdate,
  type LocationModel,
} from '@/app/types/Collection';
import { type ContentGifModel, type ContentImageModel } from '@/app/types/Content';
import { type ContentCameraModel } from '@/app/types/Metadata';
import { toggleRelation } from '@/app/utils/collectionToggle';
import { convertLocationsToModels } from '@/app/utils/locationUtils';
import { hasObjectChanges } from '@/app/utils/objectComparison';

import { getCommonValues } from '../metadataUtils';
import type { EditableContent } from '../types';

/**
 * Local edit-state shape. We allow GIF fields too because the same modal now edits both — image-
 * only fields are disabled in the JSX when the current selection is a GIF.
 */
export type ImageUpdateState = Partial<ContentImageModel> &
  Partial<Pick<ContentGifModel, 'gifUrl' | 'thumbnailUrl' | 'rating'>> & {
    id: number;
  };

/**
 * Stable empty array used as the default for `availableLocations` to prevent the
 * useEffect from re-firing on every render when the caller passes nothing.
 * (A new `[]` literal each render is a new reference → triggers the effect → setState →
 * re-render → new `[]` → infinite loop.)
 */
const EMPTY_LOCATIONS: LocationModel[] = [];

/**
 * Toggle one collection on the image-side FLAT array (`ChildCollection[]`) representation.
 *
 * The image editor stores collection membership as a single flat array of `ChildCollection`
 * (saved-and-kept items + pending additions; a removed saved item is simply absent). The shared
 * pure {@link toggleRelation} engine speaks the discrete `prev`/`newValue`/`remove`
 * `CollectionUpdate` shape that the collection editor uses, so this adapter:
 *
 * 1. Projects the current flat array into a `CollectionUpdate` (`newValue` = pending adds not in
 *    `originalIds`; `remove` = saved IDs absent from the flat array).
 * 2. Runs the shared engine.
 * 3. Re-flattens: every saved ID still kept (not in the engine's `remove`) plus every pending add
 *    in `newValue`. Existing flat objects are reused so saved-item metadata (name/slug/cover) is
 *    preserved; an un-removed saved item is rebuilt from the toggled `CollectionListModel`.
 *
 * Engine stays pure; this flat-array adaptation is the only image-specific glue.
 */
export function toggleCollectionFlat(
  currentCollections: ChildCollection[],
  toggled: CollectionListModel,
  originalIds: Set<number>
): ChildCollection[] {
  const buildEntry = (collection: CollectionListModel, index: number): ChildCollection => ({
    collectionId: collection.id,
    name: collection.name,
    visible: true,
    orderIndex: index,
  });

  const pendingAdds = currentCollections.filter(c => !originalIds.has(c.collectionId));
  const currentIds = new Set(currentCollections.map(c => c.collectionId));
  const pendingRemoves: number[] = [];
  for (const id of originalIds) {
    if (!currentIds.has(id)) pendingRemoves.push(id);
  }
  const current: CollectionUpdate = {
    newValue: pendingAdds.length > 0 ? pendingAdds : undefined,
    remove: pendingRemoves.length > 0 ? pendingRemoves : undefined,
  };

  const next = toggleRelation(current, toggled, originalIds, buildEntry);

  const nextRemove = new Set(next?.remove ?? []);
  const existingById = new Map(currentCollections.map(c => [c.collectionId, c]));
  const kept: ChildCollection[] = [];
  for (const id of originalIds) {
    if (nextRemove.has(id)) continue;
    const existing = existingById.get(id);
    if (existing) {
      kept.push(existing);
    } else if (id === toggled.id) {
      kept.push(buildEntry(toggled, kept.length));
    }
  }
  return [...kept, ...(next?.newValue ?? [])];
}

export interface UseMetadataStateResult {
  updateState: ImageUpdateState;
  updateStateField: (updates: Partial<ImageUpdateState>) => void;
  hasChanges: boolean;
  originalCollectionIds: Set<number>;
  pendingAddIds: Set<number>;
  pendingRemoveIds: Set<number>;
  handleCollectionToggle: (collection: CollectionListModel) => void;
  replaceOptimisticCamera: (optimisticName: string, replacement: ContentCameraModel | null) => void;
}

interface UseMetadataStateParams {
  selectedImages: EditableContent[];
  selectedIds: number[];
  availableLocations?: LocationModel[];
}

/**
 * Edit state for the metadata modal. Empty `availableLocations` falls back to a module constant,
 * and the reset effect depends on `selectedImages`, so both need stable references or it loops.
 * Bulk edit only runs on images, so the GIF-typed selection is safe to filter to images.
 */
export function useMetadataState({
  selectedImages,
  selectedIds,
  availableLocations,
}: UseMetadataStateParams): UseMetadataStateResult {
  const stableLocations =
    availableLocations && availableLocations.length > 0 ? availableLocations : EMPTY_LOCATIONS;

  const isBulkEdit = selectedIds.length > 1;

  const imageSubset = selectedImages.filter(
    (c): c is ContentImageModel => c.contentType === 'IMAGE'
  );

  const buildInitialState = (): ImageUpdateState => {
    if (selectedImages.length === 1) {
      const item = selectedImages[0]!;
      const itemLocations = 'locations' in item ? item.locations : undefined;
      return {
        ...item,
        locations: convertLocationsToModels(itemLocations, stableLocations),
      } as ImageUpdateState;
    }
    const common = getCommonValues(imageSubset);
    return {
      id: 0,
      ...common,
      locations: convertLocationsToModels(common.locations, stableLocations),
    };
  };

  const [updateState, setUpdateState] = useState<ImageUpdateState>(buildInitialState);

  useEffect(() => {
    setUpdateState(buildInitialState());
  }, [selectedImages, stableLocations]);

  const updateStateField = (updates: Partial<ImageUpdateState>) => {
    setUpdateState(prev => ({ ...prev, ...updates }));
  };

  /**
   * Swap (or revert) the optimistic `{ id: 0 }` camera created by the Camera
   * "add new" flow — but ONLY if the current selection is still that exact
   * placeholder. If the user changed or cleared the camera while the create was
   * in flight, this is a no-op so their newer choice survives (fixes the
   * stale-write race that a blind `updateStateField` swap would cause). Pass the
   * server-assigned camera on success, or the prior camera / null to revert on
   * failure.
   */
  const replaceOptimisticCamera = useCallback(
    (optimisticName: string, replacement: ContentCameraModel | null) => {
      setUpdateState(prev =>
        prev.camera?.id === 0 && prev.camera.name === optimisticName
          ? { ...prev, camera: replacement }
          : prev
      );
    },
    []
  );

  const hasChanges = useMemo(() => {
    if (isBulkEdit) {
      const common = getCommonValues(imageSubset);
      return hasObjectChanges(updateState, { id: 0, ...common });
    }
    const original = selectedImages[0];
    if (!original) return false;
    return hasObjectChanges(updateState, original);
  }, [updateState, selectedImages, isBulkEdit]);

  const originalIds = useMemo(
    () => (isBulkEdit ? [] : (selectedImages[0]?.collections ?? []).map(c => c.collectionId)),
    [selectedImages, isBulkEdit]
  );

  const pendingRemoves = useMemo(() => {
    const currentIds = new Set((updateState.collections ?? []).map(c => c.collectionId));
    return originalIds.filter(id => !currentIds.has(id));
  }, [updateState.collections, originalIds]);

  const {
    savedIds: originalCollectionIds,
    pendingAddIds,
    pendingRemoveIds,
  } = useToggleTriple(originalIds, updateState.collections, pendingRemoves, c => c.collectionId);

  const handleCollectionToggle = useCallback(
    (collection: CollectionListModel) => {
      setUpdateState(prev => ({
        ...prev,
        collections: toggleCollectionFlat(
          prev.collections || [],
          collection,
          originalCollectionIds
        ),
      }));
    },
    [originalCollectionIds]
  );

  return {
    updateState,
    updateStateField,
    hasChanges,
    originalCollectionIds,
    pendingAddIds,
    pendingRemoveIds,
    handleCollectionToggle,
    replaceOptimisticCamera,
  };
}
