import { type Metadata } from 'next';
import { unstable_rethrow } from 'next/navigation';

import { PageShell } from '@/app/components/ui/PageShell/PageShell';
import { getScopedAllCollections } from '@/app/lib/api/collections';
import { type CollectionModel } from '@/app/types/Collection';
import { type ContentCollectionModel } from '@/app/types/Content';
import { BROWSE_EXCLUDED_SLUGS, isShadowedRouteSlug } from '@/app/utils/collectionSlugs';
import { isContentCollection } from '@/app/utils/contentTypeGuards';
import { groupCollectionsByYear, UNDATED_YEAR } from '@/app/utils/groupCollectionsByYear';
import { logger } from '@/app/utils/logger';

import styles from './Collections.module.scss';
import { CollectionShowcaseTile } from './CollectionShowcaseTile';

/** Shared with the admin /all-collections surface — see BROWSE_EXCLUDED_SLUGS' TODO. */
const EXCLUDED_SLUGS = new Set(BROWSE_EXCLUDED_SLUGS);

/** Page size requested from the backend; reaching it means the list is truncated. */
const SHOWCASE_PAGE_SIZE = 500;

/** Tiles eagerly loaded for LCP — roughly the first grid row above the fold. */
const EAGER_TILE_COUNT = 4;

/**
 * Render on every request — `getScopedAllCollections` is `no-store`, and it calls the
 * upstream read API, which can fail mid-build before the proxy is live. Same rationale as
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
 *
 * A collection whose slug is shadowed by a static route is kept — hiding an admin's
 * collection would be worse than a tile whose link lands on the static page — but logged,
 * because nothing else in either repo records the collision.
 */
function extractCollectionBlocks(content: unknown): ContentCollectionModel[] {
  if (!Array.isArray(content)) {
    logger.warn('CollectionsPage', 'all-collections returned a non-array content field', {
      received: typeof content,
    });
    return [];
  }
  if (content.length >= SHOWCASE_PAGE_SIZE) {
    logger.warn('CollectionsPage', 'all-collections filled the requested page — list truncated', {
      pageSize: SHOWCASE_PAGE_SIZE,
    });
  }

  const blocks = content.filter(
    (block): block is ContentCollectionModel =>
      isContentCollection(block) && !EXCLUDED_SLUGS.has(block.slug)
  );

  const shadowed = blocks.filter(block => isShadowedRouteSlug(block.slug)).map(block => block.slug);
  if (shadowed.length > 0) {
    logger.warn(
      'CollectionsPage',
      'Collection slugs are shadowed by a static route — their tiles link to the route, not the collection',
      { slugs: shadowed }
    );
  }

  return blocks;
}

/**
 * Public Collections showcase.
 *
 * The public counterpart to the admin-only /all-collections. Fetches the synthetic
 * all-collections parent, whose result set the backend scopes per session (admin => all
 * visibilities; signed-in => LISTED plus their granted galleries; anonymous => LISTED),
 * then presents each collection as a parallax cover tile, grouped by year and ordered
 * newest-first.
 */
export default async function CollectionsPage() {
  let collection: CollectionModel | null;
  try {
    collection = await getScopedAllCollections(SHOWCASE_PAGE_SIZE);
  } catch (error) {
    // `getScopedAllCollections` calls `notFound()` on a missing parent, which throws a
    // control-flow error Next must handle itself — swallowing it would serve a
    // transient-sounding message with HTTP 200 forever.
    unstable_rethrow(error);
    logger.error('CollectionsPage', 'Failed to load the all-collections showcase', error);
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
          {groups.map((group, groupIndex) => (
            <section
              key={group.year}
              className={styles.group}
              aria-labelledby={`collections-year-${group.year}`}
            >
              <h2 id={`collections-year-${group.year}`} className={styles.yearHeading}>
                {group.year === UNDATED_YEAR ? 'Undated' : group.year}
              </h2>
              <div className={styles.grid}>
                {group.collections.map((block, index) => (
                  <CollectionShowcaseTile
                    key={block.id ?? block.referencedCollectionId}
                    collection={block}
                    priority={groupIndex === 0 && index < EAGER_TILE_COUNT}
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
