import { type ReactNode, useId } from 'react';

import styles from './Card.module.scss';

export interface CardProps {
  title: string;
  children: ReactNode;
  /**
   * Heading level. `h2` by default; pass `h3` when the card sits inside a region that already has
   * an `h2`, so the document outline does not skip a level.
   */
  as?: 'h2' | 'h3';
  /** Optional control aligned to the end of the heading row — a button, a link, a count. */
  action?: ReactNode;
  className?: string;
}

/**
 * A titled section: a heading with a rule under it, then a body.
 *
 * This is the app's most duplicated shape — thirteen independent implementations of "a section
 * with a heading" existed before it, whose heading rules had drifted into three arbitrary
 * variants (`text-md`/600, `text-md`/bold, `text-lg`/bold) that encoded no real distinction.
 *
 * The heading is wired to the section with `aria-labelledby`, so the region is announced by its
 * title rather than as an unnamed landmark — several of the hand-rolled versions used a bare
 * `<div>` and lost that entirely.
 *
 * It is a plain layout shell on purpose: no border, no background, no radius. It composes inside
 * the collection header rail, a page column, or a panel body without fighting whatever supplies
 * the surrounding padding. For the boxed, scroll-bodied panel used on the admin hub, see
 * `AdminPanel` — that one owns a fixed footprint and a collapse affordance, which is a different
 * job from this.
 */
export function Card({ title, children, as = 'h2', action, className }: CardProps) {
  const headingId = useId();
  const Heading = as;

  return (
    <section
      className={[styles.card, className].filter(Boolean).join(' ')}
      aria-labelledby={headingId}
    >
      <div className={styles.header}>
        <Heading id={headingId} className={styles.heading}>
          {title}
        </Heading>
        {action}
      </div>
      <div className={styles.body}>{children}</div>
    </section>
  );
}

export default Card;
