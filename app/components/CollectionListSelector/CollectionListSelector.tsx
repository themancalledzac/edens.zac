'use client';

import {
  type DragEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Button } from '@/app/components/ui/Button/Button';
import {
  ASSIGNABLE_COLLECTION_TYPES,
  COLLECTION_TYPE_ORDER,
  type CollectionListModel,
  CollectionType,
} from '@/app/types/Collection';
import { humanizeConstantCase } from '@/app/utils/stringUtils';

import styles from './CollectionListSelector.module.scss';

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
   * Drag-and-drop retype. When provided AND the selector is in accordion mode,
   * rows become draggable and the assignable type-headers become drop targets;
   * dropping a row on a different assignable type fires this with the new type.
   *
   * Pointer-only by design: this is a convenience shortcut. The keyboard-accessible
   * path to change a collection's type is to open it (the row name is a navigate
   * button) and use the type `<select>` in its edit form — so no admin action is
   * gated solely behind drag-and-drop.
   */
  onChangeType?: (collection: CollectionListModel, targetType: CollectionType) => void;
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
  onChangeType,
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

  // The type of the current ("you are here") collection, used to auto-open its section.
  const currentCollectionType = useMemo(
    () =>
      currentCollectionId == null
        ? null
        : (allCollections.find(c => c.id === currentCollectionId)?.type ?? null),
    [allCollections, currentCollectionId]
  );

  // Accordion mode engages whenever a second (Sibling) or third (Parent) toggle column is present.
  // Rows are then grouped + collapsed by CollectionType; single-column mode keeps its flat list.
  const [expandedType, setExpandedType] = useState<CollectionType | null>(null);

  // Auto-expand the section the current collection lives in, on load and whenever
  // we navigate to a different collection. Only fires when currentCollectionType
  // changes, so it never overrides a manual collapse/expand within the same collection.
  useEffect(() => {
    if (
      currentCollectionType &&
      currentCollectionType !== CollectionType.HOME &&
      COLLECTION_TYPE_ORDER.includes(currentCollectionType as CollectionType)
    ) {
      setExpandedType(currentCollectionType as CollectionType);
    }
  }, [currentCollectionType]);
  const accordionMode = siblingMode || parentMode;

  // Drag-and-drop retype state. `draggedRef` is the source of truth for a drop
  // (set on dragstart, read on drop); `draggedId` dims the dragged row;
  // `dragOverType` highlights the assignable header under the pointer.
  const draggedRef = useRef<CollectionListModel | null>(null);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverType, setDragOverType] = useState<CollectionType | null>(null);
  const dragEnabled = accordionMode && !!onChangeType;

  const handleRowDragStart = useCallback(
    (collection: CollectionListModel) => (e: DragEvent<HTMLDivElement>) => {
      draggedRef.current = collection;
      setDraggedId(collection.id);
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(collection.id));
      }
    },
    []
  );

  const handleRowDragEnd = useCallback(() => {
    draggedRef.current = null;
    setDraggedId(null);
    setDragOverType(null);
  }, []);

  const handleHeaderDragOver = useCallback(
    (type: CollectionType) => (e: DragEvent<HTMLButtonElement>) => {
      if (!draggedRef.current) return;
      e.preventDefault(); // allow drop
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      setDragOverType(type);
    },
    []
  );

  const handleHeaderDragLeave = useCallback(
    (type: CollectionType) => (e: DragEvent<HTMLButtonElement>) => {
      if (e.currentTarget.contains(e.relatedTarget as Node | null)) return; // child still inside
      setDragOverType(prev => (prev === type ? null : prev));
    },
    []
  );

  const handleHeaderDrop = useCallback(
    (type: CollectionType) => (e: DragEvent<HTMLButtonElement>) => {
      e.preventDefault();
      const dragged = draggedRef.current;
      draggedRef.current = null;
      setDraggedId(null);
      setDragOverType(null);
      if (dragged && dragged.type !== type) onChangeType?.(dragged, type);
    },
    [onChangeType]
  );

  const groupsByType = useMemo(() => {
    if (!accordionMode) return null;
    const map = new Map<string, CollectionListModel[]>();
    for (const t of COLLECTION_TYPE_ORDER) map.set(t, []);
    for (const c of orderedCollections) {
      // Bucket any unknown/missing type into MISC so it can't create a phantom
      // map key the render loop (which iterates only COLLECTION_TYPE_ORDER) never
      // shows. `t` is therefore always one of the pre-seeded keys, so `map.get(t)!`
      // is safe.
      const t =
        c.type && COLLECTION_TYPE_ORDER.includes(c.type as CollectionType)
          ? (c.type as string)
          : CollectionType.MISC;
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
  // When `disabled` is set (Child↔Parent mutual exclusion) the button is dimmed,
  // ignores clicks/hover, and exposes its `disabledReason` as a hover tooltip.
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

  // Renders one collection row. In accordion (sibling/parent) mode the row carries the
  // Sibling | Child toggles (the type label moves to the accordion header) and gets an
  // `expandedRow` tint when shown under an open group; single-column mode is unchanged.
  const renderRow = (collection: CollectionListModel, expanded: boolean) => {
    const childSelection: SelectionState = {
      savedIds: savedCollectionIds,
      pendingAddIds,
      pendingRemoveIds,
    };
    // The current ("you are here") collection stays visible but greyed-out with every toggle
    // disabled — it can't be a sibling/child/parent of itself.
    const isCurrent = currentCollectionId != null && collection.id === currentCollectionId;
    const currentReason = "This is the collection you're editing — it can't be related to itself.";
    if (siblingMode || parentMode) {
      // Child↔Parent mutual exclusion: a row that is *actively* a Child (saved & not
      // pending-removal, or pending-add) may not also be a Parent, and vice-versa.
      // A saved-but-pending-removal selection is NOT active, so it doesn't disable the other.
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

      // Precompute each toggle's disabled-reason tooltip: the "current" collection always
      // wins (it can't relate to itself); otherwise fall back to the mutual-exclusion reason.
      // Hoisted to locals to avoid a nested ternary at the call sites below.
      let childReason: string | undefined;
      if (isCurrent) childReason = currentReason;
      else if (childDisabled) childReason = disabledReason;
      let parentReason: string | undefined;
      if (isCurrent) parentReason = currentReason;
      else if (parentDisabled) parentReason = disabledReason;

      // These optional sets are only read under their respective mode guards
      // (siblingMode for sibling, parentMode for parent), so the non-null
      // assertions are safe at every call site below.
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

      // The name cell: the current collection renders a plain "(current)" label (never a
      // navigate button — it must not self-navigate); otherwise a navigate button when
      // onNavigate is supplied, else a plain span. Hoisted to avoid a nested ternary in JSX.
      let nameElement: ReactNode;
      if (isCurrent) {
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

      // A row is draggable (to retype it) only when DnD is enabled, and never for the
      // current ("you are here") collection or a HOME row (HOME is a pinned singleton).
      const isHome = collection.type === CollectionType.HOME;
      const rowDraggable = dragEnabled && !isCurrent && !isHome;

      // Two-column mode: name on the left, Sibling | Child toggles aligned on the right.
      return (
        <div
          key={collection.id}
          className={`${styles.row} ${styles.rowSibling} ${expanded ? styles.expandedRow : ''} ${isCurrent ? styles.currentRow : ''} ${rowDraggable ? styles.draggable : ''} ${draggedId === collection.id ? styles.dragging : ''}`}
          role="group"
          aria-label={collection.name}
          draggable={rowDraggable || undefined}
          onDragStart={rowDraggable ? handleRowDragStart(collection) : undefined}
          onDragEnd={rowDraggable ? handleRowDragEnd : undefined}
        >
          {nameElement}
          {siblingMode && (
            <span className={`${styles.toggleCell} ${styles.toggleCellSibling}`}>
              {renderCheckbox(
                collection,
                siblingSelection,
                onToggleSibling!,
                hoveredSiblingId,
                setHoveredSiblingId,
                `Toggle sibling ${collection.name}`,
                isCurrent,
                isCurrent ? currentReason : undefined
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
              isCurrent || childDisabled,
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
                isCurrent || parentDisabled,
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
        <span className={styles.type}>{collection.type || 'Portfolio'}</span>
        <span className={styles.name}>{collection.name}</span>
      </div>
    );
  };

  // Body shown when there is at least one collection: the grouped accordion when a
  // second/third toggle column is active, otherwise the flat single-column list.
  // Kept as a local so the empty-state vs. content choice stays a single (non-nested)
  // ternary in the JSX below.
  const listBody =
    accordionMode && groupsByType ? (
      <>
        {/* HOME is pinned above the accordion — always visible, never collapsible. */}
        {(groupsByType.get(CollectionType.HOME) ?? []).map(c => renderRow(c, false))}
        {COLLECTION_TYPE_ORDER.filter(t => t !== CollectionType.HOME).map(t => {
          const rows = groupsByType.get(t) ?? [];
          const isExpanded = expandedType === t;
          const isDropTarget = dragEnabled && ASSIGNABLE_COLLECTION_TYPES.includes(t);
          const isDragOver = isDropTarget && dragOverType === t;
          return (
            <div key={t}>
              <button
                type="button"
                className={`${styles.typeHeaderRow} ${isExpanded ? styles['typeHeaderRow--expanded'] : ''} ${isDragOver ? styles['typeHeaderRow--dropTarget'] : ''}`}
                onClick={() => setExpandedType(isExpanded ? null : t)}
                aria-expanded={isExpanded}
                onDragOver={isDropTarget ? handleHeaderDragOver(t) : undefined}
                onDragEnter={isDropTarget ? handleHeaderDragOver(t) : undefined}
                onDragLeave={isDropTarget ? handleHeaderDragLeave(t) : undefined}
                onDrop={isDropTarget ? handleHeaderDrop(t) : undefined}
              >
                <span className={styles.typeHeaderChevron}>{isExpanded ? '▾' : '▸'}</span>
                <span className={styles.typeHeaderLabel}>{humanizeConstantCase(t)}</span>
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
          {/* "Catalog Type" column removed — type is the accordion section header */}
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
          <div className={styles.emptyState}>No collections available</div>
        ) : (
          listBody
        )}
      </div>
    </div>
  );
}
