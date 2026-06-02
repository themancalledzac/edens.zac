'use client';

import { type SubmitEvent, useState } from 'react';

import {
  type ContentGifUpdateRequest,
  deleteGif,
  deleteImages,
  updateGif,
  updateImages,
} from '@/app/lib/api/content';
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
  buildContentPeopleLocationsDiff,
  buildImageUpdateDiff,
  buildImageUpdateForSingleEdit,
  buildImageUpdatesForBulkEdit,
  mapUpdateResponseToFrontend,
} from '../imageMetadataUtils';

/** Any content the modal can edit — images and animated GIF/MP4 blocks. */
type EditableContent = ContentImageModel | ContentGifModel;

/**
 * Local edit-state shape. We allow GIF fields too because the same modal now edits both — image-
 * only fields are disabled in the JSX when the current selection is a GIF.
 */
type ImageUpdateState = Partial<ContentImageModel> &
  Partial<Pick<ContentGifModel, 'gifUrl' | 'thumbnailUrl' | 'rating'>> & {
    id: number;
  };

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

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!hasChanges) {
      onClose();
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Single GIF: route through the GIF patch endpoint. Bulk-edit on GIF is not supported yet —
      // selectedImages was already filtered upstream in ManageClient.handleBulkEdit so a mixed
      // selection won't reach here as a "GIF edit"; we treat anything non-IMAGE as a single-gif
      // edit and reject batch.
      if (!isBulkEdit && isGif && previewImageAsGif) {
        const original = previewImageAsGif;
        const payload: ContentGifUpdateRequest = {};
        if ((updateState.title ?? '') !== (original.title ?? '')) {
          payload.title = updateState.title ?? '';
        }
        if (updateState.rating !== undefined && updateState.rating !== (original.rating ?? null)) {
          payload.rating = updateState.rating ?? 0;
        }
        // Collections: build prev/newValue/remove from originalCollectionIds vs current selection
        const currentCollectionIds = new Set(
          (updateState.collections || []).map(c => c.collectionId)
        );
        const add = (updateState.collections || []).filter(
          c => !originalCollectionIds.has(c.collectionId)
        );
        const remove: number[] = [];
        for (const id of originalCollectionIds) {
          if (!currentCollectionIds.has(id)) remove.push(id);
        }
        if (add.length > 0 || remove.length > 0) {
          payload.collections = {
            newValue: add.length > 0 ? add : undefined,
            remove: remove.length > 0 ? remove : undefined,
          };
        }
        // People + locations: reuse the same prev/newValue/remove builders the image path uses, so
        // a GIF/MP4 can carry general relational metadata. Only attach keys that actually changed.
        const { people, locations } = buildContentPeopleLocationsDiff(updateState, original);
        if (people !== undefined) {
          payload.people = people;
        }
        if (locations !== undefined) {
          payload.locations = locations;
        }

        const updated =
          Object.keys(payload).length > 0 ? await updateGif(original.id, payload) : original;
        if (updated) {
          onGifSaveSuccess?.(updated as ContentGifModel);
          onClose();
        }
        return;
      }

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
        const updateResponse = mapUpdateResponseToFrontend(response);

        onSaveSuccess?.(updateResponse);
        onClose();
      }
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Failed to update image');
    } finally {
      setSaving(false);
    }
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

    try {
      setSaving(true);
      setError(null);

      // Single GIF: route to the GIF delete endpoint. Bulk-gif delete isn't supported yet — we
      // process the single visible selection only.
      if (!isBulkEdit && isGif && previewImageAsGif) {
        const result = await deleteGif(previewImageAsGif.id);
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
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Failed to delete images');
    } finally {
      setSaving(false);
    }
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

    try {
      setSaving(true);
      setError(null);

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
    } catch (error_) {
      setError(
        error_ instanceof Error ? error_.message : 'Failed to remove images from collection'
      );
    } finally {
      setSaving(false);
    }
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
