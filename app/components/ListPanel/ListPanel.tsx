'use client';

import Link from 'next/link';
import { type KeyboardEvent, type ReactNode, useEffect, useId, useRef } from 'react';

import { Disclosure } from '@/app/components/ui/Disclosure/Disclosure';

import styles from './ListPanel.module.scss';

/** One tab of a tabbed {@link ListPanel}. */
export interface ListPanelTab<Id extends string = string> {
  id: Id;
  label: string;
}

/**
 * The tab strip a {@link ListPanel} shows in place of its title. Controlled: the caller owns which
 * tab is active and renders that tab's content as the panel's children.
 */
export interface ListPanelTabs<Id extends string = string> {
  tabs: ReadonlyArray<ListPanelTab<Id>>;
  active: Id;
  onChange: (id: Id) => void;
}

/**
 * What a panel's HOST hands it, as opposed to what the panel itself decides: the tab strip it sits
 * under and the collapsed state of the box it sits in. A panel takes this as one `shell` prop and
 * spreads it onto {@link ListPanel}, so it never has to know which of the three it was given.
 */
export interface ListPanelShell {
  tabs?: ListPanelTabs;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

interface ListPanelProps extends ListPanelShell {
  /**
   * The panel's name. Visible as the header heading when there are no tabs; with tabs the tab strip
   * names the content instead, and this stays as the collapse toggle's accessible name.
   */
  title: string;
  /**
   * The panel-scope action, alone at the far right of the header: `+ New User`, `View all`,
   * `← Back`. Render it with {@link PanelAction} so every panel's action looks the same. It stays
   * outside the collapse toggle, so it remains usable while the panel is collapsed.
   */
  action?: ReactNode;
  /**
   * The body's first line, above the list: a filter such as the users panel's tag-only toggle. Sits
   * on the right of {@link viewTitle} when both are given.
   */
  toolbar?: ReactNode;
  /**
   * Heading for a non-list view, such as a form or a role's detail, shown on the body's first line.
   * The header no longer changes its title per view, because with tabs the header is the tab strip.
   */
  viewTitle?: string;
  children: ReactNode;
  ariaLabel?: string;
}

/**
 * Shared shell for list panels: a header bar over a scrollable body.
 *
 * The header is one line, in this order: the collapse chevron (when collapsible), then the title
 * or the tab strip, then the panel's single action at the far right. Filters are not header
 * content. They go on the body's first line through `toolbar`, so a header never carries more than
 * one control besides its tabs.
 *
 * The header and the list inset their content by the same `--space-3`, so the header action and
 * the row actions under it end on one right-hand rail.
 *
 * Collapsing is opt-in: pass BOTH `collapsed` and `onCollapsedChange`. The header then becomes a
 * {@link Disclosure}, whose toggle is the chevron plus the title. With tabs, the title is visually
 * hidden and the tabs render as the disclosure's `action`, so they stay outside the toggle button.
 * Choosing a tab while collapsed also expands the panel, because the reason to pick a tab is to see
 * its content.
 *
 * Ownership of `collapsed` sits upstream because the panel does not control its own footprint.
 * `AdminPanelRenderer` does, through the width and height the layout packer hands it.
 */
export function ListPanel({
  title,
  tabs,
  action,
  toolbar,
  viewTitle,
  children,
  ariaLabel,
  collapsed = false,
  onCollapsedChange,
}: ListPanelProps) {
  const tabIdBase = useId();
  const isCollapsed = onCollapsedChange !== undefined && collapsed;

  const tabId = (id: string) => `${tabIdBase}-tab-${id}`;
  const tabPanelId = `${tabIdBase}-tabpanel`;

  const tabStrip = tabs ? (
    <TabStrip
      tabs={tabs}
      tabId={tabId}
      tabPanelId={isCollapsed ? undefined : tabPanelId}
      onSelect={id => {
        tabs.onChange(id);
        if (isCollapsed) onCollapsedChange?.(false);
      }}
    />
  ) : null;

  const actionSlot = <div className={styles.action}>{action}</div>;

  const firstLine =
    viewTitle || toolbar ? (
      <div className={styles.toolbar}>
        {viewTitle && <h3 className={styles.viewTitle}>{viewTitle}</h3>}
        {toolbar && <div className={styles.toolbarControls}>{toolbar}</div>}
      </div>
    ) : null;

  const body = tabs ? (
    <div role="tabpanel" id={tabPanelId} aria-labelledby={tabId(tabs.active)}>
      {firstLine}
      {children}
    </div>
  ) : (
    <>
      {firstLine}
      {children}
    </>
  );

  return (
    <section className={styles.panel} aria-label={ariaLabel}>
      {onCollapsedChange ? (
        <Disclosure
          title={tabs ? <span className={styles.srOnly}>{title}</span> : title}
          open={!collapsed}
          onOpenChange={open => onCollapsedChange(!open)}
          action={
            <>
              {tabStrip}
              {actionSlot}
            </>
          }
          headingLevel={2}
          classNames={{
            header: styles.header,
            heading: tabs ? styles.toggleHeading : styles.title,
            toggle: styles.toggle,
            chevron: styles.chevron,
            panel: styles.body,
          }}
        >
          {body}
        </Disclosure>
      ) : (
        <>
          <div className={styles.header}>
            {tabStrip ?? <h2 className={styles.title}>{title}</h2>}
            {actionSlot}
          </div>
          <div className={styles.body}>{body}</div>
        </>
      )}
    </section>
  );
}

interface TabStripProps {
  tabs: ListPanelTabs;
  tabId: (id: string) => string;
  /** The tab panel's id, or undefined while it is unmounted (collapsed). */
  tabPanelId: string | undefined;
  onSelect: (id: string) => void;
}

/**
 * The header's tab strip, following the WAI-ARIA tabs pattern: one tab in the Tab order (the
 * active one), arrow keys move between tabs, and selection follows focus.
 *
 * `aria-controls` is emitted only on the active tab, and only while the panel is mounted. The
 * inactive tabs' content is not in the DOM, and a reference to a missing id is invalid ARIA. Same
 * convention as `EditBar`.
 *
 * At a phone width the strip scrolls sideways, so the active tab — `?list=collections` on load, or
 * one reached with the arrow keys — can start out of view. The effect scrolls the STRIP to it.
 * `scrollIntoView` would also scroll the page vertically to reach the header, which is not this
 * component's call to make.
 */
function TabStrip({ tabs, tabId, tabPanelId, onSelect }: TabStripProps) {
  const stripRef = useRef<HTMLDivElement>(null);
  const activeId = tabId(tabs.active);

  useEffect(() => {
    const strip = stripRef.current;
    const tab = document.getElementById(activeId);
    if (!strip || !tab) return;
    const start = tab.offsetLeft;
    const end = start + tab.offsetWidth;
    if (start < strip.scrollLeft) strip.scrollLeft = start;
    else if (end > strip.scrollLeft + strip.clientWidth) strip.scrollLeft = end - strip.clientWidth;
  }, [activeId]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.tabs.findIndex(t => t.id === tabs.active);
    const last = tabs.tabs.length - 1;
    const next =
      e.key === 'ArrowRight'
        ? index === last
          ? 0
          : index + 1
        : e.key === 'ArrowLeft'
          ? index <= 0
            ? last
            : index - 1
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? last
              : null;
    if (next === null) return;
    e.preventDefault();
    const target = tabs.tabs[next];
    if (!target) return;
    onSelect(target.id);
    document.getElementById(tabId(target.id))?.focus();
  };

  return (
    <div ref={stripRef} role="tablist" className={styles.tabs} onKeyDown={handleKeyDown}>
      {tabs.tabs.map(tab => {
        const selected = tab.id === tabs.active;
        return (
          <button
            key={tab.id}
            id={tabId(tab.id)}
            type="button"
            role="tab"
            className={styles.tab}
            aria-selected={selected}
            aria-controls={selected ? tabPanelId : undefined}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

interface ListRowsProps {
  children: ReactNode;
}

/**
 * The list surface every panel's rows sit on.
 *
 * Declared here rather than in each panel because all of them carried a byte-identical `.list`
 * rule. It also owns the horizontal rail: the list, not the body, insets row content, which is how
 * a row lands on the same rail as the header.
 */
export function ListRows({ children }: ListRowsProps) {
  return <ul className={styles.list}>{children}</ul>;
}

interface ListRowProps {
  /** Makes the WHOLE row a single button. The row then holds no other control. */
  onActivate?: () => void;
  /** Accessible name for the activation button. Required in practice whenever `onActivate` is set. */
  ariaLabel?: string;
  /** The row's identity: a name, a subject. Rendered at 500, or 600 with `emphasis`. */
  primary: ReactNode;
  /** Muted, after a middle dot. Ellipsises before the fact does. */
  secondary?: ReactNode;
  /** A small muted fact on the right rail: a count, a relative time. */
  fact?: ReactNode;
  /** Sits before the primary: an avatar, a status dot. */
  leading?: ReactNode;
  /** Renders the primary at 600, for an unread message. */
  emphasis?: boolean;
}

/**
 * One row of a {@link ListRows} list, on one line: leading, primary, a muted secondary after a
 * middle dot, and a small muted fact on the right. The dot is `aria-hidden` so a screen reader
 * reads the two texts and not the punctuation. Per-row actions live in a `ListDetailSheet`.
 *
 * Height is declared, not measured: `listPanelShape.ts` derives it from the slots each section
 * stacks, and the layout packer reserves that number before the panel ever renders. So a row's
 * content must not change height with the row's width — every text slot is `nowrap` + ellipsis,
 * and no `@media` or `@container` may enter this subtree.
 */
export function ListRow({
  onActivate,
  ariaLabel,
  primary,
  secondary,
  fact,
  leading,
  emphasis,
}: ListRowProps) {
  const line = (
    <>
      {leading && <span className={styles.rowLeading}>{leading}</span>}
      <span className={styles.rowText}>
        <span className={`${styles.rowPrimary} ${emphasis ? styles.rowEmphasis : ''}`}>
          {primary}
        </span>
        {secondary && (
          <span className={styles.rowSecondary}>
            <span aria-hidden="true"> · </span>
            {secondary}
          </span>
        )}
      </span>
      {fact && <span className={styles.rowFact}>{fact}</span>}
    </>
  );

  return (
    <li className={styles.row}>
      {onActivate ? (
        <button
          type="button"
          className={`${styles.rowLine} ${styles.rowButton}`}
          onClick={onActivate}
          aria-label={ariaLabel}
        >
          {line}
        </button>
      ) : (
        <div className={styles.rowLine}>{line}</div>
      )}
    </li>
  );
}

type PanelActionProps =
  | { href: string; onClick?: never; disabled?: never; children: ReactNode }
  | { href?: never; onClick: () => void; disabled?: boolean; children: ReactNode };

/**
 * The one style for a panel's header action, whether it navigates or acts.
 *
 * `+ New User` used to be a ghost Button, `+ New Role` a filled secondary Button, and `View all` a
 * muted text link, all in the same header position. This is the only way a panel renders its
 * action now: a link when given `href`, a button when given `onClick`, identical either way.
 * Its height is the header's `button` slot (`--lp-slot-button`), so it cannot grow the header past
 * what `listPanelShape.ts` reserves.
 */
export function PanelAction(props: PanelActionProps) {
  if (props.href !== undefined) {
    return (
      <Link href={props.href} className={styles.panelAction}>
        {props.children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      className={styles.panelAction}
      onClick={props.onClick}
      disabled={props.disabled}
    >
      {props.children}
    </button>
  );
}

interface ViewAllLinkProps {
  /** Where the full list lives — `/collections`, `/comments`. */
  href: string;
  /** How many rows exist in total, which is usually more than the panel shows. */
  count: number;
}

/** The `N · View all` action for a panel whose full list lives on a page of its own. */
export function ViewAllLink({ href, count }: ViewAllLinkProps) {
  return <PanelAction href={href}>{count} · View all</PanelAction>;
}
