'use client';

import CollectionListSelector from '@/app/components/CollectionListSelector/CollectionListSelector';
import { LoadingSpinner } from '@/app/components/LoadingSpinner/LoadingSpinner';
import { CloseButton } from '@/app/components/ui/CloseButton/CloseButton';
import Dropdown from '@/app/components/ui/Dropdown/Dropdown';
import { Modal } from '@/app/components/ui/Modal/Modal';
import { createCamera } from '@/app/lib/api/content';
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
import { computeCameraSelectionUpdate } from './imageMetadataUtils';
import EssentialInfoSection from './sections/EssentialInfoSection';
import MediaPreview from './sections/MediaPreview';

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

            {/* Camera Metadata — image-only, greyed out for GIF/MP4 blocks. */}
            <div
              className={styles.formSection}
              style={isGif ? { opacity: 0.4, pointerEvents: 'none' } : undefined}
              aria-disabled={isGif}
              title={
                isGif ? 'Camera/EXIF metadata is not supported on GIF/MP4 content.' : undefined
              }
            >
              <h3 className={styles.sectionHeading}>Camera Settings</h3>

              <Dropdown<ContentCameraModel>
                label="Camera"
                multiSelect={false}
                options={availableCameras}
                selectedValue={updateState.camera || null}
                onChange={value => {
                  const camera = Array.isArray(value) ? value[0] || null : value;
                  updateStateField(computeCameraSelectionUpdate(camera, updateState));
                }}
                allowAddNew
                onAddNew={data => {
                  const cameraName = (data.cameraName as string | null) ?? '';
                  if (!cameraName.trim()) return;
                  const isFilm = data.isFilm === true;
                  const defaultFilmFormat = isFilm
                    ? ((data.defaultFilmFormat as string | null) ?? null)
                    : null;
                  // Optimistic local update — assume the create succeeds. Reuses the
                  // same auto-toggle helper as picking an existing film camera.
                  const optimisticCamera: ContentCameraModel = {
                    id: 0,
                    name: cameraName.trim(),
                    isFilm,
                    defaultFilmFormat,
                  };
                  updateStateField(computeCameraSelectionUpdate(optimisticCamera, updateState));
                  // Fire the create async — when it resolves, swap the camera with the real id.
                  void createCamera({
                    cameraName: optimisticCamera.name,
                    isFilm,
                    defaultFilmFormat,
                  })
                    .then(created => {
                      if (!created) return;
                      updateStateField({
                        camera: {
                          id: created.id,
                          name: created.cameraName,
                          isFilm: created.isFilm,
                          defaultFilmFormat,
                        },
                      });
                    })
                    .catch(error_ => {
                      console.error('Failed to create camera', error_);
                    });
                }}
                addNewFields={[
                  {
                    name: 'cameraName',
                    label: 'Camera Name',
                    type: 'text',
                    placeholder: 'e.g., Hasselblad 500cm',
                    required: true,
                  },
                  {
                    name: 'isFilm',
                    label: 'Film Camera',
                    type: 'checkbox',
                  },
                  {
                    name: 'defaultFilmFormat',
                    label: 'Film Format',
                    type: 'select',
                    options: availableFilmFormats.map(f => ({
                      value: f.name,
                      label: f.displayName,
                    })),
                    showWhen: data => data.isFilm === true,
                    placeholder: 'Select format',
                  },
                ]}
                getDisplayName={camera => camera.name}
                showNewIndicator
                emptyText="No camera set"
              />

              <Dropdown<ContentLensModel>
                label="Lens"
                multiSelect={false}
                options={availableLenses}
                selectedValue={updateState.lens || null}
                onChange={value => {
                  const lens = Array.isArray(value) ? value[0] || null : value;
                  updateStateField({ lens: lens || null });
                }}
                allowAddNew
                onAddNew={data => {
                  updateStateField({ lens: { id: 0, name: data.name as string } });
                }}
                addNewFields={[
                  {
                    name: 'name',
                    label: 'Lens Name',
                    type: 'text',
                    placeholder: 'e.g., 24-70mm f/2.8',
                    required: true,
                  },
                ]}
                getDisplayName={lens => lens.name}
                showNewIndicator
                emptyText="No lens set"
              />

              <div className={styles.formGrid2Col}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>ISO</label>
                  <input
                    type="number"
                    value={updateState.iso?.toString() || ''}
                    onChange={e =>
                      updateStateField({
                        iso: e.target.value ? Number.parseInt(e.target.value, 10) : undefined,
                      })
                    }
                    className={styles.formInput}
                    placeholder="e.g., 800"
                    min="0"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>F-Stop</label>
                  <input
                    type="text"
                    value={updateState.fStop ?? ''}
                    onChange={e => updateStateField({ fStop: e.target.value || null })}
                    className={styles.formInput}
                    placeholder="e.g., f/2.8"
                  />
                </div>
              </div>

              <div className={styles.formGrid2Col}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Shutter Speed</label>
                  <input
                    type="text"
                    value={updateState.shutterSpeed ?? ''}
                    onChange={e => updateStateField({ shutterSpeed: e.target.value || null })}
                    className={styles.formInput}
                    placeholder="e.g., 1/250 sec"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Focal Length</label>
                  <input
                    type="text"
                    value={updateState.focalLength ?? ''}
                    onChange={e => updateStateField({ focalLength: e.target.value || null })}
                    className={styles.formInput}
                    placeholder="e.g., 50 mm"
                  />
                </div>
              </div>

              <div className={styles.checkboxGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={updateState.blackAndWhite ?? false}
                    onChange={e => updateStateField({ blackAndWhite: e.target.checked })}
                  />
                  <span>Black & White</span>
                </label>

                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={updateState.isFilm ?? false}
                    onChange={e => updateStateField({ isFilm: e.target.checked })}
                  />
                  <span>Film Photography</span>
                </label>
              </div>

              {updateState.isFilm && (
                <div className={styles.formGrid2Col}>
                  <Dropdown<ContentFilmTypeModel>
                    label="Film Stock"
                    multiSelect={false}
                    options={availableFilmTypes}
                    selectedValue={
                      updateState.filmType
                        ? availableFilmTypes.find(f => f.name === updateState.filmType) || null
                        : null
                    }
                    onChange={value => {
                      const filmStock = Array.isArray(value) ? value[0] || null : value;
                      if (!filmStock) {
                        updateStateField({ filmType: undefined, iso: undefined });
                      } else {
                        updateStateField({
                          filmType: filmStock.name,
                          iso: filmStock.defaultIso,
                        });
                      }
                    }}
                    allowAddNew
                    onAddNew={data => {
                      const filmTypeName = data.name as string;
                      const defaultIso = data.defaultIso as number;
                      updateStateField({
                        filmType: filmTypeName,
                        iso: defaultIso,
                      });
                    }}
                    addNewFields={[
                      {
                        name: 'name',
                        label: 'Film Stock Name',
                        type: 'text',
                        placeholder: 'e.g., Kodak Portra 400',
                        required: true,
                      },
                      {
                        name: 'defaultIso',
                        label: 'Default ISO',
                        type: 'number',
                        placeholder: 'e.g., 400',
                        required: true,
                        min: 1,
                      },
                    ]}
                    getDisplayName={film => `${film.name} (ISO ${film.defaultIso})`}
                    showNewIndicator
                    emptyText="No film stock set"
                  />

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Film Format</label>
                    <select
                      value={updateState.filmFormat ?? ''}
                      onChange={e => updateStateField({ filmFormat: e.target.value || null })}
                      className={styles.formSelect}
                    >
                      <option value="">Select format</option>
                      {availableFilmFormats.map(format => (
                        <option key={format.name} value={format.name}>
                          {format.displayName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Tags & People */}
            <div className={styles.formSection}>
              <h3 className={styles.sectionHeading}>Tags & People</h3>

              <Dropdown<ContentTagModel>
                label="Tags"
                multiSelect
                options={availableTags}
                selectedValues={updateState.tags || []}
                onChange={value => {
                  const tags = (value as ContentTagModel[] | null) ?? [];
                  updateStateField({ tags });
                }}
                allowAddNew
                onAddNew={data => {
                  const newTag: ContentTagModel = { id: 0, name: data.name as string, slug: '' };
                  const currentTags = updateState.tags || [];
                  updateStateField({ tags: [...currentTags, newTag] });
                }}
                addNewFields={[
                  {
                    name: 'name',
                    label: 'Tag Name',
                    type: 'text',
                    placeholder: 'Enter new tag',
                    required: true,
                  },
                ]}
                getDisplayName={tag => tag.name}
                emptyText="No tags selected"
              />

              <div>
                <Dropdown<ContentPersonModel>
                  label="People"
                  multiSelect
                  options={availablePeople}
                  selectedValues={updateState.people || []}
                  onChange={value => {
                    const people = (value as ContentPersonModel[] | null) ?? [];
                    updateStateField({ people });
                  }}
                  allowAddNew
                  onAddNew={data => {
                    const newPerson: ContentPersonModel = {
                      id: 0,
                      name: data.name as string,
                      slug: '',
                    };
                    const currentPeople = updateState.people || [];
                    updateStateField({ people: [...currentPeople, newPerson] });
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
                  getDisplayName={person => person.name}
                  emptyText="No people selected"
                />
              </div>
            </div>

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
