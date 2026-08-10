import { type ReactNode } from 'react';

import styles from './SkipLink.module.scss';

/** Shared between the link and its target so the two cannot drift apart. */
export const MAIN_CONTENT_ID = 'main-content';

/**
 * "Skip to main content" — visually hidden until it takes focus, so the first Tab on any page
 * offers it and a keyboard user is not walked through the header's home link and menu toggle on
 * every route.
 *
 * Rendered exactly once, from the root layout (`app/layout.tsx`), immediately inside `<body>`.
 * That position is load-bearing, not tidiness: every route segment streams inside a Suspense
 * boundary, and the site-wide `<Footer>` is part of the shell that flushes *before* that boundary
 * resolves. A skip link rendered inside a page shell therefore arrived in the hidden
 * `<div id="S:0">` buffer and only joined the tab order when React relocated the boundary — 8ms
 * after the footer on `/`, but 459ms on `/collections`. For that whole window the footer's
 * Instagram and GitHub links were the page's first two tab stops. Hoisting the link above the
 * boundary puts it in the first bytes of the stream, ahead of the footer, from the first paint.
 *
 * Because it is unconditional, every route must offer a landing zone: wrap the page's content in
 * {@link SkipTarget}, or spread {@link skipTargetProps} onto an element that already plays that
 * role.
 */
export function SkipLink() {
  return (
    <a href={`#${MAIN_CONTENT_ID}`} className={styles.skipLink}>
      Skip to main content
    </a>
  );
}

/**
 * The attributes that make an element the skip link's landing zone. `tabIndex: -1` makes it
 * programmatically focusable, so the jump moves real focus rather than only the scroll position.
 *
 * Spread these onto a page's existing content root when an extra wrapper would change the layout —
 * `/login` and `/invite/[token]` centre a card inside `<main>` with flexbox, so a `<div>` between
 * the two would become the flex item and collapse the card's `width: 100%`. Those pages render no
 * header inside `<main>`, so `<main>` itself is the correct landing zone there. Everywhere else,
 * prefer {@link SkipTarget}.
 */
export const skipTargetProps = { id: MAIN_CONTENT_ID, tabIndex: -1 } as const;

/**
 * The landing zone for {@link SkipLink}. Wrap the page's content — NOT the `<main>` element,
 * because `SiteHeader` renders inside `<main>` on both shells and sequential focus navigation
 * resumes from the focused element's own subtree: landing on `<main>` would put the header right
 * back in the tab order and skip nothing.
 */
export function SkipTarget({ children }: { children: ReactNode }) {
  return <div {...skipTargetProps}>{children}</div>;
}
