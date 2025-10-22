'use client';

import Image from 'next/image';
import { type FormEvent, useMemo, useState } from 'react';

import { IMAGE } from '@/app/constants';
import { type UpdateImageDTO, updateMultipleImages } from '@/app/lib/api/images';
import type { ImageContentBlock } from '@/app/types/ContentBlock';
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
import { buildCameraUpdates, buildLensUpdates, getCommonValues } from './imageMetadataUtils';
import UnifiedMetadataSelector from './UnifiedMetadataSelector';

interface ImageMetadataModalProps {
  scrollPosition: number;
  onClose: () => void;
  onSaveSuccess?: (updatedImage: ImageContentBlock) => void;
  availableTags?: ContentTagModel[];
  availablePeople?: ContentPersonModel[];
  availableCameras?: ContentCameraModel[];
  availableLenses?: ContentLensModel[];
  availableFilmTypes?: FilmTypeModel[];
  availableFilmFormats?: FilmFormatModel[];
  availableCollections?: CollectionListModel[];
  selectedImageIds: number[]; // Array of selected image IDs (1 for single edit, N for bulk edit)
  allImages: ImageContentBlock[]; // All images in the collection
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
  allImages,
}: ImageMetadataModalProps) {
  // Get selected images
  const selectedImages = useMemo(
    () => selectedImageIds.map(id => allImages.find(img => img.id === id)).filter(Boolean) as ImageContentBlock[],
    [selectedImageIds, allImages]
  );

  if (selectedImages.length === 0) {
    throw new Error('No images found for the selected image IDs');
  }

  // Get the primary image (for display in single edit mode)
  const primaryImage = selectedImages[0]!; // Safe: already checked length > 0

  // Determine if we're in bulk edit mode (more than 1 image selected)
  const isBulkEdit = selectedImageIds.length > 1;

  // Calculate initial values - common values for bulk edit, or single image values for single edit
  // This is what we display in the form initially
  const initialValues = useMemo(() => getCommonValues(selectedImages), [selectedImages]);

  // Initialize UpdateImageDTO state - start with empty object
  // Only send fields that are actually changed to the backend
  const [updateImageDTO, setUpdateImageDTO] = useState<UpdateImageDTO>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Track selected tags, people, and collections (for UI)
  const [selectedTags, setSelectedTags] = useState<ContentTagModel[]>(initialValues.tags || []);
  const [selectedPeople, setSelectedPeople] = useState<ContentPersonModel[]>(initialValues.people || []);

  // Map collections to a format compatible with UnifiedMetadataSelector
  const initialCollections = (initialValues.collections || []).map(c => ({
    id: c.collectionId,
    name: c.collectionName,
  }));
  const [selectedCollections, setSelectedCollections] = useState<Array<{ id: number; name: string }>>(
    initialCollections
  );

  // Track new tag/person names to be created (simple string arrays)
  const [newTagNames, setNewTagNames] = useState<string[]>([]);
  const [newPersonNames, setNewPersonNames] = useState<string[]>([]);

  // Track current camera, lens, and film stock selections (for UI only - not part of DTO until submit)
  const [selectedCamera, setSelectedCamera] = useState<ContentCameraModel | null>(
    initialValues.camera || null
  );
  const [selectedLens, setSelectedLens] = useState<ContentLensModel | null>(
    initialValues.lensModel || null
  );

  // Find current film stock from available types based on initialValues.filmType
  const initialFilmStock = initialValues.filmType
    ? availableFilmTypes.find(f => f.displayName === initialValues.filmType)
    : undefined;
  const [selectedFilmStock, setSelectedFilmStock] = useState<FilmTypeModel | null>(
    initialFilmStock || null
  );

  // Helper to update DTO and mark changes
  const updateDTO = (updates: Partial<UpdateImageDTO>) => {
    setUpdateImageDTO(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  // Handle tags change
  const handleTagsChange = (tags: ContentTagModel[]) => {
    setSelectedTags(tags);
    const tagIds = tags.filter(t => t.id > 0).map(t => t.id);
    updateDTO({ tagIds: tagIds.length > 0 ? tagIds : null });
  };

  // Handle adding new tag
  const handleAddNewTag = (data: Record<string, any>) => {
    const tagName = data.name as string;

    // Create a pseudo tag (id: 0 means new)
    const newTag: ContentTagModel = {
      id: 0,
      tagName,
    };

    // Add to selected tags
    setSelectedTags(prev => [...prev, newTag]);

    // Track for backend creation
    setNewTagNames(prev => [...prev, tagName]);
    setHasChanges(true);
  };

  // Handle people change
  const handlePeopleChange = (people: ContentPersonModel[]) => {
    setSelectedPeople(people);
    const personIds = people.filter(p => p.id > 0).map(p => p.id);
    updateDTO({ personIds: personIds.length > 0 ? personIds : null });
  };

  // Handle adding new person
  const handleAddNewPerson = (data: Record<string, any>) => {
    const personName = data.name as string;

    // Create a pseudo person (id: 0 means new)
    const newPerson: ContentPersonModel = {
      id: 0,
      personName,
    };

    // Add to selected people
    setSelectedPeople(prev => [...prev, newPerson]);

    // Track for backend creation
    setNewPersonNames(prev => [...prev, personName]);
    setHasChanges(true);
  };

  // Handle collections change
  const handleCollectionsChange = (collections: Array<{ id: number; name: string }>) => {
    setSelectedCollections(collections);

    // Convert to ImageCollection format for DTO
    const collectionsForDTO = collections.map(c => ({
      collectionId: c.id,
      collectionName: c.name,
    }));

    updateDTO({ collections: collectionsForDTO.length > 0 ? collectionsForDTO : [] });
  };

  // Handle camera change - camera object contains either id (existing) or cameraName (new)
  const handleCameraChange = (camera: ContentCameraModel | null) => {
    setSelectedCamera(camera);
    setHasChanges(true);
  };

  // Handle lens change - lens object contains either id (existing) or lensName (new)
  const handleLensChange = (lens: ContentLensModel | null) => {
    setSelectedLens(lens);
    setHasChanges(true);
  };

  // Handle film stock change (unified selector)
  const handleFilmStockChange = (filmStock: FilmTypeModel | null) => {
    setSelectedFilmStock(filmStock);
    setHasChanges(true);

    if (!filmStock) {
      updateDTO({ filmType: null, filmTypeId: undefined, newFilmType: undefined });
      return;
    }

    const updates: Partial<UpdateImageDTO> = {
      filmType: filmStock.displayName || null,
    };

    // Auto-populate ISO from selected film stock's defaultIso if it's an existing film stock
    if (filmStock.id && filmStock.id > 0) {
      updates.iso = filmStock.defaultIso;
      updates.filmTypeId = filmStock.id;
      updates.newFilmType = undefined; // Clear newFilmType if switching to existing
    } else {
      // New film stock being created
      updates.newFilmType = {
        filmTypeName: filmStock.displayName,
        defaultIso: filmStock.defaultIso,
      };
      updates.iso = filmStock.defaultIso;
      updates.filmTypeId = undefined;
    }

    updateDTO(updates);
  };

  // Handle adding new film stock from unified selector
  const handleAddNewFilmStock = (data: Record<string, any>) => {
    const filmTypeName = data.filmTypeName as string;
    const defaultIso = data.defaultIso as number;

    // Create a pseudo FilmTypeModel for the new film stock
    const newFilmStock: FilmTypeModel = {
      id: 0, // 0 indicates new
      name: filmTypeName.toUpperCase().replace(/\s+/g, '_'),
      displayName: filmTypeName,
      defaultIso,
    };

    handleFilmStockChange(newFilmStock);
  };

  // Prepare collection data for UnifiedMetadataSelector
  const allCollections = availableCollections.map(c => ({ id: c.id, name: c.collectionName }));

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

      // Start with the DTO we've been building
      const updates: UpdateImageDTO = { ...updateImageDTO };

      // Apply camera updates using centralized logic
      const cameraUpdates = buildCameraUpdates(selectedCamera, initialValues.camera);
      Object.assign(updates, cameraUpdates);

      // Apply lens updates using centralized logic
      const lensUpdates = buildLensUpdates(selectedLens, initialValues.lensModel);
      Object.assign(updates, lensUpdates);

      // Add new tags if any
      if (newTagNames.length > 0) {
        updates.newTags = newTagNames;
      }

      // Add new people if any
      if (newPersonNames.length > 0) {
        updates.newPeople = newPersonNames;
      }

      // Map updates to all selected images (1 for single edit, N for bulk edit)
      const imageUpdates = selectedImageIds.map(imageId => ({
        imageId,
        updates,
      }));

      // Single API call for both single and bulk updates
      await updateMultipleImages(imageUpdates);

      // Notify parent of success
      if (onSaveSuccess) {
        onSaveSuccess(primaryImage);
      }

      onClose();
    } catch (error_) {
      console.error('Error updating image metadata:', error_);
      setError(error_ instanceof Error ? error_.message : 'Failed to update image');
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel with confirmation if there are unsaved changes
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
            {selectedImageIds.map((imageId) => {
              const img = allImages.find(i => i.id === imageId);
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
            src={primaryImage.imageUrlWeb}
            alt={primaryImage.alt || primaryImage.title || 'Image preview'}
            width={primaryImage.imageWidth || IMAGE.defaultWidth}
            height={primaryImage.imageHeight || IMAGE.defaultHeight}
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
                value={updateImageDTO.title !== undefined ? (updateImageDTO.title || '') : (initialValues.title || '')}
                onChange={(e) => updateDTO({ title: e.target.value || null })}
                className={styles.formInput}
                placeholder="Enter image title"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Caption</label>
              <textarea
                value={updateImageDTO.caption !== undefined ? (updateImageDTO.caption || '') : (initialValues.caption || '')}
                onChange={(e) => updateDTO({ caption: e.target.value || null })}
                className={styles.formTextarea}
                placeholder="Enter caption"
                rows={3}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Alt Text (Accessibility)</label>
              <input
                type="text"
                value={updateImageDTO.alt !== undefined ? (updateImageDTO.alt || '') : (initialValues.alt || '')}
                onChange={(e) => updateDTO({ alt: e.target.value || null })}
                className={styles.formInput}
                placeholder="Describe the image for screen readers"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Author</label>
              <input
                type="text"
                value={updateImageDTO.author !== undefined ? (updateImageDTO.author || '') : (initialValues.author || '')}
                onChange={(e) => updateDTO({ author: e.target.value || null })}
                className={styles.formInput}
                placeholder="Photographer name"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Location</label>
              <input
                type="text"
                value={updateImageDTO.location !== undefined ? (updateImageDTO.location || '') : (initialValues.location || '')}
                onChange={(e) => updateDTO({ location: e.target.value || null })}
                className={styles.formInput}
                placeholder="Where was this taken?"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Rating</label>
              <select
                value={updateImageDTO.rating !== undefined ? (updateImageDTO.rating?.toString() || '') : (initialValues.rating?.toString() || '')}
                onChange={(e) => updateDTO({ rating: e.target.value ? Number.parseInt(e.target.value, 10) : null })}
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
          </div>

          {/* Camera Metadata */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionHeading}>Camera Settings</h3>

            <UnifiedMetadataSelector<ContentCameraModel>
              label="Camera"
              multiSelect={false}
              options={availableCameras}
              selectedValue={selectedCamera}
              onChange={(camera) => handleCameraChange(camera as ContentCameraModel | null)}
              allowAddNew
              onAddNew={(data) => {
                const newCamera: ContentCameraModel = {
                  id: 0,
                  cameraName: data.name as string,
                };
                handleCameraChange(newCamera);
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
              getDisplayName={(camera) => camera.cameraName}
              showNewIndicator
              emptyText="No camera set"
            />

            <UnifiedMetadataSelector<ContentLensModel>
              label="Lens"
              multiSelect={false}
              options={availableLenses}
              selectedValue={selectedLens}
              onChange={(lens) => handleLensChange(lens as ContentLensModel | null)}
              allowAddNew
              onAddNew={(data) => {
                const newLens: ContentLensModel = {
                  id: 0,
                  lensName: data.name as string,
                };
                handleLensChange(newLens);
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
              getDisplayName={(lens) => lens.lensName}
              showNewIndicator
              emptyText="No lens set"
            />

            <div className={styles.formGrid2Col}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>ISO</label>
                <input
                  type="number"
                  value={updateImageDTO.iso !== undefined ? (updateImageDTO.iso?.toString() || '') : (initialValues.iso?.toString() || '')}
                  onChange={(e) => updateDTO({ iso: e.target.value ? Number.parseInt(e.target.value, 10) : null })}
                  className={styles.formInput}
                  placeholder="e.g., 800"
                  min="0"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>F-Stop</label>
                <input
                  type="text"
                  value={updateImageDTO.fstop !== undefined ? (updateImageDTO.fstop || '') : (initialValues.fstop || '')}
                  onChange={(e) => updateDTO({ fstop: e.target.value || null })}
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
                  value={updateImageDTO.shutterSpeed !== undefined ? (updateImageDTO.shutterSpeed || '') : (initialValues.shutterSpeed || '')}
                  onChange={(e) => updateDTO({ shutterSpeed: e.target.value || null })}
                  className={styles.formInput}
                  placeholder="e.g., 1/250 sec"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Focal Length</label>
                <input
                  type="text"
                  value={updateImageDTO.focalLength !== undefined ? (updateImageDTO.focalLength || '') : (initialValues.focalLength || '')}
                  onChange={(e) => updateDTO({ focalLength: e.target.value || null })}
                  className={styles.formInput}
                  placeholder="e.g., 50 mm"
                />
              </div>
            </div>

            <div className={styles.checkboxGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={updateImageDTO.blackAndWhite !== undefined ? (updateImageDTO.blackAndWhite || false) : (initialValues.blackAndWhite || false)}
                  onChange={(e) => updateDTO({ blackAndWhite: e.target.checked })}
                />
                <span>Black & White</span>
              </label>

              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={updateImageDTO.isFilm !== undefined ? (updateImageDTO.isFilm || false) : (initialValues.isFilm || false)}
                  onChange={(e) => updateDTO({ isFilm: e.target.checked })}
                />
                <span>Film Photography</span>
              </label>
            </div>

            {/* Film-specific fields - only shown when isFilm is true */}
            {(updateImageDTO.isFilm !== undefined ? updateImageDTO.isFilm : initialValues.isFilm) && (
              <div className={styles.formGrid2Col}>
                <UnifiedMetadataSelector<FilmTypeModel>
                  label="Film Stock"
                  multiSelect={false}
                  options={availableFilmTypes}
                  selectedValue={selectedFilmStock}
                  onChange={(filmStock) => handleFilmStockChange(filmStock as FilmTypeModel | null)}
                  allowAddNew
                  onAddNew={handleAddNewFilmStock}
                  addNewFields={[
                    {
                      name: 'filmTypeName',
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
                  getDisplayName={(film) => `${film.displayName} (ISO ${film.defaultIso})`}
                  showNewIndicator
                  emptyText="No film stock set"
                />

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Film Format</label>
                  <select
                    value={updateImageDTO.filmFormat !== undefined ? (updateImageDTO.filmFormat || '') : (initialValues.filmFormat || '')}
                    onChange={(e) => updateDTO({ filmFormat: e.target.value || null })}
                    className={styles.formSelect}
                  >
                    <option value="">Select format</option>
                    {availableFilmFormats.map((format) => (
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
              selectedValues={selectedTags}
              onChange={(tags) => handleTagsChange(tags as ContentTagModel[])}
              allowAddNew
              onAddNew={handleAddNewTag}
              addNewFields={[
                {
                  name: 'name',
                  label: 'Tag Name',
                  type: 'text',
                  placeholder: 'Enter new tag',
                  required: true,
                },
              ]}
              getDisplayName={(tag) => tag.tagName}
              changeButtonText="Select More ▼"
              emptyText="No tags selected"
            />

            <UnifiedMetadataSelector<ContentPersonModel>
              label="People"
              multiSelect
              options={availablePeople}
              selectedValues={selectedPeople}
              onChange={(people) => handlePeopleChange(people as ContentPersonModel[])}
              allowAddNew
              onAddNew={handleAddNewPerson}
              addNewFields={[
                {
                  name: 'name',
                  label: 'Person Name',
                  type: 'text',
                  placeholder: 'Enter person name',
                  required: true,
                },
              ]}
              getDisplayName={(person) => person.personName}
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
              selectedValues={selectedCollections}
              onChange={(collections) => handleCollectionsChange(collections as Array<{ id: number; name: string }>)}
              allowAddNew={false}
              getDisplayName={(collection) => collection.name}
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
            <button
              type="submit"
              disabled={loading || !hasChanges}
              className={styles.saveButton}
            >
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
