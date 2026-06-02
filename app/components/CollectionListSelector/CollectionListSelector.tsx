'use client';

import { useCallback, useState } from 'react';

import { Button } from '@/app/components/ui/Button/Button';
import type { CollectionListModel } from '@/app/types/Collection';

import styles from './CollectionListSelector.module.scss';

type CheckboxState = 'empty' | 'saved' | 'pending-add' | 'pending-remove';

interface CollectionListSelectorProps {
  allCollections: CollectionListModel[];
  savedCollectionIds: Set<number>;
  pendingAddIds: Set<number>;
  pendingRemoveIds: Set<number>;
  onToggle: (collection: CollectionListModel) => void;
  onNavigate?: (collection: CollectionListModel) => void;
  onAddNewChild?: () => void;
  label?: string;
  excludeCollectionId?: number;
  // Optional second ("Sibling") toggle column. When the full set is supplied the
  // selector switches to a two-column Sibling | Child grid; otherwise it renders
  // its original single-column layout unchanged.
  siblingSavedIds?: Set<number>;
  siblingPendingAddIds?: Set<number>;
  siblingPendingRemoveIds?: Set<number>;
  onToggleSibling?: (collection: CollectionListModel) => void;
}

function getCheckboxState(
  collectionId: number,
  savedIds: Set<number>,
  pendingAddIds: Set<number>,
  pendingRemoveIds: Set<number>
): CheckboxState {
  if (pendingRemoveIds.has(collectionId)) return 'pending-remove';
  if (pendingAddIds.has(collectionId)) return 'pending-add';
  if (savedIds.has(collectionId)) return 'saved';
  return 'empty';
}

export default function CollectionListSelector({
  allCollections,
  savedCollectionIds,
  pendingAddIds,
  pendingRemoveIds,
  onToggle,
  onNavigate,
  onAddNewChild,
  label = 'Collections',
  excludeCollectionId,
  siblingSavedIds,
  siblingPendingAddIds,
  siblingPendingRemoveIds,
  onToggleSibling,
}: CollectionListSelectorProps) {
  // Independent hover state per column so remove-intent (red) on one checkbox
  // never lights up the other column's checkbox.
  const [hoveredChildId, setHoveredChildId] = useState<number | null>(null);
  const [hoveredSiblingId, setHoveredSiblingId] = useState<number | null>(null);

  const siblingMode =
    !!onToggleSibling && !!siblingSavedIds && !!siblingPendingAddIds && !!siblingPendingRemoveIds;

  const filteredCollections = excludeCollectionId
    ? allCollections.filter(c => c.id !== excludeCollectionId)
    : allCollections;

  const handleRowClick = useCallback(
    (collection: CollectionListModel) => {
      // In two-column mode the row hosts two independent toggles, so a bare
      // row-body click is a no-op unless an explicit navigate handler is given.
      if (onNavigate) {
        onNavigate(collection);
      } else if (!siblingMode) {
        onToggle(collection);
      }
    },
    [onNavigate, onToggle, siblingMode]
  );

  // Renders one checkbox button for a column, with its own hover/remove-intent.
  const renderCheckbox = (
    collection: CollectionListModel,
    savedIds: Set<number>,
    pendingAdd: Set<number>,
    pendingRemove: Set<number>,
    onClick: (collection: CollectionListModel) => void,
    hoveredId: number | null,
    setHoveredId: (id: number | null) => void,
    ariaLabel: string
  ) => {
    const state = getCheckboxState(collection.id, savedIds, pendingAdd, pendingRemove);
    const isHovered = hoveredId === collection.id;
    const isSelected = state === 'saved' || state === 'pending-add';
    const showRemoveIntent = isHovered && isSelected;

    return (
      <button
        type="button"
        className={`${styles.checkbox} ${styles[`checkbox--${state}`]} ${showRemoveIntent ? styles['checkbox--remove-intent'] : ''}`}
        onClick={e => {
          e.stopPropagation();
          onClick(collection);
        }}
        onMouseEnter={() => setHoveredId(collection.id)}
        onMouseLeave={() => setHoveredId(null)}
        aria-label={ariaLabel}
      />
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <label className={styles.label}>{label}</label>
        {onAddNewChild && (
          <Button
            variant="secondary"
            size="sm"
            className={styles.addButton}
            onClick={onAddNewChild}
          >
            Add New Child
          </Button>
        )}
      </div>
      {siblingMode && (
        <div className={styles.columnHeaderRow}>
          <span className={styles.columnHeaderName}>Catalog Name</span>
          <span className={styles.columnHeaderType}>Catalog Type</span>
          <span className={styles.columnHeaderToggle}>Sibling</span>
          <span className={styles.columnHeaderToggle}>Child</span>
        </div>
      )}
      <div className={styles.list}>
        {filteredCollections.length === 0 && (
          <div className={styles.emptyState}>No collections available</div>
        )}
        {filteredCollections.map(collection =>
          siblingMode ? (
            // Two-column mode: name on the left, Sibling | Child toggles aligned on the right.
            <div
              key={collection.id}
              className={`${styles.row} ${styles.rowSibling}`}
              role="group"
              aria-label={collection.name}
            >
              {onNavigate ? (
                <button
                  type="button"
                  className={`${styles.name} ${styles.nameButton}`}
                  onClick={() => onNavigate(collection)}
                  aria-label={`Open ${collection.name}`}
                >
                  {collection.name}
                </button>
              ) : (
                <span className={styles.name}>{collection.name}</span>
              )}
              <span className={styles.type}>{collection.type || 'Portfolio'}</span>
              <span className={styles.toggleCell}>
                {renderCheckbox(
                  collection,
                  siblingSavedIds!,
                  siblingPendingAddIds!,
                  siblingPendingRemoveIds!,
                  onToggleSibling!,
                  hoveredSiblingId,
                  setHoveredSiblingId,
                  `Toggle sibling ${collection.name}`
                )}
              </span>
              <span className={styles.toggleCell}>
                {renderCheckbox(
                  collection,
                  savedCollectionIds,
                  pendingAddIds,
                  pendingRemoveIds,
                  onToggle,
                  hoveredChildId,
                  setHoveredChildId,
                  `Toggle child ${collection.name}`
                )}
              </span>
            </div>
          ) : (
            <div
              key={collection.id}
              className={`${styles.row} ${onNavigate ? styles.navigable : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => handleRowClick(collection)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleRowClick(collection);
                }
              }}
            >
              {renderCheckbox(
                collection,
                savedCollectionIds,
                pendingAddIds,
                pendingRemoveIds,
                onToggle,
                hoveredChildId,
                setHoveredChildId,
                `Toggle ${collection.name}`
              )}
              <span className={styles.type}>{collection.type || 'Portfolio'}</span>
              <span className={styles.name}>{collection.name}</span>
            </div>
          )
        )}
      </div>
    </div>
  );
}
