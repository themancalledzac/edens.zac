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
 * panel keeps only what is its own: the boxed chrome, and the `.isCollapsed` hook.
 *
 * `.isCollapsed` makes the shell FILL the box the packer gave it (`height: 100%`) rather than size
 * to its header. The packer's box for a collapsed panel is the uniform `COLLAPSED_PANEL_HEIGHT`
 * bar, and filling it is what keeps a text-only header's bar exactly as tall as a
 * button-carrying one — three closed panels read as one row of bars, not three heights.
 *
 * `.isCollapsed` also paints the strip of empty body surface a closed panel keeps showing, through
 * an `::after` that takes the space below the header. That is presentation with no content, so it
 * belongs to the stylesheet and not to this component: as markup it was two nested divs whose only
 * job was to be seen and not read, held out of the accessibility tree by an `aria-hidden` that any
 * later edit could drop.
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
    </section>
  );
}

export default AdminPanel;
