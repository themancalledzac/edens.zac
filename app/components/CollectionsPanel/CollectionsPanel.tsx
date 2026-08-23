'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useMemo } from 'react';

import { useAdminPanelSeed } from '@/app/components/AdminPanel/AdminPanelSeedContext';
import { ListPanel, ListRow, ListRows } from '@/app/components/ListPanel/ListPanel';
import { Button } from '@/app/components/ui/Button/Button';
import { EmptyState } from '@/app/components/ui/StatusText/EmptyState';
import { LoadingText } from '@/app/components/ui/StatusText/LoadingText';
import { StaleNotice } from '@/app/components/ui/StatusText/StaleNotice';
import { useCachedPanelData } from '@/app/hooks/useCachedPanelData';
import { getMetadata } from '@/app/lib/api/collections';
import { type CollectionListModel } from '@/app/types/Collection';
import { formatLongDate } from '@/app/utils/formatDateRange';
import { compareNames } from '@/app/utils/sortByName';

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
 * Newest first, undated collections last, name breaking the tie between two undated ones.
 *
 * Dates are ISO `YYYY-MM-DD`, which sorts correctly as text, so no `Date` is constructed. Undated
 * collections sink rather than being dropped: some collections have no date concept at all, and a
 * list that hides them is worse than one that puts them at the end.
 *
 * `collectionDate` is optional on {@link CollectionListModel}, so both null branches stay reachable
 * whatever the backend sends. `sortGroup`'s BLOG branch in `CollectionListSelector` applies the same
 * rule to the same list; the two should be one helper.
 */
function newestFirst(a: CollectionListModel, b: CollectionListModel): number {
  const dateA = a.collectionDate ?? null;
  const dateB = b.collectionDate ?? null;
  if (dateA === null && dateB === null) return compareNames(a.name, b.name);
  if (dateA === null) return 1;
  if (dateB === null) return -1;
  return dateB.localeCompare(dateA);
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

  const collections = useMemo(() => [...(data ?? [])].sort(newestFirst), [data]);

  const headerRight = (
    <Link href="/collections" className={styles.viewAll}>
      {collections.length} · View all
    </Link>
  );

  let body: ReactNode = null;
  if (!loading) {
    if (loadError) {
      body = (
        <div className={styles.loadError} role="alert">
          <p className={styles.error}>{loadError}</p>
          <Button variant="secondary" size="sm" onClick={() => void refresh()}>
            Retry
          </Button>
        </div>
      );
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
