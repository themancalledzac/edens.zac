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
 * the SiteHeader. Replaces the 8 copy-pasted .container/.main scaffolds. The
 * page-specific header (title/count/cover/breadcrumbs) is composed via
 * <CollectionHeader>, passed as the first child.
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
      <main className={mainClasses}>
        {withHeader && <SiteHeader pageType={pageType} collectionSlug={collectionSlug} />}
        {children}
      </main>
    </div>
  );
}

export default PageShell;
