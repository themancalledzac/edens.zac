'use client';

import { useRef, useState } from 'react';

import CollectionListSelector from '@/app/components/CollectionListSelector/CollectionListSelector';
import { CloseButton } from '@/app/components/ui/CloseButton/CloseButton';
import { EditBar } from '@/app/components/ui/EditBar/EditBar';
import { Modal } from '@/app/components/ui/Modal/Modal';
import { type CollectionListModel, type LocationModel } from '@/app/types/Collection';
import { type ContentGifModel, type ContentImageUpdateResponse } from '@/app/types/Content';
import {
  type ContentCameraModel,
  type ContentFilmTypeModel,
  type ContentLensModel,
  type ContentPersonModel,
  type ContentTagModel,
  type FilmFormatDTO,
} from '@/app/types/Metadata';
import { isGifContent } from '@/app/utils/contentTypeGuards';

import { useMetadataState } from './hooks/useMetadataState';
import { useMetadataSubmit } from './hooks/useMetadataSubmit';
import styles from './MetadataModal.module.scss';
import CameraSettingsSection from './sections/CameraSettingsSection';
import EssentialInfoSection from './sections/EssentialInfoSection';
import MediaPreview from './sections/MediaPreview';
import TagsPeopleSection from './sections/TagsPeopleSection';
import type { EditableContent } from './types';

type TabId = 'info' | 'camera' | 'collections';

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: 'info', label: 'Info' },
  { id: 'camera', label: 'Camera' },
  { id: 'collections', label: 'Collections' },
];

interface MetadataModalProps {
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
  selectedIds: number[];
  /**
   * Content blocks to edit. May include images and GIF/MP4 blocks. Bulk edit only operates on
   * the IMAGE subset (the EXIF-heavy fields don't have GIF analogs); when the selection is a
   * single GIF the modal routes title/rating/tags/collections through `updateGif()`.
   */
  selectedImages: EditableContent[];
  currentCollectionId?: number;
}

/**
 * Orchestrator for the image/GIF metadata editor sheet modal.
 *
 * Layout: pinned photo (top strip on mobile, left sidebar on desktop) + scrollable form + a
 * pinned bottom bar holding the tab row (Info · Camera · Tags · Collections) above the sticky
 * action bar. The sheet lives on the dark admin surface — primitives adapt automatically via
 * [data-surface] token inheritance; no per-component dark overrides are needed here.
 */
export default function MetadataModal({
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
  selectedIds,
  selectedImages,
  currentCollectionId,
}: MetadataModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('info');
  const formRef = useRef<HTMLFormElement>(null);

  const isBulkEdit = selectedIds.length > 1;

  const {
    updateState,
    updateStateField,
    hasChanges,
    originalCollectionIds,
    pendingAddIds,
    pendingRemoveIds,
    handleCollectionToggle,
    replaceOptimisticCamera,
  } = useMetadataState({ selectedImages, selectedIds, availableLocations });

  const { saving, error, handleSubmit, handleCancel, handleDelete, handleRemoveFromCollection } =
    useMetadataSubmit({
      selectedImages,
      selectedIds,
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

  const isGif = isGifContent(previewImage);

  return (
    <Modal open onClose={handleCancel} variant="sheet" labelledBy="metadata-modal-title">
      <div className={styles.metadataLayout}>
        <MediaPreview
          isBulkEdit={isBulkEdit}
          selectedImages={selectedImages}
          selectedIds={selectedIds}
          previewImage={previewImage}
        />

        <div className={styles.metadataSection}>
          <div className={styles.sectionTop}>
            <h2 id="metadata-modal-title" className={styles.heading}>
              {isBulkEdit ? `Edit ${selectedIds.length} Images` : 'Edit Image Metadata'}
            </h2>

            {error && (
              <div className={styles.errorMessage} role="alert">
                {error}
              </div>
            )}
          </div>

          <form ref={formRef} onSubmit={handleSubmit} className={styles.formColumn}>
            <div className={styles.tabContent}>
              <div
                id="tabpanel-info"
                role="tabpanel"
                aria-labelledby="tab-info"
                hidden={activeTab !== 'info'}
              >
                <EssentialInfoSection
                  updateState={updateState}
                  updateStateField={updateStateField}
                  availableLocations={availableLocations}
                  availableCollections={availableCollections}
                  currentCollectionId={currentCollectionId}
                  isGif={isGif}
                  isBulkEdit={isBulkEdit}
                />
                <TagsPeopleSection
                  updateState={updateState}
                  updateStateField={updateStateField}
                  availableTags={availableTags}
                  availablePeople={availablePeople}
                />
              </div>

              <div
                id="tabpanel-camera"
                role="tabpanel"
                aria-labelledby="tab-camera"
                hidden={activeTab !== 'camera'}
              >
                <CameraSettingsSection
                  updateState={updateState}
                  updateStateField={updateStateField}
                  replaceOptimisticCamera={replaceOptimisticCamera}
                  availableCameras={availableCameras}
                  availableLenses={availableLenses}
                  availableFilmTypes={availableFilmTypes}
                  availableFilmFormats={availableFilmFormats}
                  isGif={isGif}
                />
              </div>

              <div
                id="tabpanel-collections"
                role="tabpanel"
                aria-labelledby="tab-collections"
                hidden={activeTab !== 'collections'}
              >
                <div className={styles.formSection}>
                  <CollectionListSelector
                    allCollections={availableCollections}
                    savedCollectionIds={originalCollectionIds}
                    pendingAddIds={pendingAddIds}
                    pendingRemoveIds={pendingRemoveIds}
                    onToggle={handleCollectionToggle}
                    label="Collections"
                    grouped
                  />
                </div>
              </div>
            </div>

            <EditBar
              fixed={false}
              ariaLabel="Metadata sections"
              tabs={TABS}
              activeTab={activeTab}
              onTabChange={id => setActiveTab(id as TabId)}
              cells={[
                // Remove: only available in a collection context; less destructive than Delete.
                ...(currentCollectionId
                  ? [
                      {
                        key: 'remove',
                        label: 'Remove',
                        variant: 'default' as const,
                        onClick: handleRemoveFromCollection,
                        disabled: saving,
                      },
                    ]
                  : []),
                // Delete: always present, including for GIFs (which have no Remove).
                {
                  key: 'delete',
                  label: 'Delete',
                  variant: 'danger' as const,
                  onClick: handleDelete,
                  disabled: saving,
                },
                {
                  key: 'save',
                  label: isBulkEdit ? `Save ${selectedIds.length}` : 'Save',
                  variant: 'primary' as const,
                  disabled: !hasChanges || saving,
                  onClick: () => formRef.current?.requestSubmit(),
                },
                { key: 'cancel', label: 'Cancel', onClick: handleCancel, disabled: saving },
              ]}
            />
          </form>
        </div>
      </div>

      <div className={styles.closeButtonSlot}>
        <CloseButton onClick={handleCancel} aria-label="Close metadata editor" disabled={saving} />
      </div>
    </Modal>
  );
}
