import { type ReactNode } from 'react';

import SiteHeader from '@/app/components/SiteHeader/SiteHeader';

import styles from './PageShell.module.scss';

export interface PageShellProps {
  children: ReactNode;
  /** Forwarded to SiteHeader; mirrors SiteHeaderProps['pageType']. */
  pageType?: 'default' | 'manage' | 'collection' | 'collectionsCollection';
  collectionSlug?: string;
  /** Render the site header (default true). Status pages pass false. */
  withHeader?: boolean;
  className?: string;
}

/**
 * Canonical page scaffold: the painted, dark-safe surface (container/main) plus
 * the SiteHeader. The page-specific header (title/count/cover/breadcrumbs) is
 * composed via <CollectionHeader>, passed as the first child.
 *
 * First in the DOM is the skip link — visually hidden until it takes focus, so the first Tab on
 * any page offers "Skip to main content" and a keyboard user is not walked through the header's
 * home link and menu toggle on every route. It is rendered only alongside the header: with
 * `withHeader={false}` (status pages) there is no navigation to skip, and the link would just be
 * one more tab stop.
 *
 * The skip target is the wrapper around `children`, not the `<main>` element: SiteHeader renders
 * INSIDE `<main>` here, and sequential focus navigation resumes from the focused element's own
 * subtree — landing on `<main>` would put the header right back in the tab order and skip
 * nothing. `tabIndex={-1}` makes the wrapper programmatically focusable so the jump moves real
 * focus rather than only the scroll position.
 */
export function PageShell({
  children,
  pageType = 'default',
  collectionSlug,
  withHeader = true,
  className,
}: PageShellProps) {
  const mainClasses = [styles.main, className].filter(Boolean).join(' ');
  return (
    <div className={styles.container}>
      {withHeader && (
        <a href="#main-content" className={styles.skipLink}>
          Skip to main content
        </a>
      )}
      <main className={mainClasses}>
        {withHeader && <SiteHeader pageType={pageType} collectionSlug={collectionSlug} />}
        <div id="main-content" tabIndex={-1}>
          {children}
        </div>
      </main>
    </div>
  );
}

export default PageShell;
