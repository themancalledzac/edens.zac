'use client';

import { useCallback, useMemo, useState } from 'react';

import { Button } from '@/app/components/ui/Button/Button';
import { type CollectionListModel, CollectionType } from '@/app/types/Collection';

import styles from './CollectionListSelector.module.scss';

/**
 * Accordion section order for grouping collections by type on the manage page.
 * HOME leads, then PARENT, CLIENT_GALLERY, ART_GALLERY, PORTFOLIO, BLOG, MISC.
 */
export const COLLECTION_TYPE_ORDER: CollectionType[] = [
  CollectionType.HOME,
  CollectionType.PARENT,
  CollectionType.CLIENT_GALLERY,
  CollectionType.ART_GALLERY,
  CollectionType.PORTFOLIO,
  CollectionType.BLOG,
  CollectionType.MISC,
];

/**
 * Sort rows within a single type group. BLOG rows sort by `collectionDate`
 * descending (newest first) with null dates last, falling back to name when both
 * dates are null; every other type sorts alphabetically by name.
 */
export function sortGroup(
  rows: CollectionListModel[],
  type: CollectionType | string | undefined
): CollectionListModel[] {
  if (type === CollectionType.BLOG) {
    return [...rows].sort((a, b) => {
      const da = a.collectionDate ?? null;
      const db = b.collectionDate ?? null;
      if (da == null && db == null) return a.name.localeCompare(b.name);
      if (da == null) return 1;
      if (db == null) return -1;
      return db.localeCompare(da);
    });
  }
  return [...rows].sort((a, b) => a.name.localeCompare(b.name));
}

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
  /**
   * When set, this collection is sorted to the TOP of the list (all other rows keep their incoming
   * order). Used by the image metadata editor to surface the gallery currently being edited — it
   * stays visible and shows its saved (green) state instead of being hidden.
   */
  pinnedCollectionId?: number;
  // Optional second ("Sibling") toggle column. When the full set is supplied the
  // selector switches to a two-column Sibling | Child grid; otherwise it renders
  // its original single-column layout unchanged.
  siblingSavedIds?: Set<number>;
  siblingPendingAddIds?: Set<number>;
  siblingPendingRemoveIds?: Set<number>;
  onToggleSibling?: (collection: CollectionListModel) => void;
  // Optional third ("Parent") toggle column. Engages 3-column "parentMode" when all four are supplied.
  parentSavedIds?: Set<number>;
  parentPendingAddIds?: Set<number>;
  parentPendingRemoveIds?: Set<number>;
  onToggleParent?: (collection: CollectionListModel) => void;
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
  pinnedCollectionId,
  siblingSavedIds,
  siblingPendingAddIds,
  siblingPendingRemoveIds,
  onToggleSibling,
  parentSavedIds,
  parentPendingAddIds,
  parentPendingRemoveIds,
  onToggleParent,
}: CollectionListSelectorProps) {
  // Independent hover state per column so remove-intent (red) on one checkbox
  // never lights up the other column's checkbox.
  const [hoveredChildId, setHoveredChildId] = useState<number | null>(null);
  const [hoveredSiblingId, setHoveredSiblingId] = useState<number | null>(null);

  const siblingMode =
    !!onToggleSibling && !!siblingSavedIds && !!siblingPendingAddIds && !!siblingPendingRemoveIds;

  const parentMode =
    !!onToggleParent && !!parentSavedIds && !!parentPendingAddIds && !!parentPendingRemoveIds;
  const [hoveredParentId, setHoveredParentId] = useState<number | null>(null);

  const filteredCollections = useMemo(
    () =>
      excludeCollectionId
        ? allCollections.filter(c => c.id !== excludeCollectionId)
        : allCollections,
    [allCollections, excludeCollectionId]
  );

  // Pin the "current" collection to the top so the gallery being edited leads the list; every
  // other row keeps its incoming order. No-op when pinnedCollectionId is absent or not in the list.
  const orderedCollections = useMemo(
    () =>
      pinnedCollectionId == null
        ? filteredCollections
        : [
            ...filteredCollections.filter(c => c.id === pinnedCollectionId),
            ...filteredCollections.filter(c => c.id !== pinnedCollectionId),
          ],
    [filteredCollections, pinnedCollectionId]
  );

  // Accordion mode engages whenever a second (Sibling) or third (Parent) toggle column is present.
  // Rows are then grouped + collapsed by CollectionType; single-column mode keeps its flat list.
  const [expandedType, setExpandedType] = useState<CollectionType | null>(null);
  const accordionMode = siblingMode || parentMode;
  const groupsByType = useMemo(() => {
    if (!accordionMode) return null;
    const map = new Map<string, CollectionListModel[]>();
    for (const t of COLLECTION_TYPE_ORDER) map.set(t, []);
    for (const c of orderedCollections) {
      const t = (c.type as string) ?? 'MISC';
      if (!map.has(t)) map.set(t, []);
      map.get(t)!.push(c);
    }
    for (const [t, rows] of map) map.set(t, sortGroup(rows, t));
    return map;
  }, [accordionMode, orderedCollections]);

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

  // Turns a SCREAMING_SNAKE CollectionType into a human label (e.g. CLIENT_GALLERY → "Client Gallery").
  const humanizeType = (t: string) =>
    t
      .split('_')
      .map(w => w.charAt(0) + w.slice(1).toLowerCase())
      .join(' ');

  // Renders one collection row. In accordion (sibling/parent) mode the row carries the
  // Sibling | Child toggles (the type label moves to the accordion header) and gets an
  // `expandedRow` tint when shown under an open group; single-column mode is unchanged.
  const renderRow = (collection: CollectionListModel, expanded: boolean) => {
    if (siblingMode || parentMode) {
      // Two-column mode: name on the left, Sibling | Child toggles aligned on the right.
      return (
        <div
          key={collection.id}
          className={`${styles.row} ${styles.rowSibling} ${expanded ? styles.expandedRow : ''}`}
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
          {/* Parent toggle cell — added in Task 3.4 */}
        </div>
      );
    }
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
        {accordionMode && groupsByType ? (
          <>
            {/* HOME is pinned above the accordion — always visible, never collapsible. */}
            {(groupsByType.get(CollectionType.HOME) ?? []).map(c => renderRow(c, false))}
            {COLLECTION_TYPE_ORDER.filter(t => t !== CollectionType.HOME).map(t => {
              const rows = groupsByType.get(t) ?? [];
              const isExpanded = expandedType === t;
              return (
                <div key={t}>
                  <button
                    type="button"
                    className={`${styles.typeHeaderRow} ${isExpanded ? styles['typeHeaderRow--expanded'] : ''}`}
                    onClick={() => setExpandedType(isExpanded ? null : t)}
                    aria-expanded={isExpanded}
                  >
                    <span className={styles.typeHeaderChevron}>{isExpanded ? '▾' : '▸'}</span>
                    <span className={styles.typeHeaderLabel}>{humanizeType(t)}</span>
                    <span className={styles.typeHeaderCount}>({rows.length})</span>
                  </button>
                  {isExpanded && rows.map(c => renderRow(c, true))}
                </div>
              );
            })}
          </>
        ) : (
          orderedCollections.map(c => renderRow(c, false))
        )}
        {!accordionMode && orderedCollections.length === 0 && (
          <div className={styles.emptyState}>No collections available</div>
        )}
      </div>
    </div>
  );
}
