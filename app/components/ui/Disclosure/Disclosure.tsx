'use client';

import { type ReactNode, useId } from 'react';

import styles from './Disclosure.module.scss';

const HEADING_TAG = { 2: 'h2', 3: 'h3' } as const;

/**
 * Per-part class hooks. The primitive owns the structure and the wiring; the skin stays with the
 * adopter, because the two real callers disagree about every box in this list — one is a bordered
 * panel header with padding, the other a flush accordion row with a separator rule.
 */
export interface DisclosureClassNames {
  /** The row that holds the toggle and any `action` controls. */
  header?: string;
  /** The heading element — only rendered when `headingLevel` is set. */
  heading?: string;
  /** The toggle button itself. */
  toggle?: string;
  /** The chevron span inside the toggle. */
  chevron?: string;
  /** The region the toggle shows and hides. */
  panel?: string;
}

export interface DisclosureProps {
  /**
   * Toggle label. A node rather than a string so a caller can style parts of it — the collection
   * accordion pairs a flexed label with a muted row count inside the same button.
   */
  title: ReactNode;
  /**
   * Open state, owned by the caller. Controlled-only on purpose: both adopters keep this upstream
   * for reasons the primitive cannot know about — one panel's state also drops the layout packer's
   * inline height, and the accordion's is a one-open-at-a-time selection across sections.
   */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The content the toggle reveals. Unmounted while closed. */
  children: ReactNode;
  /**
   * Controls that live in the header row but are NOT part of the toggle — a checkbox, a "+ New"
   * button. They render as siblings of the button, never inside it: nesting them would be invalid
   * HTML and a trap where every click on them collapsed the region out from under you.
   */
  action?: ReactNode;
  /**
   * Wraps the toggle in a heading of this level, so the region is announced as a section of the
   * document. Omitted where a heading would be wrong — the collection accordion's sections sit
   * inside a labelled list, not the document outline.
   */
  headingLevel?: 2 | 3;
  classNames?: DisclosureClassNames;
}

/**
 * A header that shows and hides the region beneath it.
 *
 * Six independent implementations of this shape existed before it, and the two migrated first had
 * each lost a different piece of the contract: the collection accordion had no `aria-controls` and
 * a bare chevron glyph that screen readers announced as "black down-pointing small triangle", and
 * the admin panel left an `aria-controls` behind pointing at a body it had unmounted. Those four
 * things — the generated panel id, `aria-expanded`, `aria-controls`, and an `aria-hidden` chevron —
 * are exactly what this owns, so no adopter can lose them again.
 *
 * `aria-controls` is emitted only while the panel is mounted — a reference to an absent id is an
 * invalid ARIA value, and the panel is conditionally rendered. Same convention as `EditBar` and
 * `MenuDropdown`.
 *
 * It renders a header row and a panel as siblings, with no wrapper of its own: the adopters differ
 * on what the wrapper should be (a labelled `<section>` with a collapse-sensitive footprint, versus
 * a plain grouping `<div>`), and that is genuinely their business.
 */
export function Disclosure({
  title,
  open,
  onOpenChange,
  children,
  action,
  headingLevel,
  classNames,
}: DisclosureProps) {
  const panelId = useId();
  const Heading = headingLevel === undefined ? undefined : HEADING_TAG[headingLevel];

  const toggle = (
    <button
      type="button"
      className={[styles.toggle, classNames?.toggle].filter(Boolean).join(' ')}
      onClick={() => onOpenChange(!open)}
      aria-expanded={open}
      aria-controls={open ? panelId : undefined}
    >
      <span
        className={[styles.chevron, classNames?.chevron].filter(Boolean).join(' ')}
        aria-hidden="true"
      >
        {open ? '▾' : '▸'}
      </span>
      {title}
    </button>
  );

  return (
    <>
      <div className={classNames?.header}>
        {Heading ? <Heading className={classNames?.heading}>{toggle}</Heading> : toggle}
        {action}
      </div>
      {open && (
        <div className={classNames?.panel} id={panelId}>
          {children}
        </div>
      )}
    </>
  );
}

export default Disclosure;
