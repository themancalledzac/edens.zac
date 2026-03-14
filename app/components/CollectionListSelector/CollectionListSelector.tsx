'use client';

import { useCallback, useState } from 'react';

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
  label = 'Child Collections',
  excludeCollectionId,
}: CollectionListSelectorProps) {
  const [hoveredCheckboxId, setHoveredCheckboxId] = useState<number | null>(null);

  const filteredCollections = excludeCollectionId
    ? allCollections.filter(c => c.id !== excludeCollectionId)
    : allCollections;

  const handleCheckboxClick = useCallback(
    (e: React.MouseEvent, collection: CollectionListModel) => {
      e.stopPropagation();
      onToggle(collection);
    },
    [onToggle]
  );

  const handleRowClick = useCallback(
    (collection: CollectionListModel) => {
      if (onNavigate) {
        onNavigate(collection);
      } else {
        onToggle(collection);
      }
    },
    [onNavigate, onToggle]
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <label className={styles.label}>{label}</label>
        {onAddNewChild && (
          <button type="button" className={styles.addButton} onClick={onAddNewChild}>
            Add New Child
          </button>
        )}
      </div>
      <div className={styles.list}>
        {filteredCollections.length === 0 && (
          <div className={styles.emptyState}>No collections available</div>
        )}
        {filteredCollections.map(collection => {
          const state = getCheckboxState(
            collection.id,
            savedCollectionIds,
            pendingAddIds,
            pendingRemoveIds
          );
          const isCheckboxHovered = hoveredCheckboxId === collection.id;
          const isSelected = state === 'saved' || state === 'pending-add';
          const showRemoveIntent = isCheckboxHovered && isSelected;

          return (
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
              <button
                type="button"
                className={`${styles.checkbox} ${styles[`checkbox--${state}`]} ${showRemoveIntent ? styles['checkbox--remove-intent'] : ''}`}
                onClick={e => handleCheckboxClick(e, collection)}
                onMouseEnter={() => setHoveredCheckboxId(collection.id)}
                onMouseLeave={() => setHoveredCheckboxId(null)}
                aria-label={`Toggle ${collection.name}`}
              />
              <span className={styles.type}>{collection.type || 'Portfolio'}</span>
              <span className={styles.name}>{collection.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
