'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { type CollectionListModel, type LocationModel } from '@/app/types/Collection';
import { type ContentGifModel, type ContentImageModel } from '@/app/types/Content';
import { type ContentCameraModel } from '@/app/types/Metadata';
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

export function useMetadataState({
  selectedImages,
  selectedIds,
  availableLocations,
}: UseMetadataStateParams): UseMetadataStateResult {
  // Use a module-scope constant when availableLocations is absent OR empty to prevent the
  // effect from re-firing every render due to a new [] reference. The ?? operator alone is
  // insufficient — a caller that passes `[]` literally would produce a new array each render.
  // Using `length` as the guard: empty caller-passed arrays are interchangeable with EMPTY_LOCATIONS.
  const stableLocations =
    availableLocations && availableLocations.length > 0 ? availableLocations : EMPTY_LOCATIONS;

  const isBulkEdit = selectedIds.length > 1;

  // `getCommonValues` was authored for ContentImageModel only — for GIF blocks we slot the union
  // in but the bulk-edit code path only ever runs on images (ManageClient.handleBulkEdit splits
  // mixed selections), so the cast here is safe at runtime.
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
    // Safe to use selectedImages directly: the parent (ManageClient) passes a stable reference
    // from useState-backed contentToEdit, so this array identity only changes on a real selection
    // change. stableLocations handles the empty-array default-param footgun (a new [] literal each
    // render would otherwise trigger an infinite loop via: setState → re-render → new [] → effect).
    // buildInitialState is an inline closure; omitting it from deps is intentional — its captured
    // values (selectedImages, stableLocations) are already listed above.
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
    } else {
      const original = selectedImages[0]!;
      return hasObjectChanges(updateState, original);
    }
    // imageSubset is derived from selectedImages each render; reflect that in deps.
  }, [updateState, selectedImages, isBulkEdit]);

  const originalCollectionIds = useMemo(() => {
    const ids = new Set<number>();
    if (!isBulkEdit && selectedImages[0]?.collections) {
      for (const c of selectedImages[0].collections) {
        ids.add(c.collectionId);
      }
    }
    return ids;
  }, [selectedImages, isBulkEdit]);

  const pendingAddIds = useMemo(() => {
    const ids = new Set<number>();
    for (const c of updateState.collections || []) {
      if (!originalCollectionIds.has(c.collectionId)) {
        ids.add(c.collectionId);
      }
    }
    return ids;
  }, [updateState.collections, originalCollectionIds]);

  const pendingRemoveIds = useMemo(() => {
    const ids = new Set<number>();
    const currentIds = new Set((updateState.collections || []).map(c => c.collectionId));
    for (const id of originalCollectionIds) {
      if (!currentIds.has(id)) {
        ids.add(id);
      }
    }
    return ids;
  }, [updateState.collections, originalCollectionIds]);

  const handleCollectionToggle = useCallback((collection: CollectionListModel) => {
    setUpdateState(prev => {
      const currentCollections = prev.collections || [];
      const exists = currentCollections.some(c => c.collectionId === collection.id);

      const updatedCollections = exists
        ? currentCollections.filter(c => c.collectionId !== collection.id)
        : [
            ...currentCollections,
            {
              collectionId: collection.id,
              name: collection.name,
              visible: true,
              orderIndex: currentCollections.length,
            },
          ];

      return { ...prev, collections: updatedCollections };
    });
  }, []);

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
