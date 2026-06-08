'use client';

import styles from './EditBar.module.scss';
import { type EditBarCell, type EditBarProps } from './types';

function cellClassName(variant: EditBarCell['variant']): string {
  const map = {
    primary: styles.barCellPrimary,
    danger: styles.barCellDanger,
    active: styles.barCellActive,
    default: '',
  } as const;
  return [styles.barCell, variant ? map[variant] : ''].filter(Boolean).join(' ');
}

/**
 * EditBar — the single fixed bottom bar used across collection-edit, image-edit,
 * and the transient manage modes. Two shapes: an optional tab row above an action
 * row of uniform-height cells. Emphasis is by color/weight, never size.
 */
export function EditBar({ tabs, activeTab, onTabChange, cells, ariaLabel }: EditBarProps) {
  return (
    <div className={styles.bottomBar} role="toolbar" aria-label={ariaLabel}>
      {tabs && tabs.length > 0 && (
        <nav className={styles.tabRow} role="tablist" aria-label={ariaLabel}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
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
            <label key={cell.key} className={cellClassName(cell.variant)}>
              {cell.label}
              <input
                type="file"
                hidden
                accept={cell.fileInput.accept}
                multiple={cell.fileInput.multiple}
                onChange={e => {
                  if (e.target.files) cell.fileInput!.onFiles(e.target.files);
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
