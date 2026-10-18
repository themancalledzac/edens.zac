'use client';

import Image from 'next/image';
import Link from 'next/link';
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';

import { useAdminPanelSeed } from '@/app/components/ListPanel/AdminPanelSeedContext';
import { ListDetailSheet } from '@/app/components/ListPanel/ListDetailSheet';
import {
  ListPanel,
  type ListPanelShell,
  ListRow,
  ListRows,
  ViewAllLink,
} from '@/app/components/ListPanel/ListPanel';
import { PanelBody } from '@/app/components/ListPanel/PanelBody';
import { Select } from '@/app/components/ui/Field/Select';
import { IMAGE } from '@/app/constants';
import { useCachedPanelData } from '@/app/hooks/useCachedPanelData';
import {
  getCollectionUpdateMetadata,
  getMetadata,
  updateCollection,
} from '@/app/lib/api/collections';
import { type CollectionListModel } from '@/app/types/Collection';
import {
  COLLECTION_VISIBILITY_LABELS,
  CollectionVisibility,
} from '@/app/types/CollectionVisibility';
import { formatLongDate } from '@/app/utils/formatDateRange';
import { manageHref } from '@/app/utils/manageUrl';
import { compareCollectionsNewestFirst } from '@/app/utils/sortCollections';

import styles from './CollectionsPanel.module.scss';

interface CollectionsPanelProps {
  /** The hub's tab strip and collapse state; absent when mounted on its own. */
  shell?: ListPanelShell;
}

/** Side of the row's cover thumb, in CSS px, matched to `.cover` in the stylesheet. */
const THUMB_SIZE = 20;

/** Width of the cover in the detail sheet, in CSS px, as the optimizer's intrinsic size. */
const SHEET_COVER_SIZE = 480;

const VISIBILITIES = Object.values(CollectionVisibility);

/**
 * The calls the visibility select makes, held on an object so a test can replace one and watch the
 * select's behaviour change.
 *
 * `saveVisibility` is the same `updateCollection` call the manage page's InfoTab makes.
 * `rollsBackFailedSave` says whether a failed save puts the select back on the last saved value.
 */
export const collectionsPanelGuards = {
  saveVisibility(id: number, visibility: CollectionVisibility) {
    return updateCollection(id, { id, visibility }).then(() => {});
  },
  rollsBackFailedSave(): boolean {
    return true;
  },
};

/**
 * The collection list, from the metadata endpoint the admin page already calls.
 *
 * There is no collections-only endpoint and no viewer-scoped one. This panel is admin-only, so the
 * admin metadata payload is the right source.
 */
async function fetchCollections(): Promise<CollectionListModel[]> {
  const metadata = await getMetadata();
  return metadata?.collections ?? [];
}

interface CollectionSheetBodyProps {
  collection: CollectionListModel;
}

/**
 * What the detail sheet shows for one collection: cover, date, Open, Manage and a visibility select.
 *
 * Mounted only while the sheet is open, so the current visibility is read once per opening with
 * `getCollectionUpdateMetadata`. The select is disabled until that read lands. A change saves at
 * once through {@link collectionsPanelGuards}; if the save fails the select returns to the last
 * saved value and the error shows beneath it.
 */
function CollectionSheetBody({ collection }: CollectionSheetBodyProps) {
  const { id, slug, coverImageUrl, collectionDate } = collection;
  const [visibility, setVisibility] = useState<CollectionVisibility | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const savedRef = useRef<CollectionVisibility | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    void getCollectionUpdateMetadata(slug)
      .then(response => {
        const current = response?.collection.visibility ?? null;
        if (cancelled || current === null) return;
        savedRef.current = current;
        setVisibility(current);
      })
      .catch(() => {
        if (!cancelled) setSaveError('Could not read the current visibility.');
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const handleChange = async (e: ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as CollectionVisibility;
    setVisibility(next);
    setSaveError(null);
    try {
      await collectionsPanelGuards.saveVisibility(id, next);
      savedRef.current = next;
    } catch {
      if (collectionsPanelGuards.rollsBackFailedSave()) setVisibility(savedRef.current);
      setSaveError('Could not save visibility.');
    }
  };

  return (
    <div className={styles.sheetBody}>
      {coverImageUrl && (
        <Image
          src={coverImageUrl}
          alt=""
          width={SHEET_COVER_SIZE}
          height={SHEET_COVER_SIZE}
          className={styles.sheetCover}
          quality={IMAGE.quality}
        />
      )}
      {collectionDate && <span className={styles.sheetDate}>{formatLongDate(collectionDate)}</span>}
      {slug && (
        <div className={styles.links}>
          <Link href={`/${slug}`}>Open</Link>
          <Link href={manageHref(slug)}>Manage</Link>
        </div>
      )}
      <label className={styles.field}>
        Visibility
        <Select
          value={visibility ?? ''}
          disabled={visibility === null}
          onChange={e => void handleChange(e)}
        >
          {visibility === null && <option value="">…</option>}
          {VISIBILITIES.map(option => (
            <option key={option} value={option}>
              {COLLECTION_VISIBILITY_LABELS[option]}
            </option>
          ))}
        </Select>
      </label>
      {saveError && (
        <p className={styles.error} role="alert">
          {saveError}
        </p>
      )}
    </div>
  );
}

/**
 * The hub's collection list: one line per collection, a 20px cover thumb, the name and the date
 * muted after a middle dot. The list payload carries no visibility, so the row has no fact.
 *
 * Tapping a row opens a {@link ListDetailSheet} for that collection. Collections stay a list, never
 * a tile grid. The body renders through {@link PanelBody}, which owns the loading, error, empty and
 * stale states; data comes through `useCachedPanelData` under a `collections` key, seeded by the
 * list the server already fetched to size this panel — see `page.tsx`.
 *
 * The Collections tab of the `/admin` hub's list panel. The tab strip and collapsed state arrive as
 * `shell` and pass straight through.
 */
export function CollectionsPanel({ shell }: CollectionsPanelProps) {
  const seed = useAdminPanelSeed();
  const [openId, setOpenId] = useState<number | null>(null);

  const { data, loading, loadError, revalidationFailed, refresh } = useCachedPanelData(
    'collections',
    fetchCollections,
    'Could not load collections. Retry, or check that the backend is running.',
    seed.collections
  );

  const collections = useMemo(() => [...(data ?? [])].sort(compareCollectionsNewestFirst), [data]);
  const opened = collections.find(collection => collection.id === openId) ?? null;

  const action = <ViewAllLink href="/collections" count={collections.length} />;

  return (
    <ListPanel {...shell} title="Collections" ariaLabel="Collections" action={action}>
      <PanelBody
        loading={loading}
        loadError={loadError}
        revalidationFailed={revalidationFailed}
        onRetry={() => void refresh()}
        loadingLabel="Loading collections…"
        isEmpty={collections.length === 0}
        emptyLabel="No collections yet."
      >
        <ListRows>
          {collections.map(collection => (
            <ListRow
              key={collection.id}
              onActivate={() => setOpenId(collection.id)}
              ariaLabel={`Open details for ${collection.name}`}
              leading={
                collection.coverImageUrl ? (
                  <Image
                    src={collection.coverImageUrl}
                    alt=""
                    width={THUMB_SIZE}
                    height={THUMB_SIZE}
                    className={styles.cover}
                    quality={IMAGE.quality}
                  />
                ) : (
                  <span className={styles.coverPlaceholder} aria-hidden="true" />
                )
              }
              primary={collection.name}
              secondary={formatLongDate(collection.collectionDate) || undefined}
            />
          ))}
        </ListRows>
      </PanelBody>
      <ListDetailSheet
        open={opened !== null}
        onClose={() => setOpenId(null)}
        title={opened?.name ?? ''}
      >
        {opened && <CollectionSheetBody key={opened.id} collection={opened} />}
      </ListDetailSheet>
    </ListPanel>
  );
}

export default CollectionsPanel;
