import ContentBlockWithFullScreen from '@/app/components/Content/ContentBlockWithFullScreen';
import SiteHeader from '@/app/components/SiteHeader/SiteHeader';
import { SkipTarget } from '@/app/components/ui/SkipLink/SkipLink';
import { type MeResponse } from '@/app/types/Auth';
import { type CollectionModel } from '@/app/types/Collection';
import { CollectionVisibility } from '@/app/types/CollectionVisibility';
import { type AnyContentModel, type ContentParallaxImageModel } from '@/app/types/Content';
import { logger } from '@/app/utils/logger';
import { buildParallaxCard } from '@/app/utils/parallaxCard';
import { type SsrViewport } from '@/app/utils/ssrViewport';

import CollectionPageClient from './CollectionPageClient';
import styles from './ContentCollectionPage.module.scss';

interface ContentCollectionPageProps {
  collection: CollectionModel | CollectionModel[];
  chunkSize?: number; // Number of images per row (default: 2)
  /**
   * Opt-in flag to bypass the defense-in-depth strip of cover images on
   * password-protected entries. Admin-only callers set this true so the admin
   * can see their own covers. Default false preserves the strip for anonymous
   * public list views.
   */
  showProtectedCovers?: boolean;
  /** UA-derived SSR fallback viewport from {@link resolveSsrViewport}. */
  ssrViewport?: SsrViewport;
  /** Mounts the admin edit surface in CollectionPageClient (single-collection branch only). */
  editMode?: boolean;
  /** Server-resolved principal (from `meServer()`), forwarded to the gallery client. */
  me?: MeResponse | null;
  /** The viewer's persisted selected image ids for this collection (client galleries only). */
  initialSelectedIds?: number[];
  /** The viewer's GLOBAL saved (bookmarked) image ids, seeded server-side. Cross-collection. */
  initialSavedImageIds?: number[];
}

/**
 * Converts a CollectionModel to ContentParallaxImageModel for unified parallax rendering.
 * Dimensions are clamped to a minimum 4:5 aspect ratio.
 *
 * Tags are deliberately not carried: `CollectionModel.tags` is populated only by the
 * backend's SyntheticCollectionResolver (list views), so real payloads reaching this
 * converter carry none. The `art-gallery` -> "Gallery" badge therefore does not render
 * here; the isBlog -> "Story" badge still does.
 *
 * The cover strip stays HERE rather than moving into `buildParallaxCard`: it is a display
 * decision about locked galleries, not a shape decision, and burying it in a generic builder is
 * how it gets bypassed later. Never render a coverImage for a password-protected collection in
 * list views unless the caller explicitly opts in. Keyed on `isPasswordProtected` alone so a
 * payload missing the kind booleans still strips.
 *
 * This is NOT defense-in-depth against the API, whatever an earlier version of this comment
 * said. The backend deliberately returns the cover alongside the flag - `ContentModels.java`
 * calls `isPasswordProtected` "a render hint, not a gate", and the BE-H5 tests pin that the
 * cover is RETAINED for a protected gallery with or without a valid cookie. The strip is a
 * frontend product choice and is the only thing keeping a locked gallery's cover off a card.
 * `convertCollectionContentToParallax` carries the same strip for the `ContentCollectionModel`
 * path; the two are deliberately not shared - see that function's docblock.
 *
 * Visibility maps collection-level -> content-block: LISTED (or unknown/undefined) renders;
 * UNLISTED/HIDDEN hides from list views. That mapping is this call site's own, which is why
 * the builder takes an already-resolved boolean.
 */
export function collectionToContentModel(
  col: CollectionModel,
  showProtectedCovers: boolean
): ContentParallaxImageModel {
  const isProtected = col.isPasswordProtected === true;
  if (isProtected && col.isClient === undefined) {
    logger.warn('CollectionPage', 'Protected collection payload is missing isClient/isBlog', {
      slug: col.slug,
    });
  }
  const safeCoverImage = isProtected && !showProtectedCovers ? null : col.coverImage;

  return buildParallaxCard({
    id: col.id,
    collectionId: col.id,
    title: col.title,
    slug: col.slug,
    isClient: col.isClient,
    isBlog: col.isBlog,
    description: col.description ?? null,
    coverImage: safeCoverImage,
    orderIndex: 0,
    visible: col.visibility === undefined ? true : col.visibility === CollectionVisibility.LISTED,
    createdAt: col.createdAt,
    updatedAt: col.updatedAt,
    collectionDate: col.collectionDate,
  });
}

/**
 * Content Collection Page
 *
 * Unified component that displays content using ContentComponent with intelligent chunking.
 * Handles both:
 * - Array of CollectionModel: Converts to ParallaxImageContentModel and displays as cards
 * - Single CollectionModel: Extracts and displays content blocks from collection.content
 *
 * Uses ContentBlockWithFullScreen for:
 * - Intelligent chunking based on image dimensions (groups items in chunks of 2, or 1 for wide shots)
 * - Fullscreen image viewing
 * - Parallax support for both collections and content (all collections are now Parallax type)
 * - Mixed content support (collections + images + text + etc.)
 *
 * @param collection - Single CollectionModel or array of CollectionModels
 * @returns Server component displaying unified collection content
 */
export default function CollectionPage({
  collection,
  chunkSize,
  showProtectedCovers = false,
  ssrViewport,
  editMode = false,
  me = null,
  initialSelectedIds = [],
  initialSavedImageIds = [],
}: ContentCollectionPageProps) {
  // Single collection: delegate to client component for filter support
  if (!Array.isArray(collection)) {
    // The collection title is shown visually as an overlay inside the content
    // tree, so emit the page's real <h1> visually-hidden for SEO + screen readers.
    const headingText = collection.title?.trim() || collection.slug?.trim() || 'Untitled';
    return (
      <div className={styles.container}>
        <main className={styles.main}>
          <SiteHeader isCollectionPage collectionSlug={collection.slug} />
          <SkipTarget>
            <h1 className={styles.srOnly}>{headingText}</h1>
            <CollectionPageClient
              collection={collection}
              chunkSize={chunkSize}
              serverContentWidth={ssrViewport?.contentWidth}
              serverViewportHeight={ssrViewport?.viewportHeight}
              serverIsMobile={ssrViewport?.isMobile}
              editMode={editMode}
              me={me}
              initialSelectedIds={initialSelectedIds}
              initialSavedImageIds={initialSavedImageIds}
            />
          </SkipTarget>
        </main>
      </div>
    );
  }

  // Array of collections: server-rendered grid (no filters)
  const contentBlocks: AnyContentModel[] = collection.map(c =>
    collectionToContentModel(c, showProtectedCovers)
  );

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <SiteHeader />
        <SkipTarget>
          {contentBlocks.length > 0 ? (
            <ContentBlockWithFullScreen
              content={contentBlocks}
              priorityBlockIndex={0}
              enableFullScreenView
              initialPageSize={30}
              chunkSize={chunkSize}
              serverContentWidth={ssrViewport?.contentWidth}
              serverViewportHeight={ssrViewport?.viewportHeight}
              serverIsMobile={ssrViewport?.isMobile}
            />
          ) : null}
        </SkipTarget>
      </main>
    </div>
  );
}
