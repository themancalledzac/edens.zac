'use client';

import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/app/components/ui/Button/Button';
import { EmptyState } from '@/app/components/ui/StatusText/EmptyState';
import { type CollectionListModel } from '@/app/types/Collection';
import { HOME_SLUG } from '@/app/utils/collectionSlugs';

import styles from './CollectionListSelector.module.scss';

/**
 * The four buckets the manage-page selector groups rows into. Derived from stored state only:
 * collections have no `type` any more, so "home" is a slug, "client gallery" is `isClient`,
 * "blog" is `isBlog`, and everything else is just a collection. There is deliberately no
 * Portfolio or Art Gallery bucket — those concepts have no successor.
 * See docs/superpowers/specs/2026-07-26-typeless-collection.md §1.
 */
export type CollectionBucket = 'HOME' | 'CLIENT_GALLERY' | 'BLOG' | 'COLLECTION';

/** Home is pinned above the accordion; the rest render as collapsible sections, in this order. */
export const COLLECTION_BUCKET_ORDER: CollectionBucket[] = [
  'HOME',
  'CLIENT_GALLERY',
  'BLOG',
  'COLLECTION',
];

/** Human-readable section headings (mirrors COLLECTION_VISIBILITY_LABELS). */
export const COLLECTION_BUCKET_LABELS: Record<CollectionBucket, string> = {
  HOME: 'Home',
  CLIENT_GALLERY: 'Client Galleries',
  BLOG: 'Blogs',
  COLLECTION: 'Collections',
};

/**
 * Bucket a row from its stored discriminators. Home wins outright (V41's unique slug index
 * guarantees at most one row can claim it); `isClient` and `isBlog` are mutually exclusive on
 * the backend, and `isClient` is checked first so a contradictory row still lands somewhere.
 */
export function bucketOf(collection: CollectionListModel): CollectionBucket {
  if (collection.slug === HOME_SLUG) return 'HOME';
  if (collection.isClient === true) return 'CLIENT_GALLERY';
  if (collection.isBlog === true) return 'BLOG';
  return 'COLLECTION';
}

/**
 * Sort rows within a single bucket. Blog rows sort by `collectionDate` descending (newest
 * first) with null dates last, falling back to name when both dates are null; every other
 * bucket sorts alphabetically by name.
 */
export function sortGroup(
  rows: CollectionListModel[],
  bucket: CollectionBucket
): CollectionListModel[] {
  if (bucket === 'BLOG') {
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

/** The three id-sets that together describe one toggle column's selection state. */
export interface SelectionState {
  savedIds: Set<number>;
  pendingAddIds: Set<number>;
  pendingRemoveIds: Set<number>;
}

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
   * When set, this collection stays VISIBLE in its accordion type group but is rendered
   * greyed-out with all toggles disabled — a "you are here" marker for the collection being
   * edited (unlike `excludeCollectionId`, which removes the row entirely). It also drives
   * auto-expansion of the section the current collection lives in, on load.
   */
  currentCollectionId?: number;
  /**
   * When set, this collection is sorted to the TOP of the list (all other rows keep their incoming
   * order). Used by the image metadata editor to surface the gallery currently being edited — it
   * stays visible and shows its saved (green) state instead of being hidden.
   *
   * Single-column mode only: accordion grouping re-sorts each type group, so pin ordering does not
   * survive there. The two never compose in practice — pinning is the flat image-metadata selector,
   * accordion is the manage page.
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
  /**
   * Engages accordion grouping with only the single `onToggle` column — no sibling/parent
   * columns. Lets the image metadata editor reuse the grouped layout without multi-column mode.
   */
  grouped?: boolean;
  /**
   * Save a synthetic (`derived`) tag-view row as a real collection. When provided, derived rows
   * render read-only with a "Save as Collection" action instead of participating in toggles.
   */
  onSaveDerived?: (collection: CollectionListModel) => void;
}

function getCheckboxState(
  collectionId: number,
  { savedIds, pendingAddIds, pendingRemoveIds }: SelectionState
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
  currentCollectionId,
  pinnedCollectionId,
  siblingSavedIds,
  siblingPendingAddIds,
  siblingPendingRemoveIds,
  onToggleSibling,
  parentSavedIds,
  parentPendingAddIds,
  parentPendingRemoveIds,
  onToggleParent,
  onSaveDerived,
  grouped,
}: CollectionListSelectorProps) {
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

  const currentCollectionBucket = useMemo(() => {
    if (currentCollectionId == null) return null;
    const current = allCollections.find(c => c.id === currentCollectionId);
    return current ? bucketOf(current) : null;
  }, [allCollections, currentCollectionId]);

  const [expandedBucket, setExpandedBucket] = useState<CollectionBucket | null>(null);

  useEffect(() => {
    if (currentCollectionBucket && currentCollectionBucket !== 'HOME') {
      setExpandedBucket(currentCollectionBucket);
    }
  }, [currentCollectionBucket]);
  const accordionMode = siblingMode || parentMode || Boolean(grouped);

  const groupsByBucket = useMemo(() => {
    if (!accordionMode) return null;
    const map = new Map<CollectionBucket, CollectionListModel[]>();
    for (const b of COLLECTION_BUCKET_ORDER) map.set(b, []);
    for (const c of orderedCollections) map.get(bucketOf(c))!.push(c);
    for (const [b, rows] of map) map.set(b, sortGroup(rows, b));
    return map;
  }, [accordionMode, orderedCollections]);

  const handleRowClick = useCallback(
    (collection: CollectionListModel) => {
      if (onNavigate) {
        onNavigate(collection);
      } else if (!siblingMode) {
        onToggle(collection);
      }
    },
    [onNavigate, onToggle, siblingMode]
  );

  const renderCheckbox = (
    collection: CollectionListModel,
    selection: SelectionState,
    onClick: (collection: CollectionListModel) => void,
    hoveredId: number | null,
    setHoveredId: (id: number | null) => void,
    ariaLabel: string,
    disabled: boolean = false,
    disabledReason?: string
  ) => {
    const state = getCheckboxState(collection.id, selection);
    const isHovered = hoveredId === collection.id;
    const isSelected = state === 'saved' || state === 'pending-add';
    const showRemoveIntent = !disabled && isHovered && isSelected;

    return (
      <button
        type="button"
        className={`${styles.checkbox} ${styles[`checkbox--${state}`]} ${showRemoveIntent ? styles['checkbox--remove-intent'] : ''} ${disabled ? styles['checkbox--disabled'] : ''}`}
        onClick={e => {
          e.stopPropagation();
          if (!disabled) onClick(collection);
        }}
        onMouseEnter={() => !disabled && setHoveredId(collection.id)}
        onMouseLeave={() => setHoveredId(null)}
        aria-label={ariaLabel}
        aria-disabled={disabled || undefined}
        title={disabled ? disabledReason : undefined}
      />
    );
  };

  const renderRow = (collection: CollectionListModel, expanded: boolean) => {
    const childSelection: SelectionState = {
      savedIds: savedCollectionIds,
      pendingAddIds,
      pendingRemoveIds,
    };
    const isCurrent = currentCollectionId != null && collection.id === currentCollectionId;
    const currentReason = "This is the collection you're editing — it can't be related to itself.";
    // Synthetic tag-view rows are read-only until promoted; they never participate in toggles.
    const isDerived = collection.derived === true;
    const derivedReason = 'Tag view — Save as Collection to make it permanent';
    if (siblingMode || parentMode || grouped) {
      const isActivelyChild =
        (savedCollectionIds.has(collection.id) && !pendingRemoveIds.has(collection.id)) ||
        pendingAddIds.has(collection.id);
      const isActivelyParent =
        parentMode &&
        (((parentSavedIds?.has(collection.id) ?? false) &&
          !(parentPendingRemoveIds?.has(collection.id) ?? false)) ||
          (parentPendingAddIds?.has(collection.id) ?? false));
      const parentDisabled = parentMode && isActivelyChild;
      const childDisabled = parentMode && isActivelyParent;
      const disabledReason =
        'A collection cannot be both a parent and a child of the same collection.';

      let childReason: string | undefined;
      if (isDerived) childReason = derivedReason;
      else if (isCurrent) childReason = currentReason;
      else if (childDisabled) childReason = disabledReason;
      let parentReason: string | undefined;
      if (isDerived) parentReason = derivedReason;
      else if (isCurrent) parentReason = currentReason;
      else if (parentDisabled) parentReason = disabledReason;

      const siblingSelection: SelectionState = {
        savedIds: siblingSavedIds!,
        pendingAddIds: siblingPendingAddIds!,
        pendingRemoveIds: siblingPendingRemoveIds!,
      };
      const parentSelection: SelectionState = {
        savedIds: parentSavedIds!,
        pendingAddIds: parentPendingAddIds!,
        pendingRemoveIds: parentPendingRemoveIds!,
      };

      let nameElement: ReactNode;
      if (isDerived) {
        nameElement = (
          <span className={styles.name}>
            {collection.name}
            <span className={styles.currentTag}>(tag)</span>
          </span>
        );
      } else if (isCurrent) {
        nameElement = (
          <span className={styles.name}>
            {collection.name}
            <span className={styles.currentTag}>(current)</span>
          </span>
        );
      } else if (onNavigate) {
        nameElement = (
          <button
            type="button"
            className={`${styles.name} ${styles.nameButton}`}
            onClick={() => onNavigate(collection)}
            aria-label={`Open ${collection.name}`}
          >
            {collection.name}
          </button>
        );
      } else {
        nameElement = <span className={styles.name}>{collection.name}</span>;
      }

      return (
        <div
          key={collection.id}
          className={`${styles.row} ${styles.rowSibling} ${expanded ? styles.expandedRow : ''} ${isCurrent ? styles.currentRow : ''}`}
          role="group"
          aria-label={collection.name}
        >
          {nameElement}
          {isDerived && onSaveDerived && (
            <button
              type="button"
              className={styles.saveDerivedButton}
              onClick={() => onSaveDerived(collection)}
              title={derivedReason}
            >
              Save as Collection
            </button>
          )}
          {siblingMode && (
            <span className={`${styles.toggleCell} ${styles.toggleCellSibling}`}>
              {renderCheckbox(
                collection,
                siblingSelection,
                onToggleSibling!,
                hoveredSiblingId,
                setHoveredSiblingId,
                `Toggle sibling ${collection.name}`,
                isCurrent || isDerived,
                isDerived ? derivedReason : isCurrent ? currentReason : undefined
              )}
            </span>
          )}
          <span className={`${styles.toggleCell} ${styles.toggleCellChild}`}>
            {renderCheckbox(
              collection,
              childSelection,
              onToggle,
              hoveredChildId,
              setHoveredChildId,
              `Toggle child ${collection.name}`,
              isCurrent || childDisabled || isDerived,
              childReason
            )}
          </span>
          {parentMode && (
            <span className={`${styles.toggleCell} ${styles.toggleCellParent}`}>
              {renderCheckbox(
                collection,
                parentSelection,
                onToggleParent!,
                hoveredParentId,
                setHoveredParentId,
                `Toggle parent ${collection.name}`,
                isCurrent || parentDisabled || isDerived,
                parentReason
              )}
            </span>
          )}
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
          childSelection,
          onToggle,
          hoveredChildId,
          setHoveredChildId,
          `Toggle ${collection.name}`
        )}
        <span className={styles.type}>{COLLECTION_BUCKET_LABELS[bucketOf(collection)]}</span>
        <span className={styles.name}>{collection.name}</span>
      </div>
    );
  };

  const listBody =
    accordionMode && groupsByBucket ? (
      <>
        {(groupsByBucket.get('HOME') ?? []).map(c => renderRow(c, false))}
        {COLLECTION_BUCKET_ORDER.filter(b => b !== 'HOME').map(b => {
          const rows = groupsByBucket.get(b) ?? [];
          const isExpanded = expandedBucket === b;
          return (
            <div key={b}>
              <button
                type="button"
                className={`${styles.typeHeaderRow} ${isExpanded ? styles['typeHeaderRow--expanded'] : ''}`}
                onClick={() => setExpandedBucket(isExpanded ? null : b)}
                aria-expanded={isExpanded}
              >
                <span className={styles.typeHeaderChevron}>{isExpanded ? '▾' : '▸'}</span>
                <span className={styles.typeHeaderLabel}>{COLLECTION_BUCKET_LABELS[b]}</span>
                <span className={styles.typeHeaderCount}>({rows.length})</span>
              </button>
              {isExpanded && rows.map(c => renderRow(c, true))}
            </div>
          );
        })}
      </>
    ) : (
      orderedCollections.map(c => renderRow(c, false))
    );

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
      {(siblingMode || parentMode) && (
        <div className={styles.columnHeaderRow}>
          <span className={styles.columnHeaderName}>Collection Name</span>
          {siblingMode && (
            <span className={`${styles.columnHeaderToggle} ${styles.columnHeaderSibling}`}>
              Sibling
            </span>
          )}
          <span className={`${styles.columnHeaderToggle} ${styles.columnHeaderChild}`}>Child</span>
          {parentMode && (
            <span className={`${styles.columnHeaderToggle} ${styles.columnHeaderParent}`}>
              Parent
            </span>
          )}
        </div>
      )}
      <div className={styles.list}>
        {orderedCollections.length === 0 ? (
          <EmptyState align="page">No collections available</EmptyState>
        ) : (
          listBody
        )}
      </div>
    </div>
  );
}
