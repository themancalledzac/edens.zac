import { type ReactNode } from 'react';

import styles from './SkipLink.module.scss';

/** Shared between the link and its target so the two cannot drift apart. */
export const MAIN_CONTENT_ID = 'main-content';

/**
 * "Skip to main content" — visually hidden until it takes focus, so the first Tab on any page
 * offers it and a keyboard user is not walked through the header's home link and menu toggle on
 * every route.
 *
 * Render it FIRST in the DOM, before the header, and pair it with {@link SkipTarget}.
 *
 * Lives here rather than inside `PageShell` because `CollectionPage` builds its own
 * container/main/header instead of using the shell — so a skip link that only existed in
 * `PageShell` missed the home page and every collection page, which is most of the site.
 * Only render it on pages that actually have a header; with nothing to skip it is just one more
 * tab stop.
 */
export function SkipLink() {
  return (
    <a href={`#${MAIN_CONTENT_ID}`} className={styles.skipLink}>
      Skip to main content
    </a>
  );
}

/**
 * The landing zone for {@link SkipLink}. Wrap the page's content — NOT the `<main>` element,
 * because `SiteHeader` renders inside `<main>` on both shells and sequential focus navigation
 * resumes from the focused element's own subtree: landing on `<main>` would put the header right
 * back in the tab order and skip nothing.
 *
 * `tabIndex={-1}` makes it programmatically focusable, so the jump moves real focus rather than
 * only the scroll position.
 */
export function SkipTarget({ children }: { children: ReactNode }) {
  return (
    <div id={MAIN_CONTENT_ID} tabIndex={-1}>
      {children}
    </div>
  );
}
