'use client';

import { type SubmitEvent, useState } from 'react';

import { deleteGif, deleteImages, updateGif, updateImages } from '@/app/lib/api/content';
import { type LocationModel } from '@/app/types/Collection';
import {
  type ContentGifModel,
  type ContentImageModel,
  type ContentImageUpdateRequest,
  type ContentImageUpdateResponse,
} from '@/app/types/Content';
import { type ContentFilmTypeModel } from '@/app/types/ImageMetadata';
import { isGifContent } from '@/app/utils/contentTypeGuards';

import {
  buildGifUpdatePayload,
  buildImageUpdateDiff,
  buildImageUpdateForSingleEdit,
  buildImageUpdatesForBulkEdit,
  mapUpdateResponseToFrontend,
} from '../imageMetadataUtils';
import type { EditableContent } from '../types';
import type { ImageUpdateState } from './useImageMetadataState';

export interface UseImageMetadataSubmitParams {
  selectedImages: EditableContent[];
  selectedImageIds: number[];
  updateState: ImageUpdateState;
  hasChanges: boolean;
  originalCollectionIds: Set<number>;
  availableFilmTypes: ContentFilmTypeModel[];
  currentCollectionId?: number;
  onClose: () => void;
  onSaveSuccess?: (response: ContentImageUpdateResponse) => void;
  onGifSaveSuccess?: (gif: ContentGifModel) => void;
  onDeleteSuccess?: (deletedIds: number[]) => void;
  onRemoveFromCollectionSuccess?: (removedImageIds: number[]) => void;
}

export interface UseImageMetadataSubmitResult {
  saving: boolean;
  error: string | null;
  handleSubmit: (e: SubmitEvent<HTMLFormElement>) => Promise<void>;
  handleCancel: () => void;
  handleDelete: () => Promise<void>;
  handleRemoveFromCollection: () => Promise<void>;
}

export function useImageMetadataSubmit({
  selectedImages,
  selectedImageIds,
  updateState,
  hasChanges,
  originalCollectionIds,
  availableFilmTypes,
  currentCollectionId,
  onClose,
  onSaveSuccess,
  onGifSaveSuccess,
  onDeleteSuccess,
  onRemoveFromCollectionSuccess,
}: UseImageMetadataSubmitParams): UseImageMetadataSubmitResult {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isBulkEdit = selectedImageIds.length > 1;

  // "Remove from collection" only operates on IMAGE blocks today — the bulk diff helper is
  // typed to ContentImageModel. Skip GIF entries; they'll be a follow-up.
  const imageSubset = selectedImages.filter(
    (c): c is ContentImageModel => c.contentType === 'IMAGE'
  );

  const previewImage = selectedImages[0];
  const isGif = previewImage ? isGifContent(previewImage) : false;
  const previewImageAsGif = isGif ? (previewImage as ContentGifModel) : null;

  // The single-GIF edit/delete path applies only to a non-bulk GIF selection. Bulk-edit on GIF is
  // not supported yet — ManageClient.handleBulkEdit splits mixed selections, so a batch never
  // reaches here as a "GIF edit". When set, handleSubmit/handleDelete route through the GIF
  // endpoints; otherwise the image path runs.
  const singleGifTarget = isBulkEdit ? null : previewImageAsGif;

  /**
   * Shared save lifecycle. Flips `saving` on, clears the error, runs the operation, surfaces any
   * thrown message, and always clears `saving`. Centralizes the try/catch/finally every save path
   * needs so the "saving never sticks on" invariant can't be missed in one branch.
   */
  const runSave = async (operation: () => Promise<void>, fallbackError: string) => {
    try {
      setSaving(true);
      setError(null);
      await operation();
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : fallbackError);
    } finally {
      setSaving(false);
    }
  };

  const submitGifEdit = async (gifModel: ContentGifModel) => {
    const payload = buildGifUpdatePayload(updateState, gifModel, originalCollectionIds);
    const updated =
      Object.keys(payload).length > 0 ? await updateGif(gifModel.id, payload) : gifModel;
    if (updated) {
      onGifSaveSuccess?.(updated);
      onClose();
    }
  };

  const submitImageEdits = async () => {
    const imageUpdates: ContentImageUpdateRequest[] = isBulkEdit
      ? buildImageUpdatesForBulkEdit(
          updateState as Partial<ContentImageModel> & {
            id: number;
            location?: LocationModel | null;
          },
          selectedImages.filter(
            (s): s is ContentImageModel => s.contentType === 'IMAGE'
          ) as ContentImageModel[],
          selectedImageIds,
          availableFilmTypes
        )
      : [
          buildImageUpdateForSingleEdit(
            updateState as ContentImageModel & { location?: LocationModel | null },
            selectedImages[0] as ContentImageModel,
            availableFilmTypes
          ),
        ];

    const response = await updateImages(imageUpdates);
    if (response !== null) {
      onSaveSuccess?.(mapUpdateResponseToFrontend(response));
      onClose();
    }
  };

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!hasChanges) {
      onClose();
      return;
    }

    await runSave(
      () => (singleGifTarget ? submitGifEdit(singleGifTarget) : submitImageEdits()),
      'Failed to update image'
    );
  };

  const handleCancel = () => {
    if (hasChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirmed) return;
    }
    onClose();
  };

  const handleDelete = async () => {
    const imageCount = selectedImageIds.length;
    const noun = isGif ? 'GIF/MP4' : 'image';
    const nounPlural = isGif ? 'GIFs/MP4s' : 'images';
    const confirmMessage =
      imageCount === 1
        ? `Are you sure you want to delete this ${noun}? This will remove it from S3 and the database. This action cannot be undone.`
        : `Are you sure you want to delete ${imageCount} ${nounPlural}? This will remove them from S3 and the database. This action cannot be undone.`;

    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) return;

    await runSave(async () => {
      // Single GIF: route to the GIF delete endpoint. Bulk-gif delete isn't supported yet — we
      // process the single visible selection only.
      if (singleGifTarget) {
        const result = await deleteGif(singleGifTarget.id);
        if (result?.deletedId != null) {
          onDeleteSuccess?.([result.deletedId]);
          onClose();
        }
        return;
      }

      const response = await deleteImages(selectedImageIds);
      if (response !== null) {
        onDeleteSuccess?.(response.deletedIds);
        onClose();
      }
    }, 'Failed to delete images');
  };

  const handleRemoveFromCollection = async () => {
    if (!currentCollectionId) return;

    const imageCount = selectedImageIds.length;
    const confirmMessage =
      imageCount === 1
        ? 'Remove this image from the current collection? The image and its metadata will remain in the system.'
        : `Remove ${imageCount} images from the current collection? Images and their metadata will remain in the system.`;

    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) return;

    await runSave(async () => {
      const imageUpdates: ContentImageUpdateRequest[] = imageSubset.map(img => {
        const trimmedCollections = (img.collections || []).filter(
          c => c.collectionId !== currentCollectionId
        );
        return buildImageUpdateDiff(
          { id: img.id, collections: trimmedCollections },
          img,
          availableFilmTypes
        );
      });

      const response = await updateImages(imageUpdates);
      if (response !== null) {
        onRemoveFromCollectionSuccess?.(selectedImageIds);
        onClose();
      }
    }, 'Failed to remove images from collection');
  };

  return {
    saving,
    error,
    handleSubmit,
    handleCancel,
    handleDelete,
    handleRemoveFromCollection,
  };
}
