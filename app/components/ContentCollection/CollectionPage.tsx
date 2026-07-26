import ContentBlockWithFullScreen from '@/app/components/Content/ContentBlockWithFullScreen';
import SiteHeader from '@/app/components/SiteHeader/SiteHeader';
import { type MeResponse } from '@/app/types/Auth';
import { type CollectionModel } from '@/app/types/Collection';
import { CollectionVisibility } from '@/app/types/CollectionVisibility';
import { type AnyContentModel, type ContentParallaxImageModel } from '@/app/types/Content';
import { clampParallaxDimensions } from '@/app/utils/contentLayout';
import { logger } from '@/app/utils/logger';
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
 */
function collectionToContentModel(
  col: CollectionModel,
  showProtectedCovers: boolean
): ContentParallaxImageModel {
  // Defense-in-depth: never render a coverImage for a password-protected collection
  // in list views unless the caller explicitly opts in. Backend BE-H5 strips it at
  // the API, but a stale cache or future regression could re-expose it. Keyed on
  // `isPasswordProtected` alone so a payload missing the kind booleans (the exact
  // stale-cache case this strip exists for) still strips.
  const isProtected = col.isPasswordProtected === true;
  if (isProtected && col.isClient === undefined) {
    logger.warn('CollectionPage', 'Protected collection payload is missing isClient/isBlog', {
      slug: col.slug,
    });
  }
  const safeCoverImage = isProtected && !showProtectedCovers ? null : col.coverImage;
  const { imageWidth, imageHeight } = clampParallaxDimensions(
    safeCoverImage?.imageWidth,
    safeCoverImage?.imageHeight
  );

  return {
    contentType: 'IMAGE',
    enableParallax: true,
    id: col.id,
    title: col.title,
    slug: col.slug,
    collectionType: col.type,
    isClient: col.isClient,
    isBlog: col.isBlog,
    // Tags are deliberately not carried: `CollectionModel.tags` is populated only
    // by the backend's SyntheticCollectionResolver (list views), so real payloads
    // reaching this converter carry none. The `art-gallery` -> "Gallery" badge
    // therefore does not render here; the isBlog -> "Story" badge still does.
    description: col.description ?? null,
    imageUrl: safeCoverImage?.imageUrl ?? '',
    overlayText: col.title || col.slug || '',
    imageWidth,
    imageHeight,
    width: imageWidth,
    height: imageHeight,
    orderIndex: 0,
    // Map collection-level visibility -> content-block visible flag.
    // LISTED (or unknown/undefined) = render; UNLISTED/HIDDEN = hide from list views.
    visible: col.visibility === undefined ? true : col.visibility === CollectionVisibility.LISTED,
    createdAt: col.createdAt,
    updatedAt: col.updatedAt,
    collectionDate: col.collectionDate,
    locations: [],
  };
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
 * @param collectionType - Optional collection type for future customization
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
          <SiteHeader pageType="collection" collectionSlug={collection.slug} />
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
        <SiteHeader pageType="collectionsCollection" />
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
      </main>
    </div>
  );
}
