'use client';

import Image from 'next/image';
import { type SubmitEvent, useCallback, useEffect, useMemo, useState } from 'react';

import CollectionListSelector from '@/app/components/CollectionListSelector/CollectionListSelector';
import { LoadingSpinner } from '@/app/components/LoadingSpinner/LoadingSpinner';
import { CloseButton } from '@/app/components/ui/CloseButton/CloseButton';
import Dropdown from '@/app/components/ui/Dropdown/Dropdown';
import { Modal } from '@/app/components/ui/Modal/Modal';
import { IMAGE } from '@/app/constants';
import {
  type ContentGifUpdateRequest,
  createCamera,
  deleteGif,
  deleteImages,
  updateGif,
  updateImages,
} from '@/app/lib/api/content';
import { type CollectionListModel, type LocationModel } from '@/app/types/Collection';
import {
  type ContentGifModel,
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
import { isGifContent } from '@/app/utils/contentTypeGuards';
import { convertLocationsToModels } from '@/app/utils/locationUtils';
import { hasObjectChanges } from '@/app/utils/objectComparison';

import styles from './ImageMetadataModal.module.scss';
import {
  buildContentPeopleLocationsDiff,
  buildImageUpdateDiff,
  buildImageUpdateForSingleEdit,
  buildImageUpdatesForBulkEdit,
  computeCameraSelectionUpdate,
  getCommonValues,
  mapUpdateResponseToFrontend,
} from './imageMetadataUtils';

/**
 * Local edit-state shape. We allow GIF fields too because the same modal now edits both — image-
 * only fields are disabled in the JSX when the current selection is a GIF.
 */
type ImageUpdateState = Partial<ContentImageModel> &
  Partial<Pick<ContentGifModel, 'gifUrl' | 'thumbnailUrl' | 'rating'>> & {
    id: number;
  };

/** Any content the modal can edit — images and animated GIF/MP4 blocks. */
type EditableContent = ContentImageModel | ContentGifModel;

/**
 * Render the single-item preview: looping `<video>` for GIF/MP4, `<Image>` for stills. Extracted
 * so the inline JSX doesn't trigger the unicorn/no-nested-ternary rule, and so the same render
 * can be reused if we ever introduce a single-preview header above the bulk grid.
 */
function renderSinglePreview({
  isGif,
  previewImageAsGif,
  previewImageAsImage,
}: {
  isGif: boolean;
  previewImageAsGif: ContentGifModel | null;
  previewImageAsImage: ContentImageModel | null;
}) {
  if (isGif && previewImageAsGif) {
    return (
      <video
        key={previewImageAsGif.gifUrl}
        autoPlay
        loop
        muted
        playsInline
        controls={false}
        preload="auto"
        poster={previewImageAsGif.thumbnailUrl ?? undefined}
        width={previewImageAsGif.width || IMAGE.defaultWidth}
        height={previewImageAsGif.height || IMAGE.defaultHeight}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          width: 'auto',
          height: 'auto',
          objectFit: 'contain',
        }}
      >
        <source src={previewImageAsGif.gifUrl} type="video/mp4" />
      </video>
    );
  }
  if (previewImageAsImage) {
    return (
      <Image
        src={previewImageAsImage.imageUrl}
        alt={previewImageAsImage.alt || previewImageAsImage.title || 'Image preview'}
        width={previewImageAsImage.imageWidth || IMAGE.defaultWidth}
        height={previewImageAsImage.imageHeight || IMAGE.defaultHeight}
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
    );
  }
  return null;
}

interface ImageMetadataModalProps {
  onClose: () => void;
  onSaveSuccess?: (response: ContentImageUpdateResponse) => void;
  /**
   * Fired after a single-GIF save. Separate from `onSaveSuccess` because the GIF update endpoint
   * returns one record instead of the batched ImageUpdate response. ManageClient hands these to
   * the same collection-refresh handler that GIF saves used to call from `GifMetadataModal`.
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
 * Modal for editing image metadata with split-screen layout
 *
 * Layout:
 * - Left side: Image preview (~50% width)
 * - Right side: Metadata form with save/cancel buttons (~50% width)
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
        locations: convertLocationsToModels(itemLocations, availableLocations),
      } as ImageUpdateState;
    }
    const common = getCommonValues(imageSubset);
    return {
      id: 0,
      ...common,
      locations: convertLocationsToModels(common.locations, availableLocations),
    };
  };

  const [updateState, setUpdateState] = useState<ImageUpdateState>(buildInitialState);

  useEffect(() => {
    setUpdateState(buildInitialState());
    // buildInitialState closes over selectedImages + availableLocations only; everything else is
    // stable. Listing the function in deps would just churn on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedImages, availableLocations]);

  const updateStateField = (updates: Partial<ImageUpdateState>) => {
    setUpdateState(prev => ({ ...prev, ...updates }));
  };

  const hasChanges = useMemo(() => {
    if (isBulkEdit) {
      const common = getCommonValues(imageSubset);
      return hasObjectChanges(updateState, { id: 0, ...common });
    } else {
      const original = selectedImages[0]!;
      return hasObjectChanges(updateState, original);
    }
    // imageSubset is derived from selectedImages each render; reflect that in deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  /**
   * Type-narrowing helpers so the JSX below can stay readable. When `isGif` is true the GIF-
   * specific fields are available on the union; when false the image-specific ones are. The
   * disabled-input pattern (rather than rendering nothing) keeps the layout stable.
   */
  const isGif = isGifContent(previewImage);
  const previewImageAsImage = !isGif ? (previewImage as ContentImageModel) : null;
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

      // "Remove from collection" only operates on IMAGE blocks today — the bulk diff helper is
      // typed to ContentImageModel. Skip GIF entries; they'll be a follow-up.
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

  return (
    <Modal open onClose={handleCancel} variant="sheet" labelledBy="metadata-modal-title">
      <div className={styles.metadataLayout}>
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
                const item = selectedImages.find(i => i.id === imageId);
                if (!item) return null;
                // Bulk-edit thumbnail src: image uses imageUrl, GIF uses thumbnailUrl (still WebP).
                const thumbSrc =
                  item.contentType === 'GIF'
                    ? (item.thumbnailUrl ?? '')
                    : ((item as ContentImageModel).imageUrl ?? '');
                if (!thumbSrc) return null;
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
                      src={thumbSrc}
                      alt={item.alt || item.title || 'Selected media'}
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
            renderSinglePreview({ isGif, previewImageAsGif, previewImageAsImage })
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

              <div
                className={styles.formGroup}
                style={isGif ? { opacity: 0.4, pointerEvents: 'none' } : undefined}
                aria-disabled={isGif}
                title={isGif ? 'Caption is not supported on GIF/MP4 content.' : undefined}
              >
                <label className={styles.formLabel}>Caption</label>
                <textarea
                  value={updateState.caption ?? ''}
                  onChange={e => updateStateField({ caption: e.target.value || undefined })}
                  className={styles.formTextarea}
                  placeholder="Enter caption"
                  rows={3}
                  disabled={isGif}
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

              <div>
                <Dropdown<LocationModel>
                  label="Locations"
                  multiSelect
                  options={availableLocations}
                  selectedValues={updateState.locations ?? []}
                  onChange={value => {
                    let locations: LocationModel[];
                    if (Array.isArray(value)) {
                      locations = value;
                    } else if (value) {
                      locations = [value];
                    } else {
                      locations = [];
                    }
                    updateStateField({ locations });
                  }}
                  allowAddNew
                  onAddNew={data => {
                    const newLocation = { id: 0, name: data.name as string, slug: '' };
                    updateStateField({
                      locations: [...(updateState.locations ?? []), newLocation],
                    });
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
              </div>

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
                      <span style={{ marginLeft: '8px' }}>Deleting...</span>
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
                        <span style={{ marginLeft: '8px' }}>Removing...</span>
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
      </div>

      {/* Close Button — floats over the top-right corner of the sheet. */}
      <div className={styles.closeButtonSlot}>
        <CloseButton onClick={handleCancel} aria-label="Close metadata editor" disabled={saving} />
      </div>
    </Modal>
  );
}
