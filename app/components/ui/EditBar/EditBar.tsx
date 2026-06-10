'use client';

import styles from './EditBar.module.scss';
import { type EditBarCell, type EditBarProps } from './types';

function cellClassName(variant: EditBarCell['variant'], disabled?: boolean): string {
  const map = {
    primary: styles.barCellPrimary,
    danger: styles.barCellDanger,
    active: styles.barCellActive,
    default: '',
  } as const;
  return [styles.barCell, variant ? map[variant] : '', disabled ? styles.barCellDisabled : '']
    .filter(Boolean)
    .join(' ');
}

/**
 * EditBar — the single shared bottom bar used across collection-edit, image-edit,
 * and the transient manage modes. Two shapes: an optional tab row above an action
 * row of uniform-height cells. Emphasis is by color/weight, never size.
 *
 * Pass `fixed={false}` when embedding as a flex footer inside a modal sheet — the bar
 * then participates in normal block flow instead of escaping to the viewport bottom.
 *
 * ARIA contract for tabs: `aria-controls` is emitted only for the SELECTED tab.
 * The inactive tab's panel may not be in the DOM (CollectionEditSheet uses conditional
 * rendering), so emitting `aria-controls` unconditionally would create dangling
 * references that axe flags as aria-valid-attr-value violations.  The selected tab's
 * panel is always present — both consumers guarantee this.
 */
export function EditBar({
  tabs,
  activeTab,
  onTabChange,
  cells,
  ariaLabel,
  fixed = true,
}: EditBarProps) {
  const rootClass = [styles.bottomBar, fixed ? styles.fixed : styles.static]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={rootClass} role="toolbar" aria-label={ariaLabel}>
      {tabs && tabs.length > 0 && (
        <nav className={styles.tabRow} role="tablist" aria-label={ariaLabel}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              {...(activeTab === tab.id ? { 'aria-controls': `tabpanel-${tab.id}` } : {})}
              className={[styles.barCell, activeTab === tab.id ? styles.barCellActive : '']
                .filter(Boolean)
                .join(' ')}
              onClick={() => onTabChange?.(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      )}
      <div className={styles.actionRow}>
        {cells.map(cell =>
          cell.fileInput ? (
            <label key={cell.key} className={cellClassName(cell.variant, cell.disabled)}>
              {cell.label}
              <input
                type="file"
                hidden
                accept={cell.fileInput.accept}
                multiple={cell.fileInput.multiple}
                disabled={cell.disabled}
                onChange={e => {
                  if (cell.disabled) return;
                  if (e.target.files) {
                    cell.fileInput!.onFiles(e.target.files);
                    e.target.value = '';
                  }
                }}
              />
            </label>
          ) : (
            <button
              key={cell.key}
              type="button"
              className={cellClassName(cell.variant)}
              disabled={cell.disabled}
              onClick={cell.onClick}
            >
              {cell.label}
            </button>
          )
        )}
      </div>
    </div>
  );
}

export default EditBar;
