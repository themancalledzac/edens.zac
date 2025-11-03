'use client';

import Image from 'next/image';
import { type FormEvent, useMemo, useState } from 'react';

import { IMAGE } from '@/app/constants';
import { type UpdateImagesResponse } from '@/app/lib/api/images';
import { ImageContentModel, UpdateImageDTO, updateMultipleImages } from '@/app/types/Content';
import type {
  CollectionListModel,
  ContentCameraModel,
  ContentLensModel,
  ContentPersonModel,
  ContentTagModel,
  FilmFormatModel,
  FilmTypeModel,
} from '@/app/types/ImageMetadata';

import styles from './ImageMetadataModal.module.scss';
import {
  getCommonValues,
  getDisplayCamera,
  getDisplayCollections,
  getDisplayFilmStock,
  getDisplayLens,
  getDisplayPeople,
  getDisplayTags,
  getFormValue,
  handleDropdownChange,
} from './imageMetadataUtils';
import UnifiedMetadataSelector from './UnifiedMetadataSelector';

interface ImageMetadataModalProps {
  scrollPosition: number;
  onClose: () => void;
  onSaveSuccess?: (response: UpdateImagesResponse) => void;
  availableTags?: ContentTagModel[];
  availablePeople?: ContentPersonModel[];
  availableCameras?: ContentCameraModel[];
  availableLenses?: ContentLensModel[];
  availableFilmTypes?: FilmTypeModel[];
  availableFilmFormats?: FilmFormatModel[];
  availableCollections?: CollectionListModel[];
  selectedImageIds: number[]; // Array of selected image IDs (1 for single edit, N for bulk edit)
  selectedImages: ImageContentModel[]; // Images to edit (already filtered in parent)
}

/**
 * Modal for editing image metadata with split-screen layout
 *
 * Layout:
 * - Left side: Image preview (~50% width)
 * - Right side: Metadata form with save/cancel buttons (~50% width)
 */
export default function ImageMetadataModal({
  scrollPosition,
  onClose,
  onSaveSuccess,
  availableTags = [],
  availablePeople = [],
  availableCameras = [],
  availableLenses = [],
  availableFilmTypes = [],
  availableFilmFormats = [],
  availableCollections = [],
  selectedImageIds,
  selectedImages,
}: ImageMetadataModalProps) {
  const initialValues = useMemo(
    () => (selectedImages.length === 1 ? selectedImages[0]! : getCommonValues(selectedImages)),
    [selectedImages]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isBulkEdit = selectedImageIds.length > 1;

  const [updateImageDTO, setUpdateImageDTO] = useState<UpdateImageDTO>({});

  // Helper to update DTO - provides consistent API for all metadata updates
  const updateDTO = (updates: Partial<UpdateImageDTO>) => {
    setUpdateImageDTO(prev => ({ ...prev, ...updates }));
  };

  // Derive hasChanges - true if any field in DTO is defined
  const hasChanges = Object.keys(updateImageDTO).length > 0;

  // Get first image for preview and callback - always safe since selectedImages.length > 0
  const previewImage = selectedImages[0]!;

  // Prepare collection data for UnifiedMetadataSelector
  const allCollections = availableCollections.map(c => ({ id: c.id, name: c.name }));

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!hasChanges) {
      onClose();
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const imageUpdates = selectedImageIds.map(imageId => ({
        imageId,
        updates: updateImageDTO,
      }));

      const response = await updateMultipleImages(imageUpdates);

      // Check for validation/business logic errors from backend
      if (response.errors && response.errors.length > 0) {
        setError(response.errors.join(', '));
        return; // Don't close modal - let user fix the issues
      }

      onSaveSuccess?.(response);
      onClose();
    } catch (error_) {
      console.error('Error updating image metadata:', error_);
      setError(error_ instanceof Error ? error_.message : 'Failed to update image');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirmed) return;
    }
    onClose();
  };

  return (
    <div
      className={styles.metadataModalWrapper}
      style={{
        top: `${scrollPosition}px`,
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="metadata-modal-title"
    >
      {/* Image Section - Left Side */}
      <div className={styles.imageSection}>
        {isBulkEdit ? (
          // Bulk edit mode - show grid of selected images
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: '8px',
              width: '100%',
              height: '100%',
              overflowY: 'auto',
              padding: '8px',
            }}
          >
            {selectedImageIds.map(imageId => {
              const img = selectedImages.find(i => i.id === imageId);
              if (!img) return null;
              return (
                <div
                  key={imageId}
                  style={{
                    position: 'relative',
                    aspectRatio: '1',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    backgroundColor: '#f0f0f0',
                  }}
                >
                  <Image
                    src={img.imageUrlWeb}
                    alt={img.alt || img.title || 'Selected image'}
                    fill
                    style={{
                      objectFit: 'cover',
                    }}
                    sizes="150px"
                    unoptimized
                  />
                </div>
              );
            })}
          </div>
        ) : (
          // Single edit mode - show full image
          <Image
            src={previewImage.imageUrlWeb}
            alt={previewImage.alt || previewImage.title || 'Image preview'}
            width={previewImage.imageWidth || IMAGE.defaultWidth}
            height={previewImage.imageHeight || IMAGE.defaultHeight}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
            }}
            priority
            unoptimized
          />
        )}
      </div>

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
          {/* Essential Info */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionHeading}>Essential Information</h3>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Title</label>
              <input
                type="text"
                value={getFormValue(updateImageDTO.title, initialValues.title, '') ?? ''}
                onChange={e => updateDTO({ title: e.target.value || null })}
                className={styles.formInput}
                placeholder="Enter image title"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Caption</label>
              <textarea
                value={getFormValue(updateImageDTO.caption, initialValues.caption, '') ?? ''}
                onChange={e => updateDTO({ caption: e.target.value || null })}
                className={styles.formTextarea}
                placeholder="Enter caption"
                rows={3}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Alt Text (Accessibility)</label>
              <input
                type="text"
                value={getFormValue(updateImageDTO.alt, initialValues.alt, '') ?? ''}
                onChange={e => updateDTO({ alt: e.target.value || null })}
                className={styles.formInput}
                placeholder="Describe the image for screen readers"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Author</label>
              <input
                type="text"
                value={getFormValue(updateImageDTO.author, initialValues.author, '') ?? ''}
                onChange={e => updateDTO({ author: e.target.value || null })}
                className={styles.formInput}
                placeholder="Photographer name"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Location</label>
              <input
                type="text"
                value={getFormValue(updateImageDTO.location, initialValues.location, '') ?? ''}
                onChange={e => updateDTO({ location: e.target.value || null })}
                className={styles.formInput}
                placeholder="Where was this taken?"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Rating</label>
              <select
                value={
                  getFormValue(updateImageDTO.rating, initialValues.rating, null)?.toString() || ''
                }
                onChange={e =>
                  updateDTO({ rating: e.target.value ? Number.parseInt(e.target.value, 10) : null })
                }
                className={styles.formSelect}
              >
                <option value="">No rating</option>
                <option value="1">1 Star</option>
                <option value="2">2 Stars</option>
                <option value="3">3 Stars</option>
                <option value="4">4 Stars</option>
                <option value="5">5 Stars</option>
              </select>
            </div>

            {/* Collection Visibility - Only for single image edit */}
            {!isBulkEdit && (
              <div className={styles.checkboxGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={
                      getFormValue(
                        updateImageDTO.collections?.prev?.[0]?.visible,
                        initialValues.collections?.[0]?.visible,
                        true
                      ) ?? true
                    }
                    onChange={e => {
                      const currentCollections =
                        updateImageDTO.collections?.prev ?? initialValues.collections ?? [];
                      const updatedCollections = currentCollections.map(c => ({
                        ...c,
                        visible: e.target.checked,
                      }));
                      updateDTO({ collections: { prev: updatedCollections } });
                    }}
                  />
                  <span>Collection Visibility</span>
                </label>
              </div>
            )}
          </div>

          {/* Camera Metadata */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionHeading}>Camera Settings</h3>

            <UnifiedMetadataSelector<ContentCameraModel>
              label="Camera"
              multiSelect={false}
              options={availableCameras}
              selectedValue={getDisplayCamera(
                updateImageDTO,
                initialValues.camera,
                availableCameras
              )}
              onChange={value => {
                const camera = Array.isArray(value) ? value[0] || null : value;
                if (!camera) {
                  handleDropdownChange({ field: 'camera', value: { remove: true } }, updateDTO);
                } else if (camera.id && camera.id > 0) {
                  handleDropdownChange({ field: 'camera', value: { prev: camera.id } }, updateDTO);
                } else {
                  handleDropdownChange(
                    { field: 'camera', value: { newValue: camera.name } },
                    updateDTO
                  );
                }
              }}
              allowAddNew
              onAddNew={data => {
                handleDropdownChange(
                  { field: 'camera', value: { newValue: data.name as string } },
                  updateDTO
                );
              }}
              addNewFields={[
                {
                  name: 'name',
                  label: 'Camera Name',
                  type: 'text',
                  placeholder: 'e.g., Canon EOS R5',
                  required: true,
                },
              ]}
              getDisplayName={camera => camera.name}
              showNewIndicator
              emptyText="No camera set"
            />

            <UnifiedMetadataSelector<ContentLensModel>
              label="Lens"
              multiSelect={false}
              options={availableLenses}
              selectedValue={getDisplayLens(
                updateImageDTO,
                initialValues.lens,
                availableLenses
              )}
              onChange={value => {
                const lens = Array.isArray(value) ? value[0] || null : value;
                if (!lens) {
                  handleDropdownChange({ field: 'lens', value: { remove: true } }, updateDTO);
                } else if (lens.id && lens.id > 0) {
                  handleDropdownChange({ field: 'lens', value: { prev: lens.id } }, updateDTO);
                } else {
                  handleDropdownChange(
                    { field: 'lens', value: { newValue: lens.name } },
                    updateDTO
                  );
                }
              }}
              allowAddNew
              onAddNew={data => {
                handleDropdownChange(
                  { field: 'lens', value: { newValue: data.name as string } },
                  updateDTO
                );
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
                  value={
                    getFormValue(updateImageDTO.iso, initialValues.iso, null)?.toString() || ''
                  }
                  onChange={e =>
                    updateDTO({ iso: e.target.value ? Number.parseInt(e.target.value, 10) : null })
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
                  value={getFormValue(updateImageDTO.fStop, initialValues.fStop, '') ?? ''}
                  onChange={e => updateDTO({ fStop: e.target.value || null })}
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
                  value={
                    getFormValue(updateImageDTO.shutterSpeed, initialValues.shutterSpeed, '') ?? ''
                  }
                  onChange={e => updateDTO({ shutterSpeed: e.target.value || null })}
                  className={styles.formInput}
                  placeholder="e.g., 1/250 sec"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Focal Length</label>
                <input
                  type="text"
                  value={
                    getFormValue(updateImageDTO.focalLength, initialValues.focalLength, '') ?? ''
                  }
                  onChange={e => updateDTO({ focalLength: e.target.value || null })}
                  className={styles.formInput}
                  placeholder="e.g., 50 mm"
                />
              </div>
            </div>

            <div className={styles.checkboxGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={
                    getFormValue(
                      updateImageDTO.blackAndWhite,
                      initialValues.blackAndWhite,
                      false
                    ) ?? false
                  }
                  onChange={e => updateDTO({ blackAndWhite: e.target.checked })}
                />
                <span>Black & White</span>
              </label>

              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={
                    getFormValue(updateImageDTO.isFilm, initialValues.isFilm, false) ?? false
                  }
                  onChange={e => updateDTO({ isFilm: e.target.checked })}
                />
                <span>Film Photography</span>
              </label>
            </div>

            {/* Film-specific fields - only shown when isFilm is true */}
            {getFormValue(updateImageDTO.isFilm, initialValues.isFilm, false) && (
              <div className={styles.formGrid2Col}>
                <UnifiedMetadataSelector<FilmTypeModel>
                  label="Film Stock"
                  multiSelect={false}
                  options={availableFilmTypes}
                  selectedValue={getDisplayFilmStock(
                    updateImageDTO,
                    initialValues.filmType,
                    availableFilmTypes
                  )}
                  onChange={value => {
                    const filmStock = Array.isArray(value) ? value[0] || null : value;
                    if (!filmStock) {
                      handleDropdownChange(
                        { field: 'filmType', value: { remove: true } },
                        updateDTO
                      );
                      updateDTO({ iso: null });
                    } else if (filmStock.id && filmStock.id > 0) {
                      handleDropdownChange(
                        { field: 'filmType', value: { prev: filmStock.id } },
                        updateDTO
                      );
                      updateDTO({ iso: filmStock.defaultIso });
                    } else {
                      handleDropdownChange(
                        {
                          field: 'filmType',
                          value: {
                            newValue: { name: filmStock.name, defaultIso: filmStock.defaultIso },
                          },
                        },
                        updateDTO
                      );
                      updateDTO({ iso: filmStock.defaultIso });
                    }
                  }}
                  allowAddNew
                  onAddNew={data => {
                    const name = data.name as string;
                    const defaultIso = data.defaultIso as number;
                    handleDropdownChange(
                      { field: 'filmType', value: { newValue: { name, defaultIso } } },
                      updateDTO
                    );
                    updateDTO({ iso: defaultIso });
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
                    value={
                      getFormValue(updateImageDTO.filmFormat, initialValues.filmFormat, '') ?? ''
                    }
                    onChange={e => updateDTO({ filmFormat: e.target.value || null })}
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

            <UnifiedMetadataSelector<ContentTagModel>
              label="Tags"
              multiSelect
              options={availableTags}
              selectedValues={getDisplayTags(updateImageDTO, initialValues.tags, availableTags)}
              onChange={value => handleDropdownChange({ field: 'tags', value }, updateDTO)}
              allowAddNew
              onAddNew={data => {
                const newTag: ContentTagModel = { id: 0, name: data.name as string };
                const currentTags = getDisplayTags(
                  updateImageDTO,
                  initialValues.tags,
                  availableTags
                );
                const allTags = [...currentTags, newTag];
                handleDropdownChange({ field: 'tags', value: allTags }, updateDTO);
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
              changeButtonText="Select More ▼"
              emptyText="No tags selected"
            />

            <UnifiedMetadataSelector<ContentPersonModel>
              label="People"
              multiSelect
              options={availablePeople}
              selectedValues={getDisplayPeople(
                updateImageDTO,
                initialValues.people,
                availablePeople
              )}
              onChange={value => handleDropdownChange({ field: 'people', value }, updateDTO)}
              allowAddNew
              onAddNew={data => {
                const newPerson: ContentPersonModel = { id: 0, name: data.name as string };
                const currentPeople = getDisplayPeople(
                  updateImageDTO,
                  initialValues.people,
                  availablePeople
                );
                const allPeople = [...currentPeople, newPerson];
                handleDropdownChange({ field: 'people', value: allPeople }, updateDTO);
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
              changeButtonText="Select More ▼"
              emptyText="No people selected"
            />
          </div>

          {/* Collections */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionHeading}>Collections</h3>

            <UnifiedMetadataSelector<{ id: number; name: string }>
              label="Collections"
              multiSelect
              options={allCollections}
              selectedValues={getDisplayCollections(updateImageDTO, initialValues.collections)}
              onChange={value => {
                const collections = (value as Array<{ id: number; name: string }> | null) ?? [];
                const currentVisible =
                  updateImageDTO.collections?.prev?.[0]?.visible ??
                  initialValues.collections?.[0]?.visible ??
                  true;
                handleDropdownChange(
                  {
                    field: 'collections',
                    value: {
                      prev: collections.map((c, index) => ({
                        collectionId: c.id,
                        name: c.name,
                        visible: currentVisible,
                        orderIndex: index,
                      })),
                    },
                  },
                  updateDTO
                );
              }}
              allowAddNew={false}
              getDisplayName={collection => collection.name}
              changeButtonText="Select More ▼"
              emptyText="No collections selected"
            />
          </div>

          {/* Action Buttons */}
          <div className={styles.buttonRow}>
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className={styles.cancelButton}
            >
              Cancel
            </button>
            <button type="submit" disabled={loading || !hasChanges} className={styles.saveButton}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Close Button */}
      <button
        className={styles.closeButton}
        onClick={handleCancel}
        aria-label="Close metadata editor"
        disabled={loading}
      >
        <span aria-hidden="true">&#10005;</span>
      </button>
    </div>
  );
}
