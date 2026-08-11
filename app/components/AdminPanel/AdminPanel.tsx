'use client';

import { type ReactNode } from 'react';

import { Disclosure } from '@/app/components/ui/Disclosure/Disclosure';

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
 * When collapsible, the header becomes a {@link Disclosure} — the title turns into the toggle and
 * the body unmounts, while the `action` controls stay outside the button and remain usable. This
 * panel keeps only what is its own: the boxed chrome, and the `.isCollapsed` hook that lets the
 * shell size to its header instead of filling the box the packer gave it.
 *
 * `collapsed` is inverted into the disclosure's `open` rather than renamed, because the panel's
 * callers and the renderer that owns the state both speak in terms of collapsing.
 */
export function AdminPanel({
  title,
  action,
  children,
  ariaLabel,
  collapsed = false,
  onCollapsedChange,
}: AdminPanelProps) {
  const isCollapsed = onCollapsedChange !== undefined && collapsed;

  return (
    <section
      className={`${styles.panel} ${isCollapsed ? styles.isCollapsed : ''}`}
      aria-label={ariaLabel}
    >
      {onCollapsedChange ? (
        <Disclosure
          title={title}
          open={!collapsed}
          onOpenChange={open => onCollapsedChange(!open)}
          action={action}
          headingLevel={2}
          classNames={{
            header: styles.header,
            heading: styles.title,
            toggle: styles.toggle,
            chevron: styles.chevron,
            panel: styles.body,
          }}
        >
          {children}
        </Disclosure>
      ) : (
        <>
          <div className={styles.header}>
            <h2 className={styles.title}>{title}</h2>
            {action}
          </div>
          <div className={styles.body}>{children}</div>
        </>
      )}
      {isCollapsed ? (
        <div className={styles.collapsedBody} aria-hidden="true">
          <div className={styles.collapsedList} />
        </div>
      ) : null}
    </section>
  );
}

export default AdminPanel;
