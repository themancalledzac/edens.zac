import { type Metadata } from 'next';
import { unstable_rethrow } from 'next/navigation';

import CollectionPageClient from '@/app/components/ContentCollection/CollectionPageClient';
import { PageShell } from '@/app/components/ui/PageShell/PageShell';
import { EmptyState } from '@/app/components/ui/StatusText/EmptyState';
import { meServer } from '@/app/lib/api/auth';
import { getScopedAllCollections } from '@/app/lib/api/collections';
import { type CollectionModel } from '@/app/types/Collection';
import { type ContentCollectionModel } from '@/app/types/Content';
import { BROWSE_EXCLUDED_SLUGS, isShadowedRouteSlug } from '@/app/utils/collectionSlugs';
import { isContentCollection } from '@/app/utils/contentTypeGuards';
import { logger } from '@/app/utils/logger';
import { resolveSsrViewport } from '@/app/utils/ssrViewport';

import styles from './Collections.module.scss';

/** Standalone-page slugs that must not appear as tiles in the browse list. */
const EXCLUDED_SLUGS = new Set(BROWSE_EXCLUDED_SLUGS);

/** Page size requested from the backend; reaching it means the list is truncated. */
const SHOWCASE_PAGE_SIZE = 500;

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
 * The canonical Collections browse route.
 *
 * Fetches the synthetic `all-collections` parent (the backend resource slug — distinct from this
 * route), whose result set the backend scopes per session: admin => all visibilities; signed-in =>
 * LISTED plus their granted galleries; anonymous => LISTED. `meServer()` is threaded through so
 * the client can surface the admin-only Hidden toggle; the toggle is a view control over data the
 * viewer already received, never an access gate — scoping stays entirely server-side.
 *
 * Renders through `CollectionPageClient` — the same stack every collection page and `/user` use —
 * by handing it that parent with the filtered blocks as its content. The header row, filter
 * toolbar, density slider and the parallax cover cards therefore all come from the shared
 * components rather than a `/collections`-only grid. `alwaysShowFilterBar` keeps the bar present
 * regardless of which aggregates the backend ships on the child blocks: on an index surface the
 * bar is part of the page, not an accident of the payload.
 *
 * The tiles are no longer grouped under year headings. Ordering and date narrowing come from the
 * shared bar's Order and Date controls — the reason the bespoke `CollectionShowcaseTile` and
 * year-grouped grid are gone. Ordering reaches these tiles through `applySort`'s collection-card
 * path; the image-only `isDateable` sort never did, which is why the bar had no working Order
 * control here before.
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
  const [ssrViewport, me] = await Promise.all([resolveSsrViewport(), meServer()]);

  return (
    <PageShell pageType="collectionsCollection">
      <h1 className={styles.srOnly}>Collections</h1>

      <CollectionPageClient
        collection={{ ...collection, content: blocks }}
        me={me}
        serverContentWidth={ssrViewport?.contentWidth}
        serverViewportHeight={ssrViewport?.viewportHeight}
        serverIsMobile={ssrViewport?.isMobile}
        alwaysShowFilterBar
      />

      {blocks.length === 0 && (
        <EmptyState align="page">No collections yet — check back soon.</EmptyState>
      )}
    </PageShell>
  );
}
