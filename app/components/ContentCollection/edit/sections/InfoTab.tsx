'use client';

import Image from 'next/image';

import {
  LOCATION_ADD_NEW_FIELDS,
  PERSON_ADD_NEW_FIELDS,
} from '@/app/components/ui/Dropdown/commonAddNewFields';
import Dropdown from '@/app/components/ui/Dropdown/Dropdown';
import { Field } from '@/app/components/ui/Field/Field';
import { Input } from '@/app/components/ui/Field/Input';
import { Select } from '@/app/components/ui/Field/Select';
import { Textarea } from '@/app/components/ui/Field/Textarea';
import TagsSelector from '@/app/components/ui/TagsSelector/TagsSelector';
import {
  ASSIGNABLE_COLLECTION_TYPES,
  COLLECTION_TYPE_LABELS,
  CollectionType,
  type CollectionUpdateRequest,
  type ContentPersonModel,
  type LocationModel,
} from '@/app/types/Collection';
import {
  COLLECTION_VISIBILITY_LABELS,
  CollectionVisibility,
} from '@/app/types/CollectionVisibility';
import { type ContentImageModel } from '@/app/types/Content';
import { isContentImage } from '@/app/utils/contentTypeGuards';

import { Button } from '../../../ui/Button/Button';
import { type UseCollectionEditResult } from '../useCollectionEdit';
import styles from './InfoTab.module.scss';

interface InfoTabProps {
  edit: UseCollectionEditResult;
}

/**
 * Info tab: title, type, date, description, locations, visibility, tags, people, and (when
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
    isSelectingCoverImage,
    setIsSelectingCoverImage,
    handleCoverImageClick,
    displayedCoverImage,
    childCollectionImages,
  } = edit;

  const collection = currentState?.collection;
  const showGalleryAccess = updateData.type === CollectionType.CLIENT_GALLERY || isParent;

  const coverCandidates: ContentImageModel[] = isParent
    ? (childCollectionImages ?? [])
    : (collection?.content ?? []).filter(isContentImage);

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
        <Field label="Collection Type" htmlFor="edit-sheet-type">
          <Select
            id="edit-sheet-type"
            value={updateData.type}
            onChange={e => setUpdateField('type', e.target.value as CollectionType)}
          >
            {ASSIGNABLE_COLLECTION_TYPES.map(type => (
              <option key={type} value={type}>
                {COLLECTION_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

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

      <div className={styles.inlineHalfRow}>
        <div>
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

        <div>
          <Field label="Cover image" htmlFor="edit-sheet-cover">
            <button
              type="button"
              id="edit-sheet-cover"
              className={`${styles.coverButton} ${
                isSelectingCoverImage ? styles.coverButtonActive : ''
              }`}
              onClick={() => setIsSelectingCoverImage(!isSelectingCoverImage)}
              aria-pressed={isSelectingCoverImage}
              aria-label={displayedCoverImage ? 'Change cover image' : 'Set cover image'}
            >
              {displayedCoverImage ? (
                <Image
                  src={displayedCoverImage.imageUrl}
                  alt=""
                  fill
                  sizes="200px"
                  style={{ objectFit: 'cover' }}
                  unoptimized
                />
              ) : (
                <span className={styles.coverButtonPlaceholder}>Select</span>
              )}
            </button>
          </Field>
        </div>
      </div>

      {isSelectingCoverImage &&
        (coverCandidates.length > 0 ? (
          <div className={styles.coverPickerGrid}>
            {coverCandidates.map(img => (
              <button
                type="button"
                key={img.id}
                className={styles.coverPickerItem}
                onClick={() => handleCoverImageClick(img.id)}
                aria-label={`Set ${img.title || 'image'} as cover`}
              >
                <Image
                  src={img.imageUrl}
                  alt={img.title || ''}
                  width={120}
                  height={90}
                  unoptimized
                />
              </button>
            ))}
          </div>
        ) : (
          <p className={styles.fieldHint}>
            {isParent
              ? 'Add child collections with images to choose a cover.'
              : 'Add images to this collection to choose a cover.'}
          </p>
        ))}

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
            const newPerson: ContentPersonModel = { id: 0, name: data.name as string, slug: '' };
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
    </div>
  );
}

export default InfoTab;
