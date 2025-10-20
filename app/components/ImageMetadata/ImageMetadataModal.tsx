'use client';

import Image from 'next/image';
import { type FormEvent, useState } from 'react';

import { IMAGE } from '@/app/constants';
import { updateImage, type UpdateImageDTO } from '@/app/lib/api/images';
import type { ImageContentBlock } from '@/app/types/ContentBlock';
import type {
  CollectionListModel,
  ContentCameraModel,
  ContentPersonModel,
  ContentTagModel,
  FilmFormatModel,
  FilmTypeModel,
} from '@/app/types/ImageMetadata';

import CameraSelector from './CameraSelector';
import FilmStockSelector, { type NewFilmStockData } from './FilmStockSelector';
import styles from './ImageMetadataModal.module.scss';
import MetadataDropdown from './MetadataDropdown';

interface ImageMetadataModalProps {
  image: ImageContentBlock;
  scrollPosition: number;
  onClose: () => void;
  onSaveSuccess?: (updatedImage: ImageContentBlock) => void;
  collectionLocation?: string | null;
  availableTags?: ContentTagModel[];
  availablePeople?: ContentPersonModel[];
  availableCameras?: ContentCameraModel[];
  availableFilmTypes?: FilmTypeModel[];
  availableFilmFormats?: FilmFormatModel[];
  availableCollections?: CollectionListModel[];
}

/**
 * Modal for editing image metadata with split-screen layout
 *
 * Layout:
 * - Left side: Image preview (~50% width)
 * - Right side: Metadata form with save/cancel buttons (~50% width)
 */
export default function ImageMetadataModal({
  image,
  scrollPosition,
  onClose,
  onSaveSuccess,
  collectionLocation,
  availableTags = [],
  availablePeople = [],
  availableCameras = [],
  availableFilmTypes = [],
  availableFilmFormats = [],
  availableCollections = [],
}: ImageMetadataModalProps) {
  // Form state - initialize with current image values, with defaults:
  // - Author defaults to 'Zechariah Edens' if blank
  // - Location defaults to collection location if blank
  // - Camera: simple string field from image.camera
  const [formData, setFormData] = useState({
    title: image.title || '',
    caption: image.caption || '',
    alt: image.alt || '',
    author: image.author || 'Zechariah Edens',
    location: image.location || collectionLocation || '',
    camera: image.camera || '',
    lens: image.lens || '',
    iso: image.iso?.toString() || '',
    fstop: image.fstop || '',
    shutterSpeed: image.shutterSpeed || '',
    focalLength: image.focalLength || '',
    blackAndWhite: image.blackAndWhite || false,
    isFilm: image.isFilm || false,
    rating: image.rating?.toString() || '',
    filmType: image.filmType || '',
    filmFormat: image.filmFormat || '',
    selectedTagIds: (image.tags || []).map(t => t.id),
    selectedPeopleIds: (image.people || []).map(p => p.id),
    selectedCollections: (image.collections || []).map(c => c.collectionId),
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Track new tag/person names to be created (simple string arrays)
  const [newTagNames, setNewTagNames] = useState<string[]>([]);
  const [newPersonNames, setNewPersonNames] = useState<string[]>([]);

  // Track new film stock to be created and film type ID for existing selection
  const [newFilmStock, setNewFilmStock] = useState<NewFilmStockData | null>(null);
  const [filmTypeId, setFilmTypeId] = useState<number | null>(null);

  // Track form changes
  const handleChange = (field: keyof typeof formData, value: string | boolean | number[] | number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  // Handle adding new tag
  const handleAddNewTag = (tagName: string) => {
    setNewTagNames(prev => [...prev, tagName]);
    setHasChanges(true);
  };

  // Handle adding new person
  const handleAddNewPerson = (personName: string) => {
    setNewPersonNames(prev => [...prev, personName]);
    setHasChanges(true);
  };

  // Handle film stock change - when selecting existing film stock from dropdown
  const handleFilmStockChange = (filmTypeName: string, filmTypeIdFromDropdown?: number) => {
    handleChange('filmType', filmTypeName);
    setFilmTypeId(filmTypeIdFromDropdown || null);
    setNewFilmStock(null); // Clear new film stock if selecting existing one
  };

  // Handle adding new film stock
  const handleAddNewFilmStock = (filmStock: NewFilmStockData) => {
    setNewFilmStock(filmStock);
    setFilmTypeId(null); // Clear film type ID when creating new
    handleChange('filmType', filmStock.filmTypeName); // Use filmTypeName as temporary value
    handleChange('iso', filmStock.defaultIso.toString()); // Auto-set ISO from film stock
    setHasChanges(true);
  };

  // Prepare data for components
  const allCameras = availableCameras.map(c => ({ id: c.id, name: c.cameraName }));

  // For tags dropdown: only show existing tags (new ones will be created on save)
  const allTags = availableTags.map(t => ({ id: t.id, name: t.tagName }));

  // For people dropdown: only show existing people (new ones will be created on save)
  const allPeople = availablePeople.map(p => ({ id: p.id, name: p.personName }));

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

      // Build update DTO with only changed fields
      const updates: UpdateImageDTO = {};

      // String fields - send if changed
      if (formData.title !== (image.title || '')) {
        updates.title = formData.title.trim() || null;
      }
      if (formData.caption !== (image.caption || '')) {
        updates.caption = formData.caption.trim() || null;
      }
      if (formData.alt !== (image.alt || '')) {
        updates.alt = formData.alt.trim() || null;
      }
      if (formData.author !== (image.author || '')) {
        updates.author = formData.author.trim() || null;
      }
      if (formData.location !== (image.location || '')) {
        updates.location = formData.location.trim() || null;
      }

      // Camera handling - check if it changed
      if (formData.camera !== (image.camera || '')) {
        updates.camera = formData.camera.trim() || null;

        // Backend expects 'cameraName' field - will find existing or create new
        if (formData.camera) {
          updates.cameraName = formData.camera.trim();
        }
      }

      if (formData.lens !== (image.lens || '')) {
        updates.lens = formData.lens.trim() || null;
      }
      if (formData.fstop !== (image.fstop || '')) {
        updates.fstop = formData.fstop.trim() || null;
      }
      if (formData.shutterSpeed !== (image.shutterSpeed || '')) {
        updates.shutterSpeed = formData.shutterSpeed.trim() || null;
      }
      if (formData.focalLength !== (image.focalLength || '')) {
        updates.focalLength = formData.focalLength.trim() || null;
      }

      // Number fields
      const newIso = formData.iso ? Number.parseInt(formData.iso, 10) : null;
      if (newIso !== (image.iso || null)) {
        updates.iso = newIso;
      }

      const newRating = formData.rating ? Number.parseInt(formData.rating, 10) : null;
      if (newRating !== (image.rating || null)) {
        updates.rating = newRating;
      }

      // Boolean fields
      if (formData.blackAndWhite !== image.blackAndWhite) {
        updates.blackAndWhite = formData.blackAndWhite;
      }
      if (formData.isFilm !== image.isFilm) {
        updates.isFilm = formData.isFilm;
      }

      // Film-specific fields (only send if isFilm is true)
      if (formData.isFilm) {
        // Handle film type - either new or existing
        if (formData.filmType !== (image.filmType || '')) {
          updates.filmType = formData.filmType.trim() || null;

          // If creating new film stock
          if (newFilmStock) {
            updates.newFilmType = {
              filmTypeName: newFilmStock.filmTypeName,
              defaultIso: newFilmStock.defaultIso,
            };
          }
          // If selecting existing film stock
          else if (filmTypeId) {
            updates.filmTypeId = filmTypeId;
          }
        }

        if (formData.filmFormat !== (image.filmFormat || '')) {
          updates.filmFormat = formData.filmFormat.trim() || null;
        }
      }

      // Tags handling - simple comparison of existing tag IDs
      const currentTagIds = (image.tags || []).map(t => t.id).sort();
      const selectedExistingTagIds = [...formData.selectedTagIds].sort();
      const hasTagChanges = JSON.stringify(currentTagIds) !== JSON.stringify(selectedExistingTagIds) || newTagNames.length > 0;

      if (hasTagChanges) {
        // Send existing tag IDs
        updates.tagIds = formData.selectedTagIds.length > 0 ? formData.selectedTagIds : null;

        // Send new tag names
        if (newTagNames.length > 0) {
          updates.newTags = newTagNames;
        }
      }

      // People handling - simple comparison of existing person IDs
      const currentPersonIds = (image.people || []).map(p => p.id).sort();
      const selectedExistingPersonIds = [...formData.selectedPeopleIds].sort();
      const hasPeopleChanges = JSON.stringify(currentPersonIds) !== JSON.stringify(selectedExistingPersonIds) || newPersonNames.length > 0;

      if (hasPeopleChanges) {
        // Send existing person IDs
        updates.personIds = formData.selectedPeopleIds.length > 0 ? formData.selectedPeopleIds : null;

        // Send new person names
        if (newPersonNames.length > 0) {
          updates.newPeople = newPersonNames;
        }
      }

      // Collections handling - send list of collection IDs this image should belong to
      const currentCollectionIds = (image.collections || []).map(c => c.collectionId).sort();
      const newCollectionIds = [...formData.selectedCollections].sort();
      if (JSON.stringify(currentCollectionIds) !== JSON.stringify(newCollectionIds)) {
        // Build the collections list with collectionId and collectionName
        updates.collections = formData.selectedCollections.length > 0
          ? formData.selectedCollections.map(collectionId => {
              const collection = availableCollections.find(c => c.id === collectionId);
              return {
                collectionId,
                collectionName: collection?.collectionName || '',
              };
            })
          : [];
      }

      console.log('🔍 [ImageMetadataModal] Updating image metadata:', {
        imageId: image.id,
        updates,
        tagsInfo: {
          currentTags: image.tags?.map(t => ({ id: t.id, name: t.tagName })),
          selectedExistingTagIds: formData.selectedTagIds,
          newTagNames,
          sendingTagIds: updates.tagIds,
          sendingNewTags: updates.newTags,
        },
        peopleInfo: {
          currentPeople: image.people?.map(p => ({ id: p.id, name: p.personName })),
          selectedExistingPersonIds: formData.selectedPeopleIds,
          newPersonNames,
          sendingPersonIds: updates.personIds,
          sendingNewPeople: updates.newPeople,
        },
        collectionsInfo: {
          currentCollections: image.collections?.map(c => ({ id: c.collectionId, name: c.collectionName })),
          selectedCollectionIds: formData.selectedCollections,
          sendingCollections: updates.collections,
        },
      });

      // Call updateImage API
      const updatedImage = await updateImage<ImageContentBlock>(image.id, updates);

      console.log('✅ [ImageMetadataModal] Image metadata updated successfully:', {
        updatedImage,
        returnedTags: updatedImage.tags,
        returnedPeople: updatedImage.people,
      });

      // Notify parent of success
      if (onSaveSuccess) {
        onSaveSuccess(updatedImage);
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
        <Image
          src={image.imageUrlWeb}
          alt={image.alt || image.title || 'Image preview'}
          width={image.imageWidth || IMAGE.defaultWidth}
          height={image.imageHeight || IMAGE.defaultHeight}
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
      </div>

      {/* Metadata Section - Right Side */}
      <div className={styles.metadataSection}>
        <h2 id="metadata-modal-title" className={styles.heading}>
          Edit Image Metadata
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
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className={styles.formInput}
                placeholder="Enter image title"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Caption</label>
              <textarea
                value={formData.caption}
                onChange={(e) => handleChange('caption', e.target.value)}
                className={styles.formTextarea}
                placeholder="Enter caption"
                rows={3}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Alt Text (Accessibility)</label>
              <input
                type="text"
                value={formData.alt}
                onChange={(e) => handleChange('alt', e.target.value)}
                className={styles.formInput}
                placeholder="Describe the image for screen readers"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Author</label>
              <input
                type="text"
                value={formData.author}
                onChange={(e) => handleChange('author', e.target.value)}
                className={styles.formInput}
                placeholder="Photographer name"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                className={styles.formInput}
                placeholder="Where was this taken?"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Rating</label>
              <select
                value={formData.rating}
                onChange={(e) => handleChange('rating', e.target.value)}
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

            <CameraSelector
              currentCamera={formData.camera}
              availableCameras={allCameras}
              onChange={(cameraName) => handleChange('camera', cameraName)}
            />

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Lens</label>
              <input
                type="text"
                value={formData.lens}
                onChange={(e) => handleChange('lens', e.target.value)}
                className={styles.formInput}
                placeholder="e.g., 24-70mm f/2.8"
              />
            </div>

            <div className={styles.formGrid2Col}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>ISO</label>
                <input
                  type="number"
                  value={formData.iso}
                  onChange={(e) => handleChange('iso', e.target.value)}
                  className={styles.formInput}
                  placeholder="e.g., 800"
                  min="0"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>F-Stop</label>
                <input
                  type="text"
                  value={formData.fstop}
                  onChange={(e) => handleChange('fstop', e.target.value)}
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
                  value={formData.shutterSpeed}
                  onChange={(e) => handleChange('shutterSpeed', e.target.value)}
                  className={styles.formInput}
                  placeholder="e.g., 1/250 sec"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Focal Length</label>
                <input
                  type="text"
                  value={formData.focalLength}
                  onChange={(e) => handleChange('focalLength', e.target.value)}
                  className={styles.formInput}
                  placeholder="e.g., 50 mm"
                />
              </div>
            </div>

            <div className={styles.checkboxGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.blackAndWhite}
                  onChange={(e) => handleChange('blackAndWhite', e.target.checked)}
                />
                <span>Black & White</span>
              </label>

              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.isFilm}
                  onChange={(e) => handleChange('isFilm', e.target.checked)}
                />
                <span>Film Photography</span>
              </label>
            </div>

            {/* Film-specific fields - only shown when isFilm is true */}
            {formData.isFilm && (
              <div className={styles.formGrid2Col}>
                <FilmStockSelector
                  currentFilmStock={formData.filmType}
                  availableFilmTypes={availableFilmTypes}
                  onChange={handleFilmStockChange}
                  onAddNew={handleAddNewFilmStock}
                />

                {/* Display newly created film stock */}
                {newFilmStock && (
                  <div className={styles.newItemsDisplay}>
                    <span className={styles.newItemsLabel}>New film stock to be created:</span>
                    <div className={styles.newItemsChips}>
                      <div className={styles.chip}>
                        <span>
                          {newFilmStock.filmTypeName} (ISO {newFilmStock.defaultIso})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setNewFilmStock(null);
                            handleChange('filmType', '');
                            setHasChanges(true);
                          }}
                          className={styles.chipRemove}
                          aria-label="Remove new film stock"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Film Format</label>
                  <select
                    value={formData.filmFormat}
                    onChange={(e) => handleChange('filmFormat', e.target.value)}
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

            <MetadataDropdown
              label="Tags"
              options={allTags}
              selectedIds={formData.selectedTagIds}
              onChange={(ids) => handleChange('selectedTagIds', ids)}
              multiSelect
              placeholder="Select tags or add new"
              allowAddNew
              onAddNew={handleAddNewTag}
            />

            {/* Display newly created tags */}
            {newTagNames.length > 0 && (
              <div className={styles.newItemsDisplay}>
                <span className={styles.newItemsLabel}>New tags to be created:</span>
                <div className={styles.newItemsChips}>
                  {newTagNames.map((tagName) => (
                    <div key={tagName} className={styles.chip}>
                      <span>{tagName}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setNewTagNames(prev => prev.filter(name => name !== tagName));
                          setHasChanges(true);
                        }}
                        className={styles.chipRemove}
                        aria-label={`Remove ${tagName}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <MetadataDropdown
              label="People"
              options={allPeople}
              selectedIds={formData.selectedPeopleIds}
              onChange={(ids) => handleChange('selectedPeopleIds', ids)}
              multiSelect
              placeholder="Select people or add new"
              allowAddNew
              onAddNew={handleAddNewPerson}
            />

            {/* Display newly created people */}
            {newPersonNames.length > 0 && (
              <div className={styles.newItemsDisplay}>
                <span className={styles.newItemsLabel}>New people to be created:</span>
                <div className={styles.newItemsChips}>
                  {newPersonNames.map((personName) => (
                    <div key={personName} className={styles.chip}>
                      <span>{personName}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setNewPersonNames(prev => prev.filter(name => name !== personName));
                          setHasChanges(true);
                        }}
                        className={styles.chipRemove}
                        aria-label={`Remove ${personName}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Collections */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionHeading}>Collections</h3>

            <MetadataDropdown
              label="Collections"
              options={allCollections}
              selectedIds={formData.selectedCollections}
              onChange={(ids) => handleChange('selectedCollections', ids)}
              multiSelect
              placeholder="Select collections"
              allowAddNew={false}
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
