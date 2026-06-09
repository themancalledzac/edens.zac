'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';

import CollectionListSelector from '@/app/components/CollectionListSelector/CollectionListSelector';
import RatingStars from '@/app/components/RatingStars/RatingStars';
import { Button } from '@/app/components/ui/Button/Button';
import { Field } from '@/app/components/ui/Field/Field';
import { Select } from '@/app/components/ui/Field/Select';
import { type DisplayMode } from '@/app/types/Collection';
import { type ContentImageModel } from '@/app/types/Content';
import { isContentCollection, isContentImage } from '@/app/utils/contentTypeGuards';
import { logger } from '@/app/utils/logger';

import { type UseCollectionEditResult } from '../useCollectionEdit';
import styles from './StructureTab.module.scss';

interface StructureTabProps {
  edit: UseCollectionEditResult;
}

/** Structure tab: display/density, cover image, relationships, ratings. */
export function StructureTab({ edit }: StructureTabProps) {
  const router = useRouter();

  const {
    currentState,
    updateData,
    setUpdateField,
    isParent,
    allCollections,
    handleChangeType,
    childIds,
    handleChildToggle,
    handleAddNewChild,
    siblingIds,
    handleSiblingToggle,
    parentIds,
    handleParentToggle,
    updateCollectionRating,
    isSelectingCoverImage,
    setIsSelectingCoverImage,
    handleCoverImageClick,
    displayedCoverImage,
    childCollectionImages,
  } = edit;

  const collection = currentState?.collection;
  const collectionSlug = collection?.slug;
  const isHomeCollection = collectionSlug === 'home';

  const coverCandidates: ContentImageModel[] = isParent
    ? (childCollectionImages ?? [])
    : (collection?.content ?? []).filter(isContentImage);

  let coverButtonLabel = 'Set cover image';
  if (isSelectingCoverImage) coverButtonLabel = 'Cancel cover selection';
  else if (displayedCoverImage) coverButtonLabel = 'Change cover image';

  return (
    <div className={styles.tabPanel}>
      {!isParent && (
        <>
          <h3 className={styles.sectionTitle}>Presentation</h3>
          <div className={styles.formGridHalf}>
            <div>
              <Field label="Order" htmlFor="edit-sheet-display-mode">
                <Select
                  id="edit-sheet-display-mode"
                  value={updateData.displayMode}
                  onChange={e => setUpdateField('displayMode', e.target.value as DisplayMode)}
                >
                  <option value="ORDERED">Default</option>
                  <option value="CHRONOLOGICAL">Chronological</option>
                  <option value="FIXED">Fixed</option>
                </Select>
              </Field>
            </div>

            <div>
              <Field label="Row Density" htmlFor="edit-sheet-rows-wide" hint="Default: 4">
                <div className={styles.numberStepperWrapper}>
                  <button
                    type="button"
                    onClick={() =>
                      setUpdateField('rowsWide', Math.max(1, (updateData.rowsWide ?? 4) - 1))
                    }
                    className={styles.stepperButton}
                    disabled={(updateData.rowsWide ?? 4) <= 1}
                    aria-label="Decrease row density"
                  >
                    −
                  </button>
                  <input
                    id="edit-sheet-rows-wide"
                    type="number"
                    min="1"
                    max="10"
                    value={updateData.rowsWide ?? ''}
                    placeholder="4"
                    onChange={e => {
                      const value =
                        e.target.value === '' ? undefined : Number.parseInt(e.target.value);
                      if (value === undefined || (value >= 1 && value <= 10)) {
                        setUpdateField('rowsWide', value);
                      }
                    }}
                    className={styles.numberInput}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setUpdateField('rowsWide', Math.min(10, (updateData.rowsWide ?? 4) + 1))
                    }
                    className={styles.stepperButton}
                    disabled={(updateData.rowsWide ?? 4) >= 10}
                    aria-label="Increase row density"
                  >
                    +
                  </button>
                </div>
              </Field>
            </div>
          </div>
        </>
      )}

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Cover image</label>
        {displayedCoverImage && !isSelectingCoverImage && (
          <Image
            src={displayedCoverImage.imageUrl}
            alt={displayedCoverImage.title || 'Cover image'}
            width={120}
            height={90}
            className={styles.coverThumb}
            unoptimized
          />
        )}
        <Button
          variant={isSelectingCoverImage ? 'danger' : 'secondary'}
          onClick={() => setIsSelectingCoverImage(!isSelectingCoverImage)}
        >
          {coverButtonLabel}
        </Button>
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
      </div>

      <CollectionListSelector
        allCollections={allCollections}
        savedCollectionIds={childIds.saved}
        pendingAddIds={childIds.pendingAdd}
        pendingRemoveIds={childIds.pendingRemove}
        onToggle={handleChildToggle}
        onNavigate={col => {
          if (col.slug) {
            router.push(`/${col.slug}?manage=1`);
          } else {
            logger.error('StructureTab', 'Cannot navigate to collection: missing slug', col);
          }
        }}
        onAddNewChild={handleAddNewChild}
        label="Collections"
        currentCollectionId={collection?.id}
        siblingSavedIds={siblingIds.saved}
        siblingPendingAddIds={siblingIds.pendingAdd}
        siblingPendingRemoveIds={siblingIds.pendingRemove}
        onToggleSibling={handleSiblingToggle}
        parentSavedIds={parentIds.saved}
        parentPendingAddIds={parentIds.pendingAdd}
        parentPendingRemoveIds={parentIds.pendingRemove}
        onToggleParent={handleParentToggle}
        onChangeType={handleChangeType}
      />

      {isHomeCollection && (collection?.content?.some(isContentCollection) ?? false) && (
        <section aria-labelledby="edit-sheet-children-rating-heading" className={styles.formGroup}>
          <h3 id="edit-sheet-children-rating-heading" className={styles.formLabel}>
            Children (rating)
          </h3>
          <ul className={styles.plainList}>
            {(collection?.content ?? []).filter(isContentCollection).map(child => (
              <li key={child.id} className={styles.childRow}>
                <span>{child.title ?? child.slug}</span>
                <RatingStars
                  initialRating={child.rating ?? null}
                  onChange={next => updateCollectionRating(child.referencedCollectionId, next)}
                  ariaLabel={`Rate ${child.title ?? child.slug}`}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default StructureTab;
