'use client';

import {
  LOCATION_ADD_NEW_FIELDS,
  PERSON_ADD_NEW_FIELDS,
} from '@/app/components/ui/Dropdown/commonAddNewFields';
import Dropdown from '@/app/components/ui/Dropdown/Dropdown';
import { Checkbox } from '@/app/components/ui/Field/Checkbox';
import { Field } from '@/app/components/ui/Field/Field';
import { Input } from '@/app/components/ui/Field/Input';
import { Select } from '@/app/components/ui/Field/Select';
import { Textarea } from '@/app/components/ui/Field/Textarea';
import TagsSelector from '@/app/components/ui/TagsSelector/TagsSelector';
import { type ContentPersonModel, type LocationModel } from '@/app/types/Collection';
import {
  COLLECTION_VISIBILITY_LABELS,
  CollectionVisibility,
} from '@/app/types/CollectionVisibility';

import { Button } from '../../../ui/Button/Button';
import { type UseCollectionEditResult } from '../useCollectionEdit';
import { CollectionRolesSection } from './CollectionRolesSection';
import styles from './InfoTab.module.scss';

interface InfoTabProps {
  edit: UseCollectionEditResult;
}

/**
 * Info tab: title, kind, date, description, locations, visibility, tags, people, and (when
 * applicable) gallery access. Tags + people were consolidated here from a former Tags tab.
 */
export function InfoTab({ edit }: InfoTabProps) {
  const {
    updateData,
    setUpdateField,
    currentState,
    currentLocations,
    handleLocationsChange,
    currentTags,
    handleTagsChange,
    collectionPeople,
    setCollectionPeople,
    peopleSaving,
    peopleStatus,
    handleSavePeople,
    handleRegeneratePeople,
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
  // Keyed on the stored discriminator, not the legacy enum: a standalone client gallery has
  // no child collections, so `isParent` alone would hide the password SET and REVOKE controls
  // while the collection stayed gated (blast radius R12).
  const showGalleryAccess = updateData.isClient === true || isParent;

  // Soft advisory only — never blocks a save. ISO YYYY-MM-DD compares correctly as strings.
  const isEndBeforeStart = Boolean(
    updateData.collectionDate &&
    updateData.collectionEndDate &&
    updateData.collectionEndDate < updateData.collectionDate
  );

  /**
   * The two stored discriminators are mutually exclusive (the backend rejects both true), so
   * turning one on turns the other off. Turning one off touches only that flag — a collection
   * with neither is just a collection, which is the default under the typeless model.
   */
  const setKind = (kind: 'isClient' | 'isBlog', checked: boolean) => {
    setUpdateField(kind, checked);
    if (checked) setUpdateField(kind === 'isClient' ? 'isBlog' : 'isClient', false);
  };

  return (
    <div className={styles.tabPanel}>
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

      <div className={styles.formGroup}>
        <span className={styles.formLabel}>Kind</span>
        <div className={styles.checkboxRow}>
          <label className={styles.checkboxLabel}>
            <Checkbox
              checked={updateData.isClient === true}
              onChange={e => setKind('isClient', e.target.checked)}
            />
            <span>Client gallery</span>
          </label>
          <label className={styles.checkboxLabel}>
            <Checkbox
              checked={updateData.isBlog === true}
              onChange={e => setKind('isBlog', e.target.checked)}
            />
            <span>Blog</span>
          </label>
        </div>
        <p className={styles.fieldHint}>
          Leave both unchecked for an ordinary collection. A collection cannot be both.
        </p>
      </div>

      <div className={styles.formGroup}>
        <Field label="Collection Date" htmlFor="edit-sheet-collection-date">
          <div className={styles.dateInputWrapper}>
            <input
              id="edit-sheet-collection-date"
              type="date"
              value={updateData.collectionDate ?? ''}
              onChange={e => setUpdateField('collectionDate', e.target.value)}
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
        </Field>
      </div>

      <div className={styles.formGroup}>
        <Field label="End date" htmlFor="edit-sheet-collection-end-date">
          <div className={styles.dateInputWrapper}>
            <input
              id="edit-sheet-collection-end-date"
              type="date"
              value={updateData.collectionEndDate ?? ''}
              onChange={e => setUpdateField('collectionEndDate', e.target.value)}
              className={styles.dateInput}
            />
            {updateData.collectionEndDate && (
              <button
                type="button"
                onClick={() => setUpdateField('collectionEndDate', null)}
                className={styles.dateClearButton}
                aria-label="Clear end date"
              >
                ✕
              </button>
            )}
          </div>
        </Field>
        {isEndBeforeStart && (
          <p role="status" className={styles.dateRangeWarning}>
            End date is before the collection date.
          </p>
        )}
      </div>

      <div className={styles.formGroup}>
        <Field label="Description" htmlFor="edit-sheet-description">
          <Textarea
            id="edit-sheet-description"
            value={updateData.description}
            onChange={e => setUpdateField('description', e.target.value)}
          />
        </Field>
      </div>

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

      <div className={styles.formGroup}>
        <Field label="Visibility" htmlFor="edit-sheet-visibility">
          <Select
            id="edit-sheet-visibility"
            value={updateData.visibility ?? CollectionVisibility.HIDDEN}
            onChange={e => setUpdateField('visibility', e.target.value as CollectionVisibility)}
          >
            {Object.values(CollectionVisibility).map(v => (
              <option key={v} value={v}>
                {COLLECTION_VISIBILITY_LABELS[v]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Tags</label>
        <TagsSelector
          selectedTags={currentTags}
          availableTags={currentState?.tags || []}
          onChange={handleTagsChange}
          emptyText="No tags set"
        />
      </div>

      <section aria-labelledby="edit-sheet-people-heading" className={styles.formGroup}>
        <label id="edit-sheet-people-heading" className={styles.formLabel}>
          People
        </label>
        <Dropdown<ContentPersonModel>
          label=""
          multiSelect
          options={currentState?.people || []}
          selectedValues={collectionPeople}
          onChange={value => {
            let next: ContentPersonModel[];
            if (Array.isArray(value)) {
              next = value;
            } else if (value) {
              next = [value];
            } else {
              next = [];
            }
            setCollectionPeople(next);
          }}
          allowAddNew
          onAddNew={data => {
            const newPerson: ContentPersonModel = { id: 0, name: data.name as string };
            setCollectionPeople([...collectionPeople, newPerson]);
          }}
          addNewFields={PERSON_ADD_NEW_FIELDS}
          getDisplayName={person => person?.name || ''}
          showNewIndicator
          emptyText="No people set"
        />
        <div className={styles.actionRow}>
          <Button onClick={() => void handleSavePeople()} disabled={peopleSaving}>
            {peopleSaving ? 'Saving…' : 'Save People'}
          </Button>
          <Button onClick={() => void handleRegeneratePeople()} disabled={peopleSaving}>
            Regenerate from contents
          </Button>
        </div>
        {peopleStatus && (
          <p role="status" className={styles.statusMessage}>
            {peopleStatus}
          </p>
        )}
      </section>

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

      {collection?.id != null && (
        <CollectionRolesSection
          collectionId={collection.id}
          collectionTitle={updateData.title ?? ''}
        />
      )}
    </div>
  );
}

export default InfoTab;
