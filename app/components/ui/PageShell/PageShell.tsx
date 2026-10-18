import { type ReactNode } from 'react';

import { Footer } from '@/app/components/Footer/Footer';
import SiteHeader from '@/app/components/SiteHeader/SiteHeader';
import { SiteMenuProvider } from '@/app/components/SiteHeader/SiteMenuContext';
import { BottomNav } from '@/app/components/ui/BottomNav/BottomNav';
import { SkipTarget } from '@/app/components/ui/SkipLink/SkipLink';
import { type MeResponse } from '@/app/types/Auth';

import { BackLink } from './BackLink';
import styles from './PageShell.module.scss';

export interface PageShellProps {
  children: ReactNode;
  collectionSlug?: string;
  /** Render the site header (default true). Status pages pass false. */
  withHeader?: boolean;
  /** Render the site footer after `<main>` (default true). */
  withFooter?: boolean;
  className?: string;
  /** Server-resolved principal forwarded unchanged to {@link SiteHeader}; omitted means unresolved. */
  me?: MeResponse | null;
  /** When set, renders a back link to this href as the first element inside the skip target. */
  backHref?: string;
  /** Destination name in the back link (default 'Admin'). */
  backLabel?: string;
  /** Leave out the mobile bottom bar (default false). Pages that mount their own fixed bar pass true. */
  hideBottomNav?: boolean;
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
 *
 * The mobile {@link BottomNav} shares the header's {@link SiteMenuProvider} and is skipped with
 * `hideBottomNav` or when no header renders.
 *
 * No `isCollectionPage` prop: nothing the shell wraps is a single collection's page, so its header
 * never shows the admin Update item. The one page that does — `CollectionPage` — renders
 * {@link SiteHeader} directly. Add the prop back here the day a shell-wrapped page needs it.
 */
export function PageShell({
  children,
  collectionSlug,
  withHeader = true,
  withFooter = true,
  className,
  me,
  backHref,
  backLabel,
  hideBottomNav = false,
}: PageShellProps) {
  const mainClasses = [styles.main, className].filter(Boolean).join(' ');
  return (
    <SiteMenuProvider>
      <div className={styles.container}>
        <main className={mainClasses}>
          {withHeader && <SiteHeader collectionSlug={collectionSlug} me={me} />}
          {withHeader && !hideBottomNav && <BottomNav me={me} />}
          <SkipTarget>
            {backHref && <BackLink href={backHref} label={backLabel} />}
            {children}
          </SkipTarget>
        </main>
        {withFooter && <Footer />}
      </div>
    </SiteMenuProvider>
  );
}
