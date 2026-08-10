import { type ReactNode } from 'react';

import SiteHeader from '@/app/components/SiteHeader/SiteHeader';
import { SkipTarget } from '@/app/components/ui/SkipLink/SkipLink';

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
 * The shell supplies only the {@link SkipTarget} half of the skip-link pair — always, even with
 * `withHeader={false}`, because the link itself is now unconditional. The link is rendered once
 * from the root layout, above the route's Suspense boundary; see {@link SkipLink} for why it
 * cannot live down here.
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
        <SkipTarget>{children}</SkipTarget>
      </main>
    </div>
  );
}

export default PageShell;
