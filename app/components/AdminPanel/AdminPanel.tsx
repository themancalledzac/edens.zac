'use client';

import { type ReactNode, useId } from 'react';

import styles from './AdminPanel.module.scss';

interface AdminPanelProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  ariaLabel?: string;
  /**
   * Collapsed state, owned by the caller. Collapsing is opt-in: pass BOTH this and
   * {@link onCollapsedChange} to make the header a toggle. Ownership sits upstream because the
   * panel does not control its own footprint — `AdminPanelRenderer` does, via the width/height the
   * layout packer hands it. Collapsing here without shrinking that box would hide the body and
   * leave an empty 1100px well behind it, which is the opposite of the point.
   */
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

/**
 * Shared shell for admin hub panels: a header row, and a scrollable body beneath it.
 *
 * When collapsible, the title becomes a toggle button and the body unmounts — the header row,
 * including whatever `action` controls the panel supplies, stays visible and usable. Only the
 * title is the hit target, not the whole header: the header also holds real controls (the
 * tag-only-people checkbox, "+ New User"), and nesting those inside a toggle button would be both
 * invalid HTML and a trap where every click collapsed the panel out from under you. The title
 * stretches to fill the space its neighbours do not, so the tap target is most of the bar.
 */
export function AdminPanel({
  title,
  action,
  children,
  ariaLabel,
  collapsed = false,
  onCollapsedChange,
}: AdminPanelProps) {
  const bodyId = useId();
  const collapsible = onCollapsedChange !== undefined;
  const isCollapsed = collapsible && collapsed;

  return (
    <section
      className={`${styles.panel} ${isCollapsed ? styles.isCollapsed : ''}`}
      aria-label={ariaLabel}
    >
      <div className={styles.header}>
        <h2 className={styles.title}>
          {collapsible ? (
            <button
              type="button"
              className={styles.toggle}
              onClick={() => onCollapsedChange(!collapsed)}
              aria-expanded={!isCollapsed}
              aria-controls={bodyId}
            >
              <span className={styles.chevron} aria-hidden="true">
                {isCollapsed ? '▸' : '▾'}
              </span>
              {title}
            </button>
          ) : (
            title
          )}
        </h2>
        {action}
      </div>
      {!isCollapsed && (
        <div className={styles.body} id={bodyId}>
          {children}
        </div>
      )}
    </section>
  );
}

export default AdminPanel;
