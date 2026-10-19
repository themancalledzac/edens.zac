import { type ReactNode } from 'react';

import SiteHeader from '@/app/components/SiteHeader/SiteHeader';
import { SiteMenuProvider } from '@/app/components/SiteHeader/SiteMenuContext';
import { BottomNav } from '@/app/components/ui/BottomNav/BottomNav';
import { BackLink } from '@/app/components/ui/PageShell/BackLink';
import { SkipTarget } from '@/app/components/ui/SkipLink/SkipLink';
import { type MeResponse } from '@/app/types/Auth';
import { type CollectionModel } from '@/app/types/Collection';
import { type SsrViewport } from '@/app/utils/ssrViewport';

import CollectionPageClient from './CollectionPageClient';
import styles from './ContentCollectionPage.module.scss';

interface ContentCollectionPageProps {
  collection: CollectionModel;
  /** Desktop row density (1-10). Defaults downstream to `LAYOUT.defaultChunkSize`. */
  chunkSize?: number;
  /**
   * Mobile row budget (1-5) that replaces the one derived from `chunkSize`. See the same prop on
   * {@link CollectionPageClient}.
   */
  mobileChunkSize?: number;
  /** UA-derived SSR fallback viewport from {@link resolveSsrViewport}. */
  ssrViewport?: SsrViewport;
  /** Mounts the admin edit surface in CollectionPageClient. */
  editMode?: boolean;
  /** Server-resolved principal (from `meServer()`), forwarded to the gallery client. */
  me?: MeResponse | null;
  /** The viewer's persisted selected image ids for this collection (client galleries only). */
  initialSelectedIds?: number[];
  /** The viewer's GLOBAL saved (bookmarked) image ids, seeded server-side. Cross-collection. */
  initialSavedImageIds?: number[];
  /** When set, renders a back link to this href as the first element inside the skip target. */
  backHref?: string;
  /** Destination name in the back link (default 'Admin'). */
  backLabel?: string;
  /**
   * Visible page header, rendered after the back link. It must
   * carry the page's h1, because it replaces the visually-hidden one.
   */
  header?: ReactNode;
}

/**
 * Content Collection Page
 *
 * Renders a single collection, delegated to CollectionPageClient for filters and edit mode. It
 * emits a visually-hidden <h1>, because the title is only shown as an overlay inside the content
 * tree, unless the caller passes a `header` that carries its own.
 *
 * @param collection - The CollectionModel to render
 */
export default function CollectionPage({
  collection,
  chunkSize,
  mobileChunkSize,
  ssrViewport,
  editMode = false,
  me,
  initialSelectedIds = [],
  initialSavedImageIds = [],
  backHref,
  backLabel,
  header,
}: ContentCollectionPageProps) {
  const headingText = collection.title?.trim() || collection.slug?.trim() || 'Untitled';
  return (
    <SiteMenuProvider>
      <div className={styles.container}>
        <main className={styles.main}>
          <SiteHeader isCollectionPage collectionSlug={collection.slug} me={me} />
          {!editMode && <BottomNav me={me} />}
          <SkipTarget>
            {backHref && <BackLink href={backHref} label={backLabel} />}
            {header ?? <h1 className={styles.srOnly}>{headingText}</h1>}
            <CollectionPageClient
              collection={collection}
              chunkSize={chunkSize}
              mobileChunkSize={mobileChunkSize}
              ssrViewport={ssrViewport}
              editMode={editMode}
              me={me ?? null}
              initialSelectedIds={initialSelectedIds}
              initialSavedImageIds={initialSavedImageIds}
            />
          </SkipTarget>
        </main>
      </div>
    </SiteMenuProvider>
  );
}
