'use client';

import { type ReactNode } from 'react';

import { Disclosure } from '@/app/components/ui/Disclosure/Disclosure';

import styles from './ListPanel.module.scss';

interface ListPanelProps {
  title: string;
  /**
   * Header controls that sit between the title and the trailing action — a filter checkbox, a
   * count. Its wrapper renders whether or not it is occupied, which is the point: the users
   * panel's tag-only toggle is conditional on being in list mode, and an appearing/disappearing
   * grid item would reflow the header on every mode change and move the right rail with it.
   */
  headerMiddle?: ReactNode;
  /** The panel-scope action — `+ New User`, a `View all` link. Hugs the same rail as row actions. */
  headerRight?: ReactNode;
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
 * Shared shell for list panels: a header row, and a scrollable body beneath it.
 *
 * The header and every row are the SAME shape — three sections (left, middle, right) resolved
 * against one pair of rails. That is what makes the old header/row misalignment structurally
 * impossible rather than a value to keep re-tuning: header controls used to sit at a 17px inset
 * (`1px border + 16px header padding`) while row controls sat at 33px (`1 + 16 body + 8 list +
 * 8 row`), a 16px discontinuity at every row. There is no separate header inset left to get wrong.
 *
 * When collapsible, the header becomes a {@link Disclosure} — the title turns into the toggle and
 * the body unmounts, while the header's middle and right controls stay outside the button and
 * remain usable. This panel keeps only what is its own: the boxed chrome, the rails, and the
 * `.isCollapsed` hook.
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
export function ListPanel({
  title,
  headerMiddle,
  headerRight,
  children,
  ariaLabel,
  collapsed = false,
  onCollapsedChange,
}: ListPanelProps) {
  const isCollapsed = onCollapsedChange !== undefined && collapsed;

  // Both wrappers are unconditional. `Disclosure` renders `action` as a bare sibling of the
  // toggle, so without them the header's grid has no stable column for the trailing control:
  // an absent middle would slide the action from column 3 into column 2 and take the right rail
  // with it, exactly on the mode changes that hide the middle control.
  const headerSections = (
    <>
      <div className={styles.headerMiddle}>{headerMiddle}</div>
      <div className={styles.headerRight}>{headerRight}</div>
    </>
  );

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
          action={headerSections}
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
            {headerSections}
          </div>
          <div className={styles.body}>{children}</div>
        </>
      )}
    </section>
  );
}

interface ListRowsProps {
  children: ReactNode;
}

/**
 * The list surface every panel's rows sit on.
 *
 * Declared here rather than in each panel because all three carried a byte-identical `.list` rule
 * under a "keep the three in step" comment — a rule that has to be copied to stay correct is a
 * rule that belongs to the shell. It also owns the horizontal rail: the list, not the body, is
 * what insets row content, which is how a row lands on the same rail as the header.
 */
export function ListRows({ children }: ListRowsProps) {
  return <ul className={styles.list}>{children}</ul>;
}

interface ListRowProps {
  /** The row's identity — a name over an email, a subject over a body. Hugs the left rail. */
  left: ReactNode;
  /** Optional middle section. Absent in all three of today's panels; the column stays reserved. */
  middle?: ReactNode;
  /** Actions and trailing stats. Hugs the right rail, the same one the header's action hugs. */
  right?: ReactNode;
  /**
   * Makes the left section activate the row. The button wraps the LEFT section only, never the
   * whole row: the right section holds its own buttons, and nesting those inside a row-level
   * button would be invalid HTML and a trap where every action click also opened the row.
   */
  onActivate?: () => void;
  /** Accessible name for the activation button. Required in practice whenever `onActivate` is set. */
  ariaLabel?: string;
}

/**
 * One row of a {@link ListRows} list, in the same three-section shape as the panel header.
 *
 * Height is declared, not measured: `listPanelShape.ts` derives it from the slots each section
 * stacks, and the layout packer reserves that number before the panel ever renders. So a section's
 * content must not change height with the row's width — every text slot inside `left`, `middle`
 * and `right` is `nowrap` + ellipsis, and no `@media` or `@container` may enter this subtree.
 */
export function ListRow({ left, middle, right, onActivate, ariaLabel }: ListRowProps) {
  return (
    <li className={styles.row}>
      {onActivate ? (
        <button
          type="button"
          className={styles.rowActivate}
          onClick={onActivate}
          aria-label={ariaLabel}
        >
          {left}
        </button>
      ) : (
        <div className={styles.rowLeft}>{left}</div>
      )}
      <div className={styles.rowMiddle}>{middle}</div>
      <div className={styles.rowRight}>{right}</div>
    </li>
  );
}

export default ListPanel;
