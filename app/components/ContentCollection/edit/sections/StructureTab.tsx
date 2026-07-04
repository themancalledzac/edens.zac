'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import CollectionListSelector from '@/app/components/CollectionListSelector/CollectionListSelector';
import RatingStars from '@/app/components/RatingStars/RatingStars';
import SaveAsCollectionModal from '@/app/components/SaveAsCollectionModal/SaveAsCollectionModal';
import { Button } from '@/app/components/ui/Button/Button';
import { Field } from '@/app/components/ui/Field/Field';
import { Select } from '@/app/components/ui/Field/Select';
import {
  type CollectionListModel,
  type DisplayMode,
  type TagViewModel,
} from '@/app/types/Collection';
import { isContentCollection } from '@/app/utils/contentTypeGuards';
import { logger } from '@/app/utils/logger';
import { manageHref } from '@/app/utils/manageUrl';

import { type UseCollectionEditResult } from '../useCollectionEdit';
import styles from './StructureTab.module.scss';

/** Type guard for synthetic tag-view selector rows. */
function isTagViewRow(row: CollectionListModel): row is TagViewModel {
  return row.derived === true && 'sourceTagId' in row;
}

interface StructureTabProps {
  edit: UseCollectionEditResult;
}

/** Structure tab: display/density, relationships, ratings. */
export function StructureTab({ edit }: StructureTabProps) {
  const router = useRouter();

  const {
    currentState,
    updateData,
    setUpdateField,
    isParent,
    allCollectionsWithTagViews,
    saveTagAsCollection,
    handleChangeType,
    childIds,
    handleChildToggle,
    handleAddNewChild,
    siblingIds,
    handleSiblingToggle,
    parentIds,
    handleParentToggle,
    updateCollectionRating,
    deleting,
    handleDeleteCollection,
  } = edit;

  const collection = currentState?.collection;
  const collectionSlug = collection?.slug;
  const isHomeCollection = collectionSlug === 'home';

  const [pendingTagView, setPendingTagView] = useState<TagViewModel | null>(null);

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

      <CollectionListSelector
        allCollections={allCollectionsWithTagViews}
        savedCollectionIds={childIds.saved}
        pendingAddIds={childIds.pendingAdd}
        pendingRemoveIds={childIds.pendingRemove}
        onToggle={handleChildToggle}
        onNavigate={col => {
          if (col.slug) {
            router.push(manageHref(col.slug));
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
        onSaveDerived={col => {
          if (isTagViewRow(col)) setPendingTagView(col);
        }}
      />

      {pendingTagView && (
        <SaveAsCollectionModal
          tagName={pendingTagView.name}
          onClose={() => setPendingTagView(null)}
          onConfirm={async body => {
            await saveTagAsCollection(pendingTagView.sourceTagId, body);
            setPendingTagView(null);
          }}
        />
      )}

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

      {!isHomeCollection && (
        <section aria-labelledby="edit-sheet-danger-heading" className={styles.dangerZone}>
          <h3 id="edit-sheet-danger-heading" className={styles.sectionTitle}>
            Danger zone
          </h3>
          <p className={styles.dangerHint}>
            Permanently delete this collection. Its images remain in the system.
          </p>
          <Button
            variant="danger"
            loading={deleting}
            disabled={deleting}
            onClick={() => void handleDeleteCollection()}
          >
            Delete collection
          </Button>
        </section>
      )}
    </div>
  );
}

export default StructureTab;
