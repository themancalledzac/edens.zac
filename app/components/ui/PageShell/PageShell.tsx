import { type ReactNode } from 'react';

import SiteHeader from '@/app/components/SiteHeader/SiteHeader';
import { SkipLink, SkipTarget } from '@/app/components/ui/SkipLink/SkipLink';

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
 * First in the DOM is {@link SkipLink}, rendered only alongside the header — with
 * `withHeader={false}` (status pages) there is nothing to skip and it would be one more tab stop.
 * `CollectionPage` builds its own shell rather than using this one, so it renders the same pair
 * itself; see {@link SkipLink} for why the pieces live outside this file.
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
      {withHeader && <SkipLink />}
      <main className={mainClasses}>
        {withHeader && <SiteHeader pageType={pageType} collectionSlug={collectionSlug} />}
        <SkipTarget>{children}</SkipTarget>
      </main>
    </div>
  );
}

export default PageShell;
