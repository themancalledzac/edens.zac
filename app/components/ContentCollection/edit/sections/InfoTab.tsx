'use client';

import { LOCATION_ADD_NEW_FIELDS } from '@/app/components/ui/Dropdown/commonAddNewFields';
import Dropdown from '@/app/components/ui/Dropdown/Dropdown';
import { Field } from '@/app/components/ui/Field/Field';
import { Input } from '@/app/components/ui/Field/Input';
import { Textarea } from '@/app/components/ui/Field/Textarea';
import { SegmentedControl } from '@/app/components/ui/SegmentedControl/SegmentedControl';
import {
  CollectionType,
  type CollectionUpdateRequest,
  type LocationModel,
} from '@/app/types/Collection';
import {
  COLLECTION_VISIBILITY_DESCRIPTIONS,
  COLLECTION_VISIBILITY_LABELS,
  CollectionVisibility,
} from '@/app/types/CollectionVisibility';

import { Button } from '../../../ui/Button/Button';
import { type UseCollectionEditResult } from '../useCollectionEdit';
import styles from './InfoTab.module.scss';

interface InfoTabProps {
  edit: UseCollectionEditResult;
}

/** Info tab: title, date, description, locations, visibility, and (when applicable) gallery access. */
export function InfoTab({ edit }: InfoTabProps) {
  const {
    updateData,
    setUpdateField,
    currentState,
    currentLocations,
    handleLocationsChange,
    galleryPassword,
    setGalleryPassword,
    galleryEmail,
    setGalleryEmail,
    gallerySaving,
    galleryStatus,
    handleSaveAccess,
    handleClearPassword,
    isParent,
  } = edit;

  const collection = currentState?.collection;
  const showGalleryAccess = updateData.type === CollectionType.CLIENT_GALLERY || isParent;

  return (
    <div className={styles.tabPanel}>
      {/* Title */}
      <div className={styles.titleRow}>
        <div className={styles.titleInputWrapper}>
          <Field label="Title" htmlFor="edit-sheet-title">
            <Input
              id="edit-sheet-title"
              value={updateData.title}
              onChange={e => setUpdateField('title', e.target.value)}
            />
          </Field>
        </div>
      </div>

      {/* Collection Date */}
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Collection Date</label>
        <div className={styles.dateInputWrapper}>
          <input
            type="date"
            value={updateData.collectionDate ?? ''}
            onChange={e =>
              setUpdateField(
                'collectionDate',
                e.target.value as CollectionUpdateRequest['collectionDate']
              )
            }
            className={styles.dateInput}
          />
          {updateData.collectionDate && (
            <button
              type="button"
              onClick={() => setUpdateField('collectionDate', null)}
              className={styles.dateClearButton}
              aria-label="Clear date"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Description */}
      <div className={styles.formGroup}>
        <Field label="Description" htmlFor="edit-sheet-description">
          <Textarea
            id="edit-sheet-description"
            value={updateData.description}
            onChange={e => setUpdateField('description', e.target.value)}
          />
        </Field>
      </div>

      {/* Locations */}
      <Dropdown<LocationModel>
        label="Locations"
        multiSelect
        options={currentState?.locations || []}
        selectedValues={currentLocations}
        onChange={handleLocationsChange}
        allowAddNew
        onAddNew={data => {
          const newLoc: LocationModel = {
            id: 0,
            name: data.name as string,
            slug: '',
          };
          handleLocationsChange([...currentLocations, newLoc]);
        }}
        addNewFields={LOCATION_ADD_NEW_FIELDS}
        getDisplayName={location => location?.name || ''}
        showNewIndicator
        emptyText="No locations set"
      />

      {/* Visibility */}
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Visibility</label>
        <SegmentedControl<CollectionVisibility>
          ariaLabel="Visibility"
          value={updateData.visibility ?? CollectionVisibility.HIDDEN}
          onChange={v => setUpdateField('visibility', v)}
          options={Object.values(CollectionVisibility).map(v => ({
            value: v,
            label: COLLECTION_VISIBILITY_LABELS[v],
            description: COLLECTION_VISIBILITY_DESCRIPTIONS[v],
          }))}
          showDescription
        />
      </div>

      {/* Gallery Access — shown for CLIENT_GALLERY or PARENT collections */}
      {showGalleryAccess && (
        <section aria-labelledby="gallery-access-heading" className={styles.formGroup}>
          <h3 id="gallery-access-heading" className={styles.sectionTitle}>
            Gallery Access
          </h3>
          <p className={styles.fieldHint}>
            {collection?.isPasswordProtected
              ? 'Password is set. Saving a new password replaces the existing one.'
              : 'No password set. This gallery is currently unprotected.'}
          </p>
          <div className={styles.formGridHalf}>
            <div>
              <Field label="Password" htmlFor="edit-sheet-gallery-password">
                <Input
                  id="edit-sheet-gallery-password"
                  type="text"
                  minLength={4}
                  value={galleryPassword}
                  onChange={e => setGalleryPassword(e.target.value)}
                  placeholder="At least 4 characters"
                  disabled={gallerySaving}
                  autoComplete="off"
                />
              </Field>
            </div>
            <div>
              <Field label="Recipient email" htmlFor="edit-sheet-gallery-email">
                <Input
                  id="edit-sheet-gallery-email"
                  type="email"
                  multiple
                  value={galleryEmail}
                  onChange={e => setGalleryEmail(e.target.value)}
                  placeholder="client@example.com, other@example.com"
                  disabled={gallerySaving}
                  autoComplete="off"
                />
              </Field>
            </div>
          </div>
          <div className={styles.actionRow}>
            <Button
              onClick={() => void handleSaveAccess()}
              disabled={gallerySaving || galleryPassword.length === 0}
            >
              {gallerySaving ? 'Saving…' : 'Save access'}
            </Button>
            {collection?.isPasswordProtected && (
              <Button onClick={() => void handleClearPassword()} disabled={gallerySaving}>
                Clear Password
              </Button>
            )}
          </div>
          {galleryStatus && (
            <p role="status" className={styles.statusMessage}>
              {galleryStatus}
            </p>
          )}
        </section>
      )}
    </div>
  );
}

export default InfoTab;
