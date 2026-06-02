'use client';

import CollectionListSelector from '@/app/components/CollectionListSelector/CollectionListSelector';
import { LoadingSpinner } from '@/app/components/LoadingSpinner/LoadingSpinner';
import { CloseButton } from '@/app/components/ui/CloseButton/CloseButton';
import { Modal } from '@/app/components/ui/Modal/Modal';
import { type CollectionListModel, type LocationModel } from '@/app/types/Collection';
import {
  type ContentGifModel,
  type ContentImageModel,
  type ContentImageUpdateResponse,
} from '@/app/types/Content';
import {
  type ContentCameraModel,
  type ContentFilmTypeModel,
  type ContentLensModel,
  type ContentPersonModel,
  type ContentTagModel,
  type FilmFormatDTO,
} from '@/app/types/ImageMetadata';
import { isGifContent } from '@/app/utils/contentTypeGuards';

import { useImageMetadataState } from './hooks/useImageMetadataState';
import { useImageMetadataSubmit } from './hooks/useImageMetadataSubmit';
import styles from './ImageMetadataModal.module.scss';
import CameraSettingsSection from './sections/CameraSettingsSection';
import EssentialInfoSection from './sections/EssentialInfoSection';
import MediaPreview from './sections/MediaPreview';
import TagsPeopleSection from './sections/TagsPeopleSection';

/** Any content the modal can edit — images and animated GIF/MP4 blocks. */
type EditableContent = ContentImageModel | ContentGifModel;

interface ImageMetadataModalProps {
  onClose: () => void;
  onSaveSuccess?: (response: ContentImageUpdateResponse) => void;
  /**
   * Fired after a single-GIF save. Separate from `onSaveSuccess` because the GIF update endpoint
   * returns one record instead of the batched ImageUpdate response.
   */
  onGifSaveSuccess?: (gif: ContentGifModel) => void;
  onDeleteSuccess?: (deletedIds: number[]) => void;
  onRemoveFromCollectionSuccess?: (removedImageIds: number[]) => void;
  availableTags?: ContentTagModel[];
  availablePeople?: ContentPersonModel[];
  availableCameras?: ContentCameraModel[];
  availableLenses?: ContentLensModel[];
  availableFilmTypes?: ContentFilmTypeModel[];
  availableFilmFormats?: FilmFormatDTO[];
  availableCollections?: CollectionListModel[];
  availableLocations?: LocationModel[];
  selectedImageIds: number[]; // Array of selected content IDs (1 for single edit, N for bulk edit)
  /**
   * Content blocks to edit. May include images and GIF/MP4 blocks. Bulk edit only operates on
   * the IMAGE subset (the EXIF-heavy fields don't have GIF analogs); when the selection is a
   * single GIF the modal routes title/rating/tags/collections through `updateGif()`.
   */
  selectedImages: EditableContent[];
  currentCollectionId?: number; // ID of the collection being edited (for visibility checkbox)
}

/**
 * Orchestrator for the image/GIF metadata editor sheet modal.
 *
 * Composes `<MediaPreview>` (left panel) with the metadata form (right panel) via
 * `useImageMetadataState` and `useImageMetadataSubmit`. Zero business logic lives here —
 * this file is state-routing + JSX-composition only.
 */
export default function ImageMetadataModal({
  onClose,
  onSaveSuccess,
  onGifSaveSuccess,
  onDeleteSuccess,
  onRemoveFromCollectionSuccess,
  availableTags = [],
  availablePeople = [],
  availableCameras = [],
  availableLenses = [],
  availableFilmTypes = [],
  availableFilmFormats = [],
  availableCollections = [],
  availableLocations = [],
  selectedImageIds,
  selectedImages,
  currentCollectionId,
}: ImageMetadataModalProps) {
  const isBulkEdit = selectedImageIds.length > 1;

  const {
    updateState,
    updateStateField,
    hasChanges,
    originalCollectionIds,
    pendingAddIds,
    pendingRemoveIds,
    handleCollectionToggle,
  } = useImageMetadataState({ selectedImages, availableLocations });

  const { saving, error, handleSubmit, handleCancel, handleDelete, handleRemoveFromCollection } =
    useImageMetadataSubmit({
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
    });

  const previewImage = selectedImages[0];

  if (!previewImage) {
    return null;
  }

  /** `isGif` drives the disabled-state on caption + camera-settings sections. */
  const isGif = isGifContent(previewImage);

  return (
    <Modal open onClose={handleCancel} variant="sheet" labelledBy="metadata-modal-title">
      <div className={styles.metadataLayout}>
        <MediaPreview
          isBulkEdit={isBulkEdit}
          selectedImages={selectedImages}
          selectedImageIds={selectedImageIds}
          previewImage={previewImage}
        />

        {/* Metadata Section - Right Side */}
        <div className={styles.metadataSection}>
          <h2 id="metadata-modal-title" className={styles.heading}>
            {isBulkEdit ? `Edit ${selectedImageIds.length} Images` : 'Edit Image Metadata'}
          </h2>

          {error && (
            <div className={styles.errorMessage} role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <EssentialInfoSection
              updateState={updateState}
              updateStateField={updateStateField}
              availableLocations={availableLocations}
              availableCollections={availableCollections}
              currentCollectionId={currentCollectionId}
              isGif={isGif}
            />

            <CameraSettingsSection
              updateState={updateState}
              updateStateField={updateStateField}
              availableCameras={availableCameras}
              availableLenses={availableLenses}
              availableFilmTypes={availableFilmTypes}
              availableFilmFormats={availableFilmFormats}
              isGif={isGif}
            />

            <TagsPeopleSection
              updateState={updateState}
              updateStateField={updateStateField}
              availableTags={availableTags}
              availablePeople={availablePeople}
            />

            {/* Collections */}
            <div className={styles.formSection}>
              <CollectionListSelector
                allCollections={availableCollections}
                savedCollectionIds={originalCollectionIds}
                pendingAddIds={pendingAddIds}
                pendingRemoveIds={pendingRemoveIds}
                onToggle={handleCollectionToggle}
                label="Collections"
                excludeCollectionId={currentCollectionId}
              />
            </div>

            {/* Action Buttons */}
            <div className={styles.buttonRow}>
              <div className={styles.buttonRowLeft}>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className={styles.deleteButton}
                >
                  {saving ? (
                    <>
                      <LoadingSpinner size="small" color="white" />
                      <span className={styles.loadingLabel}>Deleting...</span>
                    </>
                  ) : (
                    `Delete ${isBulkEdit ? `${selectedImageIds.length} Images` : 'Image'}`
                  )}
                </button>
                {currentCollectionId && (
                  <button
                    type="button"
                    onClick={handleRemoveFromCollection}
                    disabled={saving}
                    className={styles.removeButton}
                    title="Remove from current collection (image stays in the system)"
                  >
                    {saving ? (
                      <>
                        <LoadingSpinner size="small" color="white" />
                        <span className={styles.loadingLabel}>Removing...</span>
                      </>
                    ) : (
                      `Remove ${isBulkEdit ? `${selectedImageIds.length} Images` : 'Image'}`
                    )}
                  </button>
                )}
              </div>
              <div className={styles.buttonRowRight}>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !hasChanges}
                  className={styles.saveButton}
                >
                  {saving ? (
                    <>
                      <LoadingSpinner size="small" color="white" />
                      <span className={styles.loadingLabel}>Saving...</span>
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Close Button — floats over the top-right corner of the sheet. */}
      <div className={styles.closeButtonSlot}>
        <CloseButton onClick={handleCancel} aria-label="Close metadata editor" disabled={saving} />
      </div>
    </Modal>
  );
}
