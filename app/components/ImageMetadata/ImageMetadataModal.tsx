'use client';

import Image from 'next/image';
import { type SubmitEvent, useCallback, useEffect, useMemo, useState } from 'react';

import CollectionListSelector from '@/app/components/CollectionListSelector/CollectionListSelector';
import { LoadingSpinner } from '@/app/components/LoadingSpinner/LoadingSpinner';
import { IMAGE } from '@/app/constants';
import { deleteImages, updateImages } from '@/app/lib/api/content';
import { type CollectionListModel, type LocationModel } from '@/app/types/Collection';
import {
  type ContentImageModel,
  type ContentImageUpdateRequest,
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
import { convertLocationsToModels } from '@/app/utils/locationUtils';
import { hasObjectChanges } from '@/app/utils/objectComparison';

import styles from './ImageMetadataModal.module.scss';
import {
  buildImageUpdateForSingleEdit,
  buildImageUpdatesForBulkEdit,
  getCommonValues,
  mapUpdateResponseToFrontend,
} from './imageMetadataUtils';
import UnifiedMetadataSelector from './UnifiedMetadataSelector';

type ImageUpdateState = Partial<ContentImageModel> & {
  id: number;
};

interface ImageMetadataModalProps {
  scrollPosition: number;
  onClose: () => void;
  onSaveSuccess?: (response: ContentImageUpdateResponse) => void;
  onDeleteSuccess?: (deletedIds: number[]) => void;
  availableTags?: ContentTagModel[];
  availablePeople?: ContentPersonModel[];
  availableCameras?: ContentCameraModel[];
  availableLenses?: ContentLensModel[];
  availableFilmTypes?: ContentFilmTypeModel[];
  availableFilmFormats?: FilmFormatDTO[];
  availableCollections?: CollectionListModel[];
  availableLocations?: LocationModel[];
  selectedImageIds: number[]; // Array of selected image IDs (1 for single edit, N for bulk edit)
  selectedImages: ContentImageModel[]; // Images to edit (already filtered in parent)
  currentCollectionId?: number; // ID of the collection being edited (for visibility checkbox)
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
  onDeleteSuccess,
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

  const [updateState, setUpdateState] = useState<ImageUpdateState>(() => {
    if (selectedImages.length === 1) {
      const img = selectedImages[0]!;
      return {
        ...img,
        locations: convertLocationsToModels(img.locations, availableLocations),
      };
    } else {
      const common = getCommonValues(selectedImages);
      return {
        id: 0,
        ...common,
        locations: convertLocationsToModels(common.locations, availableLocations),
      };
    }
  });

  useEffect(() => {
    if (selectedImages.length === 1) {
      const img = selectedImages[0]!;
      setUpdateState({
        ...img,
        locations: convertLocationsToModels(img.locations, availableLocations),
      });
    } else {
      const common = getCommonValues(selectedImages);
      setUpdateState({
        id: 0,
        ...common,
        locations: convertLocationsToModels(common.locations, availableLocations),
      });
    }
  }, [selectedImages, availableLocations]);

  const updateStateField = (updates: Partial<ImageUpdateState>) => {
    setUpdateState(prev => ({ ...prev, ...updates }));
  };

  const hasChanges = useMemo(() => {
    if (isBulkEdit) {
      const common = getCommonValues(selectedImages);
      return hasObjectChanges(updateState, { id: 0, ...common });
    } else {
      const original = selectedImages[0]!;
      return hasObjectChanges(updateState, original);
    }
  }, [updateState, selectedImages, isBulkEdit]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const previewImage = selectedImages[0];

  if (!previewImage) {
    return null;
  }

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!hasChanges) {
      onClose();
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const imageUpdates: ContentImageUpdateRequest[] = isBulkEdit
        ? buildImageUpdatesForBulkEdit(
            updateState as Partial<ContentImageModel> & {
              id: number;
              location?: LocationModel | null;
            },
            selectedImages,
            selectedImageIds,
            availableFilmTypes
          )
        : [
            buildImageUpdateForSingleEdit(
              updateState as ContentImageModel & { location?: LocationModel | null },
              selectedImages[0]!,
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
    const confirmMessage =
      imageCount === 1
        ? 'Are you sure you want to delete this image? This will remove it from S3 and the database. This action cannot be undone.'
        : `Are you sure you want to delete ${imageCount} images? This will remove them from S3 and the database. This action cannot be undone.`;

    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) return;

    try {
      setSaving(true);
      setError(null);

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
                    src={img.imageUrl}
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
          <Image
            src={previewImage.imageUrl}
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
                value={updateState.title ?? ''}
                onChange={e => updateStateField({ title: e.target.value || undefined })}
                className={styles.formInput}
                placeholder="Enter image title"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Caption</label>
              <textarea
                value={updateState.caption ?? ''}
                onChange={e => updateStateField({ caption: e.target.value || undefined })}
                className={styles.formTextarea}
                placeholder="Enter caption"
                rows={3}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Alt Text (Accessibility)</label>
              <input
                type="text"
                value={updateState.alt ?? ''}
                onChange={e => updateStateField({ alt: e.target.value || undefined })}
                className={styles.formInput}
                placeholder="Describe the image for screen readers"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Author</label>
              <input
                type="text"
                value={updateState.author ?? ''}
                onChange={e => updateStateField({ author: e.target.value || null })}
                className={styles.formInput}
                placeholder="Photographer name"
              />
            </div>

            <UnifiedMetadataSelector<LocationModel>
              label="Locations"
              multiSelect
              options={availableLocations}
              selectedValues={updateState.locations ?? []}
              onChange={value => {
                const locations = Array.isArray(value) ? value : (value ? [value] : []);
                updateStateField({ locations });
              }}
              allowAddNew
              onAddNew={data => {
                const newLocation = { id: 0, name: data.name as string, slug: '' };
                updateStateField({ locations: [...(updateState.locations ?? []), newLocation] });
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

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Rating</label>
              <select
                value={updateState.rating?.toString() || ''}
                onChange={e =>
                  updateStateField({
                    rating: e.target.value ? Number.parseInt(e.target.value, 10) : undefined,
                  })
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

            {/* Collection Visibility - Available for both single and bulk edit */}
            {currentCollectionId && (
              <div className={styles.checkboxGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={(() => {
                      const currentCollection = updateState.collections?.find(
                        c => c.collectionId === currentCollectionId
                      );
                      return currentCollection?.visible !== false;
                    })()}
                    onChange={e => {
                      const currentCollections = updateState.collections || [];
                      const collectionIndex = currentCollections.findIndex(
                        c => c.collectionId === currentCollectionId
                      );

                      let updatedCollections: Array<{
                        collectionId: number;
                        name?: string;
                        visible?: boolean;
                        orderIndex?: number;
                      }>;

                      if (collectionIndex >= 0) {
                        updatedCollections = currentCollections.map((c, idx) =>
                          idx === collectionIndex ? { ...c, visible: e.target.checked } : c
                        );
                      } else {
                        const collectionName = availableCollections.find(
                          c => c.id === currentCollectionId
                        )?.name;
                        updatedCollections = [
                          ...currentCollections,
                          {
                            collectionId: currentCollectionId,
                            name: collectionName,
                            visible: e.target.checked,
                            orderIndex: currentCollections.length,
                          },
                        ];
                      }

                      updateStateField({ collections: updatedCollections });
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
              selectedValue={updateState.camera || null}
              onChange={value => {
                const camera = Array.isArray(value) ? value[0] || null : value;
                updateStateField({ camera: camera || null });
              }}
              allowAddNew
              onAddNew={data => {
                updateStateField({ camera: { id: 0, name: data.name as string } });
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
                <UnifiedMetadataSelector<ContentFilmTypeModel>
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

            <UnifiedMetadataSelector<ContentTagModel>
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
              changeButtonText="Select More ▼"
              emptyText="No tags selected"
            />

            <UnifiedMetadataSelector<ContentPersonModel>
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
              changeButtonText="Select More ▼"
              emptyText="No people selected"
            />
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
                    <span style={{ marginLeft: '8px' }}>Deleting...</span>
                  </>
                ) : (
                  `Delete ${isBulkEdit ? `${selectedImageIds.length} Images` : 'Image'}`
                )}
              </button>
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
              <button type="submit" disabled={saving || !hasChanges} className={styles.saveButton}>
                {saving ? (
                  <>
                    <LoadingSpinner size="small" color="white" />
                    <span style={{ marginLeft: '8px' }}>Saving...</span>
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Close Button */}
      <button
        className={styles.closeButton}
        onClick={handleCancel}
        aria-label="Close metadata editor"
        disabled={saving}
      >
        <span aria-hidden="true">&#10005;</span>
      </button>
    </div>
  );
}
