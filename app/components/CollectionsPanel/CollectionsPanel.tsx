'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { type ReactNode, useMemo } from 'react';

import { useAdminPanelSeed } from '@/app/components/ListPanel/AdminPanelSeedContext';
import { ListPanel, ListRow, ListRows, ViewAllLink } from '@/app/components/ListPanel/ListPanel';
import { EmptyState } from '@/app/components/ui/StatusText/EmptyState';
import { LoadError } from '@/app/components/ui/StatusText/LoadError';
import { LoadingText } from '@/app/components/ui/StatusText/LoadingText';
import { StaleNotice } from '@/app/components/ui/StatusText/StaleNotice';
import { useCachedPanelData } from '@/app/hooks/useCachedPanelData';
import { getMetadata } from '@/app/lib/api/collections';
import { type CollectionListModel } from '@/app/types/Collection';
import { formatLongDate } from '@/app/utils/formatDateRange';
import { compareCollectionsNewestFirst } from '@/app/utils/sortCollections';

import styles from './CollectionsPanel.module.scss';

interface CollectionsPanelProps {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

/**
 * Side of the cover thumbnail, in CSS px, matched to `.cover` in the stylesheet.
 *
 * Passed to `next/image` as its intrinsic size so the optimizer requests a square rather than the
 * source image's own shape. The rendered size is CSS's — see the stylesheet for why it is fixed.
 */
const THUMBNAIL_SIZE = 32;

/**
 * The collection list, from the metadata endpoint the admin page already calls.
 *
 * There is no collections-only endpoint and no viewer-scoped one. This panel is admin-only, so the
 * admin metadata payload is the right source; a lighter endpoint would be a second way to ask the
 * same question.
 */
async function fetchCollections(): Promise<CollectionListModel[]> {
  const metadata = await getMetadata();
  return metadata?.collections ?? [];
}

/**
 * The hub's collection list: a cover thumbnail, the collection's name and its date, per row.
 *
 * The first panel built on {@link ListPanel} rather than migrated onto it. Its row declares
 * `left: ['header', 'subheader']` and nothing on the right (`PANEL_SHAPE` in `adminHubContent.ts`),
 * which derives to 54px. The thumbnail is deliberately not part of that declaration: at 32px it is
 * shorter than the 41px name-over-date stack, so the stack governs the row and the thumbnail costs
 * no height. Growing it past 41px would make the declared shape wrong with nothing to catch it.
 *
 * Clicking a row opens that collection. It is `onActivate` rather than a `<Link>` because
 * `ListRow` already wraps the left section in a button, and an anchor inside a button is invalid
 * markup. A collection with no slug has nowhere to go, so it renders as a plain row instead.
 *
 * Data comes through `useCachedPanelData` under a `collections` key, seeded by the list the server
 * already fetched to size this panel — see `page.tsx`. A failed load gets its own branch ahead of
 * the empty state, so a dead backend is never reported as "no collections", and a failed
 * background refresh over showing data raises the {@link StaleNotice} instead. Both follow
 * {@link RolesPanel}, which this panel is otherwise a simpler version of.
 *
 * Collapsed state is owned by `AdminHubClient` and passed straight through: this panel has no
 * body-only mode to force itself open for.
 */
export function CollectionsPanel({ collapsed, onCollapsedChange }: CollectionsPanelProps) {
  const router = useRouter();
  const seed = useAdminPanelSeed();

  const { data, loading, loadError, revalidationFailed, refresh } = useCachedPanelData(
    'collections',
    fetchCollections,
    'Could not load collections. Retry, or check that the backend is running.',
    seed.collections
  );

  const collections = useMemo(() => [...(data ?? [])].sort(compareCollectionsNewestFirst), [data]);

  const headerRight = <ViewAllLink href="/collections" count={collections.length} />;

  let body: ReactNode = null;
  if (!loading) {
    if (loadError) {
      body = <LoadError message={loadError} onRetry={() => void refresh()} />;
    } else if (collections.length === 0) {
      body = <EmptyState>No collections yet.</EmptyState>;
    } else {
      body = (
        <ListRows>
          {collections.map(collection => (
            <ListRow
              key={collection.id}
              onActivate={collection.slug ? () => router.push(`/${collection.slug}`) : undefined}
              ariaLabel={`Open collection ${collection.name}`}
              left={
                <span className={styles.entry}>
                  {collection.coverImageUrl ? (
                    <Image
                      src={collection.coverImageUrl}
                      alt=""
                      width={THUMBNAIL_SIZE}
                      height={THUMBNAIL_SIZE}
                      className={styles.cover}
                    />
                  ) : (
                    <span className={styles.coverPlaceholder} aria-hidden="true" />
                  )}
                  <span className={styles.text}>
                    <span className={styles.name}>{collection.name}</span>
                    <span className={styles.date}>{formatLongDate(collection.collectionDate)}</span>
                  </span>
                </span>
              }
            />
          ))}
        </ListRows>
      );
    }
  }

  return (
    <ListPanel
      title="Collections"
      ariaLabel="Collections"
      headerRight={headerRight}
      collapsed={collapsed}
      onCollapsedChange={onCollapsedChange}
    >
      <LoadingText isLoading={loading}>Loading collections…</LoadingText>
      {!loading && !loadError && revalidationFailed && <StaleNotice />}
      {body}
    </ListPanel>
  );
}

export default CollectionsPanel;
