import { type Metadata } from 'next';

import { PageShell } from '@/app/components/ui/PageShell/PageShell';
import { getCollectionBySlug } from '@/app/lib/api/collections';
import { type ContentCollectionModel } from '@/app/types/Content';
import { groupCollectionsByYear, UNDATED_YEAR } from '@/app/utils/groupCollectionsByYear';

import styles from './Collections.module.scss';
import { CollectionShowcaseTile } from './CollectionShowcaseTile';

/**
 * Slugs that exist as standalone pages and should never appear in the showcase list,
 * matching the admin /all-collections exclusion.
 */
const EXCLUDED_SLUGS = new Set(['home']);

/**
 * Render on every request — getCollectionBySlug('all-collections') calls the upstream
 * read API, which can fail mid-build before the proxy is live. Same rationale as
 * /explore and the admin /all-collections page.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Collections — Zac Edens Photography',
  description: 'Browse every public collection, organized by date.',
};

/**
 * Extract the public collection content blocks from the synthetic all-collections parent,
 * dropping standalone-page slugs (e.g. `home`).
 */
function extractCollectionBlocks(content: unknown): ContentCollectionModel[] {
  if (!Array.isArray(content)) {
    return [];
  }
  return content.filter(
    (block): block is ContentCollectionModel =>
      block?.contentType === 'COLLECTION' && !EXCLUDED_SLUGS.has(block.slug)
  );
}

/**
 * Public Collections showcase.
 *
 * The public counterpart to the admin-only /all-collections. Fetches the env-aware
 * synthetic all-collections parent (prod returns LISTED collections only), then presents
 * each collection as a parallax cover tile, grouped by year and ordered newest-first.
 */
export default async function CollectionsPage() {
  let collection;
  try {
    collection = await getCollectionBySlug('all-collections', 0, 500);
  } catch {
    collection = null;
  }

  if (!collection) {
    return (
      <PageShell pageType="collectionsCollection">
        <header className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Collections</h1>
        </header>
        <p className={styles.empty}>
          Unable to load collections right now. Please try again later.
        </p>
      </PageShell>
    );
  }

  const blocks = extractCollectionBlocks(collection.content);
  const groups = groupCollectionsByYear(blocks);

  return (
    <PageShell pageType="collectionsCollection">
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Collections</h1>
        <p className={styles.intro}>Every public collection, organized by date.</p>
      </header>

      {groups.length === 0 ? (
        <p className={styles.empty}>No collections yet — check back soon.</p>
      ) : (
        <div className={styles.groups}>
          {groups.map(group => (
            <section
              key={group.year}
              className={styles.group}
              aria-labelledby={`collections-year-${group.year}`}
            >
              <h2 id={`collections-year-${group.year}`} className={styles.yearHeading}>
                {group.year === UNDATED_YEAR ? 'Undated' : group.year}
              </h2>
              <div className={styles.grid}>
                {group.collections.map(block => (
                  <CollectionShowcaseTile
                    key={block.id ?? block.referencedCollectionId}
                    collection={block}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </PageShell>
  );
}
